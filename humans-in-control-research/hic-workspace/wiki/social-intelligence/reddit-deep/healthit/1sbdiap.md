---
id: social-intelligence/reddit-deep/healthit/1sbdiap.md
url: "https://www.reddit.com/r/healthIT/comments/1sbdiap/jama_study_on_ai_scribe_bad_news_for_ai_vendors/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "JAMA study on AI Scribe - bad news for AI vendors"
author: "uconnboston"
date: "2026-04-03T13:23:28.000Z"
score: 44
upvote_ratio: 0.92
num_comments: 53
flair: ""
extracted_at: "2026-06-22T20:50:35.554Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1sbdiap.md#c0"
    char_span: [0, 1666]
    sentence_count: 12
    key_terms: [scribe, time, vendors, solutions, comments, healthit, minutes, record]
    concepts: [scribe, vendors, solutions, comments, healthit]
    token_count: 410
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1sbdiap/jama_study_on_ai_scribe_bad_news_for_ai_vendors/"}]
  - id: "social-intelligence/reddit-deep/healthit/1sbdiap.md#c1"
    char_span: [1680, 3431]
    sentence_count: 5
    key_terms: [quality, shocked, scribe, notes, note, question, "there's", whether]
    concepts: [quality, shocked, scribe, notes, question]
    section: Comments
    token_count: 383
  - id: "social-intelligence/reddit-deep/healthit/1sbdiap.md#c2"
    char_span: [3433, 5713]
    sentence_count: 16
    key_terms: [time, note, documentation, notes, like, better, saved, ambulatory]
    concepts: [documentation, notes, better, ambulatory, experience]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/healthit/1sbdiap.md#c3"
    char_span: [5374, 6131]
    sentence_count: 7
    key_terms: [note, documentation, because, gain, time, substantiate, discussions, uconnboston]
    concepts: [documentation, because]
    section: Comments
    token_count: 157
  - id: "social-intelligence/reddit-deep/healthit/1sbdiap.md#c4"
    char_span: [6133, 8027]
    sentence_count: 16
    key_terms: [data, note, quality, documentation, chart, notes, information, less]
    concepts: [documentation, quality, information, chart, compliance]
    section: Comments
    token_count: 400
  - id: "social-intelligence/reddit-deep/healthit/1sbdiap.md#c5"
    char_span: [8029, 8574]
    sentence_count: 6
    key_terms: [memories, paper, hoosierdadddy, medicolegal, performance, advocating, clinically, continuity]
    concepts: [memories, paper]
    section: Comments
    token_count: 130
---
# JAMA study on AI Scribe - bad news for AI vendors

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1sbdiap/jama_study_on_ai_scribe_bad_news_for_ai_vendors/)
Posted by **uconnboston** · **44↑** · **53 comments**

Well we’re still early on in the development of AI tools, but the guts of this survey are a cautionary tale of perceived (marketed) versus actual impact for the CEO’s in the room. The bottom line is that scribe didn’t let providers unplug from their EMR’s at home and also didn’t help them see more patients. 

I am certainly not suggesting that this is the end of AI scribe and it has no utility. However, you can trace back through all of the vendor claims about enhanced productivity, ROI, provider QOL and see they were just blowing smoke to make a buck. This is the AI paradox - does an institution take a leap of faith into expensive AI solutions and resource time to implement strictly based on FOMO?  Because the data showing efficacy and ROI appears to be sketchy at best.  AI vendors and solutions are a dime a dozen.  Healthcare is not a high margin industry (for those of us on the patient-facing side of things). Guide your SLT with care, select reputable vendors with some sort of track record and customer references. Remember that most of these AI startups are going to flop or get acquired. Choose wisely. 

“AI scribe adoption was associated with 13.4 (95% CI, 9.1-17.7) fewer minutes of EHR time, 16.0 (95% CI, 13.7-18.3) fewer minutes of bdocumentation time, and 0.49 (95% CI, 0.17-0.81) additional weekly visits delivered. Electronic health record time outside work hours did not change significantly.”

## Comments

- **Thel_Odan** (15↑): I'm shocked! Shocked!....Well, not that shocked.
- **TunaHuntingLion** (23↑): It’s all whether your leadership are trying to implement something for a shiny resume boost so they can leapfrog to the next role/gig. If yes, they’ll role it out with no care about the results and metrics. If you are fortunate to have people happy in their roles and wanting to be there 10 more years, they’ll make the smart move to not be early adopters and waste their resources.
  - **uconnboston** (3↑): Ain’t that the truth.
- **xhable** (6↑): There's still the question of the quality and standardisation of the notes. If they can show improvement there then there's at least a reason.
  - **Unhappy_Finding_874** (9↑): this is the part nobody talks about imo. everyones measuring time saved but the notes are still just... free text blobs going into the same EHR fields. the scribe generates a nicer looking note faster, cool. but downstream its the same unstructured mess that quality teams and coders have to manually sift through

the real question is whether the ai generated notes actually produce more reliably extractable clinical data. like for HCC capture, quality measures, population health queries. if the scribe is writing more consistent note structures with clearer problem lists and medication reconciliation then thats where the compounding ROI shows up over time, not in minutes saved per encounter

ive seen orgs where the scribe note is arguably harder to extract from than the old templates bc the LLM writes these flowing narrative paragraphs instead of discrete structured sections. so now ur NLP pipeline or ur coding team has to parse natural language thats technically more readable for humans but worse for machines

feels like the whole category is optimizing for the wrong metric. time in chart is a symptom. the actual disease is that clinical documentation is fundamentally unstructured and every system downstream of it is doing its own janky extraction to make it usable
- **HInformaticsGeek** (11↑): I think AI scribes are a spectrum and some work better than others. We are definitely seeing value in the Ambulatory and Emergency space with high utilization and time saved/more patients being seen. One of our doctors in his ambulatory clinic is finishing his notes, reviewing with the patient and giving them a copy of the note to take with them. He is saving 2-3 hours of dictation/EMR time a week.
- **Wittace** (16↑): I disagree that this is bad news.  We’ve been live for 2+ years and even though its marginal decrease in metrics, the soft benefits like burnout, pajama time, time in note, recruitment and retention, patient satisfaction and provider quality of life are through the roof.  Not to mention tangential benefits like proper coding (hccs).  Agree with the data but not the title that it’s bad news.
  - **uconnboston** (3↑): It sounds like your experience does not quite align with the study results, unless I’m missing something. Good that you’re seeing benefit. I see you’re epic/abridge. We tested but the PHO we’re affiliated with for some of our sites is switching to Dragon Copilot. I know Abridge was better received but also more expensive.
- **GetnLine** (4↑): Am I the only one that sees this as positive?
- **soapoapsoap** (2↑): So the study shows they saved 30 mins a day on notes? That seems pretty good for a simple tool, especially if theyre better notes.
- **Shangrila101** (1↑): Quality of the documentation has increased in my experience. From paper SOAP note, EHR template, speech to text and now to Ambient listening, the notes are increasingly capturing a more complete picture of a visit. That’s the qualitative gain positively affecting care. However, the need to read and confirm note by physicians after AI generates the note is eating up the time saved during note generation. Net gain is still positive because getting a more robust documentation and not miss out on important discussions in the same amount of visit time is a win for AI Scribe. The surveyors could have asked about the quality of note, human vs AI generated, but they might have their own survey objectives.
  - **uconnboston** (1↑): Do you have any data to substantiate this?  Paper to EMR, yes absolutely. But in all my years of HC IT I’ve never heard anyone suggest that documentation is better because of speech to text or ambient listening. The concept is always focused around efficiency. 

If you want to suggest AI can scan a note and suggest visit level changes or a different dx, that’s feasible but it’s not scribe. That’s assistive medicine.
    - **Shangrila101** (1↑): Our PI measures for CMS reporting have improved. Quality scores are better because the notes are more complete that correctly reflect the visits. Our physicians used to type shorter note, speak less during speech to text or not remember a visit for retroactive documentation.But I have seen more information captured via AI Scribe (ambient listening) and less follow up queries from coders to physicians to clarify missing information and less denials from payers due to lack of appropriate documentation. Not saying that quality of treatment has increased but the quality data capturing definitely has.
- **cateri44** (1↑): AI scribes are just additional frosting on a bad cake.  Electronic medical record systems are capturing data for billing and coding and metric compliance, and all of that extra physician time is fundamentally spent doing data entry for those purposes.  EMR notes are billing and compliance documents, they are crap medical records. I need to be able to just make a note that says what the patient reported, what I observed, what I considered and concluded, and what I did about it.  A good old fashioned SOAP note didn’t take a lot of time.
  - **uconnboston** (1↑): Are you from the paper days?  Remember when the chart disappeared with the patient on their way to a procedure or study?  Searching the nurses station for the chart only to find it buried under a stack in the corner where the cardiologist was sitting?  Waiting for faxes of lab or diagnostic results?  Skimming through 20 pages of nursing home notes for an admit?  Trying to read another provider’s chicken scratch?  God forbid you have to compile m data on a collection of patients for a study. Or do chart audits. 

So many memories. Crappy memories. I’ll take electronic records every day and twice on Sundays.
    - **cateri44** (1↑): I am from the paper days, and I don’t know how you decided I was advocating that we go back to paper charts.  We do need clinically meaningful notes that serve the purposes of continuity of care and medicolegal defense.  Some of the other comments on this post would suggest that AI isn’t getting us there either.
- **HoosierDadddy** (1↑): Huge difference in vendor performance. Ambience is the only one cutting it for AMCs.
