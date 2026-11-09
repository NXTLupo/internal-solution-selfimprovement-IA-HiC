---
id: social-intelligence/reddit-deep/cscareerquestions/1wtf1fo.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Mobile Engineers: Are any of you still having fun at your job despite AI?"
author: "jacksonfire123"
date: "2026-09-29T16:37:52.000Z"
score: 19
upvote_ratio: 0.88
num_comments: 28
flair: "Experienced"
extracted_at: "2026-10-01T20:49:45.674Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1wtf1fo.md#c0"
    char_span: [0, 2221]
    sentence_count: 13
    key_terms: [like, mobile, code, cscareerquestions, job, load, create, people]
    concepts: [mobile, cscareerquestions, create, people, balancing]
    token_count: 504
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/","kind":"social-post","date":"2026-09-29","author":"jacksonfire123","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1wtf1fo.md#c1"
    char_span: [2223, 3752]
    sentence_count: 7
    key_terms: [code, anyway, new, implement, engineer, proposal, because, "doesn't"]
    concepts: [anyway, implement, engineer, proposal, because]
    token_count: 322
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/","kind":"social-post","date":"2026-09-29","author":"jacksonfire123","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1wtf1fo.md#c2"
    char_span: [3767, 5807]
    sentence_count: 22
    key_terms: [minimum-reward3264, work, software, factory, money, get, ship, want]
    concepts: [minimum-reward3264, software, factory, money, investing]
    section: Comments
    token_count: 487
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/","kind":"social-post","date":"2026-09-29","author":"jacksonfire123","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1wtf1fo.md#c3"
    char_span: [5809, 7638]
    sentence_count: 13
    key_terms: [sometimes, work, means, engineers, clients, without, working, "you're"]
    concepts: [sometimes, means, engineers, clients, without]
    section: Comments
    token_count: 437
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/","kind":"social-post","date":"2026-09-29","author":"jacksonfire123","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1wtf1fo.md#c4"
    char_span: [7640, 8560]
    sentence_count: 7
    key_terms: [claude, myself, doing, importantpoet4787, baseballsuch5458, craftsmanship, daymantrayman, engineering]
    concepts: [claude, myself, doing]
    section: Comments
    token_count: 217
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/","kind":"social-post","date":"2026-09-29","author":"jacksonfire123","subreddit":"cscareerquestions"}]
---
# Mobile Engineers: Are any of you still having fun at your job despite AI?

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1wtf1fo/mobile_engineers_are_any_of_you_still_having_fun/)
Posted by **jacksonfire123** · **19↑** · **28 comments**

A little over 3yoe. Kinda quirky, but I spent my first 2 years on mobile SDKs for iOS. It was my absolute complete dream job in every imaginable way. That team got a new manager though and long story short, I had to change to another team.

I switched to a fullstack team on a React/Ruby on Rails stack. Coincidentally at around the same time was when most people at my company, myself included, started writing 100% of code via AI. I would go so far as to say that I now "hate" my job, and so I've been contemplating trying to switch back to mobile.

But, I'm concerned that in the age of AI, I won't like mobile nearly as much anymore. Basically, I really like to focus on code rather than like server uptime, DB load, load balancing etc. **I fully recognize that AI has killed writing for-loops by hand, but what about code architecture-y things?**

Our SDK was based on Redux architecture, and I loved working on that system. I love having debates about where a piece of logic should live in code, which components need to be privy to what information, the most graceful way to accomplish dependency injection, learning about code patterns that enable effective and easy testing etc.

People will reference "higher-level skills" that are safe from AI: **is what I described above high enough level?** I feel like typically people couch those discussions in things like the server uptime, DB load, load balancing etc, which again I do not enjoy at all.

I think I could still enjoy my job if my AI prompts were like "Create a new reducer as the child of this other reducer and give it xyz state and abc actions and have an action that when y happens emits z result," or, "Create a protocol witness setup with these methods and then create a testing witness with a stubbed version of the network io method that switches upon the url and returns...". **If you are a mobile engineer, is that sort of what your AI usage looks like?**

Because on my new team, my AI usage is literal just copy pasting Jira tickets into Cursor and saying "Please implement this, open a draft pr, and then review the PR and implement any feedback items." All of our TS and Ruby code is absolute slop anyway, so it literally doesn't matter what the code looks like AT ALL and literally nobody cares, myself included because Ruby and (shitty) React are so hopelessly gross anyway. If there's a way to write good code in these frameworks, our company doesn't do it. Plus, it's a little hard to explain concisely, but outside of the dashboard/portal UI, we pretty much just write scripts that run top to bottom anyway. Everybody in charge of evaluating me thinks I am doing much, much better ever since I started not looking at the code I put up for review. **Does anybody in any corner of the industry care about thoughtful code architecture at all anymore?**

Under the leadership of a new staff engineer, my old mobile SDKs team has said they'll be removing the Redux system in favor of pure OOP hierarchy. They actually asked my opinion on the proposal and I said I'd opine once they issued a more technically-oriented proposal with ideas for alternative architectures. Then the new staff engineer said "What do you mean by alternatives? Anything but \[Redux\] kinda, which uses proper dependency injection, references, chain of calls for better stacks, et cetera." They specifically called out that they think this approach will make it easier for LLMs to contribute to the codebase.

## Comments

- **Minimum-Reward3264** (24↑): No my man. Factory work mostly.
  - **Daveboi7** (3↑): what is factory work?
    - **kkingsbe** (6↑): Software Factory, “lights-out software engineering”, etc
  - **blengoususs** (2↑): yeah that tracks tbh
- **k8s-problem-solved** (28↑): I work on some swift and kotlin codebases. You have to understand that no business cares about this stuff - they never have. They just want to ship things that make money, and code automation is the way they achieve that in many cases. They put up with engineers talking tech because they understood that was required but they've never thought "i hope software delivery unit 1455 is enjoying debating their architectural decisions and framework choices". No - ship stuff that makes money and has impact. 

If you cut too many corners and make and mess then you slow down the ability to do that. There in lies the skill - knowing what to invest time and effort in (ci, fast testing, fast feedback loops, reducing friction), knowing what will bite you hard later and what will be easy to pivot away from.

Get something in front of a customer. Get their feedback. They like? Keep it going. Its terrible? Stop investing. 

I always think now "if this was my money I was investing in this company, is it something id want to spend". 

I think people have to change their mindsets from "this aspect of the job gave me problem solving pleasure" to "how can I ship value to the customer faster". Its not what some people want to hear but its going to be the reality
  - **ApplicationGreat2995** (3↑): very based. It always has essentially boiled down to solving problems and get paid for it
  - **Minimum-Reward3264** (2↑): No they don’t. Advice is for, IDK, managers or entrepreneurs, etc. For IC it’s bull crap, ain’t nobody is hiring on your ability to manage corners. Hard text book skills, and some behavioral.
- **Khenghis_Ghan** (9↑): I am, occasionally. I am pleased to have my work done sooner and be able to move on to other things or just spend workday hours gaming.

I miss th certainty of a compiler, the exultant high of tracking down a hard bug and feeling I am a golden god (after the low of “you idiot, why cant you figure this out?”).

EDIT: Missed this was for mobile engineers, but, statement still stands.
  - **FourHeffersAlone** (0↑): Haha. No such thing as a free lunch. Nobody's gonna leave money on the table if you're finishing work early. Not forever.
    - **Khenghis_Ghan** (1↑): Maybe, but generally these things are pie eating contests where the reward for winning is more pie to eat. More likely scenario is I just get more work to do. I work in research engineering, there’s always more questions to be asked and nobody would or should trust AI to whatever results it produces without verification.
- **OutrageousCourse4172** (10↑): Not me. Bored out my mind.
- **0x-2a** (6↑): Is this what other careers feel like, just pretending like you're working all day?
  - **CandidEngineering922** (1↑): Yes but less intelligent people truly believe they are working.
- **digital_rabbit1999** (6↑): I was having fun when I would write the code, use Chatgpt for some help, otherwise stackoverflow. 

Right now, it's just garbage. Good for clients and higher ups, but developers have lost something beautiful.
  - **ApplicationGreat2995** (2↑): Good for clients is the only thing that matters
- **TeaSerenity** (3↑): I'm my team's lead and it's an interesting time to be sure. A lot of my effort is trying to keep our code quality up to my standards even with AI.   
  
Sometimes that means putting work into our workflows so AI does better. Sometimes that means continuing to teach and upskill my team so they understand what to look for when checking what their AI built

Sometimes that means telling my engineers to build certain things without AI to help develop their own skills.

To some extent I enjoying iterating on our AI workflows. I would say I enjoy the craftsmanship of building things myself more but the hard parts didn't change. We still need to be producing a quality product and figuring out how to build/test/etc something that we are proud of is still where all the fun engineering happens
- **DaymanTrayman** (3↑): I am just prompting Claude to knock out tickets and trying to make myself as important as possible to my team.  Otherwise, I just rip some games or get housework done.  I'm doing less dedicated work than ever and I am on track for a promo next year lol
- **BaseballSuch5458** (2↑): I'd go back to iOS imo. Xcode can spit out a view now but the annoying state management decisions are still yours, for better or worse.
- **ImportantPoet4787** (1↑): I quit now and now I trade. I make  more money doing it too and don't have to read b******* bug reports written by Claude
