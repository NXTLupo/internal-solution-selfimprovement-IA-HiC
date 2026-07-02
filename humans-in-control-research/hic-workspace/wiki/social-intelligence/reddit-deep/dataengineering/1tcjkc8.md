---
id: social-intelligence/reddit-deep/dataengineering/1tcjkc8.md
url: "https://www.reddit.com/r/dataengineering/comments/1tcjkc8/how_did_you_guys_learn_cicd_and_iac/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "How did you guys learn CI/CD and IaC?"
author: "Bloh56"
date: "2026-05-14T01:34:06.000Z"
score: 106
upvote_ratio: 0.97
num_comments: 33
flair: "Help"
extracted_at: "2026-06-11T18:58:17.203Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c0"
    char_span: [0, 953]
    sentence_count: 7
    key_terms: ["i'm", dataengineering, comments, progress, through, learn, "it's", lot]
    concepts: [dataengineering, comments, progress, through, learn]
    token_count: 229
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1tcjkc8/how_did_you_guys_learn_cicd_and_iac/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c1"
    char_span: [967, 2923]
    sentence_count: 21
    key_terms: [terraform, deploy, devops, "don't", aws, something, looking, someone]
    concepts: [terraform, deploy, devops, "don't", something]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c2", "social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c4"]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c2"
    char_span: [2926, 4975]
    sentence_count: 15
    key_terms: [deployments, razzmatazzliving1323, terraform, company, deploy, devops, teams, team]
    concepts: [deployments, razzmatazzliving1323, terraform, company, deploy]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c1"]
    section: Comments
    token_count: 481
  - id: "social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c3"
    char_span: [4977, 6480]
    sentence_count: 8
    key_terms: [try, background, experience, something, iterate, through, uncertainschrodinger, apply]
    concepts: [background, experience, something, iterate, through]
    section: Comments
    token_count: 329
  - id: "social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c4"
    char_span: [6485, 7503]
    sentence_count: 11
    key_terms: [get, good, something, doing, "don't", day, goes, lot]
    concepts: [something, doing, "don't"]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1tcjkc8.md#c1"]
    section: Comments
    token_count: 255
---
# How did you guys learn CI/CD and IaC?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tcjkc8/how_did_you_guys_learn_cicd_and_iac/)
Posted by **Bloh56** · **106↑** · **33 comments**

I'm pretty new as a junior data engineer, I have a business degree and come more from an analytics background, so a lot of the more engineering-side stuff is still unfamiliar to me.

My company uses AWS and GitLab, and we don't have many permissions to deploy much manually through the management console, everything has to go through CloudFormation and CI/CD pipelines. It's quite overwhelming trying to figure out where to get started.

My manager isn't very technical too, so I'm having to try and learn a lot of this on my own. I've tried using AI to help, but I'm not sure if I'm just prompting poorly, it's still been a pain to make much progress.

Just wondering if anyone has any advice on how to make progress here?

## Comments

- **Outside-Storage-1523** (63↑): You have to ask the DevOps team. Different teams deploy differently. Maybe someone can point you to something. But in general learning DevOps on your own is...perhaps not a reliable way unless you are guided. It is very hand-on and books only talk about principles. There are trainings but what good are they if you don't get to practice? You will forget those archaic Docker and K8S commands in a few days.

You can start by looking at your repo -- usually there is some CI/CD script under a hidden directory. But again, the best way to learn is to learn on job. It's not something you mess around in your side project, because your side projects usually don't need those tools.
  - **Bloh56** (11↑): Thanks for the reply appreciate it. Starting completely from zero, no ci/cd or IaC setup everything is in notebooks. I've tried looking at other teams repos but it's quite overwhelming and difficult to figure out what intricacies I need to include to have it all work with my companies devops specific setup.
    - **SeiryokuZenyo** (3↑): "we don't have many permissions to deploy much manually through the management console" who set that up? Outside-Storage is right though - someone set this up and had a model in mind, they should have some base code that you can work with.

Also stay away from Cloud Formation. Terraform or if you know you'll always be AWS, the CDK is pretty good. I swear CF and QuickSight were both developed by ex-Microsoft engineers. They remind me of the days of digging through using a linked list of GUIDs as breadcrumbs. MS is the worst for that kind of design.
- **fukinwatm8** (26↑): Baby steps

1. For IaC, deploy a aws resource via terraform with proper remote backend to keep your tf state files.


2. using CLI, deploy terraform to aws


3. Next CI/CD, plug this to github actions to automate terraform deployment across your branches. Like terraform plan followed by terraform apply


Use copilot for help.
  - **RazzmatazzLiving1323** (3↑): An edge case I can think of when Terraform CI/VD deployments becomes challenging is when Terraform deployments e.g. cluster deployments taints resources. How do teams handle this? Should there be rollback? 

It's interesting because if you compare it to ACID transactions in databases, atomicity is desired.
  - **RazzmatazzLiving1323** (4↑): I love this! In the past CI/CD deployments were tougher. With Claude and Copilot, they don't become significantly easier per se (because you still have to understand the fundamental CI/CD concepts) but the process of setting up CI/CD becomes more manageable.
- **Alternative_Draw5945** (31↑): First you are at a good company if they dont allow clickops. Everything should be IaC and engineers should know the basics. What are you struggling to deploy? I was in your position a few years ago as a SWE/Analytics manager. Had to learn gitlab pipelines+terraform myself and teach it to my team. Now they are self sufficient and teach me things.
  - **Bloh56** (9↑): End goal is to have an orchestrated pipeline using mostly just glue jobs, lambdas and step functions. Our team has no IaC or ci/cd built right now... everything is sitting in notebooks haha so starting from scratch. I'm trying to start basic and just deploy a single empty lambda with a manually created cloud formation yaml (most teams are doing this but I think devops wants us to use aws cdk). But have now learned I need to deploy it through ci/cd and I can't just upload the yaml manually which I guess make sense.

I've tried looking at some other teams repos but it's very overwhelming they have multiple .yamls with hundreds of lines in each
    - **reelznfeelz** (2↑): If I were you I’d have a call with the devops team and let them know what you’re wanting to do and ask if they can give you some advice about “how we do things at company x” so you know more about the company’s devops practices and where they expect you to just ask for help or for them to handle something.  

Building that relationship is key.
- **JaymztheKing** (14↑): against my will mostly
- **uncertainschrodinger** (6↑): I'll add one more thing in addition to what others said. In most junior roles you maintain things and make small changes, through exposure you get familiar with things but at this stage it's important to actually ask questions and try to learn the why/how and not just what - if you just memorize the steps, you won't understand it properly. After a while, you might need to deploy, migrate, or reconfigure something and that's when your prior understanding comes handy.

From personal experience (also a business degree background starting in analytics then DE), a lot of these infrastructure stuff seems very intimidating to people without SE background because of the lingo and code-first configs, and it comes off as gatekeeping, but they are actually pretty straightforward. After a while, you'll actually hate UI-based or no/low code stuff and prefer to have everything as code.
- **kaixza** (4↑): From my experience (I'm using terraform) :   
\- Make sure I could go through with my plan. If no errors then, it is a good to check it in a sandbox/dev account.

\- Try to apply it in dev, and then experiment with its params. I'll make sure I iterate this step multiple times until I am able to grasp some basic concepts, especially how it manage creations and destructions cycle. 

\- Start small in production environment. Don't try to rush to apply something big. 

\- Iterate. 

  
Using AI is good but if you don't understand the concept, it will be hard for you in the long run if something happens. Have fun and good luck!
- **Sp00ky_6** (3↑): Fucking up state files a lot
- **xander_abhishekh** (2↑): Honestly just break stuff in a dev account. deploy something, watch it fail, read the error, fix it, repeat. I use cfn day in day out and still get surprises i've never seen before. no course prepares you for that, only doing it does.
- **Kaze_Senshi** (1↑): Don't forget that you are still a software engineer when working with CI/CD. I have read several awful deployment scripts because of readability (bad variable names, code repetition, etc) that only works in production.
- **Economy_Peanut** (1↑): Projects.  I played - a lot. I then started homelabbing.

There are some things that you can only get by doing.  It goes beyond certification. 

Your journey also goes down tk the basics. As much as possible. Get those and you'll be good afterwards... no matter what team you are thrown in.
