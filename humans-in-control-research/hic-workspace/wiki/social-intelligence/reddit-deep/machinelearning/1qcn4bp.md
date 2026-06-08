---
id: social-intelligence/reddit-deep/machinelearning/1qcn4bp.md
url: "https://www.reddit.com/r/MachineLearning/comments/1qcn4bp/d_cuda_workstation_vs_apple_silicon_for_ml_llms/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] CUDA Workstation vs Apple Silicon for ML / LLMs"
author: "Individual-School-07"
date: "2026-01-14T13:22:11.000Z"
score: 8
upvote_ratio: 0.67
num_comments: 57
flair: "Discussion"
extracted_at: "2026-05-31T21:49:57.035Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging AI design trends, skills, tools, platforms, and technical implementations that would  help a company's creative team to move beyond AI as a concepting aid and understand where AI-enabled tools, workflows and internal models can practically support design production, system testing, asset generation, governance and stakeholder confidence. \n"
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c0"
    char_span: [0, 1907]
    sentence_count: 7
    key_terms: [cuda, local, silicon, apple, workstation, learning, machinelearning, used]
    token_count: 498
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c1"
    char_span: [1909, 3739]
    sentence_count: 18
    key_terms: [hobby, projects, "don't", portfolio, leetcode, project, contribution, work]
    section: Comments
    token_count: 418
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c2"
    char_span: [3741, 5583]
    sentence_count: 10
    key_terms: [github, faang, time, work, get, projects, relevant, serious-regular]
    section: Comments
    token_count: 446
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c3"
    char_span: [5585, 7627]
    sentence_count: 14
    key_terms: [because, systems, real, team, lessons, interviewing, learn, level]
    section: Comments
    token_count: 455
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c4"
    char_span: [7629, 9429]
    sentence_count: 18
    key_terms: [individual-school-07, getting, ram, different, without, market, build, learn]
    section: Comments
    token_count: 458
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c5"
    char_span: [9431, 11562]
    sentence_count: 25
    key_terms: ["it's", don, real, too, use, projects, training, hyperscalers]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/machinelearning/1qcn4bp.md#c6"
    char_span: [11564, 13139]
    sentence_count: 13
    key_terms: [cuda, serious, silicon, tooling, apple, local, inference, pipelines]
    section: Comments
    token_count: 357
---
# [D] CUDA Workstation vs Apple Silicon for ML / LLMs

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1qcn4bp/d_cuda_workstation_vs_apple_silicon_for_ml_llms/)
Posted by **Individual-School-07** · **8↑** · **57 comments**

Hi everyone,

I’m trying to make a *deliberate* choice between two paths for machine learning and AI development, and I’d really value input from people who’ve used **both CUDA GPUs and Apple Silicon**.

# Context

I already own a **MacBook Pro M1**, which I use daily for coding and general work.

I’m now considering adding a **local CUDA workstation** mainly for:

* Local LLM inference (30B–70B models)
* Real-time AI projects (LLM + TTS + RVC)
* Unreal Engine 5 + AI-driven characters
* ML experimentation and systems-level learning

I’m also thinking long-term about **portfolio quality and employability** (FAANG / ML infra / quant-style roles).



# Option A — Apple Silicon–first

* Stick with the M1 MacBook Pro
* Use Metal / MPS where possible
* Offload heavy jobs to cloud GPUs (AWS, etc.)
* Pros I see: efficiency, quiet, great dev experience
* Concerns: lack of CUDA, tooling gaps, transferability to industry infra



# Option B — Local CUDA workstation

* Used build (\~£1,270 / \~$1,700):
   * RTX 3090 (24GB)
   * i5-13600K
   * 32GB DDR4 (upgradeable)
* Pros I see: CUDA ecosystem, local latency, hands-on GPU systems work
* Concerns: power, noise, cost, maintenance



# What I’d love feedback on

1. For **local LLMs and real-time pipelines**, how limiting is Apple Silicon today vs CUDA?
2. For those who’ve used **both**, where did Apple Silicon shine — and where did it fall short?
3. From a **portfolio / hiring perspective**, does CUDA experience meaningfully matter in practice?
4. Is a local 3090 still a solid learning platform in 2025, or is cloud-first the smarter move?
5. Is the build I found a good deal ? 

I’m *not* anti-Mac (I use one daily), but I want to be realistic about what builds strong, credible ML experience.

Thanks in advance — especially interested in responses from people who’ve run real workloads on both platforms.

## Comments

- **Serious-Regular** (37↑): I work in "AI" at FAANG. I don't know where this myth of the relevance of the "portfolio" came from but it. does. not. matter. I have never looked at anyone's GitHub and I never will. Want to know why? Because your hobby projects are hobby quality and don't represent in the slightest your ability to handle work projects. Like can you imagine the NBA recruiting players based on their pickup games? Lolol

There are literally only 2 things that matter for hiring: leetcode and prior *work* experience. That's it. The end.
  - **marr75** (6↑): Have been software leadership at one large business and 2 small. Agree with everything but leetcode (which is "big tech" specific). It'll be a project or a coding interview instead of leetcode for a lot of us.

Solo hobby projects are nearly impossible to verify and AI has made it 1000x worse. Real, non-trivial contribution to a valuable OSS is a signal. Solo hobby portfolio is noise.
  - **Dedelelelo** (7↑): for faang sure for startups they def look at github
    - **Tiny_Arugula_5648** (9↑): I'm a serial startup founder and used to run a product incubator. Hobby projects don't really impress me, unless the project is popular enough to attract multiple contributors or users it's not really an indication of much.

If the OP wants to build a portfolio it's far better to be able to point to contribution to a larger OSS project that shows they know how to coordinate and interwork with a distributed team. They don't need to be a key contributor just someone who steadily contributes to the greater effort.

That's far more relevant then showing me an end to end toy project.. Not everyone sees things the same way but I do know for a fact that hiring managers are always trying to get insight into how your work not just what you worked on.
    - **crazylikeajellyfish** (1↑): If you're good enough at your job, you don't have time for side projects. I promise, the best startups care about whether you've done impressive work, they don't care if you did it in public.
    - **Serious-Regular** (1↑): Why would the concepts *hobby* and *work experience* have different meanings in FAANG vs startup?
  - **anxiouscsstudent** (2↑): Not at FAANG but can concur. The only time I've seen personal projects ever matter was for SWE internships (just barely).
  - **pm_me_github_repos** (2↑): I would say it means SOMETHING (beats nothing) when you’re a total beginner trying to get your first internship or position and have no relevant work experience. FAANG likely won’t consider it but it may get your foot in the door elsewhere when you have nothing else
    - **Serious-Regular** (1↑): Do you work as a SWE literally anywhere? It's very simple economics and it doesn't take a Stanford CS PhD to figure it out: no one has time to look at GitHub projects because no one ever got a promo for being the best interviewer. Bro I barely have time to read to read the PRs of my actual teammates let alone some random person's whole-ass GitHub project.

The only way GitHub will make any difference during recruiting is if you're a major contributor to a relevant/major project (PyTorch, TF, Jax, etc). 

Seriously you people are dreaming that your shiny GitHub will get you noticed.
  - **Cptcongcong** (1↑): I’m MLE at FAANG too, sure yeah at FAANG no one looks at GitHub. But when I was in a startup/mid sized companies I would take the time to have a look.

I think this is because at my FAANG there’s a disconnect between interviewer and interviewee. I’m probably never gonna meet this guy again, I’m not interviewing him for my team. But for example during team matching, personal projects may be a factor.
    - **Serious-Regular** (1↑): >  I’m not interviewing him for my team.

This is not universally true - at my FAANG every team interviews for itself (there is no generic loop). And at others I know it's the same because I had roughly the same thing happen when I interviewed at FB and Nvidia (interviewed directly with the teams themselves). Note this is for E5. But anyway it's not an artifact of "the disconnect".
- **patternpeeker** (5↑): I have used both, and the gap shows up once you move past toy workloads. Apple Silicon is great for day to day dev and light inference, but it starts to feel limiting when you try to run larger models or build real time pipelines, because the tooling and performance visibility are weaker. For 30B plus local LLMs and low latency systems, CUDA is still much less frustrating, with better memory control, profiling, and fewer surprises. From a hiring perspective, CUDA itself is not the point, but hands on experience debugging GPU behavior, memory limits, and throughput tradeoffs does transfer well to real infrastructure work. A 3090 is still a solid learning platform because you hit real constraints locally, and while cloud GPUs are useful for scale, they hide a lot of the systems level lessons you actually want to learn.
  - **hedgehog0** (1↑): > A 3090 is still a solid learning platform because you hit real constraints locally, and while cloud GPUs are useful for scale, they hide a lot of the systems level lessons you actually want to learn.

Thank you for your input! I’m not OP but curious what do you think of 5060 Ti for similar purposes? How low for other parts of the PC do you think I can have reasonable performance with 5060 Ti?
  - **chief167** (1↑): > they hide a lot of the systems level lessons you actually want to learn.

cloud vs workstations are just different skills, at least in my opinion. Learn what you want to learn, but one is not a substitute for the other. Sure the basic knowledge is the same, but once you get into more involved stuff, it's just different worlds
- **wotoan** (6↑): Local workstation needs way more RAM, 64GB min preferably 128. Unfortunately that will be quite expensive in today's market - but given that you're considering a 5090 it may be within your budget.
  - **Individual-School-07** (1↑): I'm getting a 3090. I thought getting this build would save me from the market getting way worse. Once things cool down, I'd get the 128
- **pbalIII** (2↑): For 30B-70B inference, the 3090's 24GB VRAM is the real constraint. You can fit 30B at Q4 but 70B needs offloading or multiple cards. An M1 Pro wont keep up with a 3090 on raw throughput, but if you eventually went Mac Studio M3 Ultra territory, unified memory lets you run 70B+ without the multi-GPU headache.

On the hiring point... one commenter is being blunt but mostly right. Interviews at big tech are leetcode plus system design plus behavioral. Your local GPU setup wont move the needle on an offer. What helps is having shipped something real, and thats more about the problem you solved than the hardware you used.

The build looks reasonable for the price. Just bump RAM to 64GB so you can quantize and prep datasets without hitting swap constantly.
  - **Individual-School-07** (1↑): Thank you for your reply. Regarding the 64GB RAM—I'm planning to start with 32GB DDR4 and upgrade later. Do you think 32GB is a 'hard blocker' for loading 30B models if I offload layers to the 24GB VRAM, or just slow?
- **Cptcongcong** (2↑): 1. Don’t run LLMs locally, not worth the initial investment. Google Colab or Kaggle is your friend.

3. Yes. For example, my team has done work in training a SOTA model with SOTA architecture, it’s not even published anywhere because our competitors will use it. Therefore there are no optimizations ready made for it, you can’t just convert it to TensorRT. We had to write the kernels when necessary to improve inference speed.

Really just don’t bother. I know someone who bought 4x3090s when they came out for “AI training” and the price per performance is just horrible. Don’t forget electricity too.
  - **hedgehog0** (1↑): > Really just don’t bother. I know someone who bought 4x3090s when they came out for “AI training” and the price per performance is just horrible. Don’t forget electricity too.

That’s interesting to know for me who wants to get a 3090… what other cards do you recommend for similar purposes, e.g., what do you think of 5060 Ti?
- **chief167** (2↑): Why do you think there is no CUDA in the cloud? 

We have no CUDA workstations at all at  work, it's all cloud. Is it cheap? Hell no, but its flexible and scalable and pricing depends on how much work to do (opex vs capex is easier for our internal accounting). And we use macbooks, but more for travel, batterylife, developer comfort. Not to build actual big GenAI projects on it. (although we still mostly do classic machine learning, XGBoost etc... run great on macbooks)

Unless you have a short term plan to use a GPU intensively, I would always go for cloud. And don't use hyperscalers like AWS, GCP or Azure. They are more expensive and you don't need to pay those premium prices for hobby projects.

I would never go for option B. It's the perfect middleground that is completely useless. It's too expensive for just learning cuda with real hardware on smaller models, and it's too small/cheap for any real big projects anyway. 24gb is sadly low tier nowadays.

Unless of course you buy it for gaming with a big of AI on the side, but thats different economics.

  
1. It's the wrong question imho

2. Battery life and developer comfort. Do real stuff on real platforms (databricks, datarobot, hyperscalers...)

3. portfolio's dont matter at all

4. no, cloud is smarter for non intensive workloads. Bonus tip: put the money for your GPU aside and spend from that bank account. It'll help you prove that you did not waste money on the cloud. Dont forget electricity isn't free either.

5. no, not for just AI
- **z3r0_se7en** (2↑): Get an amd ai halo strix pc box. 

Use it for local inference.

For any ai model training rent a gpu by the hour. It's the most cost effective method.
- **Equivalent-Joke5474** (1↑): Short take: keep the Mac for daily dev, add the 3090 if you’re serious about LLMs and infra. Apple Silicon is great for productivity, but CUDA still wins for real-time pipelines, tooling depth, and hiring signal. A 3090 is absolutely still relevant in 2025 for learning and prototyping.
- **sairas_purnil** (1↑): If you care about serious ML infra or long-term employability around LLM systems, CUDA is still the safer bet honestly. Apple Silicon is great for general dev work but the ecosystem gap becomes obvious once you move into larger local models or custom tooling
  - **Alena_laistea** (1↑): I went through this decision last year while building local inference pipelines and experimenting with multimodal agents. Ended up keeping my MacBook for everyday work but added a dedicated CUDA box later. We also collaborated with engineers from Litslink on part of the deployment stack and pretty much everyone there treated Apple Silicon as a nice secondary environment, not the primary ML workstation. The debugging or tooling experience around CUDA was just way more mature once projects became serious
