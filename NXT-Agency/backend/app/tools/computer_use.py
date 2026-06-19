"""
Computer Use tool — Playwright-based browser automation.

Provides a real headless Chromium browser that the agent can use to:
- Navigate to Intelligence Augmentation apps (Journey Mapper, Reddit Collector, etc.)
- Take screenshots of app UIs
- Fill forms, click buttons, upload files
- Read page content and extract data

This runs inside the Docker container on the nxt-humans-network,
so it can reach all services by their Docker hostnames.

The tool is Anthropic-defined (schema-less) and gets passed directly
to the Claude API with the computer-use beta header.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from typing import Any

logger = logging.getLogger("tools.computer_use")

# Display dimensions (match what we tell Claude)
DISPLAY_WIDTH = 1280
DISPLAY_HEIGHT = 800

# Anthropic-defined tool definitions
COMPUTER_USE_TOOL_DEF = {
    "type": "computer_20251124",
    "name": "computer",
    "display_width_px": DISPLAY_WIDTH,
    "display_height_px": DISPLAY_HEIGHT,
    "display_number": 1,
}

BASH_TOOL_DEF = {
    "type": "bash_20250124",
    "name": "bash",
}

TEXT_EDITOR_TOOL_DEF = {
    "type": "text_editor_20250728",
    "name": "str_replace_based_edit_tool",
}

# Convenience exports
ANTHROPIC_TOOL_DEFS = [COMPUTER_USE_TOOL_DEF, BASH_TOOL_DEF, TEXT_EDITOR_TOOL_DEF]
ANTHROPIC_TOOL_NAMES = {"computer", "bash", "str_replace_based_edit_tool"}

# Singleton browser instance (lazy-initialized)
_browser = None
_page = None
_playwright = None


async def _get_page():
    """Get or create the shared Playwright browser page."""
    global _browser, _page, _playwright

    if _page and not _page.is_closed():
        return _page

    try:
        from playwright.async_api import async_playwright

        if _playwright is None:
            _playwright = await async_playwright().start()

        if _browser is None or not _browser.is_connected():
            # Launch in VISIBLE mode so the browser renders in the Xvfb virtual display.
            # Users can watch the browser live via the noVNC web viewer.
            _browser = await _playwright.chromium.launch(
                headless=False,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--start-maximized",
                ],
            )

        _page = await _browser.new_page(
            viewport={"width": DISPLAY_WIDTH, "height": DISPLAY_HEIGHT}
        )
        logger.info("Playwright browser page created (%dx%d)", DISPLAY_WIDTH, DISPLAY_HEIGHT)
        return _page

    except Exception as e:
        logger.error("Failed to create Playwright page: %s", e)
        raise


async def navigate_to_app(url: str) -> dict[str, Any]:
    """Navigate the shared browser to an app URL. Call before computer use actions."""
    try:
        page = await _get_page()
        if page.url in ("about:blank", "chrome://newtab/", ""):
            # Use 'commit' wait — fires on first HTTP response byte.
            # 'domcontentloaded' can hang on heavy JS apps.
            await page.goto(url, wait_until="commit", timeout=15000)
            # Give the page a moment to render
            await asyncio.sleep(2)
            logger.info("Browser navigated to %s", url)
            return {"status": "navigated", "url": url}
        return {"status": "already_on_page", "url": page.url}
    except Exception as e:
        logger.error("Navigation to %s failed: %s", url, e)
        # Still try with no wait condition as last resort
        try:
            page = await _get_page()
            await page.goto(url, wait_until="commit", timeout=10000)
            await asyncio.sleep(1)
            return {"status": "navigated_retry", "url": url}
        except Exception:
            pass
        return {"error": f"Navigation failed: {e}"}


async def execute_computer_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    """Execute a computer use action via Playwright headless browser."""

    try:
        page = await _get_page()
    except Exception as e:
        return {"error": f"Browser unavailable: {e}"}

    # Auto-navigate: if page is at about:blank and a URL is provided, go there first
    if page.url in ("about:blank", "chrome://newtab/") and params.get("url"):
        try:
            await page.goto(params["url"], wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(1)
        except Exception:
            pass

    if action == "screenshot":
        return await _screenshot(page)

    elif action == "left_click":
        coord = params.get("coordinate", [0, 0])
        return await _click(page, coord[0], coord[1])

    elif action == "right_click":
        coord = params.get("coordinate", [0, 0])
        return await _click(page, coord[0], coord[1], button="right")

    elif action == "double_click":
        coord = params.get("coordinate", [0, 0])
        return await _click(page, coord[0], coord[1], click_count=2)

    elif action == "type":
        text = params.get("text", "")
        return await _type_text(page, text)

    elif action == "key":
        key = params.get("key", "")
        return await _press_key(page, key)

    elif action == "mouse_move":
        coord = params.get("coordinate", [0, 0])
        await page.mouse.move(coord[0], coord[1])
        return {"status": "moved", "coordinate": coord}

    elif action == "scroll":
        coord = params.get("coordinate", [0, 0])
        direction = params.get("direction", "down")
        amount = params.get("amount", 3)
        return await _scroll(page, coord[0], coord[1], direction, amount)

    elif action == "left_click_drag":
        start = params.get("start_coordinate", [0, 0])
        end = params.get("coordinate", [0, 0])
        await page.mouse.move(start[0], start[1])
        await page.mouse.down()
        await page.mouse.move(end[0], end[1])
        await page.mouse.up()
        return {"status": "dragged", "from": start, "to": end}

    elif action == "wait":
        duration = min(params.get("duration", 1), 10)
        await asyncio.sleep(duration)
        return {"status": "waited", "duration": duration}

    elif action == "zoom":
        region = params.get("region", [0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT])
        return await _zoom(page, region)

    elif action == "upload_file":
        # Upload a file to a file input element using Playwright set_input_files.
        # params: selector (CSS selector for the file input), file_path (path to file)
        selector = params.get("selector", "input[type=file]")
        file_path = params.get("file_path", "")
        if not file_path:
            return {"error": "file_path is required for upload_file action"}
        try:
            await page.set_input_files(selector, file_path)
            await asyncio.sleep(1)
            return {"status": "file_uploaded", "selector": selector, "file_path": file_path}
        except Exception as e:
            return {"error": f"File upload failed: {e}"}

    else:
        return {"error": f"Unknown action: {action}"}


async def _screenshot(page) -> dict[str, Any]:
    """Take a full-page screenshot and return as base64."""
    try:
        img_bytes = await page.screenshot(type="png", timeout=10000)
        img_b64 = base64.standard_b64encode(img_bytes).decode()
        current_url = page.url

        return {
            "type": "image",
            "current_url": current_url,
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": img_b64,
            },
        }
    except Exception as e:
        logger.error("Screenshot failed: %s", e)
        return {"error": f"Screenshot failed: {e}"}


async def _click(page, x: int, y: int, button: str = "left", click_count: int = 1) -> dict[str, Any]:
    """Click at coordinates."""
    try:
        await page.mouse.click(x, y, button=button, click_count=click_count)
        await asyncio.sleep(0.5)  # Brief pause for UI to respond
        return {"status": "clicked", "coordinate": [x, y], "button": button}
    except Exception as e:
        return {"error": f"Click failed: {e}"}


async def _type_text(page, text: str) -> dict[str, Any]:
    """Type text into the focused element."""
    try:
        # If text looks like a URL, navigate to it instead of typing
        if text.startswith("http://") or text.startswith("https://"):
            await page.goto(text, wait_until="commit", timeout=15000)
            await asyncio.sleep(2)
            return {"status": "navigated", "url": text}

        await page.keyboard.type(text, delay=20)
        return {"status": "typed", "length": len(text)}
    except Exception as e:
        return {"error": f"Type failed: {e}"}


async def _press_key(page, key: str) -> dict[str, Any]:
    """Press a key or key combination."""
    try:
        key_map = {
            "Return": "Enter",
            "ctrl+a": "Control+a",
            "ctrl+c": "Control+c",
            "ctrl+v": "Control+v",
            "ctrl+s": "Control+s",
            "ctrl+l": "Control+l",
            "Tab": "Tab",
            "Escape": "Escape",
            "Backspace": "Backspace",
            "Delete": "Delete",
            "space": " ",
        }
        pw_key = key_map.get(key, key)

        if "+" in pw_key and pw_key not in key_map.values():
            parts = pw_key.split("+")
            modifier = parts[0].capitalize()
            actual_key = parts[1]
            pw_key = f"{modifier}+{actual_key}"

        await page.keyboard.press(pw_key)
        return {"status": "key_pressed", "key": key}
    except Exception as e:
        return {"error": f"Key press failed: {e}"}


async def _scroll(page, x: int, y: int, direction: str, amount: int) -> dict[str, Any]:
    """Scroll at coordinates."""
    try:
        await page.mouse.move(x, y)
        delta_map = {
            "down": (0, amount * 100),
            "up": (0, -amount * 100),
            "right": (amount * 100, 0),
            "left": (-amount * 100, 0),
        }
        dx, dy = delta_map.get(direction, (0, amount * 100))
        await page.mouse.wheel(dx, dy)
        await asyncio.sleep(0.3)
        return {"status": "scrolled", "direction": direction, "amount": amount}
    except Exception as e:
        return {"error": f"Scroll failed: {e}"}


async def _zoom(page, region: list[int]) -> dict[str, Any]:
    """Capture a zoomed/cropped region of the screen."""
    try:
        x1, y1, x2, y2 = region
        img_bytes = await page.screenshot(
            type="png",
            clip={"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
        )
        img_b64 = base64.standard_b64encode(img_bytes).decode()
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": img_b64,
            },
        }
    except Exception as e:
        return {"error": f"Zoom capture failed: {e}"}


# ---- Non-browser tools ----

async def execute_bash_action(command: str) -> dict[str, Any]:
    """Execute a bash command in the container."""
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        return {
            "stdout": stdout.decode()[:10000],
            "stderr": stderr.decode()[:5000],
            "returncode": proc.returncode,
        }
    except asyncio.TimeoutError:
        return {"error": "Command timed out after 30 seconds"}
    except Exception as e:
        return {"error": str(e)}


async def execute_text_editor_action(params: dict[str, Any]) -> dict[str, Any]:
    """Execute a text editor action (view, create, str_replace, insert)."""
    command = params.get("command", "view")
    path = params.get("path", "")

    if not path:
        return {"error": "path parameter is required"}

    try:
        if command == "view":
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            return {"content": content[:50000]}

        elif command == "create":
            file_text = params.get("file_text", "")
            with open(path, "w", encoding="utf-8") as f:
                f.write(file_text)
            return {"status": "created", "path": path}

        elif command == "str_replace":
            old_str = params.get("old_str", "")
            new_str = params.get("new_str", "")
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if old_str not in content:
                return {"error": f"old_str not found in {path}"}
            content = content.replace(old_str, new_str, 1)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"status": "replaced", "path": path}

        elif command == "insert":
            insert_line = params.get("insert_line", 0)
            new_str = params.get("new_str", "")
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            lines.insert(insert_line, new_str + "\n")
            with open(path, "w", encoding="utf-8") as f:
                f.writelines(lines)
            return {"status": "inserted", "path": path, "line": insert_line}

        else:
            return {"error": f"Unknown command: {command}"}

    except Exception as e:
        return {"error": str(e)}
