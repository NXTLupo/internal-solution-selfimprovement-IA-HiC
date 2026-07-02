---
id: social-intelligence/reddit-deep/healthit/1pdvy8b.md
url: "https://www.reddit.com/r/healthIT/comments/1pdvy8b/research_how_do_your_teams_get_photos_from_a/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "Research - How do your teams get photos from a patient?"
author: "sar662"
date: "2025-12-04T09:44:34.000Z"
score: 0
upvote_ratio: 0.11
num_comments: 22
flair: ""
extracted_at: "2026-06-22T20:50:35.568Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1pdvy8b.md#c0"
    char_span: [0, 2199]
    sentence_count: 10
    key_terms: [patient, something, photo, does, file, comments, healthit, whatsapp]
    concepts: [patient, something, photo, comments, healthit]
    token_count: 492
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1pdvy8b/research_how_do_your_teams_get_photos_from_a/"}]
  - id: "social-intelligence/reddit-deep/healthit/1pdvy8b.md#c1"
    char_span: [2213, 4592]
    sentence_count: 14
    key_terms: [patient, information, health, need, follow, office, sar662, relationship]
    concepts: [patient, information, health, relationship, surveillance]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/healthit/1pdvy8b.md#c2"
    char_span: [4594, 4956]
    sentence_count: 4
    key_terms: [situations, organization, transmission, robotics500, prescribed, violations, workflows, anything]
    concepts: [situations]
    section: Comments
    token_count: 79
---
# Research - How do your teams get photos from a patient?

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1pdvy8b/research_how_do_your_teams_get_photos_from_a/)
Posted by **sar662** · **0↑** · **22 comments**

Hi all — I’m researching a workflow problem I keep seeing in public health and clinical environments, and I’d love input from real people who deal with the how of  patient communication.

The issue:
A staff member needs something simple from a patient or member of the public — usually a quick photo. Examples:

* Medication label

* Discharge paperwork

* Packaging from suspected foodborne illness

* Home test results

* Insurance card

* A wound photo

* A receipt or document needed for review


But the person is **not logged into a portal, not an existing patient in the system, doesn’t have an app installed, and might not even be “connected” to the organization in any formal way**.

So what I see happening are workarounds like:

* “Can you text it to this personal number?”

* “Just email it to me”

* Staff grabbing screenshots from WhatsApp

And then when the nurse does get the file, they have to copy it or send it in some (often unconventional) way and manually attach it to the case system they are using.  


It works, but it’s messy, insecure, slow, and creates documentation gaps. (And is a security issue waiting for a lawsuit.)

My question for those with real-world experience:
Do you also run into situations where your teams need a photo/file from someone who is not logged in anywhere?  

If yes:

1) How do you handle it today?

2) Is this just a minor annoyance or an actual operational pain point?

3) Does your org have a secure process for this, or is it still mostly ad-hoc?

4) Would a simple, secure, no-login file upload link (sent via SMS/WhatsApp/email) actually be useful in your workflows, or does something like this exist already in your environment and users ignore it?

I’m not pitching a product — I’m trying to validate whether this is a real/widespread pain point or something only certain specific orgs struggle with (e.g., public-health investigations).

Any insights or stories would be really helpful. Thanks!

## Comments

- **idk012** (8↑): No properly trained staff will do their own non complaint work around for vetted processes
  - **sar662** (-1↑): So how do the teams by you solve this challenge?
    - **MP5SD7** (3↑): The patient needs to access the portal for their own protection.  How is your patient portal adoption?  Is that workflow slowing things down?
    - **idk012** (1↑): Need $ for consultation
- **Saramela** (8↑): If you want a photo of your patient or their insurance card, you ask them for that when you see them in your office. And why would you be asking your patient for discharge paperwork? Or “a wound photo”? None of this makes any sense.
  - **sar662** (0↑): I observed the need during situations where the patient has not and was not coming into the office. I worked with a national epidemiological center while they were doing investigations. The nurse would often get a phone number for a restaurant or hotel and then call to ask the manager questions and want to get some documents. Also had cases where a nurse was calling someone's home following a lab test that was positive for salmonella and wanted to see the layout of the person's kitchen or the packaging or grocery receipt from a package of chicken.  
 Follow up on wound care would usually be from the office at the patient had visited and as such the patient could probably use a proprietary system like a mobile app from the HMO or the hospital network so you are correct it probably would not be a relevant story here. I included it because I was trying to brainstorm for additional possible cases where this might be a need.
- **fullmudman** (5↑): I have worked in these domains for more than twenty years and this has never been an issue. Why wouldn't you just get the information you need seeing the patient in person?

I suppose outside a patient/provider relationship this can be more complicated but even then we establish some kind of secure channel (like public health lab results or syndromic surveillance follow up) before any protected health information is shared. To proceed otherwise is to invite a hipaa lawsuit.
  - **sar662** (1↑): >I suppose outside a patient/provider relationship this can be more complicated but even then we establish some kind of secure channel (like public health lab results or syndromic surveillance follow up) before any protected health information is shared.

These are the situations I want to learn more about. I observed this as a problem in public health situations.
    - **robotics500** (1↑): Most of not all EMRs have workflows that allow transmission of data to the EMR. Anything you've seen have been a person not using the prescribed workflow. HIPAA violations are no joke and can really mess up an organization.
