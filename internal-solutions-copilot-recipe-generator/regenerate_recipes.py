"""
Regenerate all pre-generated recipes using the live API.
Run from within the copilot-recipe-generator directory.
Requires the service to be running on localhost:5013.
"""
import json
import sys
import time
import httpx
from pathlib import Path

BASE_URL = "http://localhost:5013"
TEMPLATES_DIR = Path(__file__).parent / "templates"
RECIPES_DIR = TEMPLATES_DIR / "recipes"

def load_template(template_id: str) -> dict:
    path = TEMPLATES_DIR / f"{template_id}.json"
    return json.loads(path.read_text(encoding="utf-8"))

def regenerate_recipe(template_id: str) -> str:
    """Call the API with prefilled data (no template_id) to force fresh generation."""
    template = load_template(template_id)
    prefilled = template.get("prefilled", {})

    # Build request body from prefilled data, WITHOUT template_id
    request_body = {
        "agent_name": prefilled.get("agent_name", template["name"]),
        "agent_description": prefilled.get("agent_description", template.get("description", "")),
        "persona_instructions": prefilled.get("persona_instructions", ""),
        "orchestration_model": prefilled.get("orchestration_model", "GPT-5 Chat GA"),
        "auth_mode": prefilled.get("auth_mode", "Authenticate with Microsoft"),
        "disable_general_knowledge": prefilled.get("disable_general_knowledge", True),
        "topics": prefilled.get("topics", []),
        "flows": prefilled.get("flows", []),
        "knowledge_sources": prefilled.get("knowledge_sources", []),
        "delivery_channels": prefilled.get("delivery_channels", ["Teams Adaptive Card", "Email"]),
        "tools": prefilled.get("tools", []),
        "triggers": prefilled.get("triggers", []),
        "environment_variables": prefilled.get("environment_variables", []),
        # NO template_id — forces fresh generation
    }

    print(f"  Sending request ({len(json.dumps(request_body))} bytes)...")

    full_text = []
    with httpx.Client(timeout=600.0) as client:
        with client.stream("POST", f"{BASE_URL}/api/generate-recipe",
                          json=request_body,
                          headers={"Accept": "text/event-stream"}) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:])
                    if data["type"] == "content":
                        full_text.append(data["text"])
                        # Print progress dots
                        if len(full_text) % 200 == 0:
                            print(".", end="", flush=True)
                    elif data["type"] == "done":
                        break
                    elif data["type"] == "error":
                        raise RuntimeError(f"API error: {data['message']}")

    print()  # newline after dots
    return "".join(full_text)


def main():
    # Get template list
    templates_to_regenerate = sys.argv[1:] if len(sys.argv) > 1 else None

    if not templates_to_regenerate:
        # All templates
        templates_to_regenerate = [
            p.stem for p in TEMPLATES_DIR.glob("*.json")
        ]

    print(f"Will regenerate {len(templates_to_regenerate)} recipes: {', '.join(templates_to_regenerate)}")
    print()

    for i, tid in enumerate(templates_to_regenerate, 1):
        print(f"[{i}/{len(templates_to_regenerate)}] Regenerating: {tid}")
        start = time.time()

        try:
            recipe_content = regenerate_recipe(tid)
            elapsed = time.time() - start

            # Backup old recipe
            recipe_path = RECIPES_DIR / f"{tid}.md"
            if recipe_path.exists():
                backup_path = RECIPES_DIR / f"{tid}.md.bak"
                backup_path.write_text(recipe_path.read_text(encoding="utf-8"), encoding="utf-8")
                print(f"  Backed up old recipe to {backup_path.name}")

            # Save new recipe
            recipe_path.write_text(recipe_content, encoding="utf-8")
            print(f"  Saved: {len(recipe_content)} chars in {elapsed:.0f}s")
        except Exception as e:
            print(f"  ERROR: {e}")

        print()

    print("Done!")


if __name__ == "__main__":
    main()
