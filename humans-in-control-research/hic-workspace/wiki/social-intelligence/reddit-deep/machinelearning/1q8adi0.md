---
id: social-intelligence/reddit-deep/machinelearning/1q8adi0.md
url: "https://www.reddit.com/r/MachineLearning/comments/1q8adi0/d_ai_research_laptop_whats_your_setup/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] AI Research laptop, what's your setup?"
author: "gradV"
date: "2026-01-09T14:55:30.000Z"
score: 64
upvote_ratio: 0.83
num_comments: 53
flair: "Discussion"
extracted_at: "2026-05-29T22:52:03.631Z"
extraction_method: "praw-deep"
research_goal: "Provide a strategic overview for a company's creative team on emerging AI design trends, skills, tools, platforms, and technical implementations. Focus on practical applications beyond concepting, specifically enabling design production, system testing, asset generation, governance, and stakeholder confidence."
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c0"
    char_span: [0, 1537]
    sentence_count: 12
    key_terms: [thinkpad, machinelearning, macbook, gpu, comments, macbooks, switched, training]
    concepts: [machinelearning, thinkpad, macbook, comments, macbooks]
    token_count: 357
    sources: [{"n":"reddit-deep: r/machinelearning","u":"https://www.reddit.com/r/MachineLearning/comments/1q8adi0/d_ai_research_laptop_whats_your_setup/"}]
  - id: "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c1"
    char_span: [1551, 2811]
    sentence_count: 7
    key_terms: [laptop, server, macbook, remote, small, get, gpu, ssh]
    concepts: [laptop, server, macbook, remote, small]
    related_chunks: ["social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c2", "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c3"]
    section: Comments
    token_count: 318
  - id: "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c2"
    char_span: [2813, 4448]
    sentence_count: 7
    key_terms: [laptop, battery, macbook, angledluffa, life, factorio, friction, research]
    concepts: [laptop, battery, macbook, angledluffa, factorio]
    related_chunks: ["social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c1", "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c3"]
    section: Comments
    token_count: 399
  - id: "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c3"
    char_span: [4450, 6303]
    sentence_count: 14
    key_terms: [gpu, need, laptop, access, work, powerful, cluster, macbook]
    concepts: [laptop, access, powerful, cluster, macbook]
    related_chunks: ["social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c1", "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c2"]
    section: Comments
    token_count: 405
  - id: "social-intelligence/reddit-deep/machinelearning/1q8adi0.md#c4"
    char_span: [6305, 6786]
    sentence_count: 3
    key_terms: [carrying, cloud, gpu, semperputidus, comfortable, precision, accessed, anything]
    concepts: [carrying, cloud]
    section: Comments
    token_count: 128
---
# [D] AI Research laptop, what's your setup?

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1q8adi0/d_ai_research_laptop_whats_your_setup/)
Posted by **gradV** · **64↑** · **53 comments**

Dear all, first time writing here.

I’m a deep learning PhD student trying to decide between a MacBook Air 15 (M4, 32 GB, 1 TB) and a ThinkPad P14s with Ubuntu and an NVIDIA RTX Pro 1000. For context, I originally used a MacBook for years, then switched to a ThinkPad and have been on Ubuntu for a while now. My current machine is an X1 Carbon 7 gen with no GPU, since all heavy training runs on a GPU cluster, so the laptop is mainly for coding, prototyping, debugging models before sending jobs to the cluster, writing papers, and running light experiments locally.

I’m torn between two philosophies. On one hand, the MacBook seems an excellent daily driver: great battery life, portability, build quality, and very smooth for general development and CPU-heavy work with recent M chips. On the other hand, the ThinkPad gives me native Linux, full CUDA support, and the ability to test and debug GPU code locally when needed, even if most training happens remotely. Plus, you can replace RAM and SSD, since nothing is soldered likewise on MacBooks.

I have seen many people in conferences with macbooks with M chips, with many that have switched from linux to macOS. In this view I’d really appreciate hearing about your setups, possible issues you have incurred in, and advice on the choice.

Thanks!

## Comments

- **mileseverett** (250↑): If you're doing AI research, get a cheap macbook and spend the rest on an external server. As a supervisor I have recommended this over a laptop with a GPU many times to students. Students who get the laptop with a GPU end up hating having to carry around a heavy and large laptop and also how loud it will be when it is training. If you get a server, you can SSH into it and use it as if it is the laptop itself.
  - **FickleShare9406** (50↑): This is the answer. Fellow PhD student in ML and I have a super basic MacBook Air, but at home I have a 4090 server that I SSH into.
  - **Ok-Entertainment-286** (6↑): Try Lightning Studios or Anyscale. Great UX on top of remote GPU machines.
  - **espressoVi** (20↑): My "gaming laptop" has paid for itself 40-50 times over, just by training small stuff for side gigs (MLPs, LSTMs, or even SAM-tiny) not to mention the tremendous value provided by being able to run small LMs locally (e.g., running small sanity tests before full run on server).

Of course that calculation assumes it's my laptop making the money, not me...
  - **OldtimersBBQ** (2↑): I particularly enjoy to edit locally on a MacBook and remote execute and debug on Linux/CUDA server via PyCharm SSH remote interpreter.

Silent MacBook lasts forever (M2/16GB), server is beefy and out of sight.
    - **mileseverett** (3↑): Exactly how I feel. I recommend a macbook because the battery life is just infinite and charges so quickly, but really any laptop you like using + server is my preferred combo
  - **Artistic_Load909** (1↑): This is the only answer. It took me way too long and wasted money to figure this out for myself, wish someone had hammered this into me a decade ago.
  - **AtMaxSpeed** (-9↑): I mean, if you're fine with carrying a heavy large laptop that is loud during training, there's no issue.
- **AngledLuffa** (41↑): Anything that runs ssh is fine, but personally I prefer my laptop to also run Factorio
  - **EternaI_Sorrow** (9↑): It's either Factorio or research.
    - **AngledLuffa** (5↑): IMO not worth speccing it out for research, since the latest models just won't train on any laptop, no matter how powerful a laptop you get. 

but the factory must grow...
- **hyperactve** (31↑): MacBook.

When Ubuntu arm is on par, then Ubuntu.

Nothing beats the battery life and ease of use of MacBooks.
- **AccordingWeight6019** (9↑): I have seen this choice come down less to raw specs and more to where friction shows up day to day. If almost all real training happens on a cluster, local GPU matters mainly for debugging CUDA edge cases, not for throughput. In that regime, many people end up valuing battery life, quietness, and a low friction dev environment more than local acceleration. macOS with recent M chips is surprisingly good for prototyping and paper writing, even if it is not representative of production GPU behavior.

The Linux plus NVIDIA path makes more sense if you regularly need to reproduce GPU specific failures locally or iterate on low level kernels. the downside is that you are opting into more maintenance and less portability for something you might only need occasionally. In practice, a lot of researchers I know moved to MacBooks and accepted that true GPU debugging happens on the cluster anyway. the question is whether local CUDA access is a core need or a nice to have that mostly provides psychological comfort.
- **Vedranation** (9↑): I used to have GPU laptop (Legion Y540) but it broke down recently. It worked but its expensive, heavy and battery doesn't last long. 
Now I'm getting a basic Thinkpad for work (email, code etc) and desktop work station for ML stuff. I just remote control into work station from laptop whenever I need it to do stuff. Got perks of powerful PC and easy to carry laptop.
- **liqui_date_me** (7↑): A decent MacBook and a massive server. All you really need is Jupyter, VSCode and an ssh connection. Claude Code is a bonus if you want to be insanely productive
- **SnapSnag** (7↑): Echoing what other people said here, there’s another benefit to having your laptop and sshing into a more powerful remote machine: this is essentially how all of the industry labs do it. I personally use a Macbook pro and SSH into either my workstation or the Slurm cluster. Having the skills and familiarity with that kind of setup will definitely pay dividends if you end up going that direction.
- **abnormal_human** (18↑): Just get the mac. Suffering through a mobile Ubuntu install with a potato GPU is not going to be all that you dreamed it to be.

Best setup would be to physically use the mac, but access NVIDIA GPUs remotely. I'm sure your school has a solution for GPU access. There are also free services like google colab. 

There's very little to gain carrying around a hot power hungry loud GPU in your backpack. Battery life, heat, noise, size all matter. GPUs can be accessed remotely.
- **kiss_a_hacker01** (4↑): I traded in a MacBook Pro for a Dell Precision 3591 (32GB RAM, 1TB SSD, RTX 2000) and I use my desktop or the cloud for anything it can't handle.
- **SemperPutidus** (5↑): Get whatever is most comfortable for you carrying and typing with a screen you like, and rent your GPU from a cloud.
