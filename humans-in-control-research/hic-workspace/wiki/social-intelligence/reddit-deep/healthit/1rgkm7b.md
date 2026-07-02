---
id: social-intelligence/reddit-deep/healthit/1rgkm7b.md
url: "https://www.reddit.com/r/healthIT/comments/1rgkm7b/our_noshow_rate_was_23_and_what_moved_it/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "Our no-show rate was 23% and what moved it"
author: "krikond"
date: "2026-02-27T22:11:47.000Z"
score: 130
upvote_ratio: 0.95
num_comments: 50
flair: ""
extracted_at: "2026-06-22T20:50:35.552Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1rgkm7b.md#c0"
    char_span: [0, 1692]
    sentence_count: 18
    key_terms: [no-show, patients, rate, portal, confirmed, comments, everyone, healthit]
    concepts: [no-show, patients, portal, confirmed, comments]
    token_count: 390
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1rgkm7b/our_noshow_rate_was_23_and_what_moved_it/"}]
  - id: "social-intelligence/reddit-deep/healthit/1rgkm7b.md#c1"
    char_span: [1706, 3743]
    sentence_count: 15
    key_terms: [calls, sms, patients, krikond, reschedule, available, reminders, consent]
    concepts: [calls, patients, krikond, reschedule, available]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/healthit/1rgkm7b.md#c2"
    char_span: [3469, 3842]
    sentence_count: 4
    key_terms: [risk, show, syncretistic, appointment, sustainable, percentage, reschedule, algorithm]
    section: Comments
    token_count: 84
  - id: "social-intelligence/reddit-deep/healthit/1rgkm7b.md#c3"
    char_span: [3844, 5747]
    sentence_count: 13
    key_terms: [shows, day, considerations, conversational, system, show, telephony, patients]
    concepts: [shows, considerations, conversational, system, telephony]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/healthit/1rgkm7b.md#c4"
    char_span: [5751, 6276]
    sentence_count: 5
    key_terms: [patient, platform, did, sms, implementation, comfortable, demographic, differences]
    concepts: [patient, platform]
    section: Comments
    token_count: 94
---
# Our no-show rate was 23% and what moved it

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1rgkm7b/our_noshow_rate_was_23_and_what_moved_it/)
Posted by **krikond** · **130↑** · **50 comments**

Managing IT for a multi-site primary care group (6 locations, \~18K active patients). No-show rate had been stuck at 22-24% for two years. Leadership kept asking IT to "fix it."

We tested this and what the numbers looked like:

Portal reminders: Useless for our no-show population. Patients who don't show up don't use the portal. Already knew this, confirmed it anyway.

Outbound calls from front desk: Contact rates under 10% on missed calls, 2-3 FTE hours burned daily. Not scalable.

Two-touch SMS (48hr + 2hr confirmation): This is where things moved. No-show rate in the confirmed segment dropped to \~11%. The same-day "reply Y to confirm" gave us actionable data to backfill slots. Set it u and handled the bulk sends and carrier registration without requiring deep EHR integration-we used Dropcowboy sms marketing platform for its simplicity, compliance guardrails, and no-code setup.

The patients driving your no-show problem are almost always the ones your existing digital infrastructure doesn't reach. Portal messages work great for engaged patients. For everyone else, you need a channel that doesn't require them to log in anywhere.

After full rollout no-show rate down to 14.6% across all sites. At our patient volume that translated to roughly $290K in recovered annual revenue.

Happy to discuss the HIPAA workflow considerations - that was the most complex part of the project.

What's everyone else using for the hard-to-reach patient segment?

## Comments

- **SquibdizzleLover** (17↑): Very impressive! Congratulations!
Did you have to get HIPAA type consent to send these types of messages?
  - **krikond** (3↑): We kept it within HIPAA by using carrier‑registered templates and sticking to appointment reminders only. No extra consent beyond what patients already give for contact
    - **zyspd** (1↑): Does that broadly include both calls, and texts being sent out? What were the costs like for the bull messaging platform if I can ask?
- **Shangrila101** (9↑): During the outreach; sms, email or call, do patients have an option to reschedule  for the next available date? So that their original slots become available for others?
  - **krikond** (2↑): the "reply Y" confirmations gave us real data, so staff could backfill or reschedule quickly instead of chasing no‑shows blindly
  - **FlawedButFly** (1↑): That’s how it should be.
- **Sea_Ambassador_6046** (7↑): If you have Epic just install Hello World. Handles all your SMS contacts and fully integrated our course.  NoShow rates will drop and patient engagement scores will rise. If you have outgoing calls with Intrado just drop it and change to HW and the overall expense is cheaper. No one answers the calls anyway but they will respond to text.
  - **Urithiru** (1↑): Serious question, any idea of the cost on that module? I'm not sure if my organization purchased it.
    - **Sea_Ambassador_6046** (2↑): You basically buy a block of SMS so it’s kind of a pay as go method
  - **krikond** (1↑): I’ve heard good things about Hello World. We weren’t on Epic, so dropcowboy was the easier plug‑in for us. Totally agree though - calls were wasted effort, texts actually got responses.
  - **zyspd** (1↑): Do you know if OpenEMR has anything like these out of the box?
- **Syncretistic** (2↑): Good stuff. To add to SMS and portal reminders, my EHR system has an algorithm that shows the percentage risk of no show for each scheduled patient. The idea is for those patients that are at high risk of show to be called by the office to confirm (or reschedule) their appointment. But that is not sustainable as it requires human labor.

So, we are exploring the use of conversational AI integrated into our practice management system and telephony system that can make these outbound calls. Discovery still underway. 

We will never reach zero no show but expect the incremental reduction of no shows will make the investment worthwhile.
  - **JurrasicBarf** (0↑): I'm building a conversational telephony AI system, would love to learn your pain points, would it be okay to DM?
    - **Syncretistic** (2↑): Why build? There are so many players in the space.
- **solsoup** (2↑): I would absolutely love to learn more about the HIPAA workflow considerations - what were the most challenging / surprising considerations for you?
- **Wittace** (1↑): This is great.  We are following similar failed path.  Just sent this to our outreach manager to work on next week. Thanks!!!
- **FlawedButFly** (1↑): Not sure about other docs here, but the schedule is packed so tight that I actually rely on their being 1-2 no shows per day. If there aren’t, then there isn’t enough time in the day to see all the patients.
  - **aliceinmidwifeland** (1↑): Fully agree that some no shows/ last minute cancels are helpful, but 25% is pretty high. Even if you're only seeing 8-10 folks a day, you'll still get your 1-2 no shows a day with an 11% no show rate.
- **glowingbug75** (1↑): Yup. Im a doctor that is psyched when o get a no show. But my rate is 10 percent t
- **Jumpy-Possibility754** (1↑): “The patients driving your no-show problem are the ones your digital infrastructure doesn’t reach.”
That line is the whole story.
Most orgs optimize channels used by compliant users, not the constraint segment.
- **Legitimate_Key8501** (1↑): The two-touch SMS confirmation approach makes sense. The 48hr + same-day reply Y combo is effective because it gives you an actionable slot decision before the deadline rather than just sending reminders into a void.  
  
Curious about the HIPAA workflow complexity you mentioned. Where did you hit the most friction, the BAA setup with the platform, or getting clinical leadership comfortable with patient data going through a third-party SMS provider? In my experience that's usually where implementation stalls regardless of which platform you're using.  
  
Did you see differences in contact rates by patient demographic or location? We found urban locations trend better for SMS engagement but it varied a lot depending on the patient panel.
