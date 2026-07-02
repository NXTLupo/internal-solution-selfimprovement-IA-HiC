---
id: social-intelligence/reddit-deep/healthit/1nbpw1a.md
url: "https://www.reddit.com/r/healthIT/comments/1nbpw1a/healthcare_orgs_with_200_employees_how_are_you/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "Healthcare orgs with 200+ employees: How are you handling the AI integration challenge?"
author: "sullyai_moataz"
date: "2025-09-08T14:53:41.000Z"
score: 41
upvote_ratio: 0.87
num_comments: 45
flair: ""
extracted_at: "2026-06-22T20:50:35.564Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1nbpw1a.md#c0"
    char_span: [0, 651]
    sentence_count: 5
    key_terms: [integration, healthcare, comments, healthit, organizations, discussions, experiences, reddit-deep]
    concepts: [integration, healthcare, comments, healthit]
    token_count: 147
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1nbpw1a/healthcare_orgs_with_200_employees_how_are_you/"}]
  - id: "social-intelligence/reddit-deep/healthit/1nbpw1a.md#c1"
    char_span: [665, 3041]
    sentence_count: 15
    key_terms: [liability, documentation, currently, clinical, integration, governance, providers, reviewing]
    concepts: [liability, documentation, currently, clinical, integration]
    section: Comments
    token_count: 487
  - id: "social-intelligence/reddit-deep/healthit/1nbpw1a.md#c2"
    char_span: [3043, 4379]
    sentence_count: 9
    key_terms: [adoption, down, cases, lot, use, challenges, generative, governance]
    concepts: [adoption, cases, challenges, generative, governance]
    section: Comments
    token_count: 297
    sources: [{"n":"Generative AI in Healthcare: Use Cases, Benefits, Challenges of GenAI and Trends 2025","u":"https://www.johnsnowlabs.com/generative-ai-healthcare/"}]
  - id: "social-intelligence/reddit-deep/healthit/1nbpw1a.md#c3"
    char_span: [4381, 6481]
    sentence_count: 13
    key_terms: [people, data, lot, tools, especially, particular, clinical, literacy]
    concepts: [people, especially, particular, tools, clinical]
    section: Comments
    token_count: 468
  - id: "social-intelligence/reddit-deep/healthit/1nbpw1a.md#c4"
    char_span: [6483, 8632]
    sentence_count: 12
    key_terms: [lot, integration, get, compliance, microsoft, controls, surprise, advisor]
    concepts: [integration, compliance, microsoft, controls, surprise]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/healthit/1nbpw1a.md#c5"
    char_span: [8634, 10631]
    sentence_count: 14
    key_terms: [interval, time, leadership, instance, create, needed, showed, help]
    concepts: [interval, leadership, instance, create, needed]
    section: Comments
    token_count: 458
---
# Healthcare orgs with 200+ employees: How are you handling the AI integration challenge?

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1nbpw1a/healthcare_orgs_with_200_employees_how_are_you/)
Posted by **sullyai_moataz** · **41↑** · **45 comments**

Looking to learn from others' experiences with AI integration in larger healthcare organizations. What's been your biggest surprise when trying to integrate AI into existing workflows? 

I've noticed scalability and security concerns coming up frequently in discussions here. Are these the main roadblocks you're hitting, or have other challenges caught you off guard?

## Comments

- **[deleted]** (40↑): Hospital with academic affiliations here, 15k employees and 1.2k med students, we are very hesitant taking on AI, but not saying we haven't considered it. We currently use Copilot for employee intercommunication's and transcriptions, but in terms of EMR integration, its in the works and heavily monitored by our AI governance team, but then again it really is up to Epic and how they want to integrate it into the EMR.

I Can tell you, we will not be losing people and do not see AI taking jobs here. We're currently using AI to govern our IVR system which is currently in the testing phase, but thats it.

We’ve got strict guardrails in place, AI might make things faster or take care of repetitive stuff, but it’s never going to replace clinical judgment or cut staff. At most, AI can calculate a weighted average of what a condition might be based on patient symptoms, but it cannot replace the clinical expertise required to interpret those results and make patient-care decisions.

Edit: Addtl wording.
  - **Potatochpzz** (3↑): I am really interesting to hear how larger systems are approaching it. I’ve noticed a lot of clinicians talk about how documentation eats up hours of their time, so I’ve been curious whether AI transcription/dictation has actually helped at the enterprise level or if it mostly gets stuck in governance and integration hurdles.
From your perspective, do you see AI tools becoming widely adopted for clinical documentation in the next few years, or is it still too early for most organizations?
    - **[deleted]** (8↑): Even when AI generates notes or documentation, the treating provider remains responsible for reviewing and verifying all content before signing off. Legally, AI tools function like any other assistsed instrument, but providers need to validate accuracy. Liability remains on the clinician or the practice.

Consider reviewing the [medical liability](https://pmc.ncbi.nlm.nih.gov/articles/PMC10711067/) with AI involved. AI devs can also face liability If an AI system failss even when used as intended, the technology vendor may be held accountable under product liability laws as well. Providers can take AI-generated text for granted, potentially missing essential information or creating a misdiagnosis. This could lead to innacurate encounters on patients charts and then coined as malpractice.

Honestly, I don’t see wide adoption happening in the near term.. Maybe 10–12 years down the line, once the legal frameworks, liability models, and clinical safeguards have caught up. If AI doccmentation tools get forced in too aggressively right now, I’d expect malpractice cases to spike, and clinicians are still the ones legally on the hook for any errors.
    - **Hopeful_Valuable1372** (1↑): That’s a great point a lot of orgs still struggle with governance and integration, which slows down real adoption. There are some areas where generative AI is already showing value though, especially in reducing documentation load and supporting compliance. John Snow Labs recently published an overview of use cases and challenges in healthcare that breaks this down in detail, including where adoption is happening and where barriers remain.

Source: [Generative AI in Healthcare: Use Cases, Benefits, Challenges of GenAI and Trends 2025](https://www.johnsnowlabs.com/generative-ai-healthcare/)
  - **Weary_Leadership_474** (1↑): Until we figure out who we can sue for instances of error; it will not be used in clinical workflow
- **CarstonMathers** (14↑): Yeah, governance is tricky. On the one hand the org doesn't want to slow down AI adoption and use with a lot of reviews. But AI needs a lot of reviews. So that's been a challenge.

My org has taken an approach of "don't worry if what you come up with is stupid or useless, learning is more important than results right now". That seems to be working.
  - **sullyai_moataz** (1↑): I guess if it’s working, then keep it up! But yeah, it really boils down to AI integrating into existing workflows - maybe even doing some A/B testing to see the extent to which it can be incorporated without slowing things down.
- **butfirstcoffee427** (10↑): AI literacy is one of our biggest challenges. People have a lot of assumptions and emotions around AI, and it takes work to help people understand the capabilities and limitations of any particular AI tool (I.e. it isn’t omniscient and only has access to particular data). It’s also a challenge to manage the fear around AI taking people’s jobs or replacing clinical decision-making. Clinicians are rightfully suspicious of anything with a price tag that promises efficiency gains, because that time is rarely just returned to the clinician. We focus a lot on how the tools augment the clinical workflow, but emphasize the importance of human-in-the-loop remaining a standard. 

Let’s just say there is a lot of bias afoot when it comes to feedback data on AI tools.
  - **sullyai_moataz** (1↑): There are some good resources and courses that promote data literacy that I’ve found especially helpful - [The Data Lodge’s](https://www.thedatalodge.com/) boot camp is a great one. You’re exactly right that a lot of people seem to be worried about AI “taking jobs” and not seeing how much it can benefit their work, not replace it. For doctors especially, I think it’s eye-opening how much tools like ours allow them to focus more on patient care than administrative tasks. It makes a big difference.
- **tripreality00** (14↑): Oh look more low effort product discovery
- **SoloDolo314** (5↑): One of the issues is that Ai companies were not willing to take any accountability for their software. This is fairly unprecedented. So it’s difficult to sign BAAs when there like “well the Ai probably won’t go rogue and do a bunch of bad shit” lol.

With that said - Ai is here to stay. Epic is heavily investing in Ai and eventually you will need to adapt or fall behind.
  - **uconnboston** (2↑): There is a big difference between Epic-supported AI vendors and rogue AI companies without app integration who are wining and dining CEO’s. If you can get your CEO to understand that, you have some modicum of control.
    - **SoloDolo314** (2↑): We have a lot of process controls to weed a lot of that junk out
- **trebuchetdoomsday** (4↑): tech broker/advisor here, poking around various IT subs. the tech advisor community is always pushing us to bring AI up in conversation, but bollocks to that. if there's any concern that you're going to run into a **biggest surprise when trying to integrate AI**, just stop. ISO42001 AI Management System standards has details on governance, start there. 

the idea of throwing a non-siloed non-local LLM into PHI to see what happens is terrifying.
- **airylizard** (3↑): I run Data & IT for a healthcare org.  
We were able to fast-track a lot of the security and compliance by leaning heavily on Microsoft and Azure. Most of our automations and AI integration go through Microsoft Power Automate and Azure AI services, which you can get a BAA for and configure with the required compliance controls.

The biggest surprise for me wasn’t the AI itself, but how fragmented our existing infrastructure was. We had so many disparate 3rd-party systems and no "real" single source of truth for our data. 

Our main roadblock has been adoption. It’s tough to get buy-in when admin workflows are being disrupted or replaced with tools that may still need iteration. That fear of “rework at scale” has slowed down deployment, though it hasn’t stopped it.
- **[deleted]** (3↑): Too much liability involved for it to do anything serious (independently); even with simple requests it takes a lot of refinement and editing to be somewhat dependable. Massive waste of time outside of certain specialties with routine caseloads.

the cost per license is daylight robbery, not to mention there's a lot of hidden costs that is actually quite insidious if you think about it. 

If you know, you know.
- **FlawedButFly** (3↑): As a physician, what would be helpful would be if AI used pt clinical data to create interval summaries. For instance “since I last saw Mr Doe, he had a PET/CT that showed resolution of avidity in all of his previous tumors, except the peri-pancreatic lymph node, which became slightly more avid (suv 11 from 9), he had a biopsy of the lesion that showed his known diffuse large b-cell lymphoma, he was hospitalized for new onset A-fib for which he was started on outpatient Metoprolol, and his HGB, Cr and LDH have all remained stable. His weight is 2 lbs higher than when I last saw him.” 

All of that based on the parameters I define as important to know about pts interval happenings between appts. When AI can do that, it will cut down monumentally on documentation time. Until then, looking all of that up will be the major time sink… not the typing during the visit. But of course EMRs don’t all talk to each other, so you risk missing some big interval event that happened at a Medical Center that doesn’t happen to be in CareEverywhere, for instance. AI cannot bridge that gap. So it’s not ready to help physicians care for patients in the way they could really use the help. I worry that once it finally is, it’ll largely replace us. But, at that time, I’m sure we’ll be in good company. :/
- **d-scan** (2↑): I work in a huge health system and AI is the bogeyman right now. Leadership meetings with very ominous undertones, lists being compiled of which IS teams will be on the chopping block first. There are also job postings for machine learning roles. 
Despite all the hype and fear, I don't think the rollout will be as smooth as leadership imagines: desktop support people will still be needed for the physical labor and customer experience aspects; I can also see patient privacy serving as a significant roadblock in the transition. Humans will still be needed to put out the fires that AI will create (or fail to put out itself)
