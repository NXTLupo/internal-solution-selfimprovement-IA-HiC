---
id: social-intelligence/reddit-deep/figmadesign/1u4mpkf.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1u4mpkf/inherited_a_product_with_hundreds_of_screens_and/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Inherited a product with hundreds of screens and no design system. How would you approach this?"
author: "AmazingBoysenberry95"
date: "2026-06-13T09:45:17.000Z"
score: 80
upvote_ratio: 0.97
num_comments: 33
flair: "help"
extracted_at: "2026-09-10T17:19:11.228Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c0"
    char_span: [0, 1825]
    sentence_count: 18
    key_terms: [design, system, designer, existing, product, screens, hundreds, figmadesign]
    concepts: [design, system, designer, existing, product]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c1", "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c2"]
    token_count: 366
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1u4mpkf/inherited_a_product_with_hundreds_of_screens_and/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c1"
    char_span: [1840, 3474]
    sentence_count: 22
    key_terms: [build, product, design, components, developer, inventory, building, systems]
    concepts: [build, product, design, components, developer]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c0", "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c2"]
    section: Comments
    token_count: 359
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c2"
    char_span: [3476, 5441]
    sentence_count: 22
    key_terms: [design, system, devs, get, take, time, components, sometimes]
    concepts: [design, system, components, sometimes, company]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c0", "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c1", "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c3"]
    section: Comments
    token_count: 445
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c3"
    char_span: [5443, 7477]
    sentence_count: 17
    key_terms: [etc, design, company, add, use, personally, depending, important]
    concepts: [design, company, personally, depending, important]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c2"]
    section: Comments
    token_count: 484
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c4"
    char_span: [7479, 9716]
    sentence_count: 25
    key_terms: [tokens, need, components, used, screens, startup, create, potentially]
    concepts: [tokens, components, screens, startup, create]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c5"]
    section: Comments
    token_count: 463
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c5"
    char_span: [9718, 11680]
    sentence_count: 24
    key_terms: [components, que, tokens, here, screens, don, variables, listado]
    concepts: [components, tokens, screens, variables, listado]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c4"]
    section: Comments
    token_count: 451
  - id: "social-intelligence/reddit-deep/figmadesign/1u4mpkf.md#c6"
    char_span: [11682, 13566]
    sentence_count: 11
    key_terms: [application, screens, styles, experiencia, devs, get, que, different]
    concepts: [application, screens, styles, experiencia, different]
    section: Comments
    token_count: 452
---
# Inherited a product with hundreds of screens and no design system. How would you approach this?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1u4mpkf/inherited_a_product_with_hundreds_of_screens_and/)
Posted by **AmazingBoysenberry95** · **80↑** · **33 comments**

Hi everyone,  
I’m a relatively junior product designer and recently joined a startup as the replacement for the previous designer.

The problem is that the previous designer built and launched the MVP without creating any proper design system, component library, variables, tokens, or documentation. They essentially designed everything screen by screen however they wanted.

Now there are already hundreds of existing screens, and management wants me to:  
Build a complete design system based on the existing product.  
Rebrand the UI.  
Convert all existing screens to use proper components and instances.  
Maintain consistency going forward.

I understand the basic concepts and process of building a design system, but doing this alone feels overwhelming. I don’t have a senior designer or mentor to guide me, and I’m worried about the amount of manual work involved.

I’m trying to find the most efficient workflow possible.

Some questions:  
If you inherited a product like this, what would your process be?

Are there any AI tools, Figma plugins, automation workflows, or design-system tools that can help speed up component extraction and standardization?

Is there a practical way to audit hundreds of screens without manually checking every single one?

Any tips for converting existing designs into components and instances at scale?

What are the biggest mistakes I should avoid in a situation like this?

I’d love to hear from anyone who’s dealt with a similar “design system after MVP launch” scenario.

## Comments

- **GOgly_MoOgly** (135↑): **Edit: wow, first award lol, thanks!**

This is like my dream job. 

But also a nightmare for someone without a lot of experience. The knowledge you’ll gain is well worth the effort though and it’s sounds like you’ll be busy for a while which is a good thing in this market.

**You are not ready for AI. AI requires structure and you have none. You have to build a muscle before it can be used.**


1. Product inventory. Go through every file/screen, group them in a new file by what’s similar. 

2. Component inventory. Pull these from the grouped screens. Check this against what actually made it into the product as well.

3. Color/spacing/type tokens. From these^ components you should be able to find the constants. You should not start saving random variables though. You should again, group core colors together first, then build color ramps based of what’s already been “approved”. 

4. This is the step where you can start building. You’ve mentioned nothing about a developer, but this is where I’d stretch myself to (try) and build a real Design System. Systems are backed by actual code. Right now, you’re just building a ui kit which is still useful, but not the same thing. Find out what stack is being used to build your product and research public design systems that use it as well. The earlier you include them, the better!


If developer alignment is just out of scope for now, build your tokens out, then create your components using best practices. Strict auto layout, use slots where customization without detachment is vital, if it’s not in the product it’s not in the design system. 

5. Each week, maybe Fridays, take an hour to log your accomplishments that week. Create a dedicated file with a before/after T chart or something. It’s is VITAL that you log and articulate what you are doing - this is a lot of work and can 10x efficiency in a company. Design efforts are rarely well documented in companies, it’s YOUR JOB to be able to relay why what you do matters and how it positively affects the bottom line!
  - **kjabad** (9↑): This comment makes most sense to me. I was in similar situations few times. I would add that coordination with a developers is crucial, and discuss things with management. After you do design audit I would make few components like buttons, imput fields, dropdowns, and components that are specific. Maybe even do 3 imporant screens. The point is to have a proposal to the rest of the team and say this is what i found, this is what i propose and get feedback.
In order for your ui library to become design system you need collaboration with the devs, find out what are they using forfront end and what is possible. Sometimes you get open hands to do anything, sometimes you can just do theming of existing design system. 

And OP, after this experience you will grow significantly. The beginning will be hard and slow but you will speed up exponentially. First 20 screens will take as much as last 100. Keep up good spirits!
  - **Fast-Bit-56** (4↑): I will refer back to this in a month or two. I inherited a really massive website with no design files or design system. Now they want to revamp the whole thing. Good part is, I get to create the very first design system the company is going to have, I can decide with the devs which framework to use and the best part, devs are my long time friends and I know they can deliver! It's gonna take a lot of time, but I know it's gonna be fun and fulfilling. I know this is going to make a big difference to them. I was looking for a job like this since a long time. 

One question, though. What tool do you use to keep track of everything? Changelogs, KPIs, components updates, performance upgrades, etc. At the end of the project I want to show how important is my work, and ask for a raise, ha!
    - **GOgly_MoOgly** (5↑): Glad it’s useful!

I didn’t personally use anything specific except my memory, which got old quickly. If your company doesn’t have one, invest in a basic task management tool yourself. This, along with any LLM, can help you turn whatever you export out of that into actual metrics you can present later.

Fair warning: I’ve been in a similar situation building from scratch. When the time came to ask for my pay to reflect the massive amount of work and success of it, it fell on deaf ears. This is why step 5 is so important. Your case (study) should be able to be made both for the company you’re with AND for another one if necessary. ☺️
  - **BertfromNL** (2↑): Very useful comment, excellent. What I would add is a way to version the designs. The design you inherited and that has been implemented is v1. Depending on what you can deduct, possibly you could add integers to part of the design (like v1.1, v1.2 etc.)

Your design system will be v2. 

This way, it's way more easy to communicate about progress, features, development etc avoiding a lot of frustration.

Personally, I would love this challenge! (depending on the design though lol)
- **ranagirl** (8↑): You’ve got some great comments already but I’ll just add that if your developers used a framework (tailwind, Vuetify, bootstrap, etc) you may be able to find a library in the Figma community files that you can use as a starting point rather than creating from scratch.
- **Silent-Incident6118** (5↑): Hey there 👋 system designer who was in a similar situation but for a very large company with multiple products and brands.

The steps depend on many things.
- Is this a single product or multiple?
- is there already an established brand? 
- what systems are we dealing with (web, native mobile OSs, etc)

1. I would first start with an audit of current screens. Not a massive one, you are in a startup. I would take enough screens to account around 80% of your product in relation to styles and components. While you’re dealing with many screens you will likely see a lot of repetition (unless there is a major silo issue)

Understand the basic styles and the context in which they are used. This will help you prioritise the MVP work as you now have a itinerary of what is used and how it’s used, potentially how often it’s used.



2. Tokens
Understand the company goals and where they are hoping to go, this will help you to determine how granular your tokens need to be.
Define the primitive tokens first. This will be your reference layer, not stuff you use directly in designs. 
Based on your audit, start creating a semantic palette based on context (backgrounds, content, border, state layers potentially, etc). If you see some lacking areas that you want to add, this is a good time. That was colours but do that for spacing, border width, radius, typography, etc. I use tokens studio primarily as well as Figma variables but Figma variables should be good for you.
If there are specific components that need to deviate from semantic tokens, create component level tokens for those specific components. A mistake I see is people creating component level tokens for everything. This is hard to maintain, especially for a startup. Only create what you need to create here. This is my opinion.
If you need help with naming conventions or anything like that, there are many ways to do it but I recommend looking to Nathan Curtis’ blogs as there is more than enough. Just determine if his ideas are too complex for your needs and simplify if necessary. This is something I can’t know from your product. 

If you’re struggling to get stakeholder improvement for tokens as they aren’t quite so tangible, I wouldn’t hesitate to argue the financial benefit of tokens. I have junior designers that do this and I personally appreciate it a lot. Hopefully you’re in a similarly decent environment. My argument for a startup is that they tend to rely on pivoting strategy more than larger companies and need a system that can flex to their needs.

3. Main components
Like tokens, Don’t go overboard here. We’re looking at mvp. Use the audit. What components make up most screens. It will be buttons, lists of some sort, form controls, etc etc. We want to focus on what will account for the majority of your screens. Best bang for your buck. Really think about the variants you use, name them appropriately (again I’m sure Nathan Curtis has some good info here but I haven’t checked).

I would also say that when you are creating tokens and components, you document any decision you make stylistically so that we can feed it to an ai EVENTUALLY. Don’t rely on ai at this point as what will be produced won’t be worth much. Again, my opinion, you do you.

Start making screens. Here I would probably be making boilerplates or assigning the task to another designer but that could very well be well be overkill here. I would start using these components and tokens/variables to make sure everything is working as expected. You will likely find deficiencies or issues that you can resolve now. You can add components where they are missing and all that stuff. 

Once you are happy with where you are and the system is appropriate for your needs and is scalable, you can collaborate with devs to get the tokens over to them. If you have native mobile products, you’ll need style dictionary or an alternative in order to translate for their needs. This should be handled by devs, don’t worry about that too muc
  - **Careful-Software6163** (1↑): What an amazing walkthrough. May I ask - when and how do you add auto layout?
- **Trrl93** (7↑): Buenas! A mí me pasó algo parecido hará 4 años o así. Mi consejo es que dejes claro a los jefes que es un proceso que lleva tiempo pero que cada minuto invertido retorna la inversión.

Por un lado te diría que hagas un listado de todos los componentes que realmente se necesitan viendo las pantallas finales, junto a un listado de variables y estilos que vayas a necesitar.

Si una cosa es segura, es que la experiencia que te va a dar hacer esto es un salto enorme en tu carrera, te lo digo por experiencia, por lo que te animo a afrontar el reto.
  - **AmazingBoysenberry95** (3↑): I'm energized, thank you so much :)!
- **hparamore** (2↑): Oh man that sounds wonderful. Nothing I love more than inheriting a huge messy project and getting to be able to build the design system for it and then rebuild everything. 

If you don't wanna do it, pay me to haha!
- **Interesting-Pay1507** (2↑): Does the final product look anything like the Figma screens? How close did the devs get to each design, and what did they use to get there as far as CSS, shared styles etc..  Like if there are ten different kinds of submit buttons in the Figma designs, when you go into the application do those ten different styles exist in the application or do the devs know that it's a primary button style? 

I would start with the application itself, is it a train wreck because of the lack of consistent styles. If it is, you need to define colors, type, spacing and then components one at a time. Those will need to be built out into a component library for devs to use so the final output matches your designs.
- **KangarooInitial578** (2↑): Crack those knuckles
- **Arae_X** (1↑): Following
- **[deleted]** (1↑): > Is there a practical way to audit hundreds of screens without manually checking every single one?

You should be checking them all anyways, I wouldn't outsource this to AI. A startup product is not that complicated just navigate through the whole platform and make a DS off the best looking parts of it then the eng team can update the non-conforming screens to the new DS.
- **elfgirl89** (1↑): If you are new to tokens and variables watch TD Sunshine’s YouTube series on it. It’s really good and will help you structure things the right way from the get go.
