---
id: social-intelligence/reddit-deep/cybersecurity/1n7awzd.md
url: "https://www.reddit.com/r/cybersecurity/comments/1n7awzd/cyber_security_recommendation_for_tiny_office/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Cyber security recommendation for tiny office."
author: "AutomaticTangerine84"
date: "2025-09-03T10:15:16.000Z"
score: 45
upvote_ratio: 0.85
num_comments: 78
flair: "Business Security Questions & Discussion"
extracted_at: "2026-06-20T17:52:50.772Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c0"
    char_span: [0, 1821]
    sentence_count: 12
    key_terms: [server, security, data, windows, application, ransomware, desktops, cybersecurity]
    concepts: [server, security, application, windows, ransomware]
    token_count: 442
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1n7awzd/cyber_security_recommendation_for_tiny_office/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c1"
    char_span: [1835, 3853]
    sentence_count: 16
    key_terms: [automatictangerine84, security, sentinel, outside, great, small, sentinelone, attachment]
    concepts: [automatictangerine84, security, sentinel, outside, sentinelone]
    section: Comments
    token_count: 478
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c2"
    char_span: [3855, 5772]
    sentence_count: 12
    key_terms: [cybersecurity, small, business, security, recommendation, requirement, backups, premium]
    concepts: [cybersecurity, small, business, security, recommendation]
    section: Comments
    token_count: 473
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c3"
    char_span: [5774, 7110]
    sentence_count: 12
    key_terms: [database, access, credentials, wifi, manager, network, outlook, running]
    concepts: [database, access, credentials, manager, network]
    section: Comments
    token_count: 272
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c4"
    char_span: [7112, 8758]
    sentence_count: 15
    key_terms: [good, mdr, siem, detections, resources, endpoint, identity, security]
    concepts: [detections, resources, endpoint, identity, security]
    section: Comments
    token_count: 389
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c5"
    char_span: [8760, 10171]
    sentence_count: 9
    key_terms: [server, siem, provide, outsourcing, dedicated, requires, security, already]
    concepts: [server, provide, outsourcing, dedicated, requires]
    section: Comments
    token_count: 348
  - id: "social-intelligence/reddit-deep/cybersecurity/1n7awzd.md#c6"
    char_span: [10173, 10927]
    sentence_count: 6
    key_terms: [automatictangerine84, solution, on-premise, action1, on-prem, client, genemoody-action1, mdr]
    concepts: [automatictangerine84, solution, on-premise, action1, on-prem]
    section: Comments
    token_count: 219
---
# Cyber security recommendation for tiny office.

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1n7awzd/cyber_security_recommendation_for_tiny_office/)
Posted by **AutomaticTangerine84** · **45↑** · **78 comments**

We are are tiny company looking for SIEM and cyber security recommendations and advice. 
How can we protect our LAN DATA?

Our setup:
- i act as the ceo, cio and programmer
- one on-premise windows server 2022 with AD/DC security group policies in place and bitlocker and windows defender and avast anti-virus anti ransomware
- one switch
- one wired router/firewall omada with firewall rules set. 
- we do not have any web application or any client-facing application
- remote desktop access is turned off on the server and desktops. Even admin are not allowed any remote access to our server or desktop. 
- 10 WINDOWS 11 desktops connected to the server via wired connection with bitlocker on all local hard drives and usb ports disabled. Intalled windows defender and avast anti-virus anti ransomware. 
- no wifi. If users wants to browse the internet, they use their mobile phones and cellular data. 
- no laptops
- users use the internet for 2 purposes only: 
   a. email outlook. Not using ms exchange server. 
   b. upload and download pdf and xls data from only one client’s secured site. 
- users run LAN delphi application on server and uses mysql database in the LAN. Mysql has sensitive data. 
- we do not have a fix ip address
- we turn off our server and desktops after 6pm. Official office hours is 8am to 5pm
- on-premise Full and differential Backup runs 12noon and 5pm. 
- separate full zip backup into external ssd run from 5pm to 6pm. 

How can we protect our data from ransomware and other security threats?

Client requiring SIEM, MDR, etc. 😩

## Comments

- **worldarkplace** (47↑): I remember a great book of nostarchpress called "Cybersecurity for small networks"
  - **Doorram** (3↑): I have this book sitting in my library. Very good
- **Shaaaaazam** (33↑): MS sentinel in conjunction with Defender.  

SentinelOne has a SEIM built into their EDR product.

Huntress also has SEIM capabilities built in.
  - **The-Jesus_Christ** (5↑): Yes this is the way. Pushed this exact thing out a few days ago.
  - **inteller** (2↑): Yep, go do this.
  - **xtheory** (1↑): Sentinel is great and all (we run it), but it takes a lot of good knowledge on how to build solid queries to hunt for actionable threats behaviors that aren't ALWAYS picked up by EDR. Ingest can get pretty expensive as well if you don't know how to tune out the needless noise, and many of the great features are unavailable without M365 E5 licenses. 

I'd probably go with Huntress and their MDR service for a small shop.
  - **Important_Evening511** (1↑): You need someone to manage sentinel and defender or Sentinelone, I dont think OP has resources or skills to manage them so best would be a contractor or small MSP which can take care
- **AutomaticTangerine84** (15↑): Client wants to apply all standard cyber security audit rules even though we do not have any web-facing application.
  - **nobody2008** (3↑): It doesn't hurt to test these things. Are all the ports (including MySQL) blocked to outside? You can run an outside security scanner. Can anyone use a computer on the LAN to connect to any website? You mentioned only email and pdf upload are allowed but is that restriction really enforced? Sometimes the weakest point is just an employee who thinks they are opening a legitimate attachment.
    - **AutomaticTangerine84** (3↑): Yes. All ports including mysql is block from outside. It is set in our router setting. 

Users are not able to connect to other websites. 

We conduct security training to employees regarding opening attachments and our avast also catches suspicious attachment. 

Do you have a recommendation for an external scanner?
- **Reasonable_Chain_160** (9↑): Best for you, get an MSP (Managed Service Provieder) to setup the MS E5 offering (EDR, Sentinel) and some patching via RMM.

Show to your client you are small, but outsource to somehow that knows and have a string tech stack.

Should cost you some dollars per endpoint.
  - **Jinxyb** (5↑): If they are that small, Business Premium is the way to go
    - **Reasonable_Chain_160** (5↑): Well, yes.

I take pride to not know too well the overly complex pricing clusterfuck model of MS.
    - **jebediah1800** (2↑): Commenting so I can read all this good advice later!
  - **Sittadel** (1↑): The way they end with the word, "client," it looks to me like this *is* the MSP trying to fulfill a cybersecurity project. In either case, Microsoft is a great recommendation on Business Premium (as u/jinxyb pointed out already).  We have a guide for you here, OP: [M365 Security Guide for Small and Mid-Sized Businesses : r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1mk8kd7/m365_security_guide_for_small_and_midsized/)
    - **Reasonable_Chain_160** (2↑): This is a small software studio, stuck on the wrong side of a contract with a Large Enterprise that has a lot of requirements for them.

In my opinion.
- **Ok-Square82** (6↑): You didn't say anything about security awareness training for the company. Not sure your line of business, but likely it is a requirement depending on your jurisdiction, use of credit cards, etc. I'd embrace with the attitude of making it an employee benefit more so than a requirement - short, sweet, monthly trainings/discussions and encourage employees to bring their own security ideas.

How often do you test your backups?

What will you do if your one server has an issue? You don't have to move to cloud/Azure, but backups are useless if you don't the backup hardware to run them.

Any reason you use Outlook for email? Some of your steps (no WiFi, turning everything off) run to the extreme, but Outlook is a notorious vector of attack given how it integrates with other applications and the Windows OS. I imagine it also defaults to reading HTML, which makes you far more susceptible to phishing and other scams.

With all that turning on and off, what is your patching policy/process?

Uploading/downloading data from client's "secured" site - likely that means you have some sort of credentials to access that site. Are they shared? (Shouldn't be - what do you do when an employee leaves or client is compromised). Are they stored? (Local password manager, OK, but if you employees storing credentials on a phone or with an online manager, risk expands).

Dephi app and MySQL database (that I assume is running on that Windows server running BitLocker). There are a bunch of database design questions (user, permissions, passwords to access database, then hashing and encryption of fields where you can).

If you can get away with no WiFi, that's great, but don't consider it fully a security feature. If WiFi access to your network worries you that more tells you something about your network (are you encrypting traffic and authenticating devices on it to begin with?).

What about printers or other peripherals?

To the SIEM, there are plenty of inexpensive solutions, and I would go in that direction. SIEMs in small environments can be a huge pain given false positives. A lot like "anti-virus" and Windows Defender, these things are at best a last line of defense that is often not up to the task. Good strategy, good policy, and patching is where you want to focus your resources. That's not to say SIEMs and antis don't have role, but far too often, you see all the resources into these things, and not the stuff ahead of them.
- **vinny147** (4↑): I think you need to focus on a few other things before a SIEM:
1. Phishing protection if it’s not already in place. 
2. Network Segmentation. Your network management devices should not have their mgt interfaces accessible on the regular LAN and your servers should also be on their own LAN. I recommend looking at Apache guacamole to act a as a central point of access to servers. 
3. Backup isolation or offsite backups. It sounds like your backups are on prem so I’d add the precaution that they should be further isolated in the event of ransomware.
  - **AutomaticTangerine84** (2↑): All items 1 to 3 are good. 
We have been audited by a 3rd party security company selected by the client and the only major item pending is the siem and mdr.
    - **vinny147** (1↑): Awesome! I help small companies with security so glad to hear you have some of the low hanging fruit in place. For MDR Crowdstrike is great but also expensive. 7AI is a great up and coming vendor. For MDR make sure they can take action on endpoint detections and identity based detections (more will come from identity than endpoint). 

If you need any help feel free to DM me.
- **[deleted]** (3↑): Honestly for an office this small I would strongly consider outsourcing to a provider.  A SIEM for an operation this small doesn't make a ton of sense to me.  There are lots of good options out there to outsource to.  Managing a SIEM on your own is a pain and requires a high level of effort to tune and triage.  Do you have a full time security person who will be monitoring this proposed solution?
  - **AutomaticTangerine84** (1↑): I agree with you but outsourcing also requires opening up our server to a 3rd party and thus creates another risk. 

We do not have a dedicated person to watch and monitor the SIEM server/pc but we can allocate 30minutes a day for this task.
    - **Important_Evening511** (1↑): what you mean opening server to third party. your server might be already talking to many thing you dont know
    - **youwantrelish** (1↑): We are an MSSP that can provide a SIEM and 24/7 SOC.  We can provide it with minimal SOC services or with everything up to assessments and table top exercises.  I could do a quick call with you to see what is best.  Either way there are MSSPs that can help.
- **threeLetterMeyhem** (6↑): >client requiring

Hire a dedicated cyber security function who can talk with you and your client to fully understand the environment and provide a real plan.
- **shatGippity** (3↑): Is summer out already 😂

The part where a mystery client suddenly demands SIEM and MDR really ties the whole story together.
  - **AutomaticTangerine84** (1↑): We have been audited for cyber security by a 3rd party selected by the client. 
So far, all is good except this siem and mdr 😩
- **ep3187** (3↑): Blumira and action1. Are you doing 2FA? If you don't want to worry about ransomware, look into Halcyon
  - **GeneMoody-Action1** (2↑): Thanks for the shoutoput, and yes our [patch management solution](https://www.action1.com) would be a great fit, but if the user is bound to be all on-prem, we have no on-prem solution.
  - **AutomaticTangerine84** (1↑): I’m looking for an on-premise solution for 2FA. We do not use entraid or ms365. 
All our applications are on-premise.
