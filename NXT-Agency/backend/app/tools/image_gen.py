"""
Image generation tools using OpenAI (gpt-image-1), Replicate (Flux), and Google (Imagen).

These tools allow agents to actually generate images rather than just
writing prompts about them.
"""

import base64
import logging
import os
import time
import uuid
from pathlib import Path

import httpx

from .base import BaseTool, AgentContext

logger = logging.getLogger(__name__)

# Output directory for generated images
OUTPUT_DIR = Path(os.environ.get("IMAGE_OUTPUT_DIR", "./generated-images"))


class GenerateImageOpenAITool(BaseTool):
    """Generate an image using OpenAI's gpt-image-1 model."""

    name = "generate_image_openai"
    description = (
        "Generate an image using OpenAI's gpt-image-1 model. "
        "Provide a detailed prompt describing the image you want to create. "
        "Returns the file path of the saved image. "
        "Supports photorealistic images, illustrations, text rendering, and editing."
    )
    parameters = {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Detailed description of the image to generate",
            },
            "size": {
                "type": "string",
                "enum": ["1024x1024", "1536x1024", "1024x1536", "auto"],
                "description": "Image dimensions (default: 1024x1024)",
            },
            "quality": {
                "type": "string",
                "enum": ["low", "medium", "high"],
                "description": "Image quality level (default: medium)",
            },
        },
        "required": ["prompt"],
    }
    tier = 2

    async def execute(self, params: dict, context: AgentContext) -> dict:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {"error": "OPENAI_API_KEY not configured"}

        prompt = params["prompt"]
        size = params.get("size", "1024x1024")
        quality = params.get("quality", "medium")

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"openai_{uuid.uuid4().hex[:8]}_{int(time.time())}.png"
        filepath = OUTPUT_DIR / filename

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-image-1",
                        "prompt": prompt,
                        "n": 1,
                        "size": size,
                        "quality": quality,
                        "output_format": "png",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            # gpt-image-1 returns base64
            image_data = data["data"][0]
            if "b64_json" in image_data:
                img_bytes = base64.b64decode(image_data["b64_json"])
                filepath.write_bytes(img_bytes)
            elif "url" in image_data:
                # Download from URL
                async with httpx.AsyncClient(timeout=60.0) as client:
                    img_resp = await client.get(image_data["url"])
                    filepath.write_bytes(img_resp.content)

            logger.info("Generated image: %s (%d bytes)", filepath, filepath.stat().st_size)
            return {
                "success": True,
                "file_path": str(filepath.resolve()),
                "file_name": filename,
                "model": "gpt-image-1",
                "size": size,
                "quality": quality,
                "prompt_used": prompt[:200],
            }
        except httpx.HTTPStatusError as e:
            return {"error": f"OpenAI API error: {e.response.status_code} - {e.response.text[:500]}"}
        except Exception as e:
            return {"error": f"Image generation failed: {str(e)}"}


class GenerateImageGeminiTool(BaseTool):
    """Generate an image using Google Gemini's Imagen model."""

    name = "generate_image_gemini"
    description = (
        "Generate an image using Google Gemini's image generation capabilities. "
        "Provide a detailed prompt. Returns the file path of the saved image."
    )
    parameters = {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Detailed description of the image to generate",
            },
        },
        "required": ["prompt"],
    }
    tier = 2

    async def execute(self, params: dict, context: AgentContext) -> dict:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {"error": "GEMINI_API_KEY not configured"}

        prompt = params["prompt"]
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"gemini_{uuid.uuid4().hex[:8]}_{int(time.time())}.png"
        filepath = OUTPUT_DIR / filename

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": f"Generate an image: {prompt}"}]}],
                        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            # Extract image from response
            for candidate in data.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    if "inlineData" in part:
                        img_bytes = base64.b64decode(part["inlineData"]["data"])
                        filepath.write_bytes(img_bytes)
                        logger.info("Generated Gemini image: %s", filepath)
                        return {
                            "success": True,
                            "file_path": str(filepath.resolve()),
                            "file_name": filename,
                            "model": "gemini-imagen",
                            "prompt_used": prompt[:200],
                        }

            return {"error": "No image data in Gemini response"}
        except httpx.HTTPStatusError as e:
            return {"error": f"Gemini API error: {e.response.status_code} - {e.response.text[:500]}"}
        except Exception as e:
            return {"error": f"Image generation failed: {str(e)}"}


class GenerateImageReplicateTool(BaseTool):
    """Generate an image using Replicate's Flux model."""

    name = "generate_image_flux"
    description = (
        "Generate an image using Flux (via Replicate). "
        "Excellent for artistic, stylized, and photorealistic images. "
        "Provide a detailed prompt. Returns the file path of the saved image."
    )
    parameters = {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Detailed description of the image to generate",
            },
            "aspect_ratio": {
                "type": "string",
                "enum": ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
                "description": "Aspect ratio (default: 1:1)",
            },
        },
        "required": ["prompt"],
    }
    tier = 2

    async def execute(self, params: dict, context: AgentContext) -> dict:
        api_key = os.environ.get("REPLICATE_API_TOKEN")
        if not api_key:
            return {"error": "REPLICATE_API_TOKEN not configured"}

        prompt = params["prompt"]
        aspect_ratio = params.get("aspect_ratio", "1:1")
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"flux_{uuid.uuid4().hex[:8]}_{int(time.time())}.png"
        filepath = OUTPUT_DIR / filename

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                # Create prediction
                resp = await client.post(
                    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": {
                            "prompt": prompt,
                            "aspect_ratio": aspect_ratio,
                            "output_format": "png",
                            "num_outputs": 1,
                        }
                    },
                )
                resp.raise_for_status()
                prediction = resp.json()

                # Poll for completion
                prediction_url = prediction.get("urls", {}).get("get", prediction.get("url"))
                if not prediction_url:
                    return {"error": "No prediction URL returned"}

                for _ in range(60):  # Max 60 polls (5 min)
                    await __import__("asyncio").sleep(5)
                    poll_resp = await client.get(
                        prediction_url,
                        headers={"Authorization": f"Bearer {api_key}"},
                    )
                    poll_data = poll_resp.json()
                    status = poll_data.get("status")

                    if status == "succeeded":
                        output = poll_data.get("output", [])
                        if output:
                            img_url = output[0] if isinstance(output, list) else output
                            img_resp = await client.get(img_url)
                            filepath.write_bytes(img_resp.content)
                            logger.info("Generated Flux image: %s", filepath)
                            return {
                                "success": True,
                                "file_path": str(filepath.resolve()),
                                "file_name": filename,
                                "model": "flux-schnell",
                                "aspect_ratio": aspect_ratio,
                                "prompt_used": prompt[:200],
                            }
                        return {"error": "Prediction succeeded but no output"}
                    elif status == "failed":
                        return {"error": f"Replicate prediction failed: {poll_data.get('error', 'unknown')}"}

                return {"error": "Prediction timed out after 5 minutes"}
        except httpx.HTTPStatusError as e:
            return {"error": f"Replicate API error: {e.response.status_code} - {e.response.text[:500]}"}
        except Exception as e:
            return {"error": f"Image generation failed: {str(e)}"}
