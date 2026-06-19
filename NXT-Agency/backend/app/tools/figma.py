"""
Figma REST API integration tools.

Enables agents to fetch real component data, styles, and rendered images
directly from Figma files by pasting Figma URLs.  This is the core of the
Figma MCP integration — the agent can inspect any Figma node, extract design
tokens, and use them to generate faithful prototypes.

Requires ``FIGMA_API_TOKEN`` environment variable (personal access token).
Tier 2: available to all tool-enabled agents.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any
from urllib.parse import urlparse, parse_qs

import httpx

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.figma")

_FIGMA_API = "https://api.figma.com/v1"
_TIMEOUT = 30


def _get_token() -> str:
    token = os.environ.get("FIGMA_API_TOKEN", "")
    if not token:
        raise RuntimeError(
            "FIGMA_API_TOKEN environment variable is not set. "
            "Get a personal access token from Figma → Settings → Personal Access Tokens."
        )
    return token


def _parse_figma_url(url: str) -> tuple[str, str | None]:
    """
    Parse a Figma URL into (file_key, node_id | None).

    Supported formats:
        https://www.figma.com/design/FILE_KEY/Title?node-id=302-3658
        https://www.figma.com/file/FILE_KEY/Title?node-id=302:3658
        https://www.figma.com/design/FILE_KEY/Title
        https://www.figma.com/file/FILE_KEY
        FILE_KEY  (bare key)
    """
    url = url.strip()

    # Bare file key (no URL)
    if not url.startswith("http"):
        return url, None

    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split("/") if p]

    # Path: /design/FILE_KEY/Title or /file/FILE_KEY/Title
    file_key = None
    for i, part in enumerate(path_parts):
        if part in ("design", "file") and i + 1 < len(path_parts):
            file_key = path_parts[i + 1]
            break

    if not file_key:
        raise ValueError(f"Could not extract file key from Figma URL: {url}")

    # Node ID from query params
    qs = parse_qs(parsed.query)
    node_id_raw = qs.get("node-id", [None])[0]
    node_id = None
    if node_id_raw:
        # Normalize: "302-3658" → "302:3658"
        node_id = node_id_raw.replace("-", ":")

    return file_key, node_id


def _extract_colors(node: dict) -> list[dict]:
    """Recursively extract all fill colors from a Figma node tree."""
    colors = []
    fills = node.get("fills", [])
    for fill in fills:
        if fill.get("type") == "SOLID" and fill.get("visible", True):
            c = fill.get("color", {})
            r, g, b = int(c.get("r", 0) * 255), int(c.get("g", 0) * 255), int(c.get("b", 0) * 255)
            a = round(fill.get("opacity", c.get("a", 1)), 2)
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            colors.append({"hex": hex_color, "opacity": a, "node": node.get("name", "")})
    for child in node.get("children", []):
        colors.extend(_extract_colors(child))
    return colors


def _extract_typography(node: dict) -> list[dict]:
    """Recursively extract text styles from a Figma node tree."""
    styles = []
    if node.get("type") == "TEXT":
        style = node.get("style", {})
        styles.append({
            "text": node.get("characters", "")[:100],
            "font_family": style.get("fontFamily", ""),
            "font_weight": style.get("fontWeight", 400),
            "font_size": style.get("fontSize", 16),
            "line_height": style.get("lineHeightPx"),
            "letter_spacing": style.get("letterSpacing", 0),
            "text_case": style.get("textCase", "ORIGINAL"),
            "node_name": node.get("name", ""),
        })
    for child in node.get("children", []):
        styles.extend(_extract_typography(child))
    return styles


def _extract_layout(node: dict, depth: int = 0, max_depth: int = 3) -> dict:
    """Extract layout structure from a Figma node (limited depth)."""
    info: dict[str, Any] = {
        "name": node.get("name", ""),
        "type": node.get("type", ""),
    }

    # Dimensions
    bbox = node.get("absoluteBoundingBox") or node.get("size")
    if bbox:
        info["width"] = round(bbox.get("width", 0))
        info["height"] = round(bbox.get("height", 0))

    # Layout
    layout_mode = node.get("layoutMode")
    if layout_mode:
        info["layout"] = layout_mode  # HORIZONTAL or VERTICAL
        info["gap"] = node.get("itemSpacing", 0)
        info["padding"] = {
            "top": node.get("paddingTop", 0),
            "right": node.get("paddingRight", 0),
            "bottom": node.get("paddingBottom", 0),
            "left": node.get("paddingLeft", 0),
        }

    # Corner radius
    cr = node.get("cornerRadius")
    if cr:
        info["border_radius"] = cr

    # Fills (first solid only)
    for fill in node.get("fills", []):
        if fill.get("type") == "SOLID" and fill.get("visible", True):
            c = fill.get("color", {})
            r, g, b = int(c.get("r", 0) * 255), int(c.get("g", 0) * 255), int(c.get("b", 0) * 255)
            info["fill"] = f"#{r:02x}{g:02x}{b:02x}"
            break

    # Children (limited depth)
    children = node.get("children", [])
    if children and depth < max_depth:
        info["children"] = [_extract_layout(c, depth + 1, max_depth) for c in children[:20]]

    return info


class FetchFigmaDataTool(BaseTool):
    """Fetch design data from a Figma URL — nodes, styles, layout, and rendered images."""

    name = "fetch_figma_data"
    description = (
        "Fetch design data from a Figma URL. Accepts a Figma file or node URL "
        "(e.g. https://www.figma.com/design/FILE_KEY/Title?node-id=302-3658). "
        "Returns the node structure, colors, typography, layout properties, "
        "and a rendered PNG image URL. Use this to inspect real Figma designs "
        "and extract component specs for prototype generation."
    )
    parameters = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": (
                    "Figma URL to fetch. Can be a file URL, a node URL with ?node-id=, "
                    "or a bare file key. Examples:\n"
                    "- https://www.figma.com/design/SPqccoINis4oLGTeT7C6Y7/Title?node-id=302-3658\n"
                    "- https://www.figma.com/file/SPqccoINis4oLGTeT7C6Y7\n"
                    "- SPqccoINis4oLGTeT7C6Y7"
                ),
            },
            "depth": {
                "type": "integer",
                "description": "How many levels of child nodes to include (1-5). Default: 3.",
            },
        },
        "required": ["url"],
    }
    tier = 2

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        url = params.get("url", "")
        depth = min(max(params.get("depth", 3), 1), 5)

        if not url.strip():
            return {"error": "url parameter is required"}

        try:
            file_key, node_id = _parse_figma_url(url)
        except ValueError as e:
            return {"error": str(e)}

        token = _get_token()
        headers = {"X-Figma-Token": token}

        logger.info(
            "fetch_figma_data file=%s node=%s (session %s)",
            file_key, node_id, ctx.session_id,
        )

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            # Fetch node data
            if node_id:
                api_url = f"{_FIGMA_API}/files/{file_key}/nodes?ids={node_id}&depth={depth}"
            else:
                api_url = f"{_FIGMA_API}/files/{file_key}?depth={depth}"

            resp = await client.get(api_url, headers=headers)
            if resp.status_code != 200:
                return {
                    "error": f"Figma API returned {resp.status_code}: {resp.text[:500]}",
                }

            data = resp.json()

            # Extract the node
            if node_id:
                nodes = data.get("nodes", {})
                node_data = nodes.get(node_id, {})
                document = node_data.get("document", {})
            else:
                document = data.get("document", {})

            if not document:
                return {"error": f"No node data found for {url}"}

            # Extract design tokens
            colors = _extract_colors(document)
            typography = _extract_typography(document)
            layout = _extract_layout(document, max_depth=depth)

            # Render image
            image_url = None
            render_id = node_id or "0:1"
            try:
                img_resp = await client.get(
                    f"{_FIGMA_API}/images/{file_key}?ids={render_id}&format=png&scale=2",
                    headers=headers,
                )
                if img_resp.status_code == 200:
                    images = img_resp.json().get("images", {})
                    image_url = images.get(render_id)
            except Exception:
                pass  # Image rendering is optional

            # Deduplicate colors
            seen_colors = set()
            unique_colors = []
            for c in colors:
                key = f"{c['hex']}-{c['opacity']}"
                if key not in seen_colors:
                    seen_colors.add(key)
                    unique_colors.append(c)

            # Deduplicate typography by font+size+weight
            seen_type = set()
            unique_type = []
            for t in typography:
                key = f"{t['font_family']}-{t['font_size']}-{t['font_weight']}"
                if key not in seen_type:
                    seen_type.add(key)
                    unique_type.append(t)

            result: dict[str, Any] = {
                "file_key": file_key,
                "node_id": node_id,
                "node_name": document.get("name", ""),
                "node_type": document.get("type", ""),
                "layout": layout,
                "colors": unique_colors[:30],
                "typography": unique_type[:20],
            }

            if image_url:
                result["image_url"] = image_url

            result["message"] = (
                f"Fetched Figma node '{document.get('name', '')}' "
                f"({document.get('type', '')}) with "
                f"{len(unique_colors)} colors, {len(unique_type)} text styles."
            )

            return result


def _collect_nodes(node: dict, types: set[str], depth: int = 0, max_depth: int = 3) -> list[dict]:
    """Recursively collect nodes of specific types from a Figma tree."""
    results = []
    node_type = node.get("type", "")

    if node_type in types:
        bbox = node.get("absoluteBoundingBox") or node.get("size") or {}
        results.append({
            "name": node.get("name", ""),
            "type": node_type,
            "node_id": node.get("id", ""),
            "width": round(bbox.get("width", 0)) if bbox else None,
            "height": round(bbox.get("height", 0)) if bbox else None,
        })

    if depth < max_depth:
        for child in node.get("children", []):
            results.extend(_collect_nodes(child, types, depth + 1, max_depth))

    return results


class GetFigmaComponentsTool(BaseTool):
    """List all components, frames, and styles in a Figma file — including unpublished ones."""

    name = "get_figma_components"
    description = (
        "List all components and top-level frames in a Figma file. "
        "This discovers BOTH published library components AND unpublished "
        "frames/components by crawling the file tree. Returns node IDs that "
        "you can pass to fetch_figma_data to inspect individual components. "
        "Use this FIRST to discover what screens and components exist, then "
        "use fetch_figma_data with specific node IDs to get detailed specs."
    )
    parameters = {
        "type": "object",
        "properties": {
            "file_key": {
                "type": "string",
                "description": (
                    "Figma file key or full URL. Examples:\n"
                    "- SPqccoINis4oLGTeT7C6Y7\n"
                    "- https://www.figma.com/design/SPqccoINis4oLGTeT7C6Y7/Title"
                ),
            },
        },
        "required": ["file_key"],
    }
    tier = 2

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        raw_key = params.get("file_key", "")
        if not raw_key.strip():
            return {"error": "file_key parameter is required"}

        try:
            file_key, _ = _parse_figma_url(raw_key)
        except ValueError as e:
            return {"error": str(e)}

        token = _get_token()
        headers = {"X-Figma-Token": token}

        logger.info(
            "get_figma_components file=%s (session %s)",
            file_key, ctx.session_id,
        )

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            # --- 1. Published components (library API) ---
            published_components = []
            try:
                resp = await client.get(
                    f"{_FIGMA_API}/files/{file_key}/components",
                    headers=headers,
                )
                if resp.status_code == 200:
                    meta = resp.json().get("meta", {})
                    for comp in meta.get("components", []):
                        published_components.append({
                            "name": comp.get("name", ""),
                            "description": comp.get("description", ""),
                            "node_id": comp.get("node_id", ""),
                            "containing_frame": comp.get("containing_frame", {}).get("name", ""),
                            "source": "published",
                        })
            except Exception as e:
                logger.warning("Failed to fetch published components: %s", e)

            # --- 2. Crawl file tree for ALL frames and components ---
            file_frames = []
            file_components = []
            file_name = ""
            pages = []
            try:
                resp = await client.get(
                    f"{_FIGMA_API}/files/{file_key}?depth=2",
                    headers=headers,
                )
                if resp.status_code == 200:
                    file_data = resp.json()
                    file_name = file_data.get("name", "")
                    document = file_data.get("document", {})

                    # Walk pages (depth 1) and their children (depth 2)
                    for page in document.get("children", []):
                        page_name = page.get("name", "")
                        pages.append({
                            "name": page_name,
                            "node_id": page.get("id", ""),
                            "child_count": len(page.get("children", [])),
                        })

                        for child in page.get("children", []):
                            child_type = child.get("type", "")
                            bbox = child.get("absoluteBoundingBox") or {}
                            node_info = {
                                "name": child.get("name", ""),
                                "type": child_type,
                                "node_id": child.get("id", ""),
                                "page": page_name,
                                "width": round(bbox.get("width", 0)) if bbox else None,
                                "height": round(bbox.get("height", 0)) if bbox else None,
                                "source": "file_tree",
                            }

                            if child_type in ("COMPONENT", "COMPONENT_SET"):
                                file_components.append(node_info)
                            elif child_type == "FRAME":
                                file_frames.append(node_info)
                            elif child_type == "INSTANCE":
                                file_components.append(node_info)
            except Exception as e:
                logger.warning("Failed to crawl file tree: %s", e)

            # --- 3. Published styles ---
            styles_list = []
            try:
                resp = await client.get(
                    f"{_FIGMA_API}/files/{file_key}/styles",
                    headers=headers,
                )
                if resp.status_code == 200:
                    meta = resp.json().get("meta", {})
                    for style in meta.get("styles", []):
                        styles_list.append({
                            "name": style.get("name", ""),
                            "type": style.get("style_type", ""),
                            "description": style.get("description", ""),
                            "node_id": style.get("node_id", ""),
                        })
            except Exception as e:
                logger.warning("Failed to fetch styles: %s", e)

            return {
                "file_key": file_key,
                "file_name": file_name,
                "pages": pages,
                "frames": file_frames[:100],
                "components_from_tree": file_components[:100],
                "published_components": published_components[:50],
                "styles": styles_list[:50],
                "summary": {
                    "pages": len(pages),
                    "frames": len(file_frames),
                    "components_in_tree": len(file_components),
                    "published_components": len(published_components),
                    "styles": len(styles_list),
                },
                "message": (
                    f"File '{file_name}': {len(pages)} pages, "
                    f"{len(file_frames)} top-level frames, "
                    f"{len(file_components)} components in tree, "
                    f"{len(published_components)} published components, "
                    f"{len(styles_list)} styles. "
                    f"Use fetch_figma_data with specific node_id values to inspect individual components."
                ),
            }
