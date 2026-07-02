---
id: social-intelligence/reddit-deep/edtech/1me1umq.md
url: "https://www.reddit.com/r/edtech/comments/1me1umq/ai_tools_that_allow_student_sessions_to_be/"
kind: "social-post"
source: "reddit-deep: r/edtech"
subreddit: "edtech"
title: "AI tools that allow student sessions to be exported"
author: "scaryrodent"
date: "2025-07-31T13:39:22.000Z"
score: 1
upvote_ratio: 0.55
num_comments: 32
flair: ""
extracted_at: "2026-06-23T20:31:59.071Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/edtech/1me1umq.md#c0"
    char_span: [0, 1110]
    sentence_count: 8
    key_terms: [students, everything, university, chatbots, comments, readable, sessions, browser]
    concepts: [students, everything, university, chatbots, comments]
    token_count: 254
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1me1umq/ai_tools_that_allow_student_sessions_to_be/"}]
  - id: "social-intelligence/reddit-deep/edtech/1me1umq.md#c1"
    char_span: [1124, 2991]
    sentence_count: 16
    key_terms: [claude, elhmfakncmnghlnabnolalcjkdpfjnin, chatgpt, claude-exporter-save-clau, pdf, export, students, chromewebstore]
    concepts: [elhmfakncmnghlnabnolalcjkdpfjnin, claude, chatgpt, claude-exporter-save-clau, export]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/edtech/1me1umq.md#c2"
    char_span: [2993, 4897]
    sentence_count: 17
    key_terms: [want, students, session, "don't", scaryrodent, code, assignment, extension]
    concepts: [students, session, scaryrodent, assignment, "don't"]
    related_chunks: ["social-intelligence/reddit-deep/edtech/1me1umq.md#c4"]
    section: Comments
    token_count: 433
  - id: "social-intelligence/reddit-deep/edtech/1me1umq.md#c3"
    char_span: [4899, 5850]
    sentence_count: 7
    key_terms: [grade, need, assessment, learning, communicationsure608, final, ways, functionality]
    concepts: [assessment, grade, learning, final]
    section: Comments
    token_count: 194
  - id: "social-intelligence/reddit-deep/edtech/1me1umq.md#c4"
    char_span: [5852, 8032]
    sentence_count: 20
    key_terms: [chatgpt, copilot, scaryrodent, chat, code, did, hand, like]
    concepts: [chatgpt, copilot, scaryrodent, assignment, exported]
    related_chunks: ["social-intelligence/reddit-deep/edtech/1me1umq.md#c2"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/edtech/1me1umq.md#c5"
    char_span: [7773, 8532]
    sentence_count: 7
    key_terms: [cogniti, https, like, unfortunately, conversation, institutions, instructors, generation]
    concepts: [cogniti, https]
    section: Comments
    token_count: 175
---
# AI tools that allow student sessions to be exported

Source: [reddit-deep: r/edtech](https://www.reddit.com/r/edtech/comments/1me1umq/ai_tools_that_allow_student_sessions_to_be/)
Posted by **scaryrodent** · **1↑** · **32 comments**

Hi, I teach computer science at a university,  so you would think I know everything about AI chatbots, but I don't. Our students need to learn to use AI productively, as an assistant, so I have developed some assignments that do just that. The issue is that I cannot assess their work without seeing their actual sessions - their questions, responses, everything - as text or pdf or something readable.  I can have them use chatGPT with a browser extension that does exports, but that breaks every so often, plus my students often do not have anything but limited free chatGPT. The university provides coPilot to the students, but it has no way of doing exports, not even browser extensions. Are there any AI chatbots out there which work well for generating code AND makes it easy to export the full session in a readable format. The tool also can't cost very much.  Thanks!

## Comments

- **azubah** (3↑): Gemini will do it. It allows you to directly export a chat session to Google docs or Gmail. It's a single-click process.

In ChatGPT, after they hit "share," you can do a Print to PDF. You can try asking them to do the Print to PDF themselves and send the PDF.

Perplexity has a **Export → PDF** option that bundles the full prompt/response history, complete with code formatting. It doesn't require any extensions or anything.

Claude has a free Claude Exporter Chrome add-on.

There are more, but try these first.
  - **scaryrodent** (2↑): Thanks, I will definitely check out Gemini and Perplexity. 

My chatGPT does not have the Print to PDF button, for some reason. It jsut generates a link when I click Share.  I am on the midtier plan.

The Claude export is the same browser extension that I am using with chatGPT. Is Claude cheaper for students than chatGPT?
    - **azubah** (1↑): This is the Claude export extension: [https://chromewebstore.google.com/detail/claude-exporter-save-clau/elhmfakncmnghlnabnolalcjkdpfjnin?pli=1](https://chromewebstore.google.com/detail/claude-exporter-save-clau/elhmfakncmnghlnabnolalcjkdpfjnin?pli=1)

Claude and ChatGPT are both right around $20 a month, I think, so no big savings there.
- **SignorJC** (2↑): im not sure i understand why your students cant save their chat sessions as a document and submit it to your lms?
  - **scaryrodent** (1↑): Because I can't find a way to do that. How would you do it with coPilot? I have done many searches to find out and just see people mentioning screenshots, which is way too cumbersome for long sessions with embedded code.
    - **SignorJC** (2↑): have you heard of this incredible features called "copy and paste?"
- **John_Yossarian** (1↑): Could you just make it a submission requirement that students include a shared link to the conversation(s) they had?

https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq
  - **scaryrodent** (2↑): No, because that just gives me access to the live session. I want the session as it is on the due date. With a live link, the student could even remove the session, and then claim they need an extension because "it was a mistake". I want an unmodifiable copy, same as I require for any other assignment
    - **John_Yossarian** (4↑): Okay, what about having them print it to a PDF?

Also, I would say that if a student "accidentally" deletes an entire live-linked conversation, that should be an automatic zero. There's no way that could legitimately happen. Set that expectation and let them test that boundary at their own risk.
- **scaryrodent** (1↑): So just for context, I teach an advanced software design course. I want them to use AI tools in the way that an experienced software engineer would use them, by iteratively going through the task, generating modules and critiqueing them before assembling the final product. AI generated code often has errors or isn't the way you want it to be designed so it needs a human eye to review and comment.  An example I did for my students to show them the process, a relatively simple code refactoring problem, is around 2500 lines. Doing screenshots of all of that is time consuming and error prone. Plus there is the problem of scrollable code. The export browser extension for chatGPT works fine, it is just that my students often don't have the paid version and the free version has serious limits on what they can upload (like big data files). I was hoping that some of the other tools might have that.  I don't see how any instructor can assess how well students are interacting with AI on real projects without that ability
  - **grendelt** (2↑): Model for them what you want them to do.  
Don't give them a monolithic assignment. Piece it out to them.

Have them document what each module is, how it will operate, what the inputs/outputs are, then have them give you the code that implements it. Don't grade them on completion, functionality, operation, etc. Grade them on sticking to the specification *they themselves* laid out.
    - **CommunicationSure608** (1↑): I second what u/grendelt says here. In the age of AI teachers/profs/instructors need to be taking a more process-based approach to assessment. Product-based assessment, where you just grade the final submission, leaves a lot of room for them to game the system and use AI in ways that undermine the learning objectives. Humanities subjects are having to deal with similar issues, even though the specifics are very different: Essays and research papers that are just graded as final products need to die. Instead we need to pivot, create more open-ended and challenging assignments for them, and find new ways to assess their learning. 

Create graded check-ins over the course of the assignment. Have them include a document that details their approach, process, obstacles, etc. By checking in with them often and being creative in how you assess, you can get around these issues. IMHO your fundamental problem is that you are not modifying your assignments and tasks for a world in which AI is always accessible. You have to assume that they will use AI to take shortcuts any chance they get - so you need to move the goalposts if you still want them to learn.
    - **scaryrodent** (0↑): Oh yes, of course. That is exactly what I do. And then I assess them on the exported session - how deeply they engage with the tool to customize and improve the code. We did it with chatGPT which has the export browser extension - it is just that the free chatGPT is very limiting. About half the class did well. But some of them still did the "feed the problem description in, push the button, and hand in the code" method.  And one guy was so lost that he asked chatGPT what to hand in despite the fact that the assignment told them to hand in the code and the exported session.
- **ReadySetWoe** (1↑): There's a Share button in Copilot chats. I'm assuming you mean M365 Copilot Chat.
  - **scaryrodent** (1↑): I had been avoiding shares because I was concerned that the student could change things later, but according to coPilot, if the student makes changes after generating the link, holders of the link won't see them. So that may well work. I have to see what it looks like
- **rfoil** (1↑): I use REACHUM for this. Contact them at support@reachum.com. They 
literally can present and collect any information including text, video, audio, AI and present it in reports. They release their own lesson planning AI Tuesday. I’ve been part of the beta group.
- **TheLearningNerdd** (1↑): There is LM Studio, it runs AI models locally and saves entire chat sessions. It’s free, but there’s a bit of a setup. and there's OpenRouter too—it’s like a hub that gives access to a bunch of different AI models . You can use it through a basic web chat, or connect it to things like Telegram or Discord if that’s easier.
- **matbot99** (1↑): [https://cogniti.ai/](https://cogniti.ai/)  
Developed by University of Sydney. Gaining traction at other institutions, including the one I work at. Instructors can view conversation history with their agents (with student identities). Students can also export easily to Word/PDF.  
Unfortunately, as it is more of a passion project than large scale Ed Tech company, there is currently no image generation, no ability for users to upload files, and it doesn't vibe code. Maybe soon though...
