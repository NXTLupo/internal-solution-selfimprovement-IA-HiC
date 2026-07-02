---
id: social-intelligence/reddit-deep/medicine/1r1ha0n.md
url: "https://www.reddit.com/r/medicine/comments/1r1ha0n/chatbots_gpt4o_llama_3_command_r_used_by_a_person/"
kind: "social-post"
source: "reddit-deep: r/medicine"
subreddit: "medicine"
title: "Chatbots (GPT-4o, Llama 3, Command R+) used by a person of the general public did no better in assessing clinical acuity and did worse in identifying relevant conditions than the group instructed to \"use any source they would typically use at home.\""
author: "ddx-me"
date: "2026-02-10T23:43:52.000Z"
score: 186
upvote_ratio: 0.99
num_comments: 33
flair: ""
extracted_at: "2026-06-22T20:50:42.084Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c0"
    char_span: [0, 2217]
    sentence_count: 10
    key_terms: [study, group, relevant, did, medical, acuity, s41591-025-04074-y, use]
    concepts: [study, relevant, group, medical, s41591-025-04074-y]
    token_count: 481
    sources: [{"n":"reddit-deep: r/medicine","u":"https://www.reddit.com/r/medicine/comments/1r1ha0n/chatbots_gpt4o_llama_3_command_r_used_by_a_person/"}]
  - id: "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c1"
    char_span: [2231, 4544]
    sentence_count: 10
    key_terms: [information, delusions, llm, something, ignore, healthcare, history, patient]
    concepts: [information, delusions, something, ignore, healthcare]
    section: Comments
    token_count: 511
  - id: "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c2"
    char_span: [4546, 6577]
    sentence_count: 20
    key_terms: [use, google, people, chatgpt, information, tool, incredibly, medically]
    concepts: [google, people, chatgpt, information, incredibly]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c3"
    char_span: [6579, 8621]
    sentence_count: 13
    key_terms: [model, want, language, patients, study, ask, dizziness, pertinent]
    concepts: [model, language, patients, study, dizziness]
    related_chunks: ["social-intelligence/reddit-deep/medicine/1r1ha0n.md#c5"]
    section: Comments
    token_count: 498
  - id: "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c4"
    char_span: [8623, 10932]
    sentence_count: 11
    key_terms: [language, information, patient, large, knowledge, perform, models, going]
    concepts: [language, information, patient, knowledge, large]
    related_chunks: ["social-intelligence/reddit-deep/medicine/1r1ha0n.md#c5"]
    section: Comments
    token_count: 470
  - id: "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c5"
    char_span: [10934, 13182]
    sentence_count: 9
    key_terms: [language, model, patient, understand, assistant, using, patients, conversation]
    concepts: [language, model, patient, understand, assistant]
    related_chunks: ["social-intelligence/reddit-deep/medicine/1r1ha0n.md#c3", "social-intelligence/reddit-deep/medicine/1r1ha0n.md#c4"]
    section: Comments
    token_count: 431
---
# Chatbots (GPT-4o, Llama 3, Command R+) used by a person of the general public did no better in assessing clinical acuity and did worse in identifying relevant conditions than the group instructed to "use any source they would typically use at home."

Source: [reddit-deep: r/medicine](https://www.reddit.com/r/medicine/comments/1r1ha0n/chatbots_gpt4o_llama_3_command_r_used_by_a_person/)
Posted by **ddx-me** · **186↑** · **33 comments**

[ https://www.nature.com/articles/s41591-025-04074-y ](https://www.nature.com/articles/s41591-025-04074-y)

As OpenAI, Anthropic, and Amazon are all entering healthcare by getting their chatbots to interact with patients and their medical records, this study signals that LLMs require actual testing in real-world conditions.

The study is a randomized trial sampling the UK general public (n = 1,298) who were asked to assess the acuity of medical scenarios (created specifically for the study by three physicians) and identify the relevant condition. The  experimental group used one of three LLMs to help complete those tasks while the control group were instructed to "use any other reference material they would ordinarily use." The study went through pilot testing and was preregistered.

The study found that the LLM-human experimental group did no better than the control in assessing acuity and generally underestimated the acuity and did not provide enough relevant information. Additionally, the LLM provided very different answers to the semantically same answer in a scenario on subarachoid hemorrhage ("go to the ED" vs. "rest in a dark room"). They also were less likely to identify a relevant condition including serious ones than the control. The LLM-human group did not do as well as the LLMs alone, suggesting a breakdown in communication between the user and the chatbot.

Overall, this study highlights the need for any LLM to undergo real-world testing and monitoring. While asking the lay public to approach clinical vignettes and potential emergencies may not lay exactly on personalized situations with medical record access, it highlights why OpenAI, Anthropic, and Amazon are precocious in sending their chatbots out to their users' medical records.

## Comments

- **terracottatilefish** (101↑): It’s a truism about medicine that the biggest part of a medical education is knowing what questions to ask the patient, how to use the exam and studies to clarify and when to believe the answer vs when to push the patient more.  The fact is that even when a LLM sounds like it’s conducting a history it’s not really.
  - **soulsquisher** (66↑): I've increasingly come to the conclusion that the huge problem healthcare will face, if we replace providers with AI, is that patients give you bad information constantly; as a human you have the ability to just ignore anything you think is irrelevant or non-nonsensical, however most modern LLMs have a sycophantic tendency to reinforce the views of its user. Now, I have no delusions that a LLM cannot be built without this capability, but I do wonder if: one, the people building LLMs understand this issue as it applies to healthcare, and two, have an incentive to build a LLM that actually challenges the user.
    - **PeacemakersWings** (7↑): I would not be so confident that you won't find users to build an LLM to make their work obsolete. Physicians are notoriously myopic, just like the rest of the population. Dangle some monetary carrot in front of them and they will happily follow it to the abyss.
    - **jjmurse** (7↑): Question: is parsing delusions are something "not quite right" with a history something only a human brain can do. Something akin to uncanny valley problem. Or reverse uncanny valley, maybe?
    - **Diarmundy** (-1↑): Why wouldn't an AI be able to ignore wrong information?

Currently they are programmed to listen to everything but you could easily program them otherwise. AI's use matrix multiplication which essentially 'averages out' the input information but highlights some words it considers more important, while assigning others less importance.

It can be as simple as typing 'please ignore information that does not fit with the rest' - i instructed my ai scribe to do that with better results, and I'm sure the developers could implement it much better.
  - **worldbound0514** (17↑): There have been several instances in which an LLM have reinforced a patient's psychotic delusions rather than the correct therapeutic approach of shifting from the delusions to real and concrete things. 

A skilled practitioner will quickly pick up on the delusions rather than reinforce them. An LLM has no ability to sort truth from fiction.
  - **Mebaods1** (2↑): I love my Abridge AI for HPI, but every time whatever symptoms the patient mentions it is almost always “severe” 😡
- **Odd_Beginning536** (31↑): I agree with you. They are testing it out on the people, that’s there real world testing. A whole bunch of people don’t know they are the subjects. I’d like to see the IRB committee that approved this- oh there isn’t one, I guess this is the gold standard of research.
- **seanpbnj** (28↑): I guess I am old but also young.... This is exactly what the medical realm experienced with google? People using google foolishly, got foolish results.... People who were smart enough not to outright trust google but to use it as a tool in a toolbelt.... Got decent info.... Same for ChatGPT. 

  
\- I have used ChatGPT medically and non-medically, its incredibly useful if you use it right. But its incredibly dumb if you use it dumbly.
  - **Games1097** (13↑): This has absolutely been my argument as well. Medically or not. The chatbots are a glorified search engine at its simplest. Makes getting specific information quicker/more efficient. But just like with google, you have to know HOW to use it. It’s (obviously) by no means fool proof
  - **worldbound0514** (9↑): You still need to vet the information given - whether it is from WebMD or ChatGPT. If you don't have the ability to accurately vet the info, you are still going to be lost without a human expert.
  - **gotlactose** (3↑): I think we all know the real use case for LLMs and its application in medicine: to give practitioners an additional tool, not to be replaced by it. A few times I’ve used OpenEvidence, it helped me narrow down the time it would’ve taken me to read through guidelines or papers. Otherwise, I’ve seen many times how the output it produces is incorrect or irrelevant. Most physicians would be able to see through that and use LLMs as a tool.

But then again, I had a patient’s family member who was a doctor suggest a nonsensical treatment plan, then I come to find out he is the medical director of AI at his very large regional group. Kinda scary he would blindly trust an LLM’s output on his family member.
- **apothecarynow** (3↑): Wow. Receiver operator curves. Hardcore analysis.
- **the_arcadian00** (3↑): These are not the latest models — 4o is obsolete, Llama 3 is a joke, WTF is command R+.

Run this study on Opus 4.6 and see what happens
- **Dependent-Juice5361** (2↑): Well yeah you can ask it whatever you want, ask it for whatever workup, etc but if you don’t know how to actually use that information it’s pretty much useless
- **sum_dude44** (2↑): LLM's are great at vignettes 

suck in real world 

at some point (maybe already), will supplement experts
  - **just_premed_memes** (-1↑): If you prime, a large language model to specifically ask, follow up questions and evaluate the pertinent positives and pertinent negatives as though it were a clinician, it would far out perform. What’s the scene in this study which is just simply giving patients access to a model they don’t know how to use. You can even have it, summarize the results of its questioning as a vignette and then allow it to solve the vignette. That’s the study. I want to see. Chain of thought and tree of thought larger language model prompting where the language model is the one in charge of the discussion not the patient.
    - **sum_dude44** (4↑): maybe, but nobody has cracked that nut & published evidence showing that to be true. 

patients are bad historians, lie, & want stuff unrelated to diagnosis. They often want someone to listen & to reassure them. LLMs bad at all that
- **Mebaods1** (1↑): I think this is the biggest issue with AI and the subjective aspect of the clinical story. How many “dizziness” patients are having near syncope vs vertebral dizziness, or pleuritic chest pain and shortness of breath thats due to their acute cholecystitis not anything cardiopulmonary.   

Now that being said i think AI is great at digesting large volumes of data and information and cant wait for the day Epic is actively reviewing prior labs and encounters while the AI dictation is generating my note— and by the time I sit back down at my desk its done a detailed chart review, summarized the relevant past encounters for me to more efficiently get my MDM done up and workup ordered.
- **Outside-One7836** (1↑): It's like me using AI to work on my car. For starters the AI output I'm going to get with my limited car knowledge isn't going to be the same as a mechanic using it. And then if I followed AI's advice no shit I'm going to probably destroy my car. 

Considering how LLMs actually work (token generation) it's actually absurd to expect chatbots to perform as well as doctors or even MAs who field these type calls at many clinics. Frustratingly the general understanding of LLMs remain poor. They are highly complex auto complete tools but cannot understand pathophysiology, relative risk, etc. 

No doubt however my hospital system will adopt this soon instead of giving me a raise or better hours.
- **just_premed_memes** (0↑): I’ll comment on this what I commented on the original one (mods removed it for some reason?):

So in essence, the large language models performed quite well when they were allowed access to the information and able to independently provide answers, but they did poorly when users were allowed to use them almost as a Google alternative. I don’t think this makes the argument that Large language models perform poorly indirect patient advice, I think it makes the argument that the large language models perform quite well and that patient’s own lack of knowledge and biases negatively influence the outcomes. My take on this study is that the language model should be taking the lead in medical discussions with patients, not as an assistant.

I would be interested in seeing a replication of this study where the user does not guide the decision-making in questions asked. If the language model was able to ask questions gather in synthesize information from the patient and the cases and then provide information to the patient as opposed to the patient, who has absolutely no knowledge about what they should be looking for, taking the steering wheel.

Instead of a patient, going to a language model and inputting all of their symptoms, not knowing what’s a pertinent positive, what’s a pertinent negative, how to interpret literally any of their lab results or the significance of any of them, etc. just leads to the same type of findings as a patient googling information looking for things they don’t know how to filter through. Our job as physicians is to be that filter. Having a language model steer the conversation can do the exact same thing, acting as a filter and building a properly and informed differential diagnosis. That’s the key difference between the practical implementation of both of these strategies; patients don’t know what they should be looking up, a language model does (or at least is capable of knowing)

“However, participants using the same LLMs identified relevant conditions in fewer than 34.5% of cases and disposition in fewer than 44.2%, both no better than the control group.”

This very clearly indicates that the primary finding was that the patient could not come up with the proper diagnosis when they were using large language model as an assistant, and that when using it as an assistant, the user was not able to sufficiently understand or come to the correct disposition. There’s nothing in here about patients, not being able to understand even when the diagnosis was correctly identified.

And again, if the issue is patient not understanding which I’m not seeing in this paper, patients don’t know what questions to ask in order to better understand. We as physicians or future physicians generally tend to know how to understand and anticipate the questions which will be asked, and how to translate medical knowledge into lay speak. So again, even if the issue is patience, not understanding the medical information conveyed to them when they are using it as an assistant, letting the large language model take the reigns in driving the conversation and follow up as opposed to patients blindly guiding it would almost certainly lead to better communication from the large language model. So again, I’d like to see the study replicated where instead of the patient using it as an assistant, the language model is is the one leading the conversation.
