---
id: social-intelligence/reddit-deep/healthit/1rwz1nl.md
url: "https://www.reddit.com/r/healthIT/comments/1rwz1nl/i_built_a_browserbased_ambient_scribe_that_keeps/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "I built a browser-based ambient scribe that keeps all data on the device (open source)"
author: "xhable"
date: "2026-03-18T09:23:11.000Z"
score: 17
upvote_ratio: 0.81
num_comments: 26
flair: ""
extracted_at: "2026-06-22T21:46:00.283Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market outlook report on the state of AI adoption across the healthcare sector heading into 2026, analyzing clinical and operational use cases, deployment barriers, and regulatory drivers. Evaluate current health system integration trends, investment priorities, and market growth indicators based on recent industry research and deployment data."
engagement: "deliver-a-strategic-market-outlook-report-on-the-state-of-ai"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c0"
    char_span: [0, 2225]
    sentence_count: 11
    key_terms: [on-device, ai-medical-scribe, com, features, ambient, browser, chrome, scribe]
    concepts: [ai-medical-scribe, on-device, features, ambient, browser]
    token_count: 490
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1rwz1nl/i_built_a_browserbased_ambient_scribe_that_keeps/"}]
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c1"
    char_span: [2239, 4491]
    sentence_count: 16
    key_terms: [security, everything, does, secure, hallucinate, local-first, data, "it's"]
    concepts: [security, everything, secure, hallucinate, local-first]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c2"
    char_span: [4493, 6689]
    sentence_count: 25
    key_terms: [speech, update, being, terminology, note, accuracy, "google's", improves]
    concepts: [speech, update, terminology, being, accuracy]
    section: Comments
    token_count: 461
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c3"
    char_span: [6691, 8891]
    sentence_count: 15
    key_terms: [local, data, integration, local-first, back, does, structured, encrypted]
    concepts: [local, integration, local-first, structured, encrypted]
    related_chunks: ["social-intelligence/reddit-deep/healthit/1rwz1nl.md#c4"]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c4"
    char_span: [8893, 10281]
    sentence_count: 9
    key_terms: [scribe, integration, fhir, structured, patients, context, nothing, patient]
    concepts: [scribe, integration, structured, patients, context]
    related_chunks: ["social-intelligence/reddit-deep/healthit/1rwz1nl.md#c3"]
    section: Comments
    token_count: 281
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c5"
    char_span: [10283, 12429]
    sentence_count: 16
    key_terms: [like, part, real, concept, happens, github, intake, layer]
    concepts: [concept, happens, github, intake, layer]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c6"
    char_span: [12431, 14848]
    sentence_count: 18
    key_terms: [because, browser, capture, enough, source, local, local-first, replacement]
    concepts: [because, browser, capture, enough, source]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/healthit/1rwz1nl.md#c7"
    char_span: [14850, 16795]
    sentence_count: 17
    key_terms: [structured, output, drafting, hospital, exactly, galeon, itself, record]
    concepts: [structured, output, drafting, hospital, exactly]
    section: Comments
    token_count: 433
---
# I built a browser-based ambient scribe that keeps all data on the device (open source)

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1rwz1nl/i_built_a_browserbased_ambient_scribe_that_keeps/)
Posted by **xhable** · **17↑** · **26 comments**

For a bit of an experiment, I put together a simple ambient scribe that runs entirely in the browser.

The main idea was to explore what this looks like without any backend at all. i.e. no API keys, no server-side processing, and no project-side data leaving the device. Everything lives in the browser.

It works broadly like other ambient scribe tools:

* live transcription during a consultation
* ability to add manual notes alongside the transcript
* mark important moments in the timeline
* generate a summary once the session ends
* draft documents from the transcript using templates

All of that is done locally using Chrome’s built-in speech recognition and on-device AI features. Sessions, notes, summaries, and documents are stored in browser storage.

For full functionality it currently needs a recent Chrome build (Canary is the most reliable) with a couple of flags enabled. Some parts still work in normal Chrome, but the on-device model features are still rolling out and a bit uneven.

I know there are already a lot of AI scribes out there, but most of the ones I’ve seen rely heavily on cloud processing. This was more of a “what happens if you remove that entirely?” exercise.

There are obviously limitations:

* depends on Chrome-specific features
* requires fairly modern hardware for on-device models
* speech recognition behaviour is browser-dependent
* not something you’d use in a real clinical setting (please don't sue me :'D)

I’d be interested in how people here think about this kind of approach from a health IT perspective. Particularly around:

* whether local-first actually solves any real concerns in practice
* how this would fit (or not fit) into existing workflows
* where the real blockers would be (EHR integration, governance, audit, etc.)

Repo is here if anyone wants to have a look:  
[https://github.com/hutchpd/AI-Medical-Scribe](https://github.com/hutchpd/AI-Medical-Scribe?utm_source=chatgpt.com)

## Comments

- **Thel_Odan** (7↑): How do you plan to keep data secure? That's the biggest thing about any of these AI tools: they have poor security plans at best and no security plan at worst. All they're doing is opening up practices to get dinged for HIPAA violations. 

Also, how does this save time? Sure, it scribes things for you, but given AI's likelihood to hallucinate and make stuff up on the fly, you have to review absolutely everything it writes. Along those lines, how does it deal with actual medical terminology? I've yet to see a program actually master that; the same goes for heavily accented English as well.
  - **xhable** (4↑): First thanks for the thoughtful questions, it's really crazy useful to get this kind of feedback.

\> How do you plan to keep data secure

At the moment this is very much an experiment rather than something I’d suggest for real clinical use, but It's a very relevent concern.

The main idea behind this prototype was to ask whether keeping everything on the device improves the security and privacy story compared with the usual pattern of sending recordings and transcripts off to third-party services. In that narrow sense, I think local-first does help, because this project has no backend, no project database, no API keys, and no server-side processing at all. Nothing in the transcript, notes, summary, or generated documents is sent anywhere by the app itself. Short answer it's as secure as any other files on your computer.

That said, local-first is not the same thing as "problem solved". You would still need proper device security, browser hardening, session controls, auditability, data retention rules, and a much clearer understanding of how the browser speech recognition layer behaves in a real deployment. So I would not claim this somehow makes HIPAA concerns disappear. It just shifts the model away from "trust my cloud pipeline" toward "trust the endpoint and deployment environment", which is a different conversation, and frankly one that's much easier. 

\> Also, how does this save time? Sure, it scribes things for you, but given AI's likelihood to hallucinate and make stuff up on the fly, you have to review absolutely everything it writes

I think that is a very fair criticism too.

For me, the value is not “press a button and trust whatever comes out”. It is more about reducing the blank-page problem. You capture the consultation as it happens, add notes or mark important moments, and then get a first draft that can be reviewed and corrected instead of written from scratch.

Whether that actually saves time depends entirely on quality. If the review burden is as heavy as writing the note manually, then it is not really helping. I think that is probably true of a lot of AI scribe products right now.

On terminology and accented speech, I would be cautious there as well. This prototype uses Chrome’s built-in speech recognition, so I would not pretend it has solved medical terminology, complex accents, or transcription accuracy in any robust way. I would expect it to vary a lot depending on the speaker, microphone, environment, browser behaviour, and the terms being used. That said, I think this method addresses that better, in that you're using google's text to speech api, it will improve at the rate google's speech to text api improves rather than being at the whim of whatever tech provider you're using.

So really I am not claiming to have solved those problems. I was more interested in testing whether a local-first approach improves one part of the picture, while recognising that workflow, governance, integration, and accuracy are still the much harder problems.

I might update the readme to highlight some of this - thanks :).
- **uconnboston** (3↑): It really needs to integrate with the EMR. I need a scribe that can insert discrete data into the note - update problem list, generate orders, create a plan etc. Without that it’s just fancy old school Dragon (ironically being replaced by Dragon Copilot). 

Sorry, edit. 

Kudos for looking at local processing. It is one of the larger hangups in provider workflow. They don’t want to wait for a note to update from the cloud. 

As others have noted, security is a challenge. It’s going to be critical that locally stored data is encrypted at rest. What’s your authentication method?  When do you purge?  Can this be audited?  If the user reports hallucinations or drift, how do you investigate?  

Keep at it. Every solution in production had multiple iterations. Good luck.
  - **xhable** (1↑): I think that is fair, and I would not pretend this replaces proper EMR integration. Without the ability to push structured data into the workflow, it does risk being fancy old school Dragon with a nicer front end. A lot of the concerns you raised are exactly the ones I’ve been trying to address in the newer v1.1 version as the prototype has evolved, including optional encrypted local storage, app lock and inactivity lock, retention and purge controls, local audit logging, confidence-aware review, and client-side FHIR export. That still does not make it production-ready, but it does feel like the right direction for testing what a more secure and auditable local-first approach could look like.
  - **PaulGoesClimbing** (1↑): What if you could pull data from this app onto clipboard, parse it locally in a chrome extension, and then write into EHR fields using DOM injection? Imprivata has been doing auth in healthcare this way for a while now. It’s not the cleanest and never first choice, but very popular.
    - **uconnboston** (2↑): Is the data encrypted at rest throughout the process?  If not, “that’s a no from me, dog”.
- **flix_md** (5↑): The local-first angle matters more than you might think from a clinical standpoint. Even vague data-leaving-device concerns are enough to make patients hold back in a consult, and that changes what you actually capture.

The bigger blocker you will hit is EHR integration. Getting structured output back into Epic or Cerner without a proper FHIR endpoint is where these projects usually stall. Local transcription is a solved problem; local-to-EHR handoff is still the hard part.
  - **xhable** (1↑): I think that is a really good point, especially about patient behaviour changing if they feel unsure where the data is going. Even if the actual risk is low, that perception alone can affect the consultation. And yes, I’m increasingly coming round to the idea that local capture is the easier bit, while the real wall is the handoff back into Epic, Cerner, or anything else in a form that is genuinely useful rather than just another attachment.

In the newer v1.1 version I’ve started pushing a bit in that direction with client-side FHIR export and optional direct FHIR delivery, not because that solves integration, but to at least explore a more structured handoff than plain transcript text. It at least starts to point toward how this kind of thing could become more useful with further development and proper integration work.
  - **Plastic-Drawing2160** (1↑): Late to this thread, but the patient behavior angle is something that gets dropped from most scribe discussions. Patients self-censor when they're unsure where data goes, and that directly limits what the session captures, no matter how accurate the transcription is.

There's a related problem on the input side that’s been on my mind lately (have been putting a lot of thought in this subject). Most scribe setups assume the patient's history, medications, and active diagnoses are already in front of the clinician. But fact is a lot of that arrives as paper intake, an outdated problem list, or nothing at all. The model ends up inferring clinical context from gaps, which is why scribe output needs heavy review.

Patients sharing verified FHIR records at check-in via SMART Health Links handles this from a different angletho. The patient initiates the share, nothing moves without their action, and the scribe session starts from a complete structured context.

(why this has been on my mind lately) me and my team open-sourced the intake parsing layer for this, kill-the-clipboard on github. We're also doing a live walkthrough of how the input and output sides of this connect on June 17 if you want to see it end to end. Happy to drop the link. Know it’s late but thought maybe you’d be interested, idk.
    - **flix_md** (1↑): That input-side piece is the part most scribe demos hand-wave. The hard test is conflict handling: what happens when the patient-shared record, intake form, and EHR problem list disagree? If the answer is just "dump it into the note," the review burden comes right back.
- **Wittace** (2↑): Honestly I like the approach as building an MVP to help showcase to docs an execs as a way to green light a pilot or implementation.  I did a similar mvp with wayfinding to get CIO to understand the concept on his phone in beta and then approve $$$ to buy a real solution
  - **xhable** (2↑): It's important this stays a concept for now, given the tech is still rolling out. In an ideal world, something like this would live on GitHub with proper version control and community contribution around it. Perhaps in the future.

And I completely agree, these MVPs really matter. Playing with the ideas is how we figure out what actually works and whether they solve actual problems.

Right now I think AVTs are still a bit too costly, and I do have concerns about where the data ends up and how it's used. A lot of them anonymise data before storing it for analytics and model improvement, which I still find a bit worrying in practice.
- **Legitimate_Key8501** (2↑): The part that jumped out was “what happens if you remove that entirely?” because that usually forces the real workflow questions into the open fast.

Local-first does solve a real concern, but mostly at the trust and procurement layer. It gives security and compliance people one less giant objection. The harder part is exactly what you called out: auditability, handoff into the EHR, and proving the transcript to summary path is reliable enough that clinicians do not feel like they need to recheck everything manually.

My guess is something like this gets traction first as a safe sandbox for note capture, not as a full scribe replacement. Curious which blocker felt most immediate while you were building it, browser capability or workflow fit?
  - **xhable** (1↑): That is a very fair read, and “safe sandbox for note capture” is probably the right framing for these kinds of projects to encourage adoption.

In the short term, the immediate blocker was mostly browser capability. Feature availability is uneven, setup is fiddly, and the speech/model pieces are not predictable enough yet to treat as real infrastructure.
But even if that part settles down, the harder problem is exactly what you said: auditability, trust in the transcript-to-summary path, and getting output into the EHR in a way that removes review burden instead of creating more of it.

Part of what I was trying to answer here was a narrower question than “can there be an open source AVT?”, because there are already open source efforts in that direction. For this project, the question was more: can something like this exist purely in the browser?

That is a big part of why I added local document drafting and client-side FHIR export. Not because that solves integration, but because I wanted to see what a local-first front end could hand off in a more structured form than raw transcript text.

So I see it less as “replacement scribe” and more as “what is the minimum useful local-first capture/drafting tool, and where does that approach stop being enough?”

I also think that is where open source gets interesting. Even when these tools are still awkward, they are far enough along for people to use them, react to them, and push on missing features. A lot of the useful progress probably comes from people trying them and saying “this needs better document generation” or “this needs a cleaner structured handoff"
- **PaulGoesClimbing** (2↑): Is the LLM processing also local? 

**Edit - RTFM. Wow! Very clever! You’re using local WebSpeech API, and Gemini Nano? I’m def going to try this out. Curious how some of the prompts I have used with other ambient tools work with Gemini Nano doing the processing vs frontier LLMs in most commercial products. 

There’s a huge need for this in sovereign nations, particularly in Middle East where they’re beginning to pass laws restricting US based cloud services and have strict data residency requirements.

I recently made a basic local pdf generator as well w NO AI or cloud. It’s usually ingesting output from a tool like this to create prior auth forms etc. 

https://github.com/LLMFAO/pdfmapper
- **Interesting_Floor225** (1↑): Really interesting experiment. The local-first angle is genuinely appealing from a compliance standpoint — especially in contexts where data residency is a hard constraint.

From a Galeon perspective (French hospital EHR), the real blocker wouldn't be the scribe itself but the last mile: getting the output into the patient record in a structured way. Galeon has its own document model, and anything that arrives outside of the standard integration layer (HL7, specific connectors) tends to end up as a flat attachment at best, invisible at worst.

The governance question is also non-trivial here. Even if no data leaves the device, you still need an audit trail that the hospital's IT security team can validate. "It stays in the browser" is a hard sell when the RSSI asks where the logs are.

That said, the use case for drafting structured documents from a transcript is exactly where tools like this could add value before EHR entry, as a drafting layer. That's a workflow a lot of clinicians would actually use.

Nice work on the open source side. Worth watching how Chrome's on-device AI matures.
  - **xhable** (1↑): That makes a lot of sense, and I think you're right about those gaps.  
  
The scribe itself is only half the story, and if the output cannot make it into the record in a structured, visible way, it risks becoming little more than a sidecar. I also agree on auditability. I actually added a local append-only audit log in the newer version for exactly that reason, although I can see why browser-local logs would still be a tough sell to hospital IT.
- **Wittace** (1↑): Awesome idea!   Helps demystify the vendor hype.  Now all you need is a giant booth at HIMSS and a bunch of salespeople.  😄
