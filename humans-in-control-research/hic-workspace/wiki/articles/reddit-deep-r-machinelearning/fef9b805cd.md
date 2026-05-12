---
url: "https://www.reddit.com/r/MachineLearning/comments/1pwd8su/p_s2id_scale_invariant_image_diffuser_trained_on/"
url_hash: "fef9b805cd"
kind: "article"
source: "Reddit Deep: r/machinelearning"
title: "[P] S2ID: Scale Invariant Image Diffuser - trained on standard MNIST, generates 1024x1024 digits and at arbitrary aspect ratios with almost no artifacts at 6.1M parameters (Drastic code change and architectural improvement)"
author: ""
date: "2025-12-26T19:51:31.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:35:30.124869+00:00"
chars: 12000
---

# [P] S2ID: Scale Invariant Image Diffuser - trained on standard MNIST, generates 1024x1024 digits and at arbitrary aspect ratios with almost no artifacts at 6.1M parameters (Drastic code change and architectural improvement)

Source: [Reddit Deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1pwd8su/p_s2id_scale_invariant_image_diffuser_trained_on/)

^(This is an update to the previous post which can be found) [^(here)](https://www.reddit.com/r/MachineLearning/comments/1puosfp/p_siid_a_scale_invariant_pixelspace_diffusion/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)^(. Take a look if you want the full context, but it's not necessary as a fair amount of things have been changed and improved. The GitHub repository can be found) [^(here)](https://github.com/Yegor-men/scale-invariant-image-diffuser)^(. Once again, forgive for the minimal readme, unclean train/inference code, as well as the usage of .pt and not .safetensors modelfiles. The focus of this post is on the architecture of the model.)

# Preface

Hello everyone.

Over the past couple weeks/months, annoyed by a couple pitfalls in classic diffusion architecures, I've been working on my own architecture, aptly named **S2ID: Scale Invariant Image Diffuser**. S2ID aims to avoid the major pitfalls found in standard diffusion architectures. Namely:

* UNet style models heavily rely on convolution kernels, and convolution kernels train to a certain pixel density. If you change your pixel density, by upscaling the image for example, the feature detectors residing in the kernels no longer work, as they are now of a different size. This is why for models like SDXL, changing the resolution at which the model generates can easily create doubling artifacts.
* DiT style models would treat the new pixels produced by upscaling as if they were actually new and appended to the edges of the image. RoPE helps generalize, but is there really a guarantee that the model knows how to "compress" context length back down to the actual size?

Fundamentally, it boils down to this: **Tokens in LLMs are atomic, pixels are not, the resolution (pixel density) doesn't affect the amount of information present, it simply changes the quality of the information**. Think of it this way: when your phone takes a 12mp photo, or a 48mp photo, or a 108mp photo, does the actual composition change? Do you treat the higher resolution image as if it had suddenly gained much more information? Not really. Same here: resolution is not a key factor. Resolution, or more importantly, pixel density, doesn't change the underlying function of the data. Hence, the goal of S2ID is to learn the underlying function, ignoring the "view" we have of it that's defined by the aspect ratio and image size. Thus, S2ID is tested to generalize on **varying image sizes and varying aspect ratios**. In the current iteration, **no image augmentation** was used during training, making the results all the more impressive.

As a side "challenge", S2ID is trained locally on my RTX 5080 and I do not intend to move to a server GPU unless absolutely necessary. The current iteration was trained in 20 epochs, batch size 25, AdamW with cosine scheduler with 2400 warmup steps going from 0 to 1e-3, and then decaying down to 1e-5. S2ID is an EMA model with 0.9995 decay (dummy text encoder is not EMA). VRAM consumption was at 12.5 GiB throughout training, total training took about 3 hours, although each epoch was trained in about 6m20s, the rest of the time was spent on intermediate diffusion and the test dataset. As said in the title, the parameter count is 6.1M, although I'm certain that it can be reduced more as in (super duper) early testing months ago I was able to get barely recognizable digits at around 2M, although that was very challenging.

# Model showcase

For the sake of the showcase, it's critical to understand that **the model was trained on standard 28x28 MNIST images** ***without any augmentations***. The only augmentation used is the coordinate jitter (explained further later on), but I would argue that this is a core component of the architecture itself, not an augmentation to the images, as it is the backbone behind what allows the model to scale well beyond the training data and why it is that it learns the continuous function in the first place and doesn't just memorize coordinates like it did last time.

Let us start with the elephant in the room, and that is the 1MP SDXL-esque generation. 1024 by 1024 images of the digits. Unfortunately, with the current implementation (issues and solutions described later) I'm hitting OOM for batch size of 10, so I'm forced to render one at a time and crappily combine them together in google sheets:

[Grid of numbers, each one diffused at 1024x1024](https://preview.redd.it/65ssouxyrl9g1.png?width=665&format=png&auto=webp&s=3348324b64bf7b830fd87db998a27b66c2007629)

As you can see, very clean digits. In fact, the model actually seems to have an easier time diffusing at larger resolutions, there's less artifacts, although admittedly the digits are much more uniform to each other. I'll test how this holds up when I change training from MNIST to CelebA.

Now, let's take a look at the other results, namely for 1:1 trained, 2:3, 3:4, 4:5 and the dreaded 9:16 from last time and see how S2ID holds up this time:

[1:1 - 28x28](https://preview.redd.it/hfg133rxol9g1.png?width=2000&format=png&auto=webp&s=b03a59cc5ee0b05803de88b5d1efe9e6d0a88c87)

[2:3 - 27x18](https://preview.redd.it/7fvas2rxol9g1.png?width=2000&format=png&auto=webp&s=22ed0489be43b605510b5acccd22c362ba182cff)

[3:2 - 18x27](https://preview.redd.it/mrtj64rxol9g1.png?width=2000&format=png&auto=webp&s=3b686da105f38671102690749311a47c0422d868)

[3:4 - 32x24](https://preview.redd.it/k5wrsfrxol9g1.png?width=2000&format=png&auto=webp&s=6bc502fc1a97082edc7eca94c2e750c5601262a8)

[4:3 - 24x32](https://preview.redd.it/e069jwtxol9g1.png?width=2000&format=png&auto=webp&s=11780e75214927390820b023c02997aefa816ea6)

[4:5 - 30x24](https://preview.redd.it/kth3tltxol9g1.png?width=2000&format=png&auto=webp&s=a0177338e5184969d4a80392f76ad5de5ebf0391)

[5:4 - 24x30](https://preview.redd.it/3drv5grxol9g1.png?width=2000&format=png&auto=webp&s=ddc1292978202dea98506d79c59380f869b14dac)

[9:16 - 32x18](https://preview.redd.it/gbcvvfrxol9g1.png?width=2000&format=png&auto=webp&s=e8fbbdb37c02561574ce170b2ce3fde010ec649a)

[16:9 - 18x32](https://preview.redd.it/ay3hpfrxol9g1.png?width=2000&format=png&auto=webp&s=58037c6283c592d2fe49f6576a568fe3347ebce9)

Like with the 1024x1024, the results are significantly better than in the last iteration. A lot less artifacts, even when we're really testing the limits with the 16:9 aspect ratio, as the coordinates become quite ugly in that scenario with the way the coordinate system works. Nevertheless, S2ID successfully seems to generalize: it applies a combination of a squish + crop whenever it has to, such that the key element of the image: the digit, doesn't actually change that much. Considering the fact that the model was trained on unaugmented data and still yields these results indicates great potential.

As last time, a quick look at double and quadruple the trained resolution. But unlike the last time, you'll see that this time around the results are far better cleaner and more accurate, at the expense of variety:

[Double Resolution - 56x56](https://preview.redd.it/288wgozpol9g1.png?width=2000&format=png&auto=webp&s=742f9401d68305b59131deb93cbd3ac633975a08)

[Quarduple resolution - 128x128](https://preview.redd.it/d0p44qzpol9g1.png?width=800&format=png&auto=webp&s=06411795c0525c9eb5058d0ecff7ed3e42251689)

For completion, here is the t-scrape loss. It's a little noisy, which suggest to me that I should use the very same gaussian noisifying coordinate jitter technique used for the positioning, but that's for the next iteration:

[T scrape loss, noisy but better than last time](https://preview.redd.it/wvkjc1ftol9g1.png?width=640&format=png&auto=webp&s=fd2d587da70cae59b6dd2163e4d977553921f92f)

# How does S2ID work?

The previous post/explanation was a bit of an infodump, I'll try to explain it a bit clearer this time, especially considering that some redundant parts were removed/replaced, the architecture is a bit simpler now.

In short, as the goal of S2ID is to be a scale invariant model, it treats the data accordingly. The images, when fed into the model, are a fixed grid that represent a much more elegant underlying function that doesn't care about the grid nature. So our goal is to approach the data as such. First, each pixel's coordinates is calculated as an exact value from -0.5 to 0.5 along the x and y axis. Two values are obtained: the coordinate relative to the image, and the coordinate relative to the composition. The way that the coordinate relative to the composition works is that we inscribe the image and whatever aspect ratio it is into a 1:1 square, and then project the pixels of the image on to the square. This allows the model to learn composition, and not stretch it as the distance between the pixels is uniform. The second coordinate system, the one relative to the image, simply assigns all the image edges the respective +- 0.5, and then have a linspace assign the values along there. The gap between pixels varies, but the model now knows how far the pixel is from the edge. If we only used the first system of coordinates, the model would ace composition, but would simply crop out the subject if the aspect ratio changed. If we used only the second system of coordinates, the model would never crop, but then at the same time it would always just squish and squeeze the subject. It is with these two systems together that the model generalizes. Next up is probably the most important part of it all: and that is turning the image from pixel space into more or less a function. We do not use FFT or anything like that. Instead, we add gaussian noise to the coordinates with a dynamic standard deviation such that the model learns that the pixels isn't the data, it's just one of the many views of the data, and the model is being trained on other, alternative views that the data could have been. We effectively treat it like this: "If our coordinates are \[0.0, 0.1, 0.2, ...\], then what we really mean to say i

--- TOP COMMENTS ---
[36↑ Shizuka_Kuze] The results are nice on the surface, but could just be overfitting, or more probably, deceptive. I also really am not sure I understand how what you’re doing is supposed to make it “model the underlying data in the image” and not the resolution.

Firstly, by deceptive I mean that MNIST is one of the datasets that is not impacted by resolution while real world problems absolutely are. For instance the individual hairs in a shampoo infomercial are not visible in the low resolution domain while in the high resolution domain they are rather prominent. 

With MNIST you are really and truly interpolating pixels between different resolutions while in other approaches you’d need to extrapolate information that does not exist. From an information theory perspective the distribution between different MNIST images at different resolutions is essentially the same. With others it is different. This is especially questionable given your Gaussian noise adding thingy that’s basically just a low pass filter which would filter out higher frequency information like textures. This is not an issue on MNIST, and it might even smooth the digits, but I suspect it would destroy textures in the wild. You could try penalizing differences in the derivative of the image function instead and it might help preserve texture better if you find it does not work on real datasets maybe?

The issues people face with resolution invariance really isn’t what you’re solving (scale invariance) but rather texture invariance as I described. Especially on MNIST there is practically no information loss. There’s no textures to lose anyways, and the scale really doesn’t matter. Compare to aerial view of a city. A group of eight  by eight pixels might contain both a car and a person, and you can’t simply smooth it out. You might even need contextual global information to figure out it what it is, which I don’t think the model has. 

To demonstrate the feasibility of this a
