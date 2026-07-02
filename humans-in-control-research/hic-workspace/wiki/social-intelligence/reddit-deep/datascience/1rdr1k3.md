---
id: social-intelligence/reddit-deep/datascience/1rdr1k3.md
url: "https://www.reddit.com/r/datascience/comments/1rdr1k3/what_is_your_python_development_set_up/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "What is your (python) development set up?"
author: "br0monium"
date: "2026-02-24T20:05:38.000Z"
score: 58
upvote_ratio: 0.87
num_comments: 66
flair: "Tools"
extracted_at: "2026-06-11T18:58:19.178Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c0"
    char_span: [0, 432]
    sentence_count: 3
    key_terms: [datascience, comments, python, development, reddit-deep, everything, br0monium, primarily]
    concepts: [datascience, comments, python]
    token_count: 113
    sources: [{"n":"reddit-deep: r/datascience","u":"https://www.reddit.com/r/datascience/comments/1rdr1k3/what_is_your_python_development_set_up/"}]
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c1"
    char_span: [454, 2160]
    sentence_count: 20
    key_terms: [environment, production, python, environments, tools, use, used, analytics]
    concepts: [environment, production, environments, python, tools]
    section: What do you use? / How do you use it?
    token_count: 363
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c2"
    char_span: [2175, 3746]
    sentence_count: 10
    key_terms: [kedro, pipeline, triplethreat8, environment, data, run, deployment, pipelining]
    concepts: [kedro, pipeline, triplethreat8, environment, deployment]
    section: Comments
    token_count: 414
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c3"
    char_span: [3748, 4988]
    sentence_count: 11
    key_terms: [environment, "it's", use, virtual, br0monium, pipelines, managing, manager]
    concepts: [environment, virtual, br0monium, pipelines, managing]
    section: Comments
    token_count: 309
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c4"
    char_span: [4990, 6480]
    sentence_count: 15
    key_terms: [projects, "it's", production, inference, language, personal, response, training]
    concepts: [projects, production, inference, language, personal]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1rdr1k3.md#c5"]
    section: Comments
    token_count: 322
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c5"
    char_span: [6482, 8530]
    sentence_count: 12
    key_terms: [python, like, rust, pyenv, work, personal, projects, atmosck]
    concepts: [python, pyenv, personal, projects, atmosck]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1rdr1k3.md#c4"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c6"
    char_span: [8251, 9100]
    sentence_count: 5
    key_terms: [projects, accordingweight6019, like, crispybacon233, deduplication, environments, reproducible, subscription]
    concepts: [projects]
    section: Comments
    token_count: 193
  - id: "social-intelligence/reddit-deep/datascience/1rdr1k3.md#c7"
    char_span: [9102, 10431]
    sentence_count: 13
    key_terms: [sometimes, cloud, use, enterprise, depends, jupyter, pycharm, claude]
    concepts: [sometimes, cloud, enterprise, depends, jupyter]
    section: Comments
    token_count: 345
---
# What is your (python) development set up?

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1rdr1k3/what_is_your_python_development_set_up/)
Posted by **br0monium** · **58↑** · **66 comments**

My setup on my personal machine has gotten stale, so I'm looking to install everything from scratch and get a fresh start. I primarily use python (although I've shipped things with Java, R, PHP, React).  
## What do you use?
1. Virtual Environment Manager
1. Package Manager
1. Containerization
1. Server Orchestration/Automation (if used)
1. IDE or text editor
1. Version/Source control
1. Notebook tools  
  

## How do you use it?
1. What are your primary use cases (e.g. analytics, MLE/MLOps, app development, contributing to repos, intelligence gathering)?
1. How does your setup help with other tech you have to support? (database system, sysadmin, dashboarding tools /renderers, other programming/scripting languages, web or agentic frameworks, specific cloud platforms or APIs you need...)
1. How do you manage dependencies?
1. Do you use containers in place of environments?
1. Do you do personal projects in a cloud/distributed environment?  
  
My version of python got a little too stale and the conda solver froze to where I couldn't update/replace the solver, python, or the broken packages. This happened while I was doing a takehome project for an interview:,)  
So I have to uninstall anaconda and python anyway.  
  
I worked at a FAANG company for 5 years, so I'm used to production environment best practices, but a lot of what I used was in-house, heavily customized, or simply overkill for personal projects. I've deployed models in production, but my use cases have mostly been predictive analytics and business tooling.  
  
I have ADHD so I don't like having to worry about subscriptions, tokens, and server credits when I am just doing things to learn or experiment. But I'm hoping there are best practices I can implement with the right (FOSS) tools to keep my skills sharp for industry standard production environments. Hopefully we can all learn some stuff to make our lives easier and grow our skills!

## Comments

- **triplethreat8** (38↑): Uv for virtual environment and package management

Docker for containers

Kedro for pipelines (you didn't ask)

VScode

Git

Just Ipython no jupyter
  - **br0monium** (4↑): sounds nice! Ive always thought of pipelining as a function that spans mutliple other areas. Server automation and DBMS for job scheduling, data lineage, etc. Using a tool for the whole process would save a lot of time on data engineering decisions.
    - **triplethreat8** (3↑): Yea, pipelining exists at multiple levels. Kedro itself isn't opinionated. Since it allows you to slice your pipeline you can still use any traditional pipeline tool that orchestrates scripts and just run slices.

Example:

`kedro run --nodes=clean_a,clean_b`

`kedro run --nodes=clean_c`

The benefit of using kedro for a Data Science project is that it imposes a good reproducible structure and gets DS thinking in a more modular way.
  - **froo** (2↑): +1 for this setup. Same here
  - **mint_warios** (1↑): Kedro is a beast
- **Old_Cry1308** (48↑): conda for environments, pip for packages. vscode for editing, git for version control. jupyter for notebooks.
  - **Civil-Age1531** (17↑): dude you have to pick up uv
    - **Glittering_Item5396** (5↑): what is that?
  - **br0monium** (6↑): the classics:)
- **templar34** (7↑): Devcontainers in each repo, Backstage template for generic new project. Makes sure my pleb code from Windows machine behaves same as Mac code, behaves same as cloud deployment environment. Conda YAML part of repo, and has its own deployment pipeline for Azure.

One day maybe I'll look at uv, buuut I'm not the Azure expert that set up our pipelines, and I'm a big believer in "if it's ugly/stupid but it works, it's not ugly/stupid".
  - **br0monium** (2↑): I havent used the devcontainer spec before, looks like it's well supported and could be pretty clean. Backstage looks really interesting too. Thanks!
- **willthms** (6↑): I use R studio running on my desktop.
  - **br0monium** (4↑): A real statistician!
- **gocurl** (6↑): Poetry for virtual environment, vscode, and clear separation between training and serving.
At work we have nice pipelines and engineers to support the infrastructure. For home projects I keep the concept, but it's not that necessary (last finished project here https://github.com/puzzled-goat/fire_watcher)
- **Atmosck** (4↑): What do I use:

1. Virtual environment manager: pyenv for managing different python versions, uv for managing the actual virtual environments
2. Package manager: uv
3. Docker
4. My coworkers maintain our build pipeline and orchestration with AWS. I mostly just ship code and bother them if I need new environment variables or something.
5. vscode
6. github for code, S3 versioning for model artifacts
7. I don't use notebooks

How do I use it?

1. I spend most of my time writing ML pipelines that feed our (SAAS) product. Scheduled tasks for training data ETL, training, monitoring and sometimes inference. Other times if it's something where we need inference in response to user action, either a lambda or a dedicated server depending on the usage patterns.
2. I have kind of a love-hate relationship with vscode. Some of my projects are a mix of python and rust (PyO3), so it's nice having language support for both in the same editor, and the sqltools extension is great. The python debugger is pretty good. But the language servers randomly shit themselves like twice a week. And I wish copilot autocomplete was hooked into intellisense so that it would suggest functions and parameters that actually exist instead of just guessing.
3. uv and pyproject.toml. almost all my stuff is containerized so it's pretty straightforward.
4. In production yeah, but locally I always work in virtual environments. I always have at least one dependency group that's not used in production with ruff/pytest/pyright/stub packages.
5. I don't really do personal projects. I'm lucky enough to be in an industry where my actual work is what my personal projects would be if I had a different job.

If you've been dealing with conda headaches and are looking for a new setup I *highly* recommend checking out uv.
  - **br0monium** (2↑): Thanks for breaking it down in a detailed response! I'll definitely check out uv after all the recommendations.

I wouldn't do personal projects if I wasn't unemployed hahaha. But it's been so long I need to make sure I dont fall too far behind or forget things. I hit the point of diminishing returns with interview prep a while ago.
  - **gpbayes** (1↑): Why do you use rust?
    - **Atmosck** (1↑): For speeeeeed. Specifically some of my models are state machine simulations where we care about the whole distribution and the frequency of rare events, and it can take a lot of sims for distributions to converge. So I write the core simulation engine (the "hot loop") in rust, and all the data IO and orchestration in python. For that sort of thing rust is about 100x faster than python. You could achieve similar speeds in python with a compiler like cython or numba or with a C extension, but there are a lot of things about rust that make it a more attractive language to work in.
  - **unc_alum** (1↑): Curious what your motivation is for using pyenv over uv for installing/managing different versions of python?
    - **Atmosck** (1↑): Basically just that I've used pyenv for longer. And I like the separation of pyenv happens in the global environment, UV happens in the venv
  - **Subject_Match860** (1↑): Hey,   
Do you have any suggestion to someone whose organization uses Databricks for all their analytics and sometimes prototype model training, on how they can start leveraging these tools and practices ?
- **FlyingQuokka** (3↑): 1. uv
2. uv
3-4: My personal projects don't need containerization; at work DevOps uses EKS
5. neovim
6. git/jj
7. I don't use notebooks, but if I must, then marimo
  - **br0monium** (1↑): Neovim, nice!  
I actually have sublime, cmder, and atom still installed on my laptop😅 vscode is basically atom, and that's what I've used at work, so I'll probably end up using vscode like a normie.  
Nothing beats the feeling when your muscle memory for vi commands finally clicks though. It's like the shell, filesystem, and text editor are all just one thing that you live in.
- **AccordingWeight6019** (3↑): Honestly, for me it’s less about fancy tooling and more about keeping things light, reproducible, and flexible. I usually stick with \`venv\` + \`pip\` for environments, VS Code for editing, git for versioning, and jupyter for quick experiments. containers only if I need to mirror a production setup. It’s not flashy, but it keeps personal projects simple and lets me switch between analytics, MLE, or just tinkering without getting stuck on solver freezes or subscription headaches.
  - **crispybacon233** (1↑): uv's speed and deduplication of packages across projects are amazing.

marimo gets along with git way better than jupyter and is easier to install.

If keeping it light, reproducible, and flexible are important, they're definitely worth checking out.
- **vaaano** (2↑): uv+marimo
- **mint_warios** (2↑): 1+2. uv for virtual envs & package Mgmt

3. Docker or Google Cloud Build for containerisation

4. Depends on the project, sometimes Prefect, sometimes Airflow/Cloud Composer for client enterprise pipelines, sometimes Kedro for more data science tasks

5. PyCharm for IDE, with Cline plugin using Claude Sonnet or Opus 4.6 models with 1m context window for agentic coding

6. Git - Bitbucket for work, GitHub for personal

7. PyCharm's built-in Jupyter notebooks, or Colab Enterprise if need to work completely within a client's cloud environment
  - **br0monium** (1↑): How much does that setup in (5) cost you?
    - **mint_warios** (2↑): PyCharm is free. Used to be called "Community Edition" but now it's wrapped up in their "Unified" IDE. But still free with all the same features. 

For Cline, it really depends on the LLM model I've chosen to use and how much I decide to use it. I use Claude Opus 4.6 mostly, and in a typical day I can easily burn through $10-30+. Lower end if I'm just making some documentation. Higher end if it's using maximum extended thinking to develop lots of code.
