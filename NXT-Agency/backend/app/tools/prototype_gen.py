"""
Prototype generation tool for the UI Designer agent.

Generates self-contained HTML/CSS prototypes that use the NXT Humans 2026
design system tokens.  The output is a single HTML file with embedded styles
and fonts that can be previewed directly in a browser or iframe.

Tier 3: only available to agents with elevated privileges.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.prototype_gen")

# NXT Humans 2026 design tokens — embedded in every generated prototype
NXT_DESIGN_TOKENS_CSS = """\
/* ===== NXT Humans 2026 Design System Tokens ===== */
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@200;300;400;500;600;700;800;900&family=Inter:wght@400;700;800&display=swap');

:root {
  /* Brand Colors */
  --nxt-teal: #115054;
  --nxt-lime: #caca20;
  --nxt-teal-40: rgba(17, 80, 84, 0.4);

  /* Accent Colors (from Approach section) */
  --nxt-blue: #00b1eb;
  --nxt-orange: #fd8e2e;
  --nxt-coral: #ff6958;
  --nxt-purple: #5a07bf;
  --nxt-linkedin: #2396bc;

  /* Neutral Scale */
  --nxt-black: #000000;
  --nxt-darkest: #141414;
  --nxt-dark: #242424;
  --nxt-med: #3a3a3a;
  --nxt-gray: #525252;
  --nxt-label: #acacac;
  --nxt-light: #eaeaea;
  --nxt-lightest: #fafafa;
  --nxt-white: #ffffff;
  --nxt-white-60: rgba(255, 255, 255, 0.6);

  /* Semantic */
  --color-bg-primary: var(--nxt-darkest);
  --color-bg-secondary: var(--nxt-dark);
  --color-bg-accent: var(--nxt-teal);
  --color-bg-cta: var(--nxt-lime);
  --color-text-primary: var(--nxt-white);
  --color-text-secondary: var(--nxt-light);
  --color-text-muted: var(--nxt-lightest);
  --color-text-on-cta: var(--nxt-teal);

  /* Font Families */
  --font-display: 'AgencyFB', 'Impact', 'Haettenschweiler', sans-serif;
  --font-primary: 'Archivo', 'Helvetica Neue', Arial, sans-serif;
  --font-accent: 'Inter', 'Helvetica Neue', Arial, sans-serif;

  /* Spacing */
  --space-xxs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 64px;

  /* Radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-circle: 50%;

  /* Blur */
  --blur-frosted: 32px;
}

/* === Base Reset === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body {
  font-family: var(--font-primary);
  font-weight: 300;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  line-height: 1.5;
}
img { max-width: 100%; display: block; }

/* === NXT Typography === */
.nxt-display-xxxl { font-family: var(--font-display); font-weight: 900; font-size: 180px; line-height: 180px; letter-spacing: 1.8px; text-transform: uppercase; }
.nxt-display-xxl  { font-family: var(--font-display); font-weight: 900; font-size: 100px; line-height: 100px; letter-spacing: 1px; text-transform: uppercase; }
.nxt-h1 { font-family: var(--font-primary); font-weight: 200; font-size: 72px; line-height: 80px; }
.nxt-h2 { font-family: var(--font-primary); font-weight: 200; font-size: 52px; line-height: 56px; }
.nxt-h3 { font-family: var(--font-primary); font-weight: 200; font-size: 44px; line-height: 60px; }
.nxt-h4 { font-family: var(--font-primary); font-weight: 500; font-size: 21px; line-height: 40px; }
.nxt-body { font-family: var(--font-primary); font-weight: 300; font-size: 18px; line-height: 26px; }
.nxt-body-sm { font-family: var(--font-primary); font-weight: 300; font-size: 16px; line-height: 18px; }
.nxt-caption { font-family: var(--font-primary); font-weight: 300; font-size: 12px; line-height: 14px; }
.nxt-caption-bold { font-family: var(--font-primary); font-weight: 700; font-size: 12px; line-height: 14px; }
.nxt-button-text { font-family: var(--font-primary); font-weight: 700; font-size: 12px; line-height: 14px; text-transform: uppercase; }

/* === NXT Button === */
.nxt-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  font-family: var(--font-primary); font-weight: 700; font-size: 12px; text-transform: uppercase;
  padding: 16px 24px; border: none; border-radius: var(--radius-sm); cursor: pointer;
  transition: all 150ms ease; height: 48px; text-decoration: none;
}
.nxt-btn-primary { background: var(--nxt-lime); color: var(--nxt-teal); }
.nxt-btn-primary:hover { filter: brightness(1.1); }
.nxt-btn-secondary { background: var(--nxt-med); color: var(--nxt-light); }
.nxt-btn-secondary:hover { background: var(--nxt-dark); }

/* === NXT Form === */
.nxt-input {
  width: 100%; height: 56px; padding: 16px;
  background: var(--nxt-darkest); border: 1px solid var(--nxt-med);
  border-radius: var(--radius-sm); color: var(--nxt-light);
  font-family: var(--font-primary); font-weight: 300; font-size: 14px;
  transition: border-color 150ms;
}
.nxt-input:focus { outline: none; border-color: var(--nxt-lime); }
.nxt-input::placeholder { color: var(--nxt-gray); }
.nxt-label { font-family: var(--font-primary); font-weight: 300; font-size: 14px; color: var(--nxt-light); margin-bottom: 8px; display: block; }

/* === NXT Card === */
.nxt-card {
  background: var(--nxt-dark); border: 1px solid var(--nxt-med);
  border-radius: var(--radius-sm); overflow: hidden;
  transition: all 300ms ease;
}
.nxt-card:hover { border-color: var(--nxt-lime); }

/* === NXT Nav === */
.nxt-nav {
  background: var(--nxt-black); border-radius: var(--radius-md);
  padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
}

/* === NXT Frosted Glass === */
.nxt-frosted {
  background: var(--nxt-teal-40);
  backdrop-filter: blur(var(--blur-frosted));
  -webkit-backdrop-filter: blur(var(--blur-frosted));
}

/* === Layout Utilities === */
.nxt-section { width: 100%; max-width: 1440px; margin: 0 auto; padding: var(--space-lg); }
.nxt-container { max-width: 920px; margin: 0 auto; }
.nxt-flex { display: flex; }
.nxt-flex-col { display: flex; flex-direction: column; }
.nxt-gap-xs { gap: var(--space-xs); }
.nxt-gap-sm { gap: var(--space-sm); }
.nxt-gap-md { gap: var(--space-md); }
.nxt-gap-lg { gap: var(--space-lg); }
.nxt-gap-xl { gap: var(--space-xl); }
.nxt-center { display: flex; align-items: center; justify-content: center; }
.nxt-between { display: flex; align-items: center; justify-content: space-between; }
"""


class GeneratePrototypeTool(BaseTool):
    """Generate a self-contained HTML prototype using the NXT Humans design system."""

    name = "generate_prototype"
    description = (
        "Generate a self-contained HTML prototype with NXT Humans 2026 design system "
        "(all CSS tokens, fonts, component classes are auto-injected). "
        "Returns the full HTML for iframe preview."
    )
    parameters = {
        "type": "object",
        "properties": {
            "html_content": {
                "type": "string",
                "description": (
                    "REQUIRED. The HTML for the <body>. NXT CSS classes (nxt-btn, nxt-card, "
                    "nxt-input, nxt-h1-h4, nxt-section, etc.) and CSS vars (--nxt-teal, "
                    "--nxt-lime, --nxt-dark, etc.) are pre-loaded. Keep under 8000 chars for "
                    "reliability. Add <style> blocks for custom styles."
                ),
            },
            "title": {
                "type": "string",
                "description": "Page title. Default: 'NXT Prototype'.",
            },
            "filename": {
                "type": "string",
                "description": "Output filename. Default: 'prototype.html'.",
            },
        },
        "required": ["html_content"],
    }
    tier = 3

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        html_content = params.get("html_content", "")
        if not html_content.strip():
            return {
                "error": (
                    "html_content parameter is REQUIRED and was missing or empty. "
                    "This usually happens when output was truncated. "
                    "Please call generate_prototype again with html_content containing "
                    "the HTML for the body. Keep it concise (under 8000 chars). "
                    "Example: '<div class=\"nxt-section\"><h1 class=\"nxt-h1\">Hello</h1></div>'"
                ),
            }

        filename = params.get("filename", "prototype.html")
        title = params.get("title", "NXT Prototype")

        # Sanitize filename
        filename = filename.replace("..", "").replace("/", "").replace("\\", "")
        if not filename.endswith(".html"):
            filename += ".html"

        # Build full HTML document
        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
{NXT_DESIGN_TOKENS_CSS}
  </style>
</head>
<body>
{html_content}
</body>
</html>"""

        # Write to sandbox
        sandbox = Path(ctx.working_dir) / ctx.session_id
        sandbox.mkdir(parents=True, exist_ok=True)
        output_path = sandbox / filename
        output_path.write_text(full_html, encoding="utf-8")

        logger.info(
            "generate_prototype file=%s size=%d (session %s)",
            filename,
            len(full_html),
            ctx.session_id,
        )

        return {
            "file_path": str(output_path),
            "filename": filename,
            "html": full_html,
            "size_bytes": len(full_html),
            "message": f"Prototype '{filename}' generated successfully with NXT Humans design system.",
        }
