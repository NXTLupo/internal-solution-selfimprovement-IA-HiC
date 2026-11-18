"""
Copilot Studio Recipe Generator -- FastAPI Backend
Generates complete, step-by-step Copilot Studio agent build recipes
using Claude API with streaming SSE responses.
"""
import os
import re
import json
import logging
import time
import urllib.request
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Copilot Studio Recipe Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = int(os.environ.get("PORT", 5013))
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# --- Model ids: read from the platform's routing authority at startup, never hard-coded in prompts ---
# The research proxy serves the platform's model seats at GET /api/models as
# {"seats": {"reasoning": ..., "structured": ..., ...}, "models": {...}}. The route sits behind the
# proxy's shared token (x-proxy-token), read the same way the platform agent reads it
# (mcp-services/agent/hic_door.py): PROXY_AUTH_TOKEN when pinned, else the token the proxy publishes
# to <hic-workspace>/.runtime/config.json. When the seats cannot be read (proxy down, 401, no token),
# the fallback ids below are used; all three were verified callable on 2026-11-10.
HIC_PROXY_URL = os.environ.get("HIC_PROXY_URL", "http://research-proxy:5012").rstrip("/")
HIC_RUNTIME_CONFIG = os.environ.get("HIC_RUNTIME_CONFIG", "/hic-workspace/.runtime/config.json")
FALLBACK_RECIPE_MODELS = {
    "opus": "claude-opus-5-5",
    "sonnet": "claude-sonnet-5-5",
    "haiku": "claude-haiku-5-5",
}
# Recipe tier -> proxy seat. The proxy has no small-model seat today; a "haiku" seat is used if one appears.
RECIPE_TIER_SEATS = {"opus": "reasoning", "sonnet": "structured", "haiku": "haiku"}


def _proxy_token() -> str:
    token = os.environ.get("PROXY_AUTH_TOKEN", "").strip()
    if token:
        return token
    try:
        with open(HIC_RUNTIME_CONFIG, "r", encoding="utf-8") as f:
            return str((json.load(f) or {}).get("proxyToken") or "").strip()
    except Exception:
        return ""


def resolve_recipe_models(timeout: float = 3.0) -> tuple:
    """Return ({tier: model_id}, source). A seat that is missing or is not a Claude id keeps its fallback,
    because recipes call the Anthropic API directly."""
    models = dict(FALLBACK_RECIPE_MODELS)
    headers = {"Accept": "application/json"}
    token = _proxy_token()
    if token:
        headers["x-proxy-token"] = token
    try:
        req = urllib.request.Request(f"{HIC_PROXY_URL}/api/models", headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            seats = (json.loads(resp.read().decode("utf-8")) or {}).get("seats") or {}
    except Exception as e:
        logger.warning(f"[models] {HIC_PROXY_URL}/api/models unavailable ({e}); using fallback model ids")
        return models, "fallback (proxy seats unavailable)"
    used = []
    for tier, seat in RECIPE_TIER_SEATS.items():
        value = str(seats.get(seat) or "").strip()
        if re.fullmatch(r"claude-[a-z0-9.-]+", value):
            models[tier] = value
            used.append(seat)
    return models, f"proxy /api/models (seats used: {', '.join(used) or 'none'})"


_RECIPE_MODELS, MODEL_SOURCE = resolve_recipe_models()
RECIPE_MODEL_OPUS = _RECIPE_MODELS["opus"]
RECIPE_MODEL_SONNET = _RECIPE_MODELS["sonnet"]
RECIPE_MODEL_HAIKU = _RECIPE_MODELS["haiku"]
# The service writes its own recipes on the highest-quality seat.
MODEL = RECIPE_MODEL_OPUS
logger.info(f"Recipe models from {MODEL_SOURCE}: opus={RECIPE_MODEL_OPUS} "
            f"sonnet={RECIPE_MODEL_SONNET} haiku={RECIPE_MODEL_HAIKU}")

# Pre-generated recipes, the few-shot knowledge files and the template JSONs were written when other
# model ids were current. Every Claude id or display name in that text is rewritten to the current id
# of the same tier on its way to a user or into the prompt, so a model change never needs a data edit.
_CLAUDE_ID_RE = re.compile(r"\bclaude-(opus|sonnet|haiku)-\d+(?:-\d+)?(?:-\d{8})?\b")
_CLAUDE_NAME_RE = re.compile(r"\bClaude (Opus|Sonnet|Haiku) \d+(?:\.\d+)?\b")


def _tier_model(tier: str) -> str:
    return {"opus": RECIPE_MODEL_OPUS, "sonnet": RECIPE_MODEL_SONNET, "haiku": RECIPE_MODEL_HAIKU}[tier.lower()]


def model_display_name(model_id: str) -> str:
    """claude-opus-5-5 -> Claude Opus 5.5 (a trailing date suffix is dropped)."""
    parts = re.sub(r"-\d{8}$", "", model_id).split("-")[1:]
    if not parts:
        return model_id
    version = ".".join(p for p in parts[1:] if p.isdigit())
    return f"Claude {parts[0].capitalize()} {version}".strip()


def with_current_models(text: str) -> str:
    text = _CLAUDE_ID_RE.sub(lambda m: _tier_model(m.group(1)), text)
    return _CLAUDE_NAME_RE.sub(lambda m: model_display_name(_tier_model(m.group(1))), text)


def rule_45_model_ids() -> str:
    """RULE 45 of the system prompt, generated from the resolved ids (never typed by hand)."""
    ids = [RECIPE_MODEL_OPUS, RECIPE_MODEL_SONNET, RECIPE_MODEL_HAIKU]
    dated = [m for m in ids if re.search(r"-\d{8}$", m)]
    undated = [m for m in ids if m not in dated]
    lines = [
        "RULE 45: CURRENT MODEL IDS",
        f"    - Highest quality (Journey Mapper): `{RECIPE_MODEL_OPUS}`",
        f"    - Fast/cost-effective (Social Research, Miro): `{RECIPE_MODEL_SONNET}`",
        f"    - Budget/high-volume: `{RECIPE_MODEL_HAIKU}`",
        "    - Copy these ids exactly as written. Never use a Claude model id from memory or from an older recipe: "
        "older ids are retired and the API rejects them.",
    ]
    if undated:
        lines.append(f"    - No date suffix on {', '.join(f'`{m}`' for m in undated)}; adding one makes the id invalid")
    if dated:
        lines.append(f"    - Keep the date suffix exactly as written on {', '.join(f'`{m}`' for m in dated)}")
    lines.append("    - A Claude request body carries only model, max_tokens, system, messages (plus tools when needed). "
                 "NEVER add temperature, top_p, top_k, a thinking budget (budget_tokens), a forced tool_choice "
                 "(any/tool) or an assistant prefill message: current Claude models reject each with HTTP 400.")
    return "\n".join(lines) + "\n"

BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
STATIC_DIR = BASE_DIR / "static"

# Load knowledge files at startup
platform_landscape = ""
aria_recipe = ""

def load_knowledge():
    global platform_landscape, aria_recipe
    landscape_path = KNOWLEDGE_DIR / "platform_landscape.md"
    aria_path = KNOWLEDGE_DIR / "aria_recipe.md"
    if landscape_path.exists():
        platform_landscape = with_current_models(landscape_path.read_text(encoding="utf-8"))
        logger.info(f"Loaded platform landscape ({len(platform_landscape)} chars)")
    if aria_path.exists():
        aria_recipe = with_current_models(aria_path.read_text(encoding="utf-8"))
        logger.info(f"Loaded Aria recipe ({len(aria_recipe)} chars)")

load_knowledge()


# --- Models ---

class EntityChoice(BaseModel):
    id: str
    displayName: str

class TopicNode(BaseModel):
    type: str  # Message, Question, Action, Condition, Redirect, Adaptive Card
    name: str
    description: str = ""
    variable_name: Optional[str] = None
    variable_scope: Optional[str] = None  # Topic or Global
    action_type: Optional[str] = None  # Call a flow, HTTP request, Set variable value, etc.
    flow_name: Optional[str] = None
    condition_expression: Optional[str] = None
    redirect_topic: Optional[str] = None
    entity_type: Optional[str] = None  # string, number, boolean, choice, email, age, etc.
    choices: Optional[List[EntityChoice]] = None  # For choice entities (ClosedListEntity)
    entity_file: Optional[str] = None  # Filename in static/entities/ for downloadable entity .txt

class TopicConfig(BaseModel):
    name: str
    description: str
    trigger_phrases: Optional[str] = None
    nodes: List[TopicNode] = []
    node_types: List[str] = []  # Backwards compat -- ignored if nodes present

class FlowParam(BaseModel):
    name: str
    type: str = "String"  # String, Number, Boolean
    description: str = ""

class FlowConfig(BaseModel):
    name: str
    flow_type: str = "Agent Flow"  # Agent Flow, Cloud Flow
    call_method: str = "Agent-level tool"  # Agent-level tool, Topic-level tool, Both
    trigger_type: str = "When an agent calls the flow"
    description: str = ""
    actions_description: str = ""
    use_async_pattern: bool = False
    input_params: List[FlowParam] = []
    output_params: List[FlowParam] = []
    http_endpoints: List[Dict[str, str]] = []

class KnowledgeSource(BaseModel):
    source_type: str  # SharePoint, Dataverse, Website URL, File upload
    path_or_url: str
    name: str = ""
    description: str = ""

class ToolConfig(BaseModel):
    tool_type: str  # Connector, Flow, REST API, MCP, Prompt, Computer use
    name: str
    description: str = ""
    inputs: List[Dict[str, str]] = []
    outputs: List[Dict[str, str]] = []
    # MCP-specific fields (only used when tool_type == "MCP")
    mcp_server_url: str = ""  # e.g., https://my-mcp-server.azurewebsites.net/mcp
    mcp_server_description: str = ""  # What the MCP server does
    mcp_is_advanced_alternative: bool = False  # True if Agent Flow is the primary recommendation

class TriggerConfig(BaseModel):
    trigger_type: str  # SharePoint file upload, Outlook email, Scheduled, Manual
    description: str = ""
    configuration: str = ""  # e.g., folder path, subject filter, schedule pattern

class EnvironmentVariable(BaseModel):
    display_name: str
    data_type: str = "Text"  # Text, Number, Boolean
    purpose: str = ""  # e.g., "API Key for Claude", "API endpoint URL"
    is_secret: bool = False

class RecipeRequest(BaseModel):
    agent_name: str
    agent_description: str = ""
    persona_instructions: str = ""
    orchestration_model: str = "GPT-5 Chat GA"
    auth_mode: str = "Authenticate with Microsoft"
    disable_general_knowledge: bool = True
    sharepoint_site_url: str = ""
    sharepoint_folders: str = ""
    topics: List[TopicConfig] = []
    flows: List[FlowConfig] = []
    knowledge_sources: List[KnowledgeSource] = []
    delivery_channels: List[str] = ["Teams Adaptive Card", "Email"]
    tools: List[ToolConfig] = []
    triggers: List[TriggerConfig] = []
    environment_variables: List[EnvironmentVariable] = []
    template_id: Optional[str] = None

class TopicYamlRequest(BaseModel):
    topic: TopicConfig
    agent_name: str = "Agent"

class ExportRequest(BaseModel):
    recipe_content: str
    format: str = "markdown"  # markdown, html
    agent_name: str = "Agent"


# --- YAML Topic Generator ---

def _strip_emojis(text: str) -> str:
    """Remove all emoji and non-BMP Unicode characters from text.

    Copilot Studio's YAML parser chokes on emojis and special Unicode.
    """
    import re
    # Remove emoji and symbol Unicode ranges
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"  # enclosed characters
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols extended-A
        "\U00002600-\U000026FF"  # misc symbols
        "\U0000FE00-\U0000FE0F"  # variation selectors
        "\U0000200D"             # zero width joiner
        "\U00000023\U000020E3"   # keycap #
        "]+",
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text).strip()


def _yaml_safe_value(text: str) -> str:
    """Return a YAML-safe inline string value -- always quoted if it contains special chars."""
    if not text:
        return '""'
    # Strip emojis -- Copilot Studio YAML parser rejects them
    text = _strip_emojis(text)
    # Multi-line text: use block scalar
    if '\n' in text:
        prefix = ' ' * 6
        return '|-\n' + '\n'.join(f'{prefix}{line}' for line in text.split('\n'))
    # Always quote -- Copilot Studio's YAML parser is strict about colons,
    # parentheses, and other chars that are valid YAML but break the parser.
    escaped = text.replace('\\', '\\\\').replace('"', '\\"')
    return f'"{escaped}"'


def _auto_trigger_phrases(topic_name: str, topic_description: str = '') -> list[str]:
    """Generate sensible trigger phrases from a topic name when none are provided.

    Copilot Studio requires OnRecognizedIntent with triggerQueries for custom topics.
    Topics without triggerQueries become System Topics (which cannot be deleted).
    """
    phrases = []
    # Use the raw topic name as the primary phrase
    name_lower = topic_name.strip()
    if name_lower:
        phrases.append(name_lower)
    # Create variations from the name words
    words = [w for w in topic_name.lower().replace('-', ' ').replace('_', ' ').split() if len(w) > 2]
    if len(words) >= 2:
        phrases.append(' '.join(words))                           # "data collection request"
        phrases.append(f"start {' '.join(words)}")                # "start data collection request"
        phrases.append(f"I want to {' '.join(words)}")            # "I want to data collection request"
        phrases.append(f"help with {' '.join(words)}")            # "help with data collection request"
    elif words:
        phrases.append(words[0])
        phrases.append(f"start {words[0]}")
        phrases.append(f"I need {words[0]}")
    # Add a description-derived phrase if available
    if topic_description and len(topic_description) > 10:
        # Use first sentence, truncated
        first_sentence = topic_description.split('.')[0].strip()[:80]
        if first_sentence and first_sentence not in phrases:
            phrases.append(first_sentence)
    # Deduplicate while preserving order, ensure at least 3 phrases
    seen = set()
    unique = []
    for p in phrases:
        p_lower = p.lower().strip()
        if p_lower and p_lower not in seen:
            seen.add(p_lower)
            unique.append(p)
    return unique[:8]  # Cap at 8 phrases


def generate_topic_yaml(topic: TopicConfig) -> str:
    """Convert a TopicConfig into Copilot Studio YAML code editor format.

    CRITICAL: Always emits OnRecognizedIntent (custom topic). NEVER emits
    OnUnknownIntent, which creates System Topics that cannot be deleted.
    Uses SendMessage (not SendActivity) for text messages per Microsoft docs.
    """
    lines = []
    lines.append('kind: AdaptiveDialog')
    lines.append('beginDialog:')

    # ALWAYS use OnRecognizedIntent -- this creates a CUSTOM topic.
    # OnUnknownIntent creates a SYSTEM topic (cannot be deleted!).
    lines.append('  kind: OnRecognizedIntent')
    lines.append('  id: main')
    lines.append('  intent:')
    lines.append(f'    displayName: {topic.name}')

    # Gather trigger phrases -- auto-generate if none provided
    if topic.trigger_phrases:
        phrases = [p.strip() for p in topic.trigger_phrases.replace(';', ',').split(',') if p.strip()]
    else:
        phrases = _auto_trigger_phrases(topic.name, topic.description or '')

    lines.append('    triggerQueries:')
    for phrase in phrases:
        lines.append(f'      - {phrase}')

    # Actions
    if topic.nodes:
        lines.append('  actions:')
        for i, node in enumerate(topic.nodes):
            node_id = f'node_{i}'
            # Sanitize node name into a safe ID
            if node.name:
                safe_name = ''.join(c if c.isalnum() else '_' for c in node.name)
                safe_name = safe_name[:30].strip('_')
                if safe_name:
                    node_id = safe_name

            if node.type == 'Message':
                lines.append(f'    - kind: SendMessage')
                lines.append(f'      id: {node_id}')
                msg_text = node.description or node.name or 'Message text here'
                lines.append(f'      message: {_yaml_safe_value(msg_text)}')

            elif node.type == 'Question':
                lines.append(f'    - kind: Question')
                lines.append(f'      id: {node_id}')
                lines.append(f'      interruptionPolicy:')
                lines.append(f'        allowInterruption: true')
                scope = node.variable_scope or 'Topic'
                var_name = node.variable_name or f'Var{i + 1}'
                lines.append(f'      variable: init:{scope}.{var_name}')
                prompt_text = node.description or node.name or 'Please provide your answer.'
                lines.append(f'      prompt: {_yaml_safe_value(prompt_text)}')
                # Entity selection: choice -> EmbeddedEntity/ClosedListEntity, else prebuilt
                if node.entity_type == 'choice' and node.choices:
                    lines.append(f'      entity:')
                    lines.append(f'        kind: EmbeddedEntity')
                    lines.append(f'        definition:')
                    lines.append(f'          kind: ClosedListEntity')
                    lines.append(f'          smartMatchingEnabled: true')
                    lines.append(f'          items:')
                    for choice in node.choices:
                        lines.append(f'            - id: {choice.id}')
                        lines.append(f'              displayName: {_yaml_safe_value(choice.displayName)}')
                elif node.entity_type:
                    # Map shorthand to Copilot Studio PascalCase prebuilt entity names
                    ENTITY_MAP = {
                        'string': 'StringPrebuiltEntity',
                        'number': 'NumberPrebuiltEntity',
                        'boolean': 'BooleanPrebuiltEntity',
                        'email': 'EmailPrebuiltEntity',
                        'url': 'URLPrebuiltEntity',
                        'age': 'AgePrebuiltEntity',
                        'money': 'MoneyPrebuiltEntity',
                        'datetime': 'DateTimePrebuiltEntity',
                        'date': 'DateTimePrebuiltEntity',
                        'percentage': 'PercentagePrebuiltEntity',
                        'temperature': 'TemperaturePrebuiltEntity',
                        'phonenumber': 'PhoneNumberPrebuiltEntity',
                        'phone': 'PhoneNumberPrebuiltEntity',
                        'personname': 'PersonNamePrebuiltEntity',
                        'city': 'CityPrebuiltEntity',
                        'country': 'CountryOrRegionPrebuiltEntity',
                        'state': 'StatePrebuiltEntity',
                        'zipcode': 'ZipCodePrebuiltEntity',
                    }
                    entity_kind = ENTITY_MAP.get(node.entity_type.lower(), node.entity_type)
                    # If already PascalCase (ends with Entity), use as-is
                    if not entity_kind.endswith('Entity'):
                        entity_kind = 'StringPrebuiltEntity'
                    lines.append(f'      entity: {entity_kind}')
                else:
                    lines.append(f'      entity: StringPrebuiltEntity')

            elif node.type == 'Action':
                if node.action_type == 'Set variable value':
                    lines.append(f'    - kind: SetVariable')
                    lines.append(f'      id: {node_id}')
                    scope = node.variable_scope or 'Topic'
                    var_name = node.variable_name or f'Var{i + 1}'
                    lines.append(f'      variable: {scope}.{var_name}')
                    lines.append(f'      value: "# SET VALUE HERE"')
                    if node.description:
                        for desc_line in node.description.replace('\r', '').split('\n'):
                            lines.append(f'      # {desc_line}')
                elif node.action_type == 'Call a flow' or (not node.action_type) or node.action_type == '':
                    # Copilot Studio requires a real GUID for flowId -- a placeholder
                    # value causes GuidParseError.  Emit a SendMessage placeholder
                    # that the user replaces with a real Action node after creating
                    # the flow (Add node -> Add a tool -> select the flow).
                    flow_label = node.flow_name or 'Your Flow'
                    lines.append(f'    - kind: SendMessage')
                    lines.append(f'      id: {node_id}')
                    placeholder_msg = f'ACTION PLACEHOLDER -- Replace this node with an Action node that calls the "{flow_label}" flow. (Add node > Add a tool > select the flow, then map input/output variables.)'
                    lines.append(f'      message: {_yaml_safe_value(placeholder_msg)}')
                    if node.description:
                        for desc_line in node.description.replace('\r', '').split('\n'):
                            lines.append(f'      # {desc_line}')
                else:
                    lines.append(f'    - kind: SendMessage')
                    lines.append(f'      id: {node_id}')
                    action_msg = f'Action: {node.action_type or "unknown"}'
                    lines.append(f'      message: {_yaml_safe_value(action_msg)}')
                    if node.description:
                        for desc_line in node.description.replace('\r', '').split('\n'):
                            lines.append(f'      # {desc_line}')

            elif node.type == 'Condition':
                lines.append(f'    - kind: ConditionGroup')
                lines.append(f'      id: {node_id}')
                lines.append(f'      conditions:')
                expr = node.condition_expression or f'{node.variable_scope or "Topic"}.{node.variable_name or "Var"} = "expected"'
                lines.append(f'        - id: {node_id}_true')
                lines.append(f'          condition: ={expr}')
                lines.append(f'          actions:')
                lines.append(f'            - kind: SendMessage')
                lines.append(f'              id: {node_id}_trueMsg')
                lines.append(f'              message: "Condition met."')
                lines.append(f'      elseActions:')
                lines.append(f'        - kind: SendMessage')
                lines.append(f'          id: {node_id}_elseMsg')
                lines.append(f'          message: "Condition not met."')

            elif node.type == 'Redirect':
                lines.append(f'    - kind: BeginDialog')
                lines.append(f'      id: {node_id}')
                target = node.redirect_topic or 'TargetTopicName'
                lines.append(f'      dialog: {target}')

            elif node.type == 'Adaptive Card':
                lines.append(f'    - kind: SendActivity')
                lines.append(f'      id: {node_id}')
                lines.append(f'      activity:')
                lines.append(f'        attachments:')
                lines.append(f'          - kind: AdaptiveCardTemplate')
                lines.append(f'            body: |-')
                card_desc = node.description or node.name or 'Results'
                # Strip emojis and escape for JSON string value:
                # 1. Remove emojis (Copilot Studio rejects them)
                # 2. Escape backslashes and quotes
                # 3. Replace real newlines with \n escape (JSON strings MUST be single-line)
                card_desc = _strip_emojis(card_desc)
                card_desc_json = card_desc.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
                card_json_lines = [
                    '              {',
                    '                "type": "AdaptiveCard",',
                    '                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",',
                    '                "version": "1.5",',
                    '                "body": [',
                    '                  {',
                    '                    "type": "TextBlock",',
                    f'                    "text": "{card_desc_json}",',
                    '                    "wrap": true,',
                    '                    "weight": "Bolder",',
                    '                    "size": "Medium"',
                    '                  }',
                    '                ],',
                    '                "actions": []',
                    '              }',
                ]
                lines.extend(card_json_lines)
            else:
                lines.append(f'    - kind: EndDialog')
                lines.append(f'      id: {node_id}')

    else:
        lines.append('  actions:')
        lines.append('    - kind: SendMessage')
        lines.append('      id: placeholder')
        fallback_msg = f'Topic {topic.name} is ready. Add nodes to define the conversation flow.'
        lines.append(f'      message: {_yaml_safe_value(fallback_msg)}')

    return '\n'.join(lines)


# --- Template Management ---

def load_templates() -> List[Dict[str, Any]]:
    templates = []
    if not TEMPLATES_DIR.exists():
        return templates
    for f in sorted(TEMPLATES_DIR.glob("*.json")):
        try:
            data = json.loads(with_current_models(f.read_text(encoding="utf-8")))
            templates.append(data)
        except Exception as e:
            logger.warning(f"Failed to load template {f.name}: {e}")
    return templates

def get_template(template_id: str) -> Optional[Dict[str, Any]]:
    for t in load_templates():
        if t.get("id") == template_id:
            return t
    return None


# --- Rule 37: extracted as module-level constant to avoid f-string brace conflicts ---
RULE_37 = """
37. **DIRECT EXTERNAL API ARCHITECTURE -- MANDATORY FOR ALL RECIPES**:

    Every Copilot Studio agent recipe calls external APIs DIRECTLY from Power Automate Cloud Flows using HTTP actions. NO recipe routes through IA Suite backend microservices. All API credentials are stored as Power Platform Environment Variables in the Solution, retrieved inside flows using the "Get environment variable" action (Power Platform connector).

    **ENVIRONMENT VARIABLE NAMING CONVENTION** -- publisher prefix `nxth_` in PascalCase:
    - `nxth_AnthropicApiKey` -- Anthropic Claude API key
    - `nxth_GeminiApiKey` -- Google Gemini + Veo API key
    - `nxth_OpenAiApiKey` -- OpenAI Whisper API key
    - `nxth_MiroAccessToken` -- Miro REST API v2 access token
    - `nxth_RedditClientId` -- Reddit OAuth2 App client ID
    - `nxth_RedditClientSecret` -- Reddit OAuth2 App client secret
    - `nxth_RedditUserAgent` -- Reddit User-Agent string (e.g. `script:MarketResearch:1.0 (by /u/your_reddit_username)`)
    - `nxth_ElevenLabsApiKey` -- ElevenLabs TTS API key
    - `nxth_ReplicateApiToken` -- Replicate inference API token

    **MANDATORY ENVIRONMENT VARIABLE SETUP PHASE** (always Phase 4, after Knowledge Sources):
    1. In the Solution, click New -> More -> Environment variable
    2. For each key: Display name (e.g. "Anthropic API Key"), schema name auto-fills as `nxth_AnthropicApiKey`, Data type = Secret, Default value = blank
    3. After saving: click the variable -> "New value" -> paste the actual key value
    4. In Power Automate flows: add "Get environment variable" (Power Platform connector) to retrieve each key at runtime
    5. On every HTTP action using an API key: Settings tab -> turn on "Secure Inputs" and "Secure Outputs"

    **A. ANTHROPIC CLAUDE API (Journey Mapper, Social Research Analytics, Miro Board Generator)**
    - URL: `POST https://api.anthropic.com/v1/messages`
    - Headers: `x-api-key: {outputs('Get_Anthropic_Key')}`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`
    - Journey Mapper model: `OPUS_MODEL_ID` (highest quality; max_tokens 64000)
    - Social Research / Miro analysis model: `SONNET_MODEL_ID` (faster alternative)
    - Body: `{"model": "OPUS_MODEL_ID", "messages": [{"role": "user", "content": "@{variables('varPrompt')}"}], "system": "@{variables('varSystemPrompt')}", "max_tokens": 64000}`
    - Never add temperature, top_p, top_k, a thinking budget, a forced tool_choice or an assistant prefill to a Claude body: current Claude models reject each with HTTP 400 (see RULE 45)
    - Response text extraction: `first(body('HTTP_Claude')?['content'])?['text']`
    - Journey Mapper uses TWO sequential Cloud Flow HTTP calls: Pass 1 extracts journey elements (stages, touchpoints, emotions, pain points) from the uploaded document; Pass 2 takes the Pass 1 JSON output plus original document and synthesizes a complete interactive HTML journey map visualization

    **B. OPENAI WHISPER API (Video Transcription)**
    - URL: `POST https://api.openai.com/v1/audio/transcriptions`
    - Auth header: `Authorization: Bearer @{outputs('Get_OpenAI_Key')}`
    - Request format: multipart/form-data (NOT JSON)
    - Required form fields: `model = whisper-1`, `file = <audio binary>`, `response_format = verbose_json`
    - Optional: `language = en`
    - File constraint: MP3 format, max 20 MB, 16 kHz mono recommended
    - In Power Automate: Use "Send an HTTP request to SharePoint" to get file content, then compose as multipart body
    - Response: `body('HTTP_Whisper')?['text']` for full transcript; `body('HTTP_Whisper')?['segments']` for timestamped segments

    **C. GOOGLE GEMINI IMAGE API (Character Generator, HiC Research)**
    - Model: `gemini-3-pro-image-preview` (NOT Imagen-3, NOT gemini-2.0-flash)
    - URL: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=@{outputs('Get_Gemini_Key')}`
    - Auth: API key in URL query param only -- NO Authorization header
    - Headers: `Content-Type: application/json`
    - Text-to-image body: `{"contents": [{"role": "user", "parts": [{"text": "@{variables('varPrompt')}"}]}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}`
    - Image-to-image (with reference): add before the text part: `{"inlineData": {"data": "@{variables('varBase64Image')}", "mimeType": "image/jpeg"}}`
    - Up to 14 reference images; up to 5 images of humans for character consistency
    - Image response extraction: `body('HTTP_Gemini')?['candidates']?[0]?['content']?['parts']?[1]?['inlineData']?['data']` (base64 PNG)

    **D. GOOGLE GEMINI THINKING API (HiC Research)**
    - Model: `gemini-3-pro-preview` (for extended reasoning + structured JSON output)
    - URL: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=@{outputs('Get_Gemini_Key')}`
    - Body adds thinking config: `"generationConfig": {"thinkingConfig": {"thinkingBudget": 16384}, "responseMimeType": "application/json", "temperature": 0.1}`
    - Use for research synthesis, persona generation, structured analysis output

    **E. GOOGLE VEO VIDEO API (Character Generator)**
    - Model: `veo-3.1-fast-generate-preview`
    - Initiate URL: `POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=@{outputs('Get_Gemini_Key')}`
    - Body: `{"instances": [{"prompt": "@{variables('varVideoPrompt')}"}], "parameters": {"aspectRatio": "16:9", "sampleCount": 1}}`
    - For image-to-video: add `"image": {"bytesBase64Encoded": "@{variables('varBase64Image')}", "mimeType": "image/jpeg"}` inside the instance
    - Initiate response: `body('HTTP_Veo')?['name']` -- this is the operation name (e.g. `operations/abc123`)
    - Poll URL: `GET https://generativelanguage.googleapis.com/v1beta/@{variables('varOperationName')}?key=@{outputs('Get_Gemini_Key')}`
    - Use "Do Until" loop: condition `body('HTTP_Poll')?['done'] == true`, max 60 iterations, Delay 10 seconds between polls
    - Video URI extraction: `body('HTTP_Poll')?['response']?['generateVideoResponse']?['generatedSamples']?[0]?['video']?['uri']`
    - Append `?key=@{outputs('Get_Gemini_Key')}` to the returned URI before storing
    - Constraint: 9:16 portrait aspect ratio only supports 720p resolution (NOT 1080p)

    **F. MIRO REST API v2 (Miro Board Generator)**
    - Base URL: `https://api.miro.com/v2`
    - Auth header: `Authorization: Bearer @{outputs('Get_Miro_Token')}`, `Content-Type: application/json`
    - Create board: `POST https://api.miro.com/v2/boards` -- body: `{"name": "@{variables('varBoardTitle')}", "description": "@{variables('varBoardDesc')}"}`
    - Board ID from response: `body('HTTP_CreateBoard')?['id']`
    - Board URL from response: `body('HTTP_CreateBoard')?['viewLink']`
    - Create sticky note: `POST https://api.miro.com/v2/boards/@{variables('varBoardId')}/sticky_notes`
    - Create shape: `POST https://api.miro.com/v2/boards/@{variables('varBoardId')}/shapes`
    - Create text: `POST https://api.miro.com/v2/boards/@{variables('varBoardId')}/texts`
    - Create connector between two items: `POST https://api.miro.com/v2/boards/@{variables('varBoardId')}/connectors`
    - ARCHITECTURE: First call Claude API to analyze the journey HTML into structured JSON (phases, touchpoints, pain points, opportunities), THEN iterate through the JSON to create Miro objects in sequence

    **G. REDDIT OAUTH2 DIRECT API (Social Data Collector)**
    - IMPORTANT: TrustPilot and Google Play Store have NO official public API (they are web-scraped in the IA service). The Copilot recipe focuses exclusively on Reddit.
    - Step 1 -- Get access token: `POST https://www.reddit.com/api/v1/access_token`
      - Auth: Basic auth header: `Authorization: Basic @{base64(concat(outputs('Get_Reddit_ClientId'), ':', outputs('Get_Reddit_Secret')))}`
      - Body (application/x-www-form-urlencoded): `grant_type=client_credentials`
      - Header: `User-Agent: @{outputs('Get_Reddit_UserAgent')}`
      - Token response: `body('HTTP_RedditToken')?['access_token']`
    - Step 2 -- Fetch posts: `GET https://oauth.reddit.com/r/@{variables('varSubreddit')}/top.json?limit=100&t=month`
      - Headers: `Authorization: Bearer @{variables('varRedditToken')}`, `User-Agent: @{outputs('Get_Reddit_UserAgent')}`
      - Posts: `body('HTTP_RedditPosts')?['data']?['children']` (each item has `data.title`, `data.selftext`, `data.score`, `data.author`, `data.num_comments`, `data.id`)
    - Step 3 -- Fetch comments for a post: `GET https://oauth.reddit.com/r/@{variables('varSubreddit')}/comments/@{variables('varPostId')}.json`
      - Same auth headers
      - Comments: `body('HTTP_RedditComments')?[1]?['data']?['children']` (each has `data.body`, `data.score`, `data.author`)
    - Token expiry: 86400 seconds (24 hours); store token in a variable and reuse within the flow run
""".replace("OPUS_MODEL_ID", RECIPE_MODEL_OPUS).replace("SONNET_MODEL_ID", RECIPE_MODEL_SONNET).replace("HAIKU_MODEL_ID", RECIPE_MODEL_HAIKU)

# --- System Prompt Builder ---

def build_system_prompt() -> str:
    return f"""You are a **Copilot Studio Master Builder** -- the world's most thorough, educational, beginner-friendly recipe generator for Microsoft Copilot Studio agents.

## RULE #1 -- RECIPE STRUCTURE (THIS OVERRIDES EVERYTHING ELSE)

**THE SINGLE MOST IMPORTANT RULE**: Every recipe MUST be organized as a STEP-BY-STEP, PHASE-BY-PHASE sequence where each functional capability is a CONTIGUOUS group of phases. Study the Aria example below -- it NEVER groups all topics into one section then all flows into another. Instead, it builds each capability end-to-end before moving to the next:

- Phase 5: Model Selection **TOPIC** (node-by-node with complete Adaptive Card JSON)
- Phase 6: Multi-Model Reasoning **FLOW** (the flow that Phase 5's topic calls, action-by-action)
- Phase 7: Infographic Generation **FLOW** (next capability's flow, action-by-action)
- Phase 8: Report Generation & Delivery **FLOW** (with human review gate)
- Phase 9: Register all flows as **TOOLS**

**NEVER DO THIS** (WRONG -- groups by component type):
```
Phase 5: Build ALL Topics (Data Collection, Status Check, Export)
Phase 6: Build ALL Flows (Collection Flow, Status Flow, Export Flow)
Phase 7: Register ALL Tools
```

**ALWAYS DO THIS** (CORRECT -- groups by capability):
```
Phase 5: Data Collection Request -- TOPIC BUILD (node-by-node)
Phase 6: Execute Data Collection -- FLOW BUILD (action-by-action)
Phase 7: Execute Data Collection -- TOOL REGISTRATION
Phase 8: Collection Status -- TOPIC BUILD (node-by-node)
Phase 9: Poll Collection Status -- FLOW BUILD (action-by-action)
Phase 10: Poll Collection Status -- TOOL REGISTRATION
Phase 11: Export Results -- TOPIC BUILD (node-by-node)
Phase 12: Generate Export -- FLOW BUILD (action-by-action)
Phase 13: Generate Export -- TOOL REGISTRATION
```

**The user prompt provides a REQUIRED PHASE SEQUENCE at the end.** Follow it EXACTLY. Each phase has an explicit number and title. Do not rearrange, merge, or skip phases.

### REQUIRED HEADING FORMAT FOR EVERY RECIPE

Use this EXACT markdown heading hierarchy throughout the recipe:

```
# PHASE 1: SharePoint Folder Structure
## Step 1.1: Create the Document Library
WHERE AM I?: SharePoint > Site Contents > + New > Document Library
1. Open your browser and navigate to...
2. Click Site Contents in the left navigation...
...
## Step 1.2: Create Subfolders
WHERE AM I?: SharePoint > Document Library > + New > Folder
...

# PHASE 2: Create the Agent
## Step 2.1: Open Copilot Studio and Create a Blank Agent
WHERE AM I?: Copilot Studio > Agents > + Create
...
```

Each phase = one `# PHASE N:` heading.
Each step within a phase = one `## Step N.M:` heading.
Every step starts with a `WHERE AM I?:` breadcrumb showing the UI path.
Instructions are prose-style numbered paragraphs (1, 2, 3...), NOT bullet points.

### REQUIRED CALLOUT FORMAT

Use these EXACT callout labels (plain ASCII, no emojis, no icons):

```
> **VERIFY**: Check that the agent name appears in the top-left corner...

> **WATCH OUT**: If you skip this step, the flow will fail silently...

> **CRITICAL**: This is an architectural decision that cannot be easily undone...

> **BEGINNER TIP**: Dynamic content is like a variable reference...

> **COPY-PASTE** into the Expression field:
> `first(body('HTTP_Claude')?['content'])?['text']`
```

### REQUIRED TABLE FORMAT FOR ACTION STACKS

At the end of every flow phase, include a summary table:

```
| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Get_API_Key | Compose     | outputs('...') |
| 2 | HTTP_Claude | HTTP        | POST to api.anthropic.com |
| 3 | Parse_Response | Compose  | first(body(...)...) |
```

## YOUR AUDIENCE

Your reader is a **complete beginner** who has NEVER opened Copilot Studio, Power Automate, or Power Apps before. They need their hand held at every single step. They do not know what "dynamic content" means, where buttons are located, how expressions work, or what variables do. You must explain EVERYTHING as if teaching someone who has never seen these tools.

## THE GOLD STANDARD: STUDY THIS EXAMPLE

The following is a **49-page, 52-step, 11-phase** definitive build recipe for an Industry Research Agent. This is the EXACT level of detail, writing style, and comprehensiveness your recipes MUST match or exceed. Study every pattern -- especially its PHASE ORGANIZATION where each capability is built end-to-end:

{aria_recipe}

## WHAT MAKES THE EXAMPLE RECIPE EXCEPTIONAL (YOU MUST REPLICATE ALL OF THESE)

### 1. PROSE-STYLE NUMBERED INSTRUCTIONS
The recipe uses clear numbered steps within each phase step, written in natural prose -- not terse bullet points. Each instruction tells the user EXACTLY where to click, what to type, and what to look for. Examples:
- "Open your browser and navigate to https://copilotstudio.microsoft.com"
- "In the left navigation pane, click Agents"
- "Click the Create blank agent button. (If you want to change advanced settings like the solution or schema name, click the small down arrow next to the button and select Advanced create, then click Confirm and create. For most users, just clicking the main button is fine.)"
- "Click the three dots (...) at the top-right of the node, then select Properties"

### 2. COMPLETE AGENT INSTRUCTIONS TEXT
The recipe includes the FULL agent instructions text to paste (within the 8,000 character limit), structured with sections: [PERSONA], [CHAIN-OF-THOUGHT REASONING], [OUTPUT FORMAT], [CONSTRAINTS], [FEW-SHOT EXAMPLE]. The few-shot example inside the instructions includes a COMPLETE JSON output sample with realistic data. You MUST do this for every recipe.

### 3. ENVIRONMENT VARIABLES AND API KEY MANAGEMENT
The recipe dedicates an ENTIRE phase to creating a Power Platform Solution, creating environment variables, and explaining the security trade-offs. It explains Secure Inputs/Secure Outputs on every action that touches a key. You MUST include this pattern for any recipe that involves API keys.

### 4. TOPIC CREATION WITH NODE-BY-NODE DETAIL
The recipe documents topic creation at the individual node level:
- How to add trigger phrases (the exact phrases to type)
- How to add an Adaptive Card question node: "click the three dots (...) -> select Properties -> under Input type, change to Adaptive Card"
- The COMPLETE Adaptive Card JSON -- fully formatted, ready to copy-paste, with no abbreviations
- How to extract the output variable from the card
- How to make a variable global: "Click the variable name in the node (or open the Variables panel from the topic menu bar) -> the Variable properties panel appears on the right -> under Usage, select 'Global (any topic can access)' -> the variable name automatically gets the Global. prefix (e.g., modelChoice becomes Global.modelChoice) -> Save the topic"
- How to set a default value for a global variable in the Conversation Start system topic: add a Set variable value node, select the Global.VarName variable, and for string empty-string values use the Power Fx formula `Text("")`

### 5. FLOW BUILDING WITH EVERY CLICK DOCUMENTED
The recipe documents EVERY action in each Power Automate flow:
- Where to search for the action: "Click + -> Add an action -> search for 'Initialize variable' -> select Initialize variable (under 'Variable' actions)"
- Every field filled in: Name, Type, Value -- with exact values
- For HTTP actions: Method (from dropdown), URI (exact URL), Headers (each one separately -- Key and Value), Body (complete JSON with dynamic content references)
- How to insert dynamic content: "click the dynamic content panel (the lightning bolt icon) and select modelChoice (from the trigger inputs)"
- How to use the Expression tab: "Click the Expression tab (the fx button) and paste: first(body('HTTP_Claude')?['content'])?['text']"
- How to rename actions: "click the three dots (...) -> Rename -> type Get_Anthropic_Key"
- How to secure actions: "Click the three dots (...) on the Compose action -> Settings -> scroll down to Security -> toggle Secure Inputs to On -> toggle Secure Outputs to On -> click Done"
- How to add Switch cases with exact "Equals" values
- The complete HTTP request body with dynamic content placeholders explained

### 6. EXPRESSIONS WITH EXPLANATIONS
Every expression includes context on HOW to enter it and what it does:
- "Click fx (Expression) and paste: first(body('HTTP_Claude')?['content'])?['text']"
- "Expression: concat('https://...key=', outputs('Get_Gemini_Key'))"
- "Expression: body('HTTP_Gemini')?['candidates']?[0]?['content']?['parts']?[0]?['text']"
- "Expression: base64ToBinary(outputs('Extract_Base64_Image'))"

### 7. COMPLETE ADAPTIVE CARD JSON
Copilot Studio uses JSON for Adaptive Cards -- NOT YAML. Every Adaptive Card in the recipe is COMPLETE, ready-to-paste JSON with no abbreviations. Rules:
- Use version "1.5" for Teams-targeted agents (Teams max is v1.5, Web Chat supports v1.6)
- Include "wrap": true on all TextBlock elements for responsive layout
- Interactive cards (collecting user input) MUST use the Adaptive Card node and include a submit button
- Non-interactive cards (displaying info) should use a Message node instead
- For consecutive cards, each MUST have unique identifiers in its submit action data
- Document which input "id" fields create output variables
- For dynamic content, show BOTH static JSON AND explain Power Fx formula mode (warn: one-way conversion)

### 8. TWO METHODS FOR CALLING POWER AUTOMATE FLOWS

**Method A: Tool Registration** (orchestrator auto-calls):
- "On the Overview page, find the Tools section. Click Add a tool."
- "Select Flow -> find the flow -> click Add and configure"
- Configure: Name, Description (for routing), Input mappings, Completion mode

**Method B: Action Node in a Topic** (explicit call):
- In topic editor, "Select the Add node icon -> select Add a tool -> select the flow"
- Map EACH input parameter to topic variables
- After the Action node, add a Message node using flow output variables

**PRIORITY RULE**: When a topic collects specific inputs and needs the flow result for the next message, use Method B. Use Method A when the orchestrator should decide autonomously.

**FLOW REQUIREMENTS FOR AGENT USE**:
- Trigger: "When an agent calls the flow"
- Response: "Respond to the agent"
- Async response: OFF (Settings -> Networking on the Respond action)
- Must respond within 100 seconds
- Must be in a solution in the same Power Platform environment
- Supported parameter types: Number, String, Boolean ONLY
- Max 1 MB data from flow to agent per action

**RECIPE REQUIREMENT**: For EVERY flow, document:
1. How to build the flow action by action
2. How to call it (Tool registration OR Action node with variable mapping)
3. Input parameters (name + type) and output parameters (name + type)
4. Async toggle OFF
5. How to test (Test -> Manual -> Run flow)

### 9. MCP SERVER INTEGRATION (WHEN APPLICABLE)

When a recipe includes MCP tools, document:
1. Tools page -> Add a tool -> MCP Server -> enter URL
2. Review discovered tools (descriptions are server-defined, not editable)
3. Save to register all server tools

**MCP Decision**: Use MCP when 5+ related tools exist on one server. Use Agent Flows when 1-3 API calls needed or for beginners. Always present Agent Flows as simpler primary approach.

**MCP Constraints**: Preview status, whole-server governance, public HTTPS required, 100s timeout, 1 MB limit, server handles auth.

### 10. TOOL REGISTRATION
Show EXACTLY how to register each flow as a tool -- tool description crafted for orchestrator routing, input/output mappings, completion mode.

## MANDATORY PHASE ORDERING PATTERN

**INFRASTRUCTURE PHASES (always first):**
1. **SharePoint/Storage Setup** -- Document libraries, folder structure, permissions
2. **Agent Creation & Configuration** -- Create agent, orchestration mode, COMPLETE Agent Instructions, system topics (Conversation Start, Fallback, On Error, End of Conversation)
3. **Knowledge Sources** -- Add each source with Name and detailed Description, set strictness
4. **Environment Variables & Security** -- Power Platform Solution, each variable, Secure Inputs/Outputs, Key Vault path

**CAPABILITY PHASES (middle -- one contiguous group per functional capability):**

Phase N: **[Capability Name] -- Topic Build**
- Create topic, set name/description, add trigger phrases
- Build EVERY node in order: Message, Question, Adaptive Card (COMPLETE JSON), Action (Call a flow with variable mapping), Condition, Redirect
- Document EVERY variable: name, type, scope, how to make global
- Include complete YAML code block at the end

Phase N+1: **[Flow Name] -- Flow Build**
- Create flow, configure trigger with input parameters
- Build EVERY action individually with full detail
- HTTP actions: method, URI, headers, body, timeout PT120S
- Expressions: fx tab instructions with plain-English explanation
- Respond to Agent with output parameters
- Async toggle OFF, action stack summary table, how to test

Phase N+2: **[Flow Name] -- Tool Registration**
- Register as agent tool with description, input/output mappings, completion mode
- If also called from topic: document BOTH Method A and Method B

**Repeat for each capability. Keep each capability's phases CONTIGUOUS.**

**CROSS-CUTTING PHASES (always last):**
- Shared/utility flows, MCP server setup (if applicable), automatic triggers
- Publish and deploy to Teams/Email
- Testing (5+ specific scenarios)
- Troubleshooting (8-12 symptom -> resolution pairs)
- Architecture summary (ASCII diagram), credit estimate, verification checklist (15+ items)

## PLATFORM CONSTRAINTS (Must be respected in all recipes)

{platform_landscape}

## ABSOLUTE RULES FOR EVERY RECIPE

1. **Match the example recipe's style** -- prose-style numbered instructions, not terse bullet points
2. **EVERY step tells the user where to click, what to type, and what to look for**
3. **Include the FULL agent instructions text** with [PERSONA], [CHAIN-OF-THOUGHT], [OUTPUT FORMAT], [CONSTRAINTS], [FEW-SHOT EXAMPLE]
4. **Dedicate a full phase to API key/environment variable setup** when external APIs are used
5. **Document EVERY flow action individually** -- search for it, every field, every expression, rename, secure
6. **Every expression MUST include**: which field, lightning bolt vs fx tab, plain-English explanation
7. **Every Adaptive Card MUST be COMPLETE JSON** -- never abbreviated, never truncated
8. **Every topic MUST be documented node-by-node**
9. **Every variable MUST be documented**: name, type, scope, how to make global
10. **Every tool registration MUST include**: description for orchestrator, input/output mappings, completion mode
11. **For flows called from topics via Action nodes**: document EVERY input/output mapping
12. **Prioritize calling flows from Action nodes** when the topic collects specific inputs
13. **For MCP tools**: document server URL, discovered tools, deployment. Always present Agent Flows as simpler alternative
14. **Include a comprehensive testing phase** with 5+ specific test scenarios
15. **Include a troubleshooting table** with 8-12 symptom -> resolution pairs
16. **Include an architecture summary** with ASCII diagram and data flow
17. **Never abbreviate** -- never use "etc.", "similar to above", "repeat for each"
18. **Use Adaptive Card v1.5** for Teams (Web Chat supports v1.6, Omnichannel limited to v1.5)
19. **Set HTTP timeouts to PT120S**
20. **Reference NXT Humans brand**: Dark #0D0D0D, Chartreuse #B8B800, Cyan #00B7C3
21. **Target 40-55 steps across 8-12 phases** for complex agents
22. **Every phase opens with a sentence explaining WHY** it is necessary
23. **For complex flows, document EACH Switch case separately** -- never say "repeat for GPT"
24. **FOLLOW THE REQUIRED PHASE SEQUENCE** from the user prompt exactly -- do not rearrange, merge, or skip phases
25. **EVERY topic phase MUST include a complete YAML code block** at the END, inside a fenced `yaml` block. Rules:
    - ALWAYS use `kind: OnRecognizedIntent` (Custom Topic). NEVER use `kind: OnUnknownIntent` (System Topic -- cannot be deleted)
    - Include `triggerQueries:` with 5-10 varied phrases even with generative orchestration
    - Use `kind: SendMessage` with `message:` for text (NOT `SendActivity` with `activity:`)
    - Use exact PascalCase entity names: `StringPrebuiltEntity`, `NumberPrebuiltEntity`, `BooleanPrebuiltEntity`, etc.
    - For choice entities: `kind: EmbeddedEntity` with `kind: ClosedListEntity` and `smartMatchingEnabled: true`
    - NEVER use `InvokeFlowAction` -- emit a `SendMessage` placeholder instead
    - ALL string values with colons or special chars MUST be double-quoted
    - Label: **YAML -- Paste into Code Editor (... > Open code editor)**
26. **ORCHESTRATION MODE**: Every recipe MUST explain the choice in the Agent Creation phase:
    - Generative (default): Topics selected by description, tools called autonomously, knowledge searched proactively
    - Classic: Topics by trigger phrase matching, tools only from Action nodes, knowledge as fallback
    - Document how to configure: Settings -> Generative AI -> Orchestration -> Yes/No
    - Include comparison note explaining why the chosen mode fits this agent
27. **VOICE AGENTS** (when description mentions IVR/phone/voice): Short Message nodes, no Adaptive Cards for voice, DTMF options, Dynamics 365 Contact Center license note
28. **ADAPTIVE CARDS ARE JSON, NOT YAML**: Show complete JSON, mention built-in designer and adaptivecards.io, document reprompt behavior and topic switching
29. **BREVITY IN DESCRIPTIONS**: Topic descriptions under 150 words, tool descriptions under 50 words. Explain what it DOES and does NOT do
30. **2000-CHARACTER RESPONSE LIMIT**: Use knowledge source pattern for long content. Return JSON for structured data
31. **USE CLOUD FLOWS FOR HTTP**: Built-in HTTP action only supports delegated permissions. Use Cloud Flow with HTTP connector for app-level auth
32. **SERVICE ACCOUNT PATTERN**: Recommend dedicated service account for flow connections. Agent is run-only user
33. **CHANNEL DEPLOYMENT WARNING**: Knowledge source responses may differ in deployed channels vs test chat
34. **ENTITY DEFINITION ORDER**: Define custom entities BEFORE building topics to enable slot filling
35. **NO EMOJIS ANYWHERE**: NEVER include emoji characters in ANY output. Use only plain ASCII text everywhere. This applies to YAML, Adaptive Card JSON, recipe prose, code blocks, descriptions, and comments without exception
36. **COPILOT STUDIO VARIABLE MANAGEMENT -- OFFICIAL RULES (from Microsoft docs)**:

    **EMPTY STRING FORMULA**: The ONLY correct way to set a string variable to empty in a Copilot Studio Set variable value node is using the Power Fx formula `Text("")`. NEVER tell the user to "leave it blank" -- the To value field cannot be empty; Copilot Studio shows "Variable selection is missing". Instruct: "In the To value field, click the formula icon (ƒx), type `Text("")` and click Done." Exception: Power Automate "Initialize variable" flow actions DO accept a blank Value field for string types.

    **MAKING A VARIABLE GLOBAL -- CORRECT STEPS**:
    1. Select the variable in any node (click on its name) -- OR -- click the Variables button on the topic's menu bar to open the Variables panel, then click the variable
    2. The Variable properties panel opens on the right side
    3. Under Usage, select "Global (any topic can access)"
    4. The variable name AUTOMATICALLY gets the `Global.` prefix (e.g., JobId becomes Global.JobId)
    5. Save the topic
    NEVER say "toggle 'Global variable' to On" -- that is not the correct UI text. The correct UI text is "Global (any topic can access)".

    **VARIABLE SCOPES**: Topic variables (default, topic-only), Global variables (Global. prefix, all topics, persists per session), System variables (System.User.DisplayName etc.), Environment variables (read-only, from Power Platform).

    **CREATING A NEW GLOBAL VARIABLE IN A SET VARIABLE VALUE NODE**:
    1. Click the box under "Set variable" -> select "Create a new variable"
    2. The new variable appears with a default name (e.g., Var1) and type Unknown
    3. Click the variable name -> Variable properties panel opens
    4. Under Variable name, type the desired name WITHOUT the Global. prefix (e.g., JobId)
    5. Under Usage, select "Global (any topic can access)" -> name becomes Global.JobId automatically
    6. For the To value field, assign using: a literal value, an existing variable, or a Power Fx formula

    **CONVERSATION START INITIALIZATION PATTERN**: Add Set variable value nodes in the Conversation Start system topic to initialize global variables. For empty string: use `Text("")`. For a string literal: type the value directly (e.g., idle). Alternatively, use the Clear variable values node to reset ALL global variables to blank at session start.

    **VARIABLE TYPES**: String, Boolean, Number, Table, Record, DateTime, Choice, Blank. Type is fixed after first assignment. Use Power Fx formulas for complex types (Table, Record).

    **RECEIVE/RETURN BETWEEN TOPICS**: In the Variable properties panel, you can also set "Receive values from other topics" (allows a Redirect node to pass a value in) or "Return values to original topics" (passes the value back when topic completes). Document this when topics redirect to each other.

{RULE_37}

RULE 38: POWER AUTOMATE 4-STEP ESCAPE CHAIN (MANDATORY)
    Every prompt variable that gets embedded inside an HTTP action's JSON body MUST be escaped with this exact 4-step chain BEFORE being placed into a concat() expression:
    ```
    replace(
      replace(
        replace(
          replace(
            outputs('Your_Action_Name'),
            '\\', '\\\\'
          ),
          '"', '\\"'
        ),
        decodeUriComponent('%0A'), '\\n'
      ),
      decodeUriComponent('%0D'), ''
    )
    ```
    - Step 1: Escape backslashes (must be first to avoid double-escaping)
    - Step 2: Escape double quotes
    - Step 3: Replace newlines (LF) with literal \\n
    - Step 4: Strip carriage returns (CR)
    Place each escape chain in its own Compose action (e.g., "Escape_System_Prompt", "Escape_User_Prompt") so the escaped outputs can be referenced cleanly in the concat() body.
    NEVER skip this chain. Unescaped prompts break the JSON body and cause 400 errors from the API.

RULE 39: CONCAT() BODY CONSTRUCTION PATTERN (CANONICAL)
    Use concat() to build HTTP JSON bodies. This is the ONE correct pattern -- never offer alternatives:
    ```
    concat(
      '{{"model":"{RECIPE_MODEL_OPUS}","max_tokens":64000,"system":"',
      outputs('Escape_System_Prompt'),
      '","messages":[{{"role":"user","content":"',
      outputs('Escape_User_Prompt'),
      '"}}]}}'
    )
    ```
    - All literal JSON braces must be doubled: {{ and }}
    - All literal quotes inside the JSON string must be escaped: \\"
    - Reference only Compose outputs that have been through the RULE 38 escape chain
    - Never add temperature, top_p or top_k to the body (RULE 45)
    - For tool-use bodies (e.g., web_search), extend the pattern: add the tools array as a literal string segment
    - NEVER suggest a "lightning bolt" approach or "expression builder" as an alternative

RULE 40: POWER AUTOMATE ACTION NAMING CONVENTION
    Display names with spaces become internal names with underscores automatically.
    Example: display name "Research User Prompt 1" -> internal name `Research_User_Prompt_1`
    When writing outputs() or body() references, ALWAYS use the underscore version.
    Common mistake: `outputs('Research User Prompt 1')` -- this FAILS silently.
    Correct: `outputs('Research_User_Prompt_1')`
    In recipe instructions, always show BOTH the display name and the internal reference name so builders can verify.

RULE 41: EXPRESSION LENGTH LIMIT AND HTTP TIMEOUT
    - Power Automate expressions have an 8,192-character hard limit. If a concat() body exceeds this, split the construction across multiple Compose actions and nest them.
    - HTTP actions have a 120-second synchronous timeout (PT120S). For API calls that may exceed this (e.g., Claude with max_tokens 64000), instruct builders to set: Settings tab -> Timeout -> PT120S. If processing still exceeds 120s, split into sequential API calls with intermediate storage in variables.

RULE 42: NO HEDGING, NO PLACEHOLDERS, COMPLETE IMPLEMENTATIONS ONLY
    - NEVER use phrases like "simplified version", "for brevity", "in production you would", "too complex to show here", or offer "alternative approaches" that are less complete.
    - NEVER leave [ACTION], [TODO], [PLACEHOLDER], or similar markers in the final recipe. Every step must be fully specified with exact action types, exact expression syntax, and exact configuration values.
    - If a Cloud Flow action requires a GUID (like InvokeFlowAction), use a SendMessage placeholder that tells the builder exactly which flow to connect, with the exact input/output schema. Do NOT use a fake GUID.
    - Every recipe must be buildable end-to-end by a Power Platform developer following only the recipe instructions, with zero guesswork.

RULE 43: TRIGGER INPUT PLANNING AND NAMED REFERENCES
    - Before building any Cloud Flow actions, explicitly list ALL trigger inputs the flow will receive (name, type, description) in a planning section.
    - Use named trigger references: `triggerBody()?['your_input_name']` -- NEVER use positional references like `triggerBody()?['text']` or `triggerBody()?['text_1']` as these are fragile and break when inputs are reordered.
    - For Copilot topics that send data to a Cloud Flow via an action node, the trigger input names must exactly match the variable names passed from the topic.

RULE 44: RESPONSE CONTENT EXTRACTION PATTERNS
    - Standard Claude API response (no tools): `first(body('HTTP_Action_Name')?['content'])?['text']`
    - Claude API with tool use (e.g., web_search): `last(body('HTTP_Action_Name')?['content'])?['text']` -- tool results appear first in content array, text response is last
    - Null-safe fallback: `coalesce(first(body('HTTP_Action_Name')?['content'])?['text'], 'No response received')`
    - web_search tool declaration in body: `"tools":[{{"type":"web_search_20250305","name":"web_search","max_uses":8}}]`
    - Always specify which extraction pattern to use based on whether the API call includes tools or not

{rule_45_model_ids()}"""


# --- API Endpoints ---

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "copilot-recipe-generator",
        "templates_loaded": len(load_templates()),
        "knowledge_loaded": bool(platform_landscape and aria_recipe),
        "models": {"opus": RECIPE_MODEL_OPUS, "sonnet": RECIPE_MODEL_SONNET,
                   "haiku": RECIPE_MODEL_HAIKU, "source": MODEL_SOURCE},
    }


@app.get("/api/templates")
async def list_templates():
    templates = load_templates()
    summaries = []
    for t in templates:
        summaries.append({
            "id": t["id"],
            "name": t["name"],
            "description": t["description"],
            "replicates_service": t.get("replicates_service", ""),
            "icon": t.get("icon", "fas fa-robot"),
            "estimated_build_time": t.get("estimated_build_time", "6-10 hours"),
            "complexity": t.get("complexity", "intermediate"),
            "thumbnail": t.get("thumbnail", ""),
        })
    return {"templates": summaries}


@app.get("/api/templates/{template_id}")
async def get_template_detail(template_id: str):
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return template


@app.post("/api/generate-recipe")
async def generate_recipe(req: RecipeRequest):
    # Check for pre-generated recipe when template_id is provided
    if req.template_id:
        recipe_path = TEMPLATES_DIR / "recipes" / f"{req.template_id}.md"
        if recipe_path.exists():
            recipe_content = with_current_models(recipe_path.read_text(encoding="utf-8"))
            if recipe_content.strip():
                logger.info(f"Serving pre-generated recipe for template '{req.template_id}' ({len(recipe_content)} chars)")

                import asyncio

                async def stream_pregenerated():
                    # Stream pre-generated content in chunks to simulate real-time generation
                    chunk_size = 80  # ~80 chars per chunk for smooth streaming
                    for i in range(0, len(recipe_content), chunk_size):
                        chunk = recipe_content[i:i + chunk_size]
                        yield f"data: {json.dumps({'type': 'content', 'text': chunk})}\n\n"
                        await asyncio.sleep(0.008)  # Small delay for smooth rendering
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"

                return StreamingResponse(
                    stream_pregenerated(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no",
                    },
                )

    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    user_prompt = build_user_prompt(req)
    system_prompt = build_system_prompt()

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    async def stream_recipe():
        try:
            async with client.messages.stream(
                model=MODEL,
                # No temperature/top_p/top_k: the Claude 5.x family rejects them with HTTP 400. Thinking is
                # always on for this family and shares max_tokens, so the budget is the 128K output cap
                # (streaming, so the size is safe) to leave room for a full-length recipe.
                max_tokens=128000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'content', 'text': text})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"Recipe generation error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_recipe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/topic-yaml")
async def generate_yaml(req: TopicYamlRequest):
    """Generate Copilot Studio YAML for a single topic."""
    try:
        yaml_output = generate_topic_yaml(req.topic)
        return JSONResponse({
            "yaml": yaml_output,
            "topic_name": req.topic.name,
            "node_count": len(req.topic.nodes),
        })
    except Exception as e:
        logger.error(f"YAML generation error: {e}")
        raise HTTPException(status_code=500, detail=f"YAML generation failed: {str(e)}")


@app.post("/api/export")
async def export_recipe(req: ExportRequest):
    if req.format == "html":
        html = convert_to_branded_html(req.recipe_content, req.agent_name)
        return JSONResponse({"html": html, "filename": f"{req.agent_name.replace(' ', '_')}_recipe.html"})
    else:
        return JSONResponse({
            "content": req.recipe_content,
            "filename": f"{req.agent_name.replace(' ', '_')}_recipe.md"
        })


@app.get("/api/entities")
async def list_entity_files():
    """List all available entity .txt files for download."""
    entities_dir = STATIC_DIR / "entities"
    if not entities_dir.exists():
        return JSONResponse({"files": []})
    files = []
    for f in sorted(entities_dir.glob("*.txt")):
        content = f.read_text(encoding="utf-8").strip()
        lines = [l for l in content.split('\n') if l.strip()]
        files.append({
            "filename": f.name,
            "entry_count": len(lines),
            "download_url": f"/static/entities/{f.name}"
        })
    return JSONResponse({"files": files})


@app.get("/api/entities/{template_id}")
async def list_template_entity_files(template_id: str):
    """List entity files for a specific template based on its entity_definitions."""
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    if not template_path.exists():
        return JSONResponse({"error": "Template not found"}, status_code=404)
    import json as _json
    data = _json.loads(template_path.read_text(encoding="utf-8"))
    entity_defs = data.get("prefilled", {}).get("entity_definitions", [])
    result = []
    for edef in entity_defs:
        filepath = STATIC_DIR / "entities" / edef.get("entity_file", "")
        entry_count = 0
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8").strip()
            entry_count = len([l for l in content.split('\n') if l.strip()])
        result.append({
            "entity_name": edef.get("entity_name", ""),
            "entity_file": edef.get("entity_file", ""),
            "description": edef.get("description", ""),
            "used_in_topics": edef.get("used_in_topics", []),
            "entry_count": entry_count,
            "download_url": f"/static/entities/{edef.get('entity_file', '')}"
        })
    return JSONResponse({"template_id": template_id, "entity_definitions": result})


@app.get("/api/triggers")
async def list_trigger_files():
    """List all available trigger phrase .txt files."""
    triggers_dir = STATIC_DIR / "triggers"
    if not triggers_dir.exists():
        return JSONResponse({"files": []})
    files = []
    for f in sorted(triggers_dir.glob("*.txt")):
        content = f.read_text(encoding="utf-8").strip()
        lines = [l for l in content.split('\n') if l.strip()]
        files.append({
            "filename": f.name,
            "phrase_count": len(lines),
            "download_url": f"/static/triggers/{f.name}"
        })
    return JSONResponse({"files": files})


# --- Prompt Builder ---

def _append_flow_detail(sections: list, f, fi: int, parent_topic_name: str = None):
    """Append detailed flow documentation to sections list."""
    sections.append(f"\n##### Flow {fi}: `{f.name}`")
    sections.append(f"- **Flow Type:** {f.flow_type}")
    sections.append(f"- **Call Method:** {f.call_method}")
    if f.call_method in ('Agent-level tool', 'Both'):
        sections.append(f"  -> Register as agent-level tool on Tools page with description crafted for orchestrator routing")
    if f.call_method in ('Topic-level tool', 'Both'):
        topic_ref = f" in the `{parent_topic_name}` topic" if parent_topic_name else " in the relevant topic"
        sections.append(f"  -> Add as Action node{topic_ref}, map EVERY input/output variable explicitly")
    sections.append(f"- **Trigger:** {f.trigger_type}")
    if f.description:
        sections.append(f"- **Description (for orchestrator routing):** {f.description}")
    if f.input_params:
        sections.append(f"- **Input Parameters (document EACH -- name, type, source variable, how to map from topic variable or dynamic content):**")
        for p in f.input_params:
            desc = f" -- {p.description}" if p.description else ""
            sections.append(f"  - `{p.name}` ({p.type}){desc}")
    if f.output_params:
        sections.append(f"- **Output Parameters (document EACH -- name, type, how to use in subsequent Message node via lightning bolt dynamic content):**")
        for p in f.output_params:
            desc = f" -- {p.description}" if p.description else ""
            sections.append(f"  - `{p.name}` ({p.type}){desc}")
    if f.actions_description:
        sections.append(f"- **Action Stack (document EVERY action individually -- action number, action type, renamed name, every field, every expression with fx/lightning bolt instructions, every dynamic content reference):**")
        sections.append(f"  {f.actions_description}")
    sections.append(f"- **Async Respond Pattern:** {'Yes -- Respond to Agent first, then long-running actions (up to 30 days)' if f.use_async_pattern else 'No -- must respond within 100 seconds synchronously'}")
    if f.flow_type == "Agent Flow":
        sections.append(f"- **Asynchronous Response Toggle:** Set to OFF (Respond to agent -> Settings -> Networking)")
        sections.append(f"- **Testing:** After publishing, test from Designer -> Test -> Manual -> Run flow")
    if f.http_endpoints:
        sections.append("- **HTTP Endpoints (document EACH -- method, URI, all headers Key+Value, complete body JSON, timeout PT120S, retry policy):**")
        for ep in f.http_endpoints:
            sections.append(f"  - `{ep.get('method', 'POST')} {ep.get('url', '')}`: {ep.get('description', '')}")


def _append_tool_detail(sections: list, tool):
    """Append non-MCP tool registration detail."""
    sections.append(f"\n- **Tool: `{tool.name}`** ({tool.tool_type})")
    if tool.description:
        sections.append(f"  Description: {tool.description}")
    if tool.inputs:
        sections.append("  Inputs:")
        for inp in tool.inputs:
            sections.append(f"    - `{inp.get('name', '')}` ({inp.get('type', 'Text')})")
    if tool.outputs:
        sections.append("  Outputs:")
        for out in tool.outputs:
            sections.append(f"    - `{out.get('name', '')}` ({out.get('type', 'Text')})")


def _append_mcp_tool_detail(sections: list, tool):
    """Append MCP-specific tool detail."""
    sections.append(f"\n#### MCP Tool: `{tool.name}`")
    if tool.mcp_server_url:
        sections.append(f"- **MCP Server URL:** `{tool.mcp_server_url}`")
    if tool.mcp_server_description:
        sections.append(f"- **Server Description:** {tool.mcp_server_description}")
    if tool.description:
        sections.append(f"- **Tool Description (from server):** {tool.description}")
    if tool.mcp_is_advanced_alternative:
        sections.append(f"- **WARNING: ADVANCED ALTERNATIVE**: This MCP server is an advanced alternative. The recipe MUST ALSO document the simpler Agent Flow approach (HTTP connector wrapping the same API endpoints) as the PRIMARY recommendation for beginners. Document the MCP approach as an 'Advanced: MCP Alternative' section at the end of the relevant capability.")
    else:
        sections.append(f"- Document full MCP server connection: Tools page -> Add a tool -> MCP Server -> enter server URL -> review discovered tools -> Save")
    if tool.inputs:
        sections.append("- **Inputs (server-defined):**")
        for inp in tool.inputs:
            sections.append(f"  - `{inp.get('name', '')}` ({inp.get('type', 'Text')})")
    if tool.outputs:
        sections.append("- **Outputs (server-defined):**")
        for out in tool.outputs:
            sections.append(f"  - `{out.get('name', '')}` ({out.get('type', 'Text')})")
    sections.append("- **MCP Constraints**: 100s timeout, 1 MB response limit, whole-server governance, server-defined descriptions (cannot edit), preview status")


def build_user_prompt(req: RecipeRequest) -> str:
    # ===============================================================
    # DESCRIPTION-ONLY MODE: When the user provides just a name and
    # description (no structured topics, flows, tools, etc.), Claude
    # must design the entire agent architecture from the description.
    #
    # ALSO used for pre-built templates: When template_id is set AND
    # agent_description is present, route through description-only
    # path so template recipes match "Start from Scratch" output format
    # identically (same TOC structure, same phase layout, same detail).
    # ===============================================================
    has_structured_input = bool(req.topics or req.flows or req.tools or req.knowledge_sources or req.triggers or req.environment_variables)

    # Templates with comprehensive descriptions use description-only path
    # to produce identical output format as "Start from Scratch"
    if req.template_id and req.agent_description:
        return _build_description_only_prompt(req)

    if not has_structured_input and req.agent_description:
        return _build_description_only_prompt(req)

    return _build_structured_prompt(req)


def _build_description_only_prompt(req: RecipeRequest) -> str:
    """Build a prompt for description-only (Start from Scratch) requests."""
    return f"""# Agent Recipe Request -- Design from Description

## Agent Name: `{req.agent_name}`

## User's Description of What the Agent Should Do:

{req.agent_description}

---

## YOUR TASK: FULL ARCHITECTURE DESIGN + COMPLETE BUILD RECIPE

The user has provided ONLY a description of what they want their Copilot Studio agent to do. You must:

1. **ANALYZE** the description to identify all functional capabilities (each becomes a topic + flow group)

2. **DESIGN** the complete agent architecture -- all topics, flows, tools, knowledge sources, environment variables

3. **BUILD A PHASE SEQUENCE** following this mandatory pattern (assign concrete phase numbers):
   - Infrastructure phases FIRST: SharePoint setup, Agent creation, Knowledge sources, Environment variables
   - Capability phases MIDDLE: For EACH capability, build Topic -> Flow -> Tool Registration as CONTIGUOUS phases
   - Cross-cutting phases LAST: Triggers, Publishing, Testing, Troubleshooting, Architecture Summary

4. **GENERATE** the complete build recipe following the phase sequence, with EVERY phase as a `# PHASE N:` heading and EVERY step as a `## Step N.M:` heading with `WHERE AM I?:` breadcrumbs

**CRITICAL STRUCTURE RULE**: NEVER group all topics together then all flows together. ALWAYS build each capability end-to-end:
```
# PHASE 5: [Capability 1] -- TOPIC BUILD (node-by-node)
# PHASE 6: [Capability 1's Flow] -- FLOW BUILD (action-by-action)
# PHASE 7: [Capability 1's Flow] -- TOOL REGISTRATION
# PHASE 8: [Capability 2] -- TOPIC BUILD (node-by-node)
# PHASE 9: [Capability 2's Flow] -- FLOW BUILD (action-by-action)
# PHASE 10: [Capability 2's Flow] -- TOOL REGISTRATION
```

**Architecture decisions** (make smart choices):
- Orchestration mode: Generative (default) or Classic. Explain your choice
- Agent Flows vs Cloud Flows: Prefer Agent Flows for simplicity, Cloud Flows for HTTP
- Which APIs to call and how to structure HTTP actions
- What Adaptive Cards to design for user interaction
- Voice/IVR: If description mentions phone/voice/IVR, design for voice (short messages, no cards, DTMF)

**YAML SAFETY RULES**:
- ALWAYS use `kind: OnRecognizedIntent` (Custom Topic). NEVER `kind: OnUnknownIntent` (System Topic)
- Use `kind: SendMessage` with `message:` for text. NEVER `SendActivity` with `activity:` for text
- NEVER use `InvokeFlowAction` -- use `SendMessage` placeholder instead
- Exact PascalCase entity names: `StringPrebuiltEntity`, `NumberPrebuiltEntity`, etc.
- For choice entities: `kind: EmbeddedEntity` with `kind: ClosedListEntity`
- Define custom entities BEFORE building topics (enables slot filling)
- NO EMOJIS ANYWHERE -- plain ASCII text only in all output
- ALL string values with colons or special chars MUST be double-quoted

**Configuration defaults**:
- Orchestration Mode: Generative (unless description implies rigid control)
- Orchestration Model: {req.orchestration_model}
- Authentication: {req.auth_mode}
- General Knowledge: {'Disabled' if req.disable_general_knowledge else 'Enabled'}
- Delivery Channels: {', '.join(req.delivery_channels)}

Generate the complete recipe now. Do not summarize, abbreviate, or skip sections. The user's career depends on getting this right."""


def _build_structured_prompt(req: RecipeRequest) -> str:
    """Build a prompt for structured (wizard) requests with explicit topics/flows/tools."""
    sections = []

    # ===============================================================
    # SECTION 1: Agent Identity
    # ===============================================================
    sections.append("# Agent Recipe Request\n")
    sections.append(f"## Agent Identity\n- **Agent Name:** `{req.agent_name}`")
    if req.agent_description:
        sections.append(f"- **Description:** {req.agent_description}")
    if req.persona_instructions:
        sections.append(f"- **Persona Instructions:** {req.persona_instructions}")

    # ===============================================================
    # SECTION 2: Configuration
    # ===============================================================
    sections.append(f"\n## Configuration")
    sections.append(f"- **Orchestration Model:** {req.orchestration_model}")
    sections.append(f"- **Authentication:** {req.auth_mode}")
    sections.append(f"- **General Knowledge:** {'Disabled' if req.disable_general_knowledge else 'Enabled'}")
    if req.sharepoint_site_url:
        sections.append(f"- **SharePoint Site URL:** `{req.sharepoint_site_url}`")
    if req.sharepoint_folders:
        sections.append(f"- **SharePoint Folder Structure:**\n```\n{req.sharepoint_folders}\n```")

    # ===============================================================
    # SECTION 3: Knowledge Sources (infrastructure -- documented early)
    # ===============================================================
    if req.knowledge_sources:
        sections.append(f"\n## Knowledge Sources ({len(req.knowledge_sources)} defined)")
        sections.append("Document in an infrastructure phase: add each source, set Name, write detailed Description (critical for retrieval quality), set strictness to High.")
        for i, ks in enumerate(req.knowledge_sources, 1):
            sections.append(f"\n### Source {i}: `{ks.name or ks.source_type}`")
            sections.append(f"- **Type:** {ks.source_type}")
            sections.append(f"- **Path/URL:** `{ks.path_or_url}`")
            if ks.description:
                sections.append(f"- **Description:** {ks.description}")

    # ===============================================================
    # SECTION 4: Environment Variables (infrastructure -- documented early)
    # ===============================================================
    if req.environment_variables:
        sections.append(f"\n## Environment Variables ({len(req.environment_variables)} defined)")
        sections.append("Dedicate a FULL infrastructure phase to creating a Power Platform Solution with these environment variables. For EACH secret variable, explain Secure Inputs/Outputs on every action that references it, and document the Azure Key Vault migration path.")
        for i, ev in enumerate(req.environment_variables, 1):
            secret_str = " **[SECRET -- requires Secure Inputs/Outputs]**" if ev.is_secret else ""
            sections.append(f"- `{ev.display_name}` ({ev.data_type}): {ev.purpose}{secret_str}")

    # ===============================================================
    # SECTION 5: FUNCTIONAL CAPABILITIES (core organizational structure)
    # Group each topic with its associated flows and tools
    # ===============================================================

    # Build lookup maps
    flow_by_name = {f.name: f for f in req.flows}
    flow_by_name_lower = {f.name.lower(): f.name for f in req.flows}
    tool_by_name = {t.name: t for t in req.tools}

    claimed_flow_names = set()
    claimed_tool_names = set()

    capabilities = []

    if req.topics:
        for topic in req.topics:
            # Collect flow references from topic Action nodes (via flow_name field)
            referenced_flow_names = set()
            for node in topic.nodes:
                if node.flow_name:
                    # Exact match
                    if node.flow_name in flow_by_name:
                        referenced_flow_names.add(node.flow_name)
                    # Case-insensitive fallback
                    elif node.flow_name.lower() in flow_by_name_lower:
                        referenced_flow_names.add(flow_by_name_lower[node.flow_name.lower()])

            # Collect matching tools (tools whose name matches a referenced flow)
            referenced_tool_names = set()
            for fn in referenced_flow_names:
                if fn in tool_by_name:
                    referenced_tool_names.add(fn)

            capabilities.append({
                'topic': topic,
                'flows': [flow_by_name[fn] for fn in referenced_flow_names],
                'tools': [tool_by_name[tn] for tn in referenced_tool_names],
            })
            claimed_flow_names.update(referenced_flow_names)
            claimed_tool_names.update(referenced_tool_names)

    # Identify orphan flows and tools (not claimed by any topic)
    orphan_flows = [f for f in req.flows if f.name not in claimed_flow_names]
    orphan_tools = [t for t in req.tools if t.name not in claimed_tool_names]

    # --- Output capabilities ---
    if capabilities or orphan_flows or req.topics:
        sections.append(f"\n---")
        sections.append(f"\n## FUNCTIONAL CAPABILITIES")
        sections.append(f"**CRITICAL ORGANIZATION RULE**: Each capability below groups a topic with its associated flows and tools. In the recipe, each capability MUST be documented as a **contiguous sequence of phases**: first the topic (node-by-node), then immediately its associated flow(s) (action-by-action), then tool registration for those flows. **NEVER separate a topic from its flows into different parts of the recipe.**")

        for ci, cap in enumerate(capabilities, 1):
            topic = cap['topic']
            flows = cap['flows']
            tools = cap['tools']

            sections.append(f"\n### --------------------------------------------------")
            sections.append(f"### CAPABILITY {ci}: {topic.name}")
            sections.append(f"### --------------------------------------------------")

            # --- Topic detail ---
            sections.append(f"\n#### TOPIC: `{topic.name}`")
            sections.append(f"- **Description (for orchestrator routing):** {topic.description}")
            if topic.trigger_phrases:
                sections.append(f"- **Trigger phrases:** {topic.trigger_phrases}")
            if topic.nodes:
                sections.append(f"- **Node count:** {len(topic.nodes)}")
                sections.append(f"- **Conversation flow (build nodes in this exact order):**")
                for ni, node in enumerate(topic.nodes, 1):
                    scope = f"{node.variable_scope}." if node.variable_scope else ""
                    var_str = f" -> sets/uses `{scope}{node.variable_name}`" if node.variable_name else ""
                    action_str = f" [{node.action_type}]" if node.action_type else ""
                    flow_str = f" -> calls flow `{node.flow_name}`" if node.flow_name else ""
                    cond_str = f" expression: `{node.condition_expression}`" if node.condition_expression else ""
                    redir_str = f" -> redirects to `{node.redirect_topic}`" if node.redirect_topic else ""
                    sections.append(f"  {ni}. **{node.type}** -- \"{node.name}\"{action_str}{flow_str}{var_str}{cond_str}{redir_str}")
                    if node.description:
                        sections.append(f"     {node.description}")
                sections.append("")
                sections.append(f"  **RECIPE REQUIREMENT**: Document EVERY node above with: how to add it (click + -> select node type), exact configuration for each field, variable assignments with explicit scope (Topic vs Global), how to make variables global (Variables icon {{x}} -> find variable -> toggle Global variable to On), complete Adaptive Card JSON (never abbreviated), and for Action nodes calling flows: the exact input/output variable mapping showing which topic variable feeds which flow parameter.")
            elif topic.node_types:
                sections.append(f"- **Required node types:** {', '.join(topic.node_types)}")
                sections.append(f"  (Document EACH node: what it does, its configuration, variables it sets/reads, and any expressions)")

            # --- Associated flows ---
            if flows:
                sections.append(f"\n#### ASSOCIATED FLOWS ({len(flows)} flows for `{topic.name}`)")
                sections.append(f"  **Build these flows IMMEDIATELY after the topic above.** The topic's Action nodes call these flows. Document each flow action-by-action in its own phase, in the order they appear in the topic's conversation flow.")
                for fi, f in enumerate(flows, 1):
                    _append_flow_detail(sections, f, fi, topic.name)
            else:
                # Check if topic nodes reference flows that weren't found in the flows list
                missing_flow_refs = set()
                for node in topic.nodes:
                    if node.flow_name and node.flow_name not in flow_by_name:
                        missing_flow_refs.add(node.flow_name)
                if missing_flow_refs:
                    sections.append(f"\n#### ASSOCIATED FLOWS")
                    sections.append(f"  WARNING: This topic references flow(s) not explicitly defined in the flows list: {', '.join(f'`{mf}`' for mf in missing_flow_refs)}")
                    sections.append(f"  The recipe engine should determine which of the standalone flows below best serves this topic (based on name and purpose) and document them in sequence after this topic.")

            # --- Associated tools ---
            if tools:
                sections.append(f"\n#### TOOL REGISTRATIONS for `{topic.name}`")
                sections.append(f"  After building the flows above, register each as an agent tool:")
                for tool in tools:
                    _append_tool_detail(sections, tool)

        # --- Orphan flows (not directly referenced by any topic) ---
        if orphan_flows:
            sections.append(f"\n### --------------------------------------------------")
            sections.append(f"### ADDITIONAL FLOWS ({len(orphan_flows)} flows not directly referenced by a topic)")
            sections.append(f"### --------------------------------------------------")
            sections.append(f"\n**RECIPE INSTRUCTION**: For each flow below, determine which capability above it most logically supports based on its name, description, and purpose. Document the flow as a phase IMMEDIATELY AFTER the relevant capability's topic phase. If a flow serves multiple capabilities (e.g., a shared status-polling flow), document it once in its own phase after the last capability that uses it, and cross-reference it from other capabilities. If a flow is truly standalone (e.g., a scheduled maintenance flow), give it its own capability section.")

            for fi, f in enumerate(orphan_flows, 1):
                _append_flow_detail(sections, f, fi)

        # --- Orphan tools (not claimed by any topic's flow) ---
        if orphan_tools:
            mcp_orphans = [t for t in orphan_tools if t.tool_type == 'MCP']
            non_mcp_orphans = [t for t in orphan_tools if t.tool_type != 'MCP']

            sections.append(f"\n### ADDITIONAL TOOLS ({len(orphan_tools)} tools not directly associated with a capability above)")

            if mcp_orphans:
                sections.append(f"\n#### MCP Server Tools ({len(mcp_orphans)} MCP tools)")
                sections.append("**IMPORTANT**: MCP in Copilot Studio is in preview. Document the MCP server setup AND note Agent Flows as a simpler alternative for beginners.")
                for tool in mcp_orphans:
                    _append_mcp_tool_detail(sections, tool)

            for tool in non_mcp_orphans:
                _append_tool_detail(sections, tool)

    elif req.flows:
        # No topics defined but flows exist -- present as standalone
        sections.append(f"\n## Flows ({len(req.flows)} defined)")
        sections.append("No topics are defined. Document each flow in its own phase, then register each as an agent tool.")
        for fi, f in enumerate(req.flows, 1):
            _append_flow_detail(sections, f, fi)

        if req.tools:
            sections.append(f"\n## Tools ({len(req.tools)} defined)")
            for tool in req.tools:
                if tool.tool_type == 'MCP':
                    _append_mcp_tool_detail(sections, tool)
                else:
                    _append_tool_detail(sections, tool)

    # ===============================================================
    # SECTION 6: Delivery Channels
    # ===============================================================
    sections.append(f"\n## Delivery Channels")
    for ch in req.delivery_channels:
        sections.append(f"- {ch}")

    # ===============================================================
    # SECTION 7: Automatic Triggers
    # ===============================================================
    if req.triggers:
        sections.append(f"\n## Automatic Triggers ({len(req.triggers)} defined)")
        sections.append("Document EACH trigger as a full phase in the cross-cutting section: how to configure it in Copilot Studio, all settings, and how to test it.")
        for i, tr in enumerate(req.triggers, 1):
            sections.append(f"\n### Trigger {i}: `{tr.trigger_type}`")
            if tr.configuration:
                sections.append(f"- **Configuration:** {tr.configuration}")
            if tr.description:
                sections.append(f"- **Instructions:** {tr.description}")

    # ===============================================================
    # SECTION 8: Build the concrete phase outline from form data
    # ===============================================================
    phase_outline_lines = []
    phase_num = 1

    # Infrastructure phases
    has_sharepoint = bool(req.sharepoint_site_url or req.sharepoint_folders)
    has_knowledge = bool(req.knowledge_sources)
    has_env_vars = bool(req.environment_variables)

    if has_sharepoint:
        phase_outline_lines.append(f"# PHASE {phase_num}: SharePoint Folder Structure")
        phase_num += 1

    phase_outline_lines.append(f"# PHASE {phase_num}: Create the {req.agent_name} Agent")
    phase_num += 1

    if has_knowledge:
        phase_outline_lines.append(f"# PHASE {phase_num}: Add Knowledge Sources ({len(req.knowledge_sources)} sources)")
        phase_num += 1

    if has_env_vars:
        phase_outline_lines.append(f"# PHASE {phase_num}: Environment Variables and API Key Security ({len(req.environment_variables)} variables)")
        phase_num += 1

    # Capability phases -- each capability gets Topic + Flow(s) + Tool Registration as contiguous phases
    for cap in capabilities:
        topic = cap['topic']
        flows = cap['flows']

        phase_outline_lines.append(f"# PHASE {phase_num}: {topic.name} -- TOPIC BUILD (node-by-node: {len(topic.nodes)} nodes)")
        phase_num += 1

        for f in flows:
            phase_outline_lines.append(f"# PHASE {phase_num}: {f.name} -- FLOW BUILD (action-by-action)")
            phase_num += 1

        if flows:
            flow_names = ', '.join(f.name for f in flows)
            phase_outline_lines.append(f"# PHASE {phase_num}: Register {flow_names} -- TOOL REGISTRATION")
            phase_num += 1

    # Orphan flows get their own phases
    for f in orphan_flows:
        phase_outline_lines.append(f"# PHASE {phase_num}: {f.name} -- FLOW BUILD (action-by-action)")
        phase_num += 1
        phase_outline_lines.append(f"# PHASE {phase_num}: {f.name} -- TOOL REGISTRATION")
        phase_num += 1

    # Cross-cutting phases
    if req.triggers:
        for tr in req.triggers:
            phase_outline_lines.append(f"# PHASE {phase_num}: Automatic Trigger -- {tr.trigger_type}")
            phase_num += 1

    phase_outline_lines.append(f"# PHASE {phase_num}: Publish and Deploy to Teams")
    phase_num += 1

    phase_outline_lines.append(f"# PHASE {phase_num}: Testing (5+ Scenarios)")
    phase_num += 1

    phase_outline_lines.append(f"# PHASE {phase_num}: Troubleshooting Reference")
    phase_num += 1

    phase_outline_lines.append(f"# PHASE {phase_num}: Architecture Summary and Verification Checklist")
    phase_num += 1

    phase_outline = "\n".join(phase_outline_lines)

    # ===============================================================
    # SECTION 9: Generation Mandate with concrete phase outline
    # ===============================================================
    sections.append(f"\n---\n")
    sections.append(f"""## GENERATION MANDATE -- FOLLOW THE PHASE SEQUENCE BELOW EXACTLY

Generate a **COMPLETE, BEGINNER-FRIENDLY** Copilot Studio build recipe for the `{req.agent_name}` agent. The reader has NEVER used Copilot Studio before. They need EVERY click, EVERY field, EVERY expression explained.

### REQUIRED PHASE SEQUENCE (YOU MUST FOLLOW THIS EXACT ORDER -- DO NOT REARRANGE, MERGE, OR SKIP):

```
{phase_outline}
```

**THIS IS YOUR TABLE OF CONTENTS.** Each line above becomes one `# PHASE N:` heading in your recipe. Each phase contains multiple `## Step N.M:` subheadings. Follow this sequence from top to bottom. Do NOT group all topics together. Do NOT group all flows together. Each capability's Topic, Flow, and Tool Registration phases are CONTIGUOUS -- build each capability end-to-end before moving to the next.

### REQUIRED HEADING FORMAT:

Use `# PHASE N: Title` for phase headings. Use `## Step N.M: Title` for steps within each phase. Every step starts with `WHERE AM I?: [UI breadcrumb path]`. Instructions are prose-style numbered paragraphs (1, 2, 3...).

### MANDATORY CONTENT (do not skip ANY):

1. Architecture diagram (ASCII) showing complete data flow -- at the very beginning before Phase 1
2. Prerequisites checklist -- before Phase 1
3. Component summary table -- listing every topic, flow, tool, and knowledge source
4. EVERY topic documented node-by-node with complete Adaptive Card JSON and YAML code block
5. EVERY flow documented action-by-action with complete detail and action stack summary table
6. Tool registration for each flow with input/output mappings
7. Testing phase with 5+ specific test scenarios and expected results
8. Troubleshooting table with 8-12 symptom/resolution pairs
9. Credit consumption estimate table
10. Post-build verification checklist with 15+ items

### FORMATTING RULES:

- **WHERE AM I?** breadcrumbs at the start of EVERY step
- **VERIFY** callouts for UI elements that may change
- **WATCH OUT** callouts for gotchas and common mistakes
- **CRITICAL** callouts for irreversible architectural decisions
- **BEGINNER TIP** callouts for educational explanations
- **COPY-PASTE** into [field]: for every expression
- NEVER use "etc.", "and so on", "similar to above", "repeat for each" -- write out EVERYTHING explicitly
- Include `{req.agent_name}` in EVERY phase heading
- This recipe should be EXHAUSTIVELY detailed -- 3,000+ lines minimum for a complex agent
- Use generous spacing between sections for readability

Generate the complete recipe now. Do not summarize, abbreviate, or skip sections. The user's career depends on getting this right.""")

    return "\n".join(sections)


# --- HTML Export ---

def convert_to_branded_html(markdown_content: str, agent_name: str) -> str:
    # Markdown-to-html with NXT Humans branding
    import re
    html_body = markdown_content

    # Convert code blocks first (before other processing to protect content)
    html_body = re.sub(r'```(\w*)\n(.*?)```', r'<pre><code class="language-\1">\2</code></pre>', html_body, flags=re.DOTALL)

    # Convert blockquotes (lines starting with >)
    def convert_blockquotes(text):
        lines = text.split('\n')
        result = []
        in_quote = False
        for line in lines:
            if line.startswith('> '):
                if not in_quote:
                    result.append('<blockquote>')
                    in_quote = True
                result.append(f'<p>{line[2:]}</p>')
            else:
                if in_quote:
                    result.append('</blockquote>')
                    in_quote = False
                result.append(line)
        if in_quote:
            result.append('</blockquote>')
        return '\n'.join(result)
    html_body = convert_blockquotes(html_body)

    # Convert headers
    html_body = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html_body, flags=re.MULTILINE)

    # Convert horizontal rules
    html_body = re.sub(r'^---+$', r'<hr>', html_body, flags=re.MULTILINE)

    # Convert bold and italic
    html_body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_body)
    html_body = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html_body)

    # Convert inline code (after code blocks)
    html_body = re.sub(r'`(.+?)`', r'<code>\1</code>', html_body)

    # Convert unordered list items
    html_body = re.sub(r'^- (.+)$', r'<li>\1</li>', html_body, flags=re.MULTILINE)

    # Convert ordered list items
    html_body = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', html_body, flags=re.MULTILINE)

    # Convert line breaks to paragraphs
    html_body = re.sub(r'\n\n', '</p><p>', html_body)
    html_body = f'<p>{html_body}</p>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{agent_name} -- Copilot Studio Build Recipe</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@200;300;400;600;700&display=swap');
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Archivo', sans-serif; font-weight: 300; color: #E0E0E0; line-height: 1.8; background: #0D0D0D; padding: 48px 64px; max-width: 1000px; margin: 0 auto; font-size: 15px; }}
  h1 {{ font-weight: 700; font-size: 32px; text-transform: uppercase; letter-spacing: 2px; color: #FBBF24; margin: 48px 0 20px; border-bottom: 3px solid #F59E0B; border-top: 1px solid #333; padding: 12px 0 10px; }}
  h1:first-child {{ margin-top: 0; border-top: none; }}
  h2 {{ font-weight: 600; font-size: 22px; color: #FFFFFF; border-left: 4px solid #F59E0B; padding-left: 16px; margin: 36px 0 16px; line-height: 1.4; }}
  h3 {{ font-weight: 600; font-size: 18px; color: #FBBF24; margin: 28px 0 10px; }}
  h4 {{ font-weight: 600; font-size: 16px; color: #FFFFFF; opacity: 0.85; margin: 20px 0 8px; }}
  p {{ font-size: 15px; margin-bottom: 14px; line-height: 1.8; }}
  strong {{ color: #FFFFFF; font-weight: 600; }}
  code {{ background: #1a1a1a; color: #FBBF24; padding: 2px 6px; border-radius: 4px; font-size: 13px; word-break: break-word; }}
  pre {{ background: #050505; border: 1px solid #444; border-radius: 8px; padding: 20px; overflow-x: auto; margin: 20px 0; line-height: 1.5; }}
  pre code {{ background: none; padding: 0; color: #d4d4d4; font-size: 13px; word-break: normal; }}
  table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
  th {{ background: #1a1a1a; color: #FBBF24; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; font-size: 12px; padding: 10px 14px; border: 1px solid #444; text-align: left; }}
  td {{ border: 1px solid #333; padding: 8px 14px; text-align: left; font-size: 14px; line-height: 1.5; }}
  tr:nth-child(even) td {{ background: rgba(255,255,255,0.02); }}
  blockquote {{ border-left: 4px solid #F59E0B; margin: 20px 0; padding: 12px 20px; background: rgba(245,158,11,0.06); border-radius: 0 8px 8px 0; }}
  blockquote p {{ color: #E0E0E0; }}
  blockquote strong {{ color: #FBBF24; }}
  ul, ol {{ margin: 10px 0; padding-left: 28px; }}
  li {{ margin: 6px 0; line-height: 1.75; }}
  hr {{ border: none; border-top: 2px solid #333; margin: 40px 0; }}
  .footer {{ text-align: center; padding: 24px; font-size: 11px; color: #4A4A4A; border-top: 1px solid #333; margin-top: 48px; }}
  .footer .brand {{ color: #F59E0B; font-weight: 600; }}
  @media print {{ body {{ background: #fff; color: #222; padding: 24px; }} h1 {{ color: #B8860B; border-color: #B8860B; }} h2 {{ color: #222; border-color: #B8860B; }} h3 {{ color: #B8860B; }} code {{ background: #f5f5f5; color: #B8860B; }} pre {{ background: #f9f9f9; border-color: #ddd; }} pre code {{ color: #333; }} th {{ background: #f0f0f0; color: #B8860B; }} td {{ border-color: #ddd; }} blockquote {{ background: #fffdf0; border-color: #B8860B; }} blockquote p {{ color: #333; }} strong {{ color: #111; }} }}
</style>
</head>
<body>
{html_body}
<div class="footer">
  <span class="brand">NXT Humans</span> &middot; Copilot Studio Recipe Generator &middot; Intelligence Augmentation Suite
</div>
</body>
</html>"""


# --- Static File Serving ---

# Mount static files if the build directory exists
if (STATIC_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")
    if (STATIC_DIR / "entities").exists():
        app.mount("/static/entities", StaticFiles(directory=str(STATIC_DIR / "entities")), name="entities")
    if (STATIC_DIR / "triggers").exists():
        app.mount("/static/triggers", StaticFiles(directory=str(STATIC_DIR / "triggers")), name="triggers")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
else:
    # Development fallback -- serve a simple landing page
    @app.get("/")
    async def dev_landing():
        return HTMLResponse("""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Copilot Studio Recipe Generator</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0D0D0D; color: #E0E0E0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .container { max-width: 800px; padding: 60px; text-align: center; }
  h1 { font-size: 2.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #fff; margin-bottom: 8px; }
  .accent { color: #B8B800; }
  .subtitle { font-size: 1.1rem; color: #94A3B8; margin-bottom: 40px; }
  .api-section { background: #111; border: 1px solid #222; border-radius: 12px; padding: 30px; text-align: left; }
  .api-section h3 { color: #B8B800; margin-bottom: 16px; }
  .endpoint { background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 12px 16px; margin: 8px 0; font-family: monospace; font-size: 14px; }
  .method { color: #00B7C3; font-weight: 600; }
</style>
</head>
<body>
<div class="container">
  <h1>Copilot Studio <span class="accent">Recipe Generator</span></h1>
  <p class="subtitle">Generate complete build recipes for Microsoft Copilot Studio agents</p>
  <div class="api-section">
    <h3>API Endpoints</h3>
    <div class="endpoint"><span class="method">GET</span> /health</div>
    <div class="endpoint"><span class="method">GET</span> /api/templates</div>
    <div class="endpoint"><span class="method">GET</span> /api/templates/{id}</div>
    <div class="endpoint"><span class="method">POST</span> /api/generate-recipe</div>
    <div class="endpoint"><span class="method">POST</span> /api/export</div>
  </div>
</div>
</body>
</html>""")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
