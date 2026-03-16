"""
Pre-generate all 7 template recipes by calling the running Recipe Generator API.
Each template's agent_description is sent through the same "Start from Scratch"
code path to produce identical output format.

Usage: python generate_all_recipes.py
Requires: The recipe generator service running on localhost:5013
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = os.environ.get("RECIPE_API_URL", "http://localhost:5013")
TEMPLATES_DIR = Path(__file__).parent / "templates"
RECIPES_DIR = TEMPLATES_DIR / "recipes"
RECIPES_DIR.mkdir(exist_ok=True)

TEMPLATE_IDS = [
    "social_data_collector",
    "video_transcription",
    "social_research_analytics",
    "journey_mapper",
    "miro_board_generator",
    "character_generator",
    "hic_research",
]


def generate_recipe(template_id: str) -> tuple[str, str, float]:
    """Generate a recipe for a single template. Returns (template_id, content, elapsed)."""
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    with open(template_path, "r", encoding="utf-8") as f:
        template = json.load(f)

    prefilled = template.get("prefilled", {})
    agent_name = prefilled.get("agent_name", template.get("name", template_id))
    agent_description = prefilled.get("agent_description", "")

    if not agent_description:
        return template_id, "", 0

    payload = {
        "agent_name": agent_name,
        "agent_description": agent_description,
        "template_id": template_id,
        "orchestration_model": prefilled.get("orchestration_model", "GPT-5 Chat GA"),
        "auth_mode": prefilled.get("auth_mode", "Authenticate with Microsoft"),
    }

    print(f"[{template_id}] Starting generation for '{agent_name}'...")
    start = time.time()

    try:
        resp = requests.post(
            f"{BASE_URL}/api/generate-recipe",
            json=payload,
            stream=True,
            timeout=600,  # 10 minute timeout
        )
        resp.raise_for_status()

        content = ""
        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data_str = line[6:]  # strip "data: "
            try:
                event = json.loads(data_str)
                if event.get("type") == "content":
                    content += event.get("text", "")
                elif event.get("type") == "done":
                    break
                elif event.get("type") == "error":
                    print(f"[{template_id}] ERROR: {event.get('message')}")
                    break
            except json.JSONDecodeError:
                continue

        elapsed = time.time() - start

        # Save to file
        output_path = RECIPES_DIR / f"{template_id}.md"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        line_count = content.count("\n")
        print(f"[{template_id}] DONE - {line_count} lines, {len(content)} chars in {elapsed:.0f}s -> {output_path.name}")
        return template_id, content, elapsed

    except Exception as e:
        elapsed = time.time() - start
        print(f"[{template_id}] FAILED after {elapsed:.0f}s: {e}")
        return template_id, "", elapsed


def main():
    # Check service health
    try:
        health = requests.get(f"{BASE_URL}/health", timeout=5).json()
        print(f"Service healthy: {health}")
    except Exception as e:
        print(f"ERROR: Cannot reach service at {BASE_URL}: {e}")
        sys.exit(1)

    # Filter to specific templates if args provided
    templates = sys.argv[1:] if len(sys.argv) > 1 else TEMPLATE_IDS

    print(f"\nGenerating {len(templates)} recipes (this will take 15-30 minutes)...\n")

    # Run 2 at a time to avoid rate limits
    results = {}
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(generate_recipe, tid): tid for tid in templates}
        for future in as_completed(futures):
            tid = futures[future]
            try:
                template_id, content, elapsed = future.result()
                results[template_id] = {
                    "lines": content.count("\n"),
                    "chars": len(content),
                    "elapsed": elapsed,
                    "success": bool(content),
                }
            except Exception as e:
                print(f"[{tid}] Exception: {e}")
                results[tid] = {"success": False, "error": str(e)}

    # Summary
    print("\n" + "=" * 60)
    print("GENERATION SUMMARY")
    print("=" * 60)
    for tid, r in results.items():
        if r.get("success"):
            print(f"  {tid}: {r['lines']} lines, {r['chars']} chars ({r['elapsed']:.0f}s)")
        else:
            print(f"  {tid}: FAILED - {r.get('error', 'unknown')}")

    total = sum(r.get("elapsed", 0) for r in results.values())
    success = sum(1 for r in results.values() if r.get("success"))
    print(f"\n{success}/{len(templates)} succeeded in {total:.0f}s total")


if __name__ == "__main__":
    main()
