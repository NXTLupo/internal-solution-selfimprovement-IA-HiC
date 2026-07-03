---
id: articles/hugging-face-blog/bfad128ecc.md
url: "https://huggingface.co/blog/ml-for-games-4"
url_hash: "bfad128ecc"
kind: "article"
source: "Hugging Face Blog"
title: "2D Asset Generation: AI for Game Development #4"
author: ""
date: "Thu, 26 Jan 2023 00:00:00 GMT"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T16:06:01.591709+00:00"
chars: 8386
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
collected_at: "2026-07-02T16:05:59+00:00"
content_hash: "11180f3ad49a42c5"
chunks:
  - id: "articles/hugging-face-blog/bfad128ecc.md#c0"
    char_span: [0, 123]
    sentence_count: 1
    key_terms: [blog, ml-for-games-4, development, huggingface, generation, hugging, source, asset]
    token_count: 37
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ml-for-games-4"}]
  - id: "articles/hugging-face-blog/bfad128ecc.md#c1"
    char_span: [125, 2484]
    sentence_count: 25
    key_terms: [denoising, image2image, image, diffusion, strength, input, stable, generate]
    concepts: [denoising, image2image, diffusion, image, strength]
    token_count: 512
  - id: "articles/hugging-face-blog/bfad128ecc.md#c2"
    char_span: [2223, 4542]
    sentence_count: 21
    key_terms: [prompt, diffusion, going, direction, result, scythe, stable, "you're"]
    concepts: [diffusion, prompt, direction, going, result]
    token_count: 512
  - id: "articles/hugging-face-blog/bfad128ecc.md#c3"
    char_span: [4190, 6876]
    sentence_count: 24
    key_terms: [development, game, using, dreambooth, especially, generation, interested, great]
    concepts: [development, using, dreambooth, especially, generation]
    related_chunks: ["articles/hugging-face-blog/bfad128ecc.md#c4"]
    token_count: 512
  - id: "articles/hugging-face-blog/bfad128ecc.md#c4"
    char_span: [6556, 8512]
    sentence_count: 15
    key_terms: [game, development, interesting, like, experience, generation, procedural, article]
    concepts: [development, interesting, experience, generation, procedural]
    related_chunks: ["articles/hugging-face-blog/bfad128ecc.md#c3"]
    token_count: 344
---
# 2D Asset Generation: AI for Game Development #4

Source: [Hugging Face Blog](https://huggingface.co/blog/ml-for-games-4)

Dreambooth Training
Train custom Stable Diffusion models
Want the quick video version? You can watch it here. Otherwise, if you want the technical details, keep reading!
Note: This tutorial is intended for readers who are familiar with Unity development and C#. If you're new to these technologies, check out the Unity for Beginners series before continuing.
In Part 3 of this tutorial series, we discussed how text-to-3D isn't quite ready yet. However, the story is much different for 2D.
In this part, we'll talk about how you can use AI to generate 2D Assets.
This tutorial describes a collaborative process for generating 2D Assets, where Stable Diffusion is incorporated as a tool in a conventional 2D workflow. This is intended for readers with some knowledge of image editing and 2D asset creation but may otherwise be helpful for beginners and experts alike.
Requirements:
Diffusion models such as Stable Diffusion work by reconstructing images from noise, guided by text. Image2Image uses the same process but starts with real images as input rather than noise. This means that the outputs will, to some extent, resemble the input image.
An important parameter in Image2Image is denoising strength. This controls the extent to which the model changes the input. A denoising strength of 0 will reproduce the input image exactly, while a denoising strength of 1 will generate a very different image. Another way to think about denoising strength is creativity. The image below demonstrates image-to-image with an input image of a circle and the prompt "moon", at various denoising strengths.
Image2Image allows Stable Diffusion to be used as a tool, rather than as a replacement for the conventional artistic workflow. That is, you can pass your own handmade assets to Image2Image, iterate back on the result by hand, and so on. Let's take an example for the farming game.
In this section, I'll walk through how I generated a corn icon for the farming game. As a starting point, I sketched a very rough corn icon, intended to lay out the composition of the image.
Next, I used Image2Image to generate some icons using the following prompt:
corn, james gilleard, atey ghailan, pixar concept artists, stardew valley, animal crossing
I used a denoising strength of 0.8, to encourage the model to be more creative. After generating several times, I found a result I liked.
The image doesn't need to be perfect, just in the direction you're going for, since we'll keep iterating. In my case, I liked the style that was produced, but thought the stalk was a bit too intricate. So, I made some modifications in photoshop.
Notice that I roughly painted over the parts I wanted to change, allowing Stable Diffusion to fill the details in. I dropped my modified image back into Image2Image, this time using a lower denoising strength of 0.6 since I didn't want to deviate too far from the input. This resulted in an icon I was almost happy with.
The base of the corn stalk was just a bit too painterly for me, and there was a sprout coming out of the top. So, I painted over these in photoshop, made one more pass in Stable Diffusion, and removed the background.
Voilà, a game-ready corn icon in less than 10 minutes. However, you could spend much more time to get a better result. I recommend this video for a more detailed walkthrough of making a more intricate asset.
In many cases, you may need to fight Stable Diffusion a bit to get the result you're going for. For me, this was definitely the case for the scythe icon, which required a lot of iteration to get in the direction I was going for.
The issue likely lies in the fact that there are way more images online of scythes as weapons rather than as farming tools. One way around this is prompt engineering, or fiddling with the prompt to try to push it in the right direction, i.e. writing scythe, scythe tool in the prompt or weapon in the negative prompt. However, this isn't the only solution.
Dreambooth, textual inversion, and LoRA are techniques for customizing diffusion models, making them capable of producing results much more specific to what you're going for. These are outside the scope of this tutorial, but are worth mentioning, as they're becoming increasingly prominent in the area of 2D Asset generation.
Generative services such as layer.ai and scenario.gg are specifically targeted toward game asset generation, likely using techniques such as dreambooth and textual inversion to allow game developers to generate style-consistent assets. However, it remains to be seen which approaches will rise to the top in the emerging generative game development toolkit.
If you're interested in diving deeper into these advanced workflows, check out this blog post and space on Dreambooth training.
Click here to read Part 5, where we use AI for Story.
Train custom Stable Diffusion models
Hi there,
I built AI Game Generator - a tool that transforms text descriptions into playable HTML5 games in minutes using AI.
Great for rapid prototyping, educational content, and testing game mechanics quickly.
Check it out: https://ai-game-generator.com/
Might be useful for your readers interested in AI-assisted development.
Great walkthrough! I love how you show iterating with Image2Image and Stable Diffusion — AI really shines as a tool alongside traditional workflows.
I’ve been experimenting with similar 2D assets for simulation and driving games, especially bus simulator–style mods. For anyone interested, I share resources and updates here: https://bussimulator-apk.com/
.
Great explanation of using Image2Image as part of a workflow instead of a replacement for artists. The way you demonstrated iterative refinement with denoising strength really makes the process clear. I’ve found that combining rough sketches with AI tools can significantly speed up prototyping, especially for indie projects where time and resources are limited. This hybrid approach feels like the most practical direction for AI in game development right now here: https://animeswitcher.com/.
Nice walkthrough! The point about “fighting the model” for specific assets like the scythe is very relatable. It highlights how dataset bias can influence outputs and why refining prompts or using custom-trained models becomes necessary. Tools like this are great for speeding up early development stages, particularly for testing ideas before investing time in detailed art production. Here: https://animeslayers.org/
This is a really solid breakdown of 2D asset generation using Stable Diffusion. The corn example especially shows how important iteration is rather than expecting a perfect result in one go. I also appreciate the mention of prompt engineering and techniques like LoRA and DreamBooth—those are becoming essential for maintaining style consistency across assets in a game. Here: https://yacinetvsapk.com/
Really interesting article! AI is changing game development fast — from smarter NPCs to procedural content and storytelling. It reminds me of troubleshooting modern mobile games too. I recently had issues with car parking multiplayer 2 not installing, and after checking what it requires android version and hardware compatibility, the problem was solved. AI tools may be advanced, but device requirements still matter 😄.
This was a fascinating read because machine learning in games often gets discussed in terms of NPC behavior, but the broader applications are even more interesting. Procedural content generation, adaptive difficulty systems, player-behavior modeling, and AI-assisted testing all have the potential to improve both development efficiency and player experience. What I particularly like about articles like this is that they focus on practical implementations rather than treating AI as a buzzword. As game development becomes more data-driven, finding the right balance between automation and creative design will likely be one of the biggest challenges for studios.
It's also interesting to see how gaming communities benefit from educational guides that help players understand complex systems. For example, the common BUSSID mod APK myths article clears up misconceptions around game modifications, while the bus simulator ultimate customization guide explores how players can personalize their experience. Different angle, but both highlight how deeper understanding improves engagement with a game.
