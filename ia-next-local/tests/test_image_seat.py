"""The image seat is MOSS-Image-SFT, with Stable Diffusion 3.5 Large as its fallback (owner's decision, 25 Nov)."""
from ia_next import config, localmedia, providers


def _engine(monkeypatch, has_moss, fail_moss=False):
    seen = []
    monkeypatch.setattr(localmedia, "available", lambda wait=0: True)
    monkeypatch.setattr(localmedia, "moss_ready", lambda: has_moss)

    def run(graph, kinds, minutes, what):
        seen.append(graph)
        if fail_moss and "15" in graph:
            raise providers.ProviderError("the engine stopped")
        return b"png"
    monkeypatch.setattr(localmedia, "_run", run)
    return seen


def test_pictures_are_made_by_moss_image_when_the_engine_holds_it(monkeypatch):
    seen = _engine(monkeypatch, True)
    png, engine = localmedia.image("a nurse writing on a clipboard", "1024x1024")
    g = seen[0]
    assert engine == "comfyui:moss-image-sft" == config.SEATS["image"]["primary"]
    assert g["1"]["inputs"]["unet_name"] == "moss_image_sft_bf16.safetensors" and g["2"]["inputs"]["type"] == "moss_image"
    assert g["7"]["inputs"]["steps"] == localmedia.MOSS_STEPS and g["6"]["inputs"]["width"] == 1024
    assert g["4"]["inputs"]["text"] == "a nurse writing on a clipboard"


def test_the_earlier_model_makes_the_picture_when_moss_is_absent_or_fails(monkeypatch):
    seen = _engine(monkeypatch, False)
    assert localmedia.image("p", "768x768")[1] == "comfyui:sd3.5-large" and "CheckpointLoaderSimple" in str(seen[0])
    seen = _engine(monkeypatch, True, fail_moss=True)
    png, engine = localmedia.image("p", "768x768")
    assert engine == "comfyui:sd3.5-large" and len(seen) == 2                # MOSS was tried, then the picture was still made
