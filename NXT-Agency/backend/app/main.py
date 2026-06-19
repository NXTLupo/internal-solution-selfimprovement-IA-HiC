import logging
import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

load_dotenv()

from app.db import get_session, init_db, close_db
from app.models import (
    User, UserCreate, UserRead, UserUpdate,
    Conversation, ConversationCreate, ConversationRead, ConversationUpdate,
    Message, MessageCreate, MessageRead,
    AgentSession, AgentSessionCreate, AgentSessionRead, AgentSessionUpdate,
)

# Agent subsystem imports
from app.agents.registry import AgentRegistry
from app.agents.engine import AgentEngine
from app.agents.routes import router as agents_router, configure_routes
from app.llm import ModelRouter
from app.tools import ToolRegistry
from app.tools.web_search import WebSearchTool, ExtractUrlContentTool
from app.tools.file_ops import ReadFileTool, WriteFileTool, ListDirectoryTool
from app.tools.code_exec import ExecutePythonTool, ExecuteJavaScriptTool
from app.tools.text_analysis import SummarizeTextTool, AnalyzeSentimentTool
from app.tools.delegate import DelegateToAgentTool
from app.tools.image_gen import GenerateImageOpenAITool, GenerateImageGeminiTool, GenerateImageReplicateTool
from app.tools.prototype_gen import GeneratePrototypeTool
from app.tools.figma import FetchFigmaDataTool, GetFigmaComponentsTool
from app.tools.cx_services import (
    GenerateJourneyMapTool, SearchRedditTool, CollectRedditDataTool,
    AnalyzeSocialDataTool, TranscribeVideoTool,
    TranscribeVideoComputerTool, BuildCopilotRecipeTool,
    GenerateCharacterComputerTool,
)
from app.tools.computer_use import (
    COMPUTER_USE_TOOL_DEF,
    BASH_TOOL_DEF,
    TEXT_EDITOR_TOOL_DEF,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("nxt-agency")

# Create FastAPI app
app = FastAPI(
    title="NXT Agency Backend",
    description="Multi-agent orchestration API with 172 AI specialist agents",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5050",
        "http://localhost:8200",
        "http://localhost:8201",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


@app.on_event("startup")
async def on_startup():
    """Initialize database and agent subsystem on startup."""
    try:
        await init_db()
    except Exception as e:
        logger.warning("Database init failed (will retry on demand): %s", e)

    # --- Agent subsystem bootstrap ---
    # Resolve agent prompts directory: try env var, then relative to project root
    _project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    _env_prompts = os.environ.get("AGENT_PROMPTS_DIR", "")
    if _env_prompts:
        # Resolve relative paths against project root (where .env lives)
        prompts_dir = os.path.abspath(os.path.join(_project_root, _env_prompts))
        if not os.path.isdir(prompts_dir):
            # Fallback: resolve relative to CWD
            prompts_dir = os.path.abspath(_env_prompts)
    else:
        prompts_dir = os.path.join(_project_root, "agent-prompts")
    configs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "agents", "configs"))

    logger.info("Loading agent registry from %s", prompts_dir)
    agent_registry = AgentRegistry(
        prompts_dir=prompts_dir,
        configs_dir=configs_dir,
    )

    # Model router (reads API keys from environment)
    model_router = ModelRouter()

    # Tool registry -- register all built-in tools
    tool_registry = ToolRegistry()
    for tool_cls in [
        SummarizeTextTool, AnalyzeSentimentTool,     # tier 2
        WebSearchTool, ExtractUrlContentTool,         # tier 2
        GenerateImageOpenAITool, GenerateImageGeminiTool, GenerateImageReplicateTool,  # tier 2
        FetchFigmaDataTool, GetFigmaComponentsTool,    # tier 2
        GenerateJourneyMapTool, SearchRedditTool,        # tier 2 (CX services)
        CollectRedditDataTool,                             # tier 2 (CX browser automation)
        TranscribeVideoComputerTool,                       # tier 2 (CX browser automation)
        BuildCopilotRecipeTool,                            # tier 2 (CX browser automation)
        GenerateCharacterComputerTool,                     # tier 2 (CX browser automation)
        AnalyzeSocialDataTool, TranscribeVideoTool,      # tier 2 (CX services)
        ReadFileTool, WriteFileTool, ListDirectoryTool,  # tier 3
        ExecutePythonTool, ExecuteJavaScriptTool,     # tier 3
        GeneratePrototypeTool,                         # tier 3
    ]:
        tool_registry.register(tool_cls())

    # Delegate tool (tier 4) -- needs engine reference, wired below
    delegate_tool = DelegateToAgentTool()
    tool_registry.register(delegate_tool)

    # Anthropic-defined tools (computer use, bash, text editor)
    # These are schema-less and passed directly to the Claude API.
    # Only available to agents at tier >= 4.
    tool_registry.register_anthropic_tool(COMPUTER_USE_TOOL_DEF)
    tool_registry.register_anthropic_tool(BASH_TOOL_DEF)
    tool_registry.register_anthropic_tool(TEXT_EDITOR_TOOL_DEF)

    # Engine
    engine = AgentEngine(
        registry=agent_registry,
        model_router=model_router,
        tool_registry=tool_registry,
    )

    # Wire the delegate tool's engine reference (breaks circular dep)
    delegate_tool.wire_engine(engine.run)

    # Inject into routes module
    configure_routes(registry=agent_registry, engine=engine)

    # Wire launchpad compatibility layer (must be inside startup for access to engine)
    from app.agents.launchpad_compat import configure_launchpad_compat
    configure_launchpad_compat(registry=agent_registry, engine=engine)
    logger.info("Launchpad compatibility layer wired")

    agent_count = len(agent_registry.list_all())
    cat_count = len(agent_registry.categories())
    tool_count = len(tool_registry.get_tool_names(max_tier=4))
    logger.info(
        "Agent subsystem ready: %d agents, %d categories, %d tools",
        agent_count, cat_count, tool_count,
    )

    # Pre-launch the Playwright browser so computer use is instant (no cold start).
    # The browser runs on DISPLAY=:99 (Xvfb) and is visible via noVNC on port 6080.
    try:
        from app.tools.computer_use import _get_page
        await _get_page()
        logger.info("Playwright browser pre-launched on display :99")
    except Exception as e:
        logger.warning("Browser pre-launch failed (will retry on first use): %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    await close_db()


# Include agent routes
app.include_router(agents_router)

# Include Multi-Agent OS orchestration routes
from app.orchestration.routes import router as orchestration_router, init_orchestration
init_orchestration()
app.include_router(orchestration_router)
logger.info("Multi-Agent OS orchestration routes mounted at /api/orchestration")

# Include Launchpad compatibility routes (CX Agent API surface)
# NOTE: configure_launchpad_compat() is called inside on_startup() where engine is available
from app.agents.launchpad_compat import router as launchpad_router
app.include_router(launchpad_router)
logger.info("Launchpad compatibility routes mounted (/api/chat/*, /ws/*)")


# Health check — includes CX Agent compatible fields
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "nxt-agency-backend",
        "model": "multi-model",
        "tools_cached": 0,
        "available_tools": [],
        "active_conversations": 0,
    }


@app.get("/")
async def root():
    return {
        "message": "NXT Agency Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "agents": "/api/agents/",
        "orchestration": "/api/orchestration/",
        "health": "/health",
    }


# --- Existing CRUD endpoints (unchanged) ---

@app.post("/users/", response_model=UserRead)
async def create_user(
    user: UserCreate, session: AsyncSession = Depends(get_session)
):
    existing_user = await session.exec(
        select(User).where(
            (User.email == user.email) | (User.username == user.username)
        )
    )
    if existing_user.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists",
        )
    hashed_password = f"hashed_{user.password}"
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        hashed_password=hashed_password,
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


@app.get("/users/{user_id}", response_model=UserRead)
async def get_user(user_id: int, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@app.get("/users/", response_model=List[UserRead])
async def list_users(
    skip: int = 0, limit: int = 100, session: AsyncSession = Depends(get_session)
):
    result = await session.exec(select(User).offset(skip).limit(limit))
    return result.all()


@app.post("/conversations/", response_model=ConversationRead)
async def create_conversation(
    conversation: ConversationCreate,
    user_id: int,
    session: AsyncSession = Depends(get_session),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db_conversation = Conversation(
        title=conversation.title, status=conversation.status, user_id=user_id
    )
    session.add(db_conversation)
    await session.commit()
    await session.refresh(db_conversation)
    return db_conversation


@app.get("/conversations/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: int, session: AsyncSession = Depends(get_session)
):
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return conversation


@app.get("/users/{user_id}/conversations/", response_model=List[ConversationRead])
async def list_user_conversations(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    return result.all()


@app.post("/messages/", response_model=MessageRead)
async def create_message(
    message: MessageCreate, session: AsyncSession = Depends(get_session)
):
    conversation = await session.get(Conversation, message.conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    db_message = Message(
        content=message.content,
        role=message.role,
        conversation_id=message.conversation_id,
        message_metadata=message.message_metadata,
    )
    session.add(db_message)
    await session.commit()
    await session.refresh(db_message)
    return db_message


@app.get("/conversations/{conversation_id}/messages/", response_model=List[MessageRead])
async def list_conversation_messages(
    conversation_id: int,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .offset(skip)
        .limit(limit)
    )
    return result.all()


@app.post("/agent-sessions/", response_model=AgentSessionRead)
async def create_agent_session(
    agent_session: AgentSessionCreate,
    session: AsyncSession = Depends(get_session),
):
    conversation = await session.get(Conversation, agent_session.conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    db_agent_session = AgentSession(
        agent_name=agent_session.agent_name,
        status=agent_session.status,
        current_step=agent_session.current_step,
        state_data=agent_session.state_data,
        result_data=agent_session.result_data,
        conversation_id=agent_session.conversation_id,
    )
    session.add(db_agent_session)
    await session.commit()
    await session.refresh(db_agent_session)
    return db_agent_session


@app.get("/agent-sessions/{session_id}", response_model=AgentSessionRead)
async def get_agent_session(
    session_id: int, session: AsyncSession = Depends(get_session)
):
    agent_session = await session.get(AgentSession, session_id)
    if not agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found"
        )
    return agent_session


@app.put("/agent-sessions/{session_id}", response_model=AgentSessionRead)
async def update_agent_session(
    session_id: int,
    update_data: AgentSessionUpdate,
    session: AsyncSession = Depends(get_session),
):
    agent_session = await session.get(AgentSession, session_id)
    if not agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found"
        )
    update_dict = update_data.dict(exclude_unset=True)
    for field_name, value in update_dict.items():
        setattr(agent_session, field_name, value)
    session.add(agent_session)
    await session.commit()
    await session.refresh(agent_session)
    return agent_session


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
