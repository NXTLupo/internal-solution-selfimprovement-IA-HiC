---
id: articles/hugging-face-blog/fbcb38f95c.md
url: "https://huggingface.co/blog/modular-diffusers"
url_hash: "fbcb38f95c"
kind: "article"
source: "Hugging Face Blog"
title: "Introducing Modular Diffusers - Composable Building Blocks for Diffusion Pipelines"
author: ""
date: "Thu, 05 Mar 2026 00:00:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-13T17:18:09.821944+00:00"
chars: 10000
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
collected_at: "2026-08-13T17:18:09.411Z"
relevance: 0
engagement_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
content_hash: "f1db24ad39af6705"
relevance_by_goal: {"bb7e192171b3":0}
chunks:
  - id: "articles/hugging-face-blog/fbcb38f95c.md#c0"
    char_span: [0, 160]
    sentence_count: 1
    key_terms: [modular-diffusers, blog, huggingface, introducing, composable, diffusers, diffusion, pipelines]
    token_count: 38
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/modular-diffusers","kind":"article","date":"2026-03-05"}]
  - id: "articles/hugging-face-blog/fbcb38f95c.md#c1"
    char_span: [162, 2352]
    sentence_count: 7
    key_terms: [blocks, pipeline, modular, diffusionpipeline, pipe, diffusers, image, own]
    concepts: [blocks, pipeline, diffusionpipeline, modular, diffusers]
    related_chunks: ["articles/hugging-face-blog/fbcb38f95c.md#c4"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/modular-diffusers","kind":"article","date":"2026-03-05"}]
  - id: "articles/hugging-face-blog/fbcb38f95c.md#c2"
    char_span: [2074, 4506]
    sentence_count: 4
    key_terms: [blocks, self, components, block, image, depth, torch, black-forest-labs]
    concepts: [blocks, components, block, image, black-forest-labs]
    related_chunks: ["articles/hugging-face-blog/fbcb38f95c.md#c3"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/modular-diffusers","kind":"article","date":"2026-03-05"}]
  - id: "articles/hugging-face-blog/fbcb38f95c.md#c3"
    char_span: [4191, 6598]
    sentence_count: 4
    key_terms: [blocks, depth, requires, block, image, componentsmanager, controlnet, prompt]
    concepts: [blocks, depth, componentsmanager, requires, block]
    related_chunks: ["articles/hugging-face-blog/fbcb38f95c.md#c2"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/modular-diffusers","kind":"article","date":"2026-03-05"}]
  - id: "articles/hugging-face-blog/fbcb38f95c.md#c4"
    char_span: [6269, 8617]
    sentence_count: 5
    key_terms: [diffusers, pipeline, componentsmanager, controlnet, depth-processor-custom-block, repo, modular, flux2-bnb-4bit-modular]
    concepts: [diffusers, pipeline, componentsmanager, depth-processor-custom-block, controlnet]
    related_chunks: ["articles/hugging-face-blog/fbcb38f95c.md#c1"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/modular-diffusers","kind":"article","date":"2026-03-05"}]
  - id: "articles/hugging-face-blog/fbcb38f95c.md#c5"
    char_span: [8349, 10163]
    sentence_count: 5
    key_terms: [diffusers, flux2transformer2dmodel, flux2-bnb-4bit-modular, transformer, autoencoderklflux2, modularpipeline, modular, video-to-video]
    concepts: [diffusers, flux2transformer2dmodel, flux2-bnb-4bit-modular, transformer, autoencoderklflux2]
    token_count: 430
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/modular-diffusers","kind":"article","date":"2026-03-05"}]
---
# Introducing Modular Diffusers - Composable Building Blocks for Diffusion Pipelines

Source: [Hugging Face Blog](https://huggingface.co/blog/modular-diffusers)

Introducing Modular Diffusers - Composable Building Blocks for Diffusion Pipelines
DiffusionPipeline class with a more flexible, composable alternative.
In this post, we'll walk through how Modular Diffusers works — from the familiar API to run a modular pipeline, to building fully custom blocks and composing them into your own workflow. We'll also show how it integrates with Mellon, a node-based visual workflow interface that you can use to wire Modular Diffusers blocks together.
Table of contents
Quickstart
Here is a simple example of how to run inference with FLUX.2 Klein 4B using pre-built blocks:
import torch
from diffusers import ModularPipeline
# Create a modular pipeline - this only defines the workflow, model weights have not been loaded yet
pipe = ModularPipeline.from_pretrained(
    "black-forest-labs/FLUX.2-klein-4B"
)
#  Now load the model weights — configure dtype, quantization, etc in this step
pipe.load_components(torch_dtype=torch.bfloat16)
pipe.to("cuda")
# Generate an image - API remains the same as DiffusionPipeline
image = pipe(
    prompt="a serene landscape at sunset",
    num_inference_steps=4,
).images[0]
image.save("output.png")
You get the same results as with a standard DiffusionPipeline, but the pipeline is very different under the hood: it's composed of flexible blocks — text encoding, image encoding, denoising, and decoding — that you can inspect directly:
print(pipe.blocks)
Flux2KleinAutoBlocks(
  ...
  Sub-Blocks:
    [0] text_encoder (Flux2KleinTextEncoderStep)
    [1] vae_encoder (Flux2KleinAutoVaeEncoderStep)
    [2] denoise (Flux2KleinCoreDenoiseStep)
    [3] decode (Flux2DecodeStep)
)
Each block is self-contained with its own inputs and outputs. You can run any block independently as its own pipeline, or add, remove, and swap blocks freely — they dynamically recompose to work with whatever blocks remain. Use .init_pipeline() to convert blocks into a runnable pipeline, and .load_components() to load the model weights.
# get a copy of the blocks
blocks = pipe.blocks
# pop out the text_encoder block
text_blocks = blocks.sub_blocks.pop("text_encoder")
# run it as its own pipeline
text_pipe = text_blocks.init_pipeline("black-forest-labs/FLUX.2-klein-4B")
# load the text_encoder, or reuse already loaded components: text_pipe.update_components(text_encoder=pipe.text_encoder)
text_pipe.load_components(torch_dtype=torch.bfloat16)
text_pipe.to("cuda")
prompt_embeds = text_pipe(prompt="a serene landscape at sunset").prompt_embeds
# create a new pipeline from the remaining blocks
# it now accepts prompt_embeds directly instead of prompt
remaining_pipe = blocks.init_pipeline("black-forest-labs/FLUX.2-klein-4B")
remaining_pipe.load_components(torch_dtype=torch.bfloat16)
remaining_pipe.to("cuda")
image = remaining_pipe(prompt_embeds=prompt_embeds, num_inference_steps=4).images[0]
For more on block types, composition patterns, lazy loading, and memory management with ComponentsManager, check out the Modular Diffusers documentation.
Custom Blocks
Modular Diffusers really shines when creating your own blocks. A custom block is a Python class that defines its components, inputs, outputs, and computation logic — and once defined, you can plug it into any workflow.
Writing a Custom Block
Here's an example block that extracts depth maps from images using Depth Anything V2.
class DepthProcessorBlock(ModularPipelineBlocks):
    @property
    def expected_components(self):
        return [
            ComponentSpec("depth_processor", DepthPreprocessor,
                          pretrained_model_name_or_path="depth-anything/Depth-Anything-V2-Large-hf")
        ]
    @property
    def inputs(self):
        return [
            InputParam("image", required=True,
                       description="Image(s) to extract depth maps from"),
        ]
    @property
    def intermediate_outputs(self):
        return [
            OutputParam("control_image", type_hint=torch.Tensor,
                        description="Depth map(s) of input image(s)"),
        ]
    @torch.no_grad()
    def __call__(self, components, state):
        block_state = self.get_block_state(state)
        depth_map = components.depth_processor(block_state.image)
        block_state.control_image = depth_map.to(block_state.device)
        self.set_block_state(state, block_state)
        return components, state
- expected_componentsdefines what models the block needs — in this case, a depth estimation model. The- pretrained_model_name_or_pathparameter sets a default Hub repo to load from, so- load_componentsautomatically fetches the depth model unless you override it in- modular_model_index.json.
- inputsand- intermediate_outputsdefine what goes in and comes out.
- __call__is where the computation logic lives.
Composing Blocks into Workflows
Let's use this block with Qwen's ControlNet workflow. Extract the ControlNet workflow and insert the depth block at the beginning:
# Create Qwen Image pipeline
pipe = ModularPipeline.from_pretrained("Qwen/Qwen-Image")
print(pipe.blocks.available_workflows)
#       Supported workflows:
#        - `text2image`: requires `prompt`
#        - `image2image`: requires `prompt`, `image`
#        - `inpainting`: requires `prompt`, `mask_image`, `image`
#        - `controlnet_text2image`: requires `prompt`, `control_image`
#        - `controlnet_image2image`: requires `prompt`, `image`, `control_image`
# Extract the ControlNet workflow — it expects a control_image input
blocks = pipe.blocks.get_workflow("controlnet_text2image")
# Show the blocks this workflow uses
print(blocks)
# Insert depth block at the beginning — its output (control_image)
# automatically flows to the ControlNet block that needs it
blocks.sub_blocks.insert("depth", DepthProcessorBlock(), 0)
# You can inspect any block's inputs and outputs with print(blocks.doc)
blocks.sub_blocks['depth'].doc
Blocks in a sequence share data automatically: the depth block's control_image output flows to downstream blocks that need it, and its image input becomes a pipeline input since no earlier block provides it.
from diffusers import ComponentsManager, AutoModel
from diffusers.utils import load_image
# ComponentsManager handles memory across multiple pipelines —
# it automatically offloads models to CPU when not in use
manager = ComponentsManager()
pipeline = blocks.init_pipeline("Qwen/Qwen-Image", components_manager=manager)
pipeline.load_components(torch_dtype=torch.bfloat16)
# The depth model loads automatically from the default path we set in expected_components —
# no need to load it manually even though it's not part of the Qwen repo.
# But controlnet is not included by default, so we do need to load it from a different repo
controlnet = AutoModel.from_pretrained("InstantX/Qwen-Image-ControlNet-Union", torch_dtype=torch.bfloat16)
pipeline.update_components(controlnet=controlnet)
# pipeline now takes image as input
image = load_image("https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/diffusers/astronaut.jpg")
output = pipeline(
    prompt="an astronaut hatching from an egg, detailed, fantasy, Pixar, Disney",
    image=image,
).images[0]
Sharing Custom Blocks on the Hub
You can publish your custom block to the Hub so anyone can load it with trust_remote_code=True. We've created a template to get you started — check out the Building Custom Blocks guide for the full walkthrough.
pipeline.save_pretrained(local_dir, repo_id="your-username/your-block-name", push_to_hub=True)
The DepthProcessorBlock from this post is published at diffusers/depth-processor-custom-block — you can load and use it directly:
from diffusers import ModularPipelineBlocks
depth_block = ModularPipelineBlocks.from_pretrained(
    "diffusers/depth-processor-custom-block", trust_remote_code=True
)
We've published a collection of ready-to-use custom blocks here.
Modular Repositories
ModularPipeline.from_pretrained works with any existing Diffusers repo out of the box, but Modular Diffusers also introduces a new kind of repo: the Modular Repository.
A modular repository is able to reference components from their original model repos. For example, diffusers/flux2-bnb-4bit-modular contains a quantized transformer and loads the remaining components from the original repo.
// diffusers/flux2-bnb-4bit-modular/modular_model_index.json
{
    "transformer": [
        "diffusers", 
        "Flux2Transformer2DModel", 
        {
            "pretrained_model_name_or_path": "diffusers/flux2-bnb-4bit-modular",
            "subfolder": "transformer",
            "type_hint": ["diffusers", "Flux2Transformer2DModel"]
        }
    ],
    "vae": [
        "diffusers", 
        "AutoencoderKLFlux2", 
        {
            "pretrained_model_name_or_path": "black-forest-labs/FLUX.2-dev",
            "subfolder": "vae",
            "type_hint": ["diffusers", "AutoencoderKLFlux2"]
        }
    ],
    ...
}
Modular repositories can also host custom pipeline blocks as Python code and visual UI configurations for tools like Mellon — all in one place.
Community Pipelines
The community has already started building complete pipelines with Modular Diffusers and publishing them on the Hub, with model weights and ready-to-run code.
- Krea Realtime Video — A 14B parameter real-time video generation model distilled from Wan 2.1, achieving 11fps on a single B200 GPU. It supports text-to-video, video-to-video, and streaming video-to-video — all built as modular blocks. Users can modify prompts mid-generation, restyle videos on-the-fly, and see first frames within 1 second.
import torch
from diffusers import ModularPipeline
pipe = ModularPipeline.from_pretrained("krea/krea-realtime-video", trust_remote_code=True)
pipe.load_components(
    trust_remote_code=True, 
    device_map="cuda",
    torch_dtype={"default": torch.bfloat16, "vae": torch.float16}
)
- Waypoint-1 — A 2.3B parameter real-time diffusion world model from Overworld. It autoregressively generates interactive worlds from contro
