"""design_assets.py - static brand asset resolution for /api/design-assets/{brand}/{filename}.

Kept as a tiny import-safe module (no FastAPI, no app startup side effects) so the
filename guard can be unit-tested without importing app.py. app.py imports the
helpers and mounts the route; the DECIEM tokens block (figma-tokens.json ->
DECIEM.art.assetsRoute) points the SPA at the same route.

Asset roots mirror the token loader's container-first, repo-relative fallback:
  /hic-workspace/design-system/<brand>/        (container mount)
  <repo>/humans-in-control-research/hic-workspace/design-system/<brand>/  (local dev)
"""
import os
import re

# Brands whose asset directory may be served. NXT and NU are Figma-mode brands and
# carry no static art; DECIEM is PPTX-template-sourced and ships jpg/png layout art.
ASSET_BRANDS = ("deciem",)

# One plain filename, no path separators, allow-listed extensions only.
DESIGN_ASSET_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.(jpg|jpeg|png|json|pptx)$")

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".json": "application/json",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

_HERE = os.path.dirname(os.path.abspath(__file__))


def is_safe_asset_name(filename: str) -> bool:
    """True only for a bare filename with an allow-listed extension. Rejects any path
    separator, parent-directory segment, or unknown extension."""
    if not isinstance(filename, str) or not filename:
        return False
    if "/" in filename or "\\" in filename or ".." in filename:
        return False
    return bool(DESIGN_ASSET_NAME_RE.match(filename))


def media_type_for(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return _MEDIA_TYPES.get(ext, "application/octet-stream")


def design_assets_dir(brand: str) -> str:
    """Resolve the asset directory for a brand: container mount first, then the
    repo-relative path (same fallback order as the figma-tokens.json loader)."""
    b = (brand or "").strip().lower()
    container = os.path.join("/hic-workspace", "design-system", b)
    if os.path.isdir(container):
        return container
    return os.path.normpath(os.path.join(_HERE, "..", "hic-workspace", "design-system", b))


def resolve_design_asset(brand: str, filename: str):
    """Return (absolute_path, media_type) for a servable asset, or None when the brand
    is not allow-listed, the name fails the guard, or the file does not exist."""
    b = (brand or "").strip().lower()
    if b not in ASSET_BRANDS or not is_safe_asset_name(filename):
        return None
    root = design_assets_dir(b)
    path = os.path.normpath(os.path.join(root, filename))
    # Belt and braces: the resolved path must stay inside the brand directory.
    if os.path.dirname(path) != os.path.normpath(root):
        return None
    if not os.path.isfile(path):
        return None
    return path, media_type_for(filename)
