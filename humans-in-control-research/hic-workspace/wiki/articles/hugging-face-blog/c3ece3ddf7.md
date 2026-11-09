---
id: articles/hugging-face-blog/c3ece3ddf7.md
url: "https://huggingface.co/blog/ai-art-newsletter-jan-25"
url_hash: "c3ece3ddf7"
kind: "article"
source: "Hugging Face Blog"
title: "The AI tools for Art Newsletter - Issue 1"
author: ""
date: "Fri, 31 Jan 2025 00:00:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:51:13.331686+00:00"
chars: 10000
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:51:12.852Z"
relevance: 10
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "729bd771a53380b0"
relevance_by_goal: {"aa6916010743":10}
chunks:
  - id: "articles/hugging-face-blog/c3ece3ddf7.md#c0"
    char_span: [0, 126]
    sentence_count: 1
    key_terms: [ai-art-newsletter-jan-25, blog, huggingface, newsletter, hugging, source, https, issue]
    token_count: 37
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ai-art-newsletter-jan-25","kind":"article","date":"2025-01-31"}]
  - id: "articles/hugging-face-blog/c3ece3ddf7.md#c1"
    char_span: [128, 2540]
    sentence_count: 14
    key_terms: [models, diffusion, generation, image, source, tools, matching, releases]
    concepts: [diffusion, models, generation, image, source]
    related_chunks: ["articles/hugging-face-blog/c3ece3ddf7.md#c2", "articles/hugging-face-blog/c3ece3ddf7.md#c3", "articles/hugging-face-blog/c3ece3ddf7.md#c5"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ai-art-newsletter-jan-25","kind":"article","date":"2025-01-31"}]
  - id: "articles/hugging-face-blog/c3ece3ddf7.md#c2"
    char_span: [2284, 4892]
    sentence_count: 12
    key_terms: [models, personalization, quality, generation, techniques, image, understanding, components]
    concepts: [models, personalization, generation, techniques, quality]
    related_chunks: ["articles/hugging-face-blog/c3ece3ddf7.md#c1", "articles/hugging-face-blog/c3ece3ddf7.md#c3", "articles/hugging-face-blog/c3ece3ddf7.md#c5"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ai-art-newsletter-jan-25","kind":"article","date":"2025-01-31"}]
  - id: "articles/hugging-face-blog/c3ece3ddf7.md#c3"
    char_span: [4583, 7211]
    sentence_count: 16
    key_terms: [generation, video, models, audio, year, quality, open-source, significant]
    concepts: [generation, video, models, audio, open-source]
    related_chunks: ["articles/hugging-face-blog/c3ece3ddf7.md#c1", "articles/hugging-face-blog/c3ece3ddf7.md#c2", "articles/hugging-face-blog/c3ece3ddf7.md#c4", "articles/hugging-face-blog/c3ece3ddf7.md#c5"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ai-art-newsletter-jan-25","kind":"article","date":"2025-01-31"}]
  - id: "articles/hugging-face-blog/c3ece3ddf7.md#c4"
    char_span: [6922, 9167]
    sentence_count: 16
    key_terms: [models, flux, year, audio, community, diffusers, face, new]
    concepts: [models, community, diffusers, audio, creative]
    related_chunks: ["articles/hugging-face-blog/c3ece3ddf7.md#c3"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ai-art-newsletter-jan-25","kind":"article","date":"2025-01-31"}]
  - id: "articles/hugging-face-blog/c3ece3ddf7.md#c5"
    char_span: [8873, 10129]
    sentence_count: 6
    key_terms: [models, generation, model, open-source, source, competitive, read, try]
    concepts: [models, generation, model, open-source, source]
    related_chunks: ["articles/hugging-face-blog/c3ece3ddf7.md#c1", "articles/hugging-face-blog/c3ece3ddf7.md#c2", "articles/hugging-face-blog/c3ece3ddf7.md#c3"]
    token_count: 326
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ai-art-newsletter-jan-25","kind":"article","date":"2025-01-31"}]
---
# The AI tools for Art Newsletter - Issue 1

Source: [Hugging Face Blog](https://huggingface.co/blog/ai-art-newsletter-jan-25)

The AI tools for Art Newsletter
First issue 🎉
The AI space is moving so fast it’s hard to believe that a year ago we still struggled to generate people with the correct amount of fingers 😂.
The last couple of years have been pivotal for open source models and tools for artistic usage. AI tools for creative expression have never been more accessible, and we’re only scratching the surface. Join us as we look back at the key milestones, tools, and breakthroughs in AI & Arts from 2024, and forward for what’s to come in 2025 (spoiler 👀: we’re starting a new monthly roundup 👇).
Table of Contents
Major Releases of 2024
What were the standout releases of creative AI tools in 2024? We'll highlight the major releases across creative and artistic fields, with a particular focus on open-source developments in popular tasks like image and video generation.
Image Generation
Over 2 years since the OG stable diffusion was released and made waves in image generation with open source models, it’s now safe to say that when it comes to image generation from text, image editing and controlled image generation - open source models are giving closed source models a run for their money.
Text-to-image generation
2024 was the year we shifted paradigms of diffusion models - from the traditional Unet based architecture to Diffusion Transformer (DiT), as well as an objective switch to flow matching.
TD;LR - diffusion models and Gaussian flow matching are equivalent. Flow matching proposes a vector field parametrization of the network output that is different compared to the ones commonly used in diffusion models previously.
- We recommend this great blog by Google DeepMind if you’re interested in learning more about flow matching and the connection with diffusion models
Back to practice: First to announce the shift was Stability AI with Stable Diffusion 3, however it was HunyuanDiT that became the first open source model with DiT architecture.
This trend continued with the releases of AuraFlow, Flux.1 and Stable Diffusion 3.5. 
Among many pivotal moments in the (not so long) history of open source image generation models, it’s safe to say that the release of Flux.1 was one of them. Flux [dev] achieved a new state-of-the-art, surpassing popular closed source models like Midjourney v6.0, DALL·E 3 (HD) on various benchmarks.
Personalization & stylization
A positive side effect of advancements in image models is the significant improvement in personalization techniques for text-to-image models and controlled generation.
Back in August 2022, transformative works like Textual Inversion and DreamBooth enhanced our ability to teach and introduce new concepts to text-to-image models, drastically expanding what could be done with them. These opened the door to a stream of improvements and enhancements building on top of these techniques (such as LoRA for diffusion models).
However, an upper bound to the quality of the fine-tuned models is naturally the base model from which it was fine-tuned. In that sense, we can’t neglect Stable Diffusion XL, which was also a significant marker in personalization for open source image generation models. A testimony to that is that even now, many of the popular techniques and models for personalization and controlled generation are based on SDXL.  The advanced abilities of SDXL (and models that were released after with similar quality) together with the growing understanding of the semantic roles of different components in the diffusion model architecture raises the question -  
what can we achieve without further optimization?
cue in the rain of zero shot techniques - 2024 was definitely the year when generating high quality portraits from reference photos was made possible with as little as a single reference image & without any optimization. Training free techniques like IP adapter FaceID, InstantID, Photomaker and more came out and demonstrated competitive if not even superior abilities to those of fine-tuned models.
Similarly, image editing and controlled generation - such as image generation with canny / depth / pose constraints made progress too - both thanks to the growing quality of the base models and the community’s growing understanding of the semantic roles different components have (Instant Style, B-LoRA)
So what’s next? since the shift of paradigms to DiT and flow matching objectives, additional models came out trying to utilize DiT-based models like Flux and SD3.5 for similar purposes, but so far not quite beating the quality of the SDXL-based ones despite the superior quality of the underlying base model. This could be attributed to the relative lack of understanding of semantic roles of different components of the DiT compared to the Unet. 2025 could be the year when we identify those roles in DiTs as well, unlocking more possibilities with the next generation of image generation models.
Video Generation
As opposed to image generation, with video we still have a way to go. 
But, it’s safe to say that we’re very far away from where we were a year ago. While we’re all about open-source, 
the credit for (some) of the significant leap in AI video generation goes to OpenAI’s sora for changing our 
expectations of video model capabilities quite radically. And as fofr put nicely in AI video is having its Stable Diffusion moment (which we recommend reading 🙂) - it  
made everyone realize what is possible.
The recent surge of open-source video generation models, including CogVideoX, Mochi, Allegro, LTX Video, and HunyuanVideo, has also been noteworthy. Video generation is inherently more challenging than image generation due to the need for motion quality, coherence, and consistency. Additionally, video generation requires substantial computational and memory resources, leading to significant generation latency. This often hinders local usage, making many new open video models inaccessible to community hardware without extensive memory optimizations and quantization approaches that impact both inference latency and the quality of generated videos. Nevertheless the open source community has made remarkable progress - which was recently covered in this blog on the state of open video generation models.
While this implies that most community members are still unable to experiment and develop with open-source video models, it also suggests that we can expect significant advancements in 2025.
Audio Generation
Audio generation has progressed significantly in the past year going from simple sounds to complete songs with lyrics. Despite challenges - Audio signals are complex and multifaceted, require more sophisticated mathematical models than models that generate text or images and training data quite scarce - 2024 saw open source releases like OuteTTS and IndicParlerTTS for text to speech and openai’s Whisper large v3 turbo for audio speech recognition. The year 2025 is already shaping up to be a breakthrough year for audio models, with a remarkable number of releases in January alone. We've seen the release of three new text-to-speech models: Kokoro, LLasa TTS and OuteTTS 0.3, as well as two new music models: JASCO and YuE. With this pace, we can expect even more exciting developments in the audio space throughout the year.
This song👇 was generated with YuE 🤯
Creative Tools that Shined in 2024
The beauty of open source is that it allows the community to experiment, find new usages for existing models / pipelines, improve on and build new tools together. Many of the creative AI tools that were popular this year are the fruit of joint community effort.
Here are some of our favorites:
Flux fine-tuning
Many of the amazing Flux fine-tunes created in the last year were trained thanks to the AI-toolkit by ostris.
Face to all
Inspired by fofr's face-to-many, Face to All combines the viral Instant ID model with added ControlNet depth constraints and community fine-tuned SDXL LoRAs to create training-free and high-quality portraits in creative stylizations.
Flux style shaping
Based on a ComfyUI workflow by Nathan Shipley, Flux style shaping combines Flux [dev] Redux and Flux [dev] Depth for style transfer and optical illusion creation.
Outpainting with diffusers
Diffusers Image Outpaint makes use of the diffusers Stable Diffusion XL Fill Pipeline together with an SDXL union controlnet to seamlessly expand an input image.
Live portrait, Face Poke
Adding mimics to a static portrait was never easier with Live Portrait and Face Poke.
TRELLIS
TRELLIS is a 3D generation model for versatile and high-quality 3D asset creation that took over the 3D landscape with a bang.
IC Light
IC-Light, which stands for "Imposing Consistent Light", is a tool for relighting with foreground condition.
What should we expect for AI & Art in 2025?
2025 is the year for open-source to catch up on video, movement, and audio models, making room for more modalities. With advancements in efficient computing and quantization, we can expect significant leaps in open-source video models. As we approach a (natural) plateau in image generation models, we can shift our focus to other tasks and modalities.
Starting off strong - Open source releases of January 25
- YuE - series of open-source music foundation models for full song generation. YuE is possibly the best open source model for music generation (with an Apache 2.0 license!), achieving competitive results to closed source models like Suno. try it out & read more: demo, model weights.
- Hunyuan 3D-2 , SPAR3D, DiffSplat - 3D generation models. 3D models are coming in hot - not long after the release of TRELLIS, Hunyuan 3D-2, SPAR3D and DiffSplat are here to take over the 3D landscape. try it out & read more:
- Lumina-Image 2.0 - text to image model. Lumina is a 2B parameter model competitive with the 12B Flux.1 [dev] and with an Apache 2.0 license(!!). try it out & read more: demo, model weights.
- ComfyUI-to-Gradio - a step-by-step guide on how to convert a complex ComfyUI workflow to a simple Gradio a
