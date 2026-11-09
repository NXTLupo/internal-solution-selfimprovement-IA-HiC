---
id: social-intelligence/reddit-deep/edtech/1rakk3w.md
url: "https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/"
kind: "social-post"
source: "reddit-deep: r/edtech"
subreddit: "edtech"
title: "The real first step to getting an edtech tool into schools: DPA"
author: "vvsamuel"
date: "2026-02-21T07:05:38.000Z"
score: 10
upvote_ratio: 0.77
num_comments: 21
flair: ""
extracted_at: "2026-10-01T20:49:35.648Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/edtech/1rakk3w.md#c0"
    char_span: [0, 2227]
    sentence_count: 17
    key_terms: [district, dpa, edtech, districts, teachers, dpas, here, run]
    concepts: [district, edtech, districts, teachers, sometimes]
    related_chunks: ["social-intelligence/reddit-deep/edtech/1rakk3w.md#c5"]
    token_count: 512
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/","kind":"social-post","date":"2026-02-21","author":"vvsamuel","subreddit":"edtech"}]
  - id: "social-intelligence/reddit-deep/edtech/1rakk3w.md#c1"
    char_span: [2229, 2549]
    sentence_count: 2
    key_terms: [through, districts, mentioned, district, probably, flagged, process, product]
    concepts: [through]
    token_count: 69
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/","kind":"social-post","date":"2026-02-21","author":"vvsamuel","subreddit":"edtech"}]
  - id: "social-intelligence/reddit-deep/edtech/1rakk3w.md#c2"
    char_span: [2564, 4394]
    sentence_count: 16
    key_terms: [dpas, district, schools, student, teacher, states, "don't", boysterload]
    concepts: [district, schools, student, teacher, states]
    related_chunks: ["social-intelligence/reddit-deep/edtech/1rakk3w.md#c4"]
    section: Comments
    token_count: 440
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/","kind":"social-post","date":"2026-02-21","author":"vvsamuel","subreddit":"edtech"}]
  - id: "social-intelligence/reddit-deep/edtech/1rakk3w.md#c3"
    char_span: [4396, 5736]
    sentence_count: 19
    key_terms: [classlink, clever, free, individual, rostering, schools, avoid, dpas]
    concepts: [classlink, clever, individual, rostering, schools]
    section: Comments
    token_count: 322
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/","kind":"social-post","date":"2026-02-21","author":"vvsamuel","subreddit":"edtech"}]
  - id: "social-intelligence/reddit-deep/edtech/1rakk3w.md#c4"
    char_span: [5738, 7339]
    sentence_count: 17
    key_terms: [schools, state, dpa, "it's", sign, different, district, notmiserableoberon]
    concepts: [schools, state, different, district]
    related_chunks: ["social-intelligence/reddit-deep/edtech/1rakk3w.md#c2"]
    section: Comments
    token_count: 371
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/","kind":"social-post","date":"2026-02-21","author":"vvsamuel","subreddit":"edtech"}]
  - id: "social-intelligence/reddit-deep/edtech/1rakk3w.md#c5"
    char_span: [7344, 8551]
    sentence_count: 9
    key_terms: [need, org, sign, studentdpa, agreement, districts, alliance, district]
    concepts: [studentdpa, agreement, districts, alliance, district]
    related_chunks: ["social-intelligence/reddit-deep/edtech/1rakk3w.md#c0"]
    section: Comments
    token_count: 295
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/","kind":"social-post","date":"2026-02-21","author":"vvsamuel","subreddit":"edtech"}]
---
# The real first step to getting an edtech tool into schools: DPA

Source: [reddit-deep: r/edtech](https://www.reddit.com/r/edtech/comments/1rakk3w/the_real_first_step_to_getting_an_edtech_tool/)
Posted by **vvsamuel** · **10↑** · **21 comments**

Just launched my new edtech product. I’ve been an edtech dev for a long time, but this is my first time as a founder/marketer—so all of this is pretty new to me. Sharing something I think is useful for other founders here:

Here’s what I’ve learned about DPAs over the past two weeks:

Even if you have a solid Privacy Policy and Terms of Service, a DPA (Data Privacy Agreement) is still required. Teachers are usually mandated by their districts to have one in place before they can use your tool with students.

In my case, the tool can be used for PLCs, so in theory teachers could try it without student data. In practice, they still can’t. To enable Google SSO, your app needs to be approved by the district IT admin. And to get on that approved app list, you typically need a signed DPA. So the only real workaround is teachers using personal accounts, which obviously limits adoption.

Fortunately for us, we have an incredibly supportive championing teacher, which helped us get into the door with school IT department.

Still learning, but here’s my current understanding:

* DPAs are usually signed between a district and a vendor, so you need a district countersignature. A “champion” teacher is often the entry point—they connect you with the district IT/admin team to start the process.
* Some states have consortiums (like SDPC or state-level alliances) where signing once with a district can unlock access to others. These DPAs are often published on shared platforms (sometimes behind a fee, sometimes public).
* Other states run their own vendor vetting + DPA workflows. From what I can tell, \~5–6 of these processes cover a large portion of U.S. districts.
* And then some districts just run their own custom DPA entirely.

Also, as u/mybrotherhasabbgun pointed out in my previous post \[1\], DPA is just one piece. If you want broader adoption, you’ll likely also run into VPAT (accessibility) and security frameworks. I’m still early in learning all of this.

Would love to hear from others who’ve gone through this, on either side of the table (as the school or the vendor) — what actually helped you get through the first few districts, or what your district/states process look like.

  
\[1\]: flagged by mods probably cos mentioned my product. So let's focus on sharing here.

## Comments

- **Boysterload** (6↑): District IT admin here. In my state, teachers are not bound by a DPA. They can use whatever they want to try, but cannot enter student PII or have students create accounts.

A championing teacher is good, but non-IT district managers/admins often go to conferences and trade shows and come back with a contract for a new product. Then whoever is responsible for acquiring a DPA does their work. SDPC is a growing site with almost 6800 districts in 38 states. It saves so much time and the DPAs feel much more solid than what my district lawyer came up with. Many States require schools to host all DPAs on their website, usually on the tech page.
  - **vvsamuel** (1↑): Thanks for sharing! DPA is great and covers lots of grounds. I wonder which states do require schools to host these DPAs? I was looking at Instructure's Learn Platform, my guess is that's the platform that's used by these districts to manage all these?
    - **Boysterload** (0↑): Not sure. I've never heard of Instructure.
- **MathewGeorghiou** (3↑): I sell to schools and I've signed a lot of DPAs ... the lack of a centralized system is a real burden for everyone.  

Even if you don't collect student PII, you still have to go through the process because of teacher PII as most apps need to at least know the name and email of the teacher. I wish they would separate that out as it would simplify things.

If student rostering is important to you, you may want to check out Clever, as once you are on their system, you and your teachers don't have to worry about the tech integration — some of Clever is free and some if it is unaffordable for many edtech companies.
  - **vvsamuel** (1↑): Yes I wish they could split it but I don't even see that option from these DPAs I was signing. I guess most of these just covers the students.

Definitely will be integrating Clever later. What about Classlink? Is that commonly requested as well? Last time I checked Clever is free to SSO, but not free for rostering. But Classlink rostering is free? I'm very sad that this is not an open standard like LTI.
    - **MathewGeorghiou** (1↑): We did a small integration with Clever as a test.  Classlink won't respond to my emails asking how to get into their system.
- **bkk_startups** (2↑): One of the big reasons I prefer working with individual schools, colleges, and universities. School districts make things unreasonably difficult.

VPAT is easy to make, you just need to go through your entire platform and make sure it's WCAG compliant. Tedious but not super hard. Just make sure your colors match the contrast ratio requirements.

Happy to share what we've done for our SaaS over the years. Most of the time we avoid DPAs entirely.
  - **vvsamuel** (1↑): How is that practical to avoid DPAs? Is your SaaS mostly targeting teachers as end users? Also even if you do work with individual schools, aren't they still covered by district policy?   
Or maybe your service is more to highered? then that would make much more sense. I'd love to learn more about your playbooks. Thannks!
    - **bkk_startups** (2↑): More geared to higher education. Both instructors & students use it. 

I find that when I deal with individual schools, DPAs almost never come up. But when it's a school district, it's a 50/50. Sample size of 500+ schools over the last 5 years.
- **NotMiserableOberon** (2↑): This is accurate about the overall dpa situation. Every state has their own rules. In my district this is a part of the onboarding process and is a requirement but it isn’t the first step. Does the product fill a need or replace another with better features? What is the cost? Then I ask about sdpas if pii is connected. Most vendors sign our default, which is similar to all others in my state. A few ask for modifications. Rarely, a vendor won’t sign and that will end the conversation. Imo the length of time it takes to respond to a dpa request seems correlated to customer service quality.
  - **vvsamuel** (1↑): Makes sense. The landing page and a short video will always be the first contact, Teacher will know if a tool is valuable or not after. Your last statement maybe true to established platforms, for starter projects like ours, we'd love to sign right away and be responsive in communication,  but it's also very new to us so will take some cycles before we can get comfortable with all the commitments...
- **eldonhughes** (2↑): I don't think I saw it mentioned here or in the other thread so...

Different states can have different DPAs. For example, the California DPA you signed (hopefully a SOPIPA compliant one) is not quite the same as the Illinois (SOPPA) agreement. Meaning, the schools covered by those agreements are under the requirements of their specific state laws. 

  
States are joining or creating alliances to centrally manage these agreements. For example: [https://sdpc.a4l.org/](https://sdpc.a4l.org/) wherein you can make an agreement with one district that is a part of an alliance and that agreement can be "piggybacked" on by other districts that are a part of that alliance. (Saves you, and the schools, legal fees.)
  - **vvsamuel** (1↑): Thanks for adding that. I’ve learned about that word but how does that work exactly? If another state decides to piggyback, do they just work with the consortium? and I as the vendor no longer need to sign? Or do we still need to sign with them even tho they are just piggybacking?
- **Colsim** (1↑): Thinking about what your client needs - rather than just convincing them that they need your product - is a good sign
  - **vvsamuel** (1↑): Thanks! Trying our best to learn and enjoy the process.
- **PushPlus9069** (1↑): fwiw the DPA process varies wildly by district. Some accept a standard StudentDPA template in a day, others want custom language and it takes months. I'd prioritize districts that already use StudentDPA.org since they have a streamlined approval flow. Learned this the hard way trying to get into K-12.
