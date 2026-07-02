---
id: social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md
url: "https://www.reddit.com/r/cybersecurity/comments/1oj8nnw/microsoft_office_365_breach/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Microsoft Office 365 Breach"
author: "Any-Fly-5703"
date: "2025-10-29T16:08:35.000Z"
score: 53
upvote_ratio: 0.9
num_comments: 74
flair: "Business Security Questions & Discussion"
extracted_at: "2026-06-20T17:52:50.770Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c0"
    char_span: [0, 2349]
    sentence_count: 17
    key_terms: [email, microsoft, vacation, cybersecurity, account, "didn't", emails, reset]
    concepts: [email, microsoft, cybersecurity, vacation, account]
    related_chunks: ["social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c1"]
    token_count: 501
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1oj8nnw/microsoft_office_365_breach/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c1"
    char_span: [2351, 4324]
    sentence_count: 18
    key_terms: [file, "i'm", attacker, account, moved, microsoft, get-spomalwarefilecontent, assuming]
    concepts: [attacker, account, moved, microsoft, assuming]
    related_chunks: ["social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c0"]
    token_count: 426
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c2"
    char_span: [4338, 6008]
    sentence_count: 17
    key_terms: [defender, microsoft, downdetector, check, theft, token, page, virustotal]
    concepts: [defender, microsoft, downdetector, check, theft]
    section: Comments
    token_count: 384
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c3"
    char_span: [6011, 7854]
    sentence_count: 17
    key_terms: [token, policies, access, likely, conditional, run, compliant, microsoft]
    concepts: [token, policies, access, likely, conditional]
    section: Comments
    token_count: 410
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c4"
    char_span: [7856, 9718]
    sentence_count: 13
    key_terms: [any-fly-5703, email, mfa, malicious, phishing, devices, managed, likely]
    concepts: [any-fly-5703, email, malicious, phishing, devices]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c5"
    char_span: [9721, 11728]
    sentence_count: 16
    key_terms: [emails, malicious, mailbox, search, check, rules, theft, good]
    concepts: [emails, malicious, mailbox, search, check]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c6"
    char_span: [11730, 13135]
    sentence_count: 10
    key_terms: [microsoft, protecting-tokens-microsoft-entra-id, though, "don't", entra, learn, been, did]
    concepts: [microsoft, protecting-tokens-microsoft-entra-id, though, "don't", entra]
    section: Comments
    token_count: 331
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c7"
    char_span: [13137, 15136]
    sentence_count: 17
    key_terms: [breached, personal, communication, user, number, authenticator, want, companies]
    concepts: [communication, breached, personal, authenticator, number]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/cybersecurity/1oj8nnw.md#c8"
    char_span: [15138, 17021]
    sentence_count: 11
    key_terms: [microsoft, any-fly-5703, token, aitm, app, data, incidents, exposure]
    concepts: [microsoft, any-fly-5703, token, incidents, exposure]
    section: Comments
    token_count: 421
---
# Microsoft Office 365 Breach

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1oj8nnw/microsoft_office_365_breach/)
Posted by **Any-Fly-5703** · **53↑** · **74 comments**

I apologize in advance for the length of this post... I didn't want to leave out crucial information!

I'm an IT Admin, but I'm definitely not a cybersecurity professional. Looking to those out there with some experience to guide me on the best next steps for a scenario.

\--------------------------------------------------------------------------------------------------------------------

I'm the IT Admin for a company that has a small European branch, and we utilize the suite of Microsoft 365 apps. One of our European sales guys went on vacation, and towards the end of his vacation our tenant-level Microsoft Defender notified me that he was sending out a huge blast of emails and subsequently shut down his ability to send/receive emails. According to him, his PC was shut off and his router was turned off (a habit of his when he goes away on vacation).

I sent him a Teams message to let him know what had happened (didn't know he was on vacation) and told him we'd need to reset his password and force a logout on all devices, to which I got the response "I just did". I asked if this might be a blunder (sending an email to all contacts somehow instead of one), and he responded asking me to reset his account, and adding "I didn't respond to you before now". The "I just did" response had been someone else who was logged on to Microsoft account.

I immediately forced out all sessions, blocked login and reset the password. I then accessed his email to review what was being sent. It was a .pdf file share email from OneDrive. I gave myself "send as" permissions, grabbed the list of emails from an Exchange audit, unblocked his account and sent a follow up email informing end users to delete the previous email with the subject line from spam email.

I logged into his OneDrive where the file came from and found that it was flagged as malware. I ran an Entra audit to get his sign-ins and found that there had been multiple accesses that day from an IP address that was identified as "Dallas, TX". I doubt that was the actual location. The Entra logs also showed noted "MFA requirement satisfied by claim in the token".

I ran audits in Microsoft Purview as well to get all activity for this user in the past 24-hours. From that I found all the files that had been created/deleted/moved in his OneDrive. Only one file was flagged as malware, but I moved them all to a folder marked "Quarantine" for later download on a secure sandbox, except the malware file as it can't be moved once it's flagged.

I watched the account over the weekend, and there were multiple attempts to log in, but they all failed. Reinstated the user on Monday after running several virus scans against his PC and kept an eye on the account still through the beginning of this week. Doesn't seem like the attacker has gotten back in since then, and the failed attempts have stopped from IP addresses other than the user's.

\--------------------------------------------------------------------------------------------------------------------

Looking for some insight here based on the facts above (I can clarify if something isn't clear). First, how did the attacker bypass MFA? Based on the "MFA requirement satisfied by claim in the token", I'm assuming they managed to scrape a token somehow.  Assuming he did turn off his PC and network, what's the most likely vector? Man/Adversary-in-the-Middle on a public WiFi? Is https vulnerable to this?

I want to analyze the infected file on a dedicated laptop I've set up off-network as a sandbox. Even though it *should* be safe to download an infected .pdf as long as you don't open the file, I'm not *positive* it is. I used a powershell script with Get-SPOMalwareFile & Get-SPOMalwareFileContent, but it didn't manage to pull the other files I want to check. Any insight on how to go about this? Any suggested tools?

I'm sure I'll get a lot of responses saying I'm in way over my head (and I probably am), but please add constructive guidance alongside the critiques.

Tl;dr: User's Microsoft Account got hacked which led to attacker getting access to their OneDrive.

## Comments

- **Jealous-Bit4872** (29↑): Not helpful now, but look into device compliance policies going forward. Why do you need to analyze the malware? Didn't Defender already tell you what it is? You can look up reports on the Virustotal page which is linked in the file page.  

It's clearly token theft. You may not ever find out how it was stolen. It's usually just a phishing email or malicious ad. There are several token theft defenses that are available depending on your environment. I would link some docs, but Microsoft Learn is down.
  - **Any-Fly-5703** (4↑): Lol, yup... I just realized a lot of Microsoft is down, and it goes beyond that too. AWS is affected, and [downdetector.com](http://downdetector.com) is listing lots of sites with issues.

I was hoping to find out what the file intended to do when executed. Microsoft Defender didn't give me the virustotal page that I saw... I'll try and seek it out.

I agree with it being a clear case of token theft, but just wondering what might have been the most likely vector for it. I ran a full sweep of the user's PC with both Malwarebytes and Defender, and nothing was reported.

Thanks for the response, btw!
    - **Maverick_X9** (18↑): -> check forwarding rules in their inbox, they could be running and you’ll never see them operating 


-> check your users browser extensions, browser hijackers are hard to identify for defender


-> go to explorer in defender and check for URL clicks by that user’s inbox, and inspect any odd URL clicks for possible phishing


-> audit your users SharePoint files, and make sure the sensitivity labels didn’t get altered 


-> take SMS auth away, force Authenticator app.


Welcome to the shit show
  - **Humble_Idea_6777** (1↑): Was it stolen from the Microsoft servers or from the users' phones? Could it be either, or is one more likely than the other?
    - **Jealous-Bit4872** (3↑): Neither of those. It’s stolen via browser.
- **TheDrumasaurus** (14↑): Going off what others have said. This is definitely token theft, which can be somewhat mitigated by Conditional Access policies. Generally the cause is an email received by the user with some sort of “PDF” attachment that redirects them to sign into Microsoft to access it. URL is normally bogus. Likely not AitM. Jonathan Edward’s on YouTube has a video on token protection policies. Also Device compliance policies as another had mentioned would be good to look into.

To sandbox the file, I would recommend Any.Run or Joe  Sandbox. Any.Run can run free analysis, but getting something like this for your team would be useful to look at behavior.

Happy to help if you have any other questions. Make sure you have removed all MFA methods from his account in case the attacker registered new methods during the compromise.
  - **bornagy** (5↑): Genuine question: how does conditional access help with token theft. I understand the token is provided after the user went through CAP filters. If someone steals the token they can replay it from other places, cant they?
    - **therealtacopanda** (3↑): Can watch for impossible travel or set where only intune managed devices get to stay signed in.
    - **Swordfish-Charming** (3↑): What this OP describes is likely an AiTM phishing attack. Very simplified the attacker tricks you into login into your account on their computer. 

If you implement a CA policy that requires signins to come from an Entra Joined / Compliant device you are vaccinated against this as the threatactors computer is not compliant. 

Side by side view from attacker and victim: [Attack Demo — Evilginx](https://www.youtube.com/watch?v=octo3ye8SwI)
  - **Check123ok** (3↑): To add here I would turn on a “defcon” policy to not allow any persistnat sessions for the whole org. Geo block as well. That’s a less friction approach. If possible only managed devices. I don’t know what else you have but there should be more data available to figure this out
    - **Any-Fly-5703** (1↑): What would you suggest as the minimum level of persistence? Having frequent logins isn't ideal either as the time does slowly add up.
  - **Any-Fly-5703** (1↑): All MFA was removed and reset, but thanks for the suggestions! I wish there was a "team" that could benefit from these tools, but we're a small company, and I'm the sole IT.

I did look through his email while I was in it looking for attachments that might be infected but didn't see anything. I think I might need to take another pass at it, however.
- **Maverick_X9** (6↑): Conditional access —-> entra +managed devices only
  - **Any-Fly-5703** (1↑): This seems like a good next step. I've read so much about how https and MFA are supposed to be such a reliable wall, but it's only a wall until it's a passed hurdle.
- **rastauff11** (7↑): Work 100s of BECs, most likely you’re going to find the user at your org was compromised in the an almost identical manner as the phishing email that was sent out. Pull message trace and or the users PST and give it a browse around the time you see the first malicious login.

If you find the initial phishing email, that will give you more insight into how MFA was bypassed, I’d presume likely AITM if it was an authenticator push. If you look at the logs and see a fresh session ID starting with the malicious activity that can tell you it’s a new login entirely and not theft of a token that already existed.


Grab those session IDs you see associated with the malicious logins and look for any activity based on session ID and IP, always good to do a tenant wide search for the IPs as well as other users that may have received the same initial phish.

Often times the TAs goal is going to be wire fraud. So if that user handles invoicing would be a good idea to check that no emails were sent to vendors or clients requesting an ACH account change.

If the user has sensitive info in their mailbox as was mentioned in another comment, best to contact your cyber insurance and have a third party investigation done.

Best of luck
  - **rastauff11** (2↑): https://github.com/jesparza/peepdf

Here’s a good tool for manual PDF analysis.
  - **Any-Fly-5703** (1↑): I very much appreciate this insight... thank you! Fortunately, the emails sent from his OneDrive were sent so fast and numerous that the triggered Defender. Also, SharePoint flagged the attachment as malicious, and from my understanding will not allow downloads of a file if it's flagged, despite if people were given access. Maybe I'm mistaken here?

Trying to find a convenient way of scanning the attachments he's gotten in the last few weeks.
- **Encryptedmind** (6↑): sounds like Token theft
- **imwearingatowel** (6↑): 1. Check the breached user's mailbox for any suspicious/unknown rules. Attackers will often leave behind forwarding rules, or rules to hide/delete emails.

2. Assuming it's a company computer, don't just AV scan it - burn it. Time to re-image it and/or issue him a new computer.

3. Check for suspicious emails received to the breached user's mailbox at least 72hrs prior to the breach (search further if you have the time/resources). This was most likely a token theft, which - in most cases - comes in the form of a phishing email, and once the theft happens the malicious actors don't usually sit on it for long. If you find any, search other mailboxes for the same email and ensure those recipients also reset their password.

4. As soon as Microsoft Learn is back online, review this guidance and implement whatever your Entra licencing enables you to: [https://learn.microsoft.com/en-us/entra/identity/devices/protecting-tokens-microsoft-entra-id](https://learn.microsoft.com/en-us/entra/identity/devices/protecting-tokens-microsoft-entra-id) (risk-based CA policies are key)
  - **Any-Fly-5703** (1↑): I did find a rule that routed all his incoming emails to the RSS folder, though I honestly don't know what would have been the value of that otther than being a pain in the ass. I did remove that rule, btw.

Because of the size of our company (small), and this is a sales rep on a different continent where we don't have an IT guy or company-provided, professionally (me) set up hardware. I can't do anything directly to it. If it were at our headquarters, I would have re-imaged it for good measure (even though this seems to have been all contained to Microsoft online).

We do have Safe Attachment policies in place in Defender... not sure how reliable Microsoft is at catching them, though. Any evidence that their screening is lacking?

I'll check out that link... Microsoft seems to have managed to recover. :D
    - **imwearingatowel** (1↑): >I did find a rule that routed all his incoming emails to the RSS folder, though I honestly don't know what would have been the value of that otther than being a pain in the ass.

They do that to hide the activity from the breached user, and to avoid tipping them off. Inevitably, at least one recipient of the phish will reply (e.g. "Did you send this?") and they don't want the breached user to see these replies. They want to be able to covertly reply and maintain their presence, and they do that by routing all incoming emails to a subfolder that the breached user is unlikely to look at.
- **Middle_Actuator_1225** (6↑): Definitely token theft. I have to say as someone who does IR I think your response was really good. Besides contacting him through teams when he was suspected to be breached. But that’s a learning moment. Attackers often monitor teams and emails for any signs of people catching on to their activities
  - **vlgngrbrdmn** (2↑): As a fellow IR engineer/analyst, how do y’all handle communication with the user outside of the MS ecosystem, assuming their MS account is compromised? Do you simply call a number they have listed as personal or text a personal number in an HR system? Or something else?
    - **Middle_Actuator_1225** (5↑): You should have policies outlined to reach people via a different method of communication should an incident Occur. 

Because I do contracting, I often suggest for companies to use Signal or an app of that nature. It should already be setup and ready to go. Since most companies don’t have alternatives planned, best thing to do is to use a personal number/contact. Overall you want to get communication out of your ecosystem.
- **ConsiderationSad6521** (3↑): How is the MFA configured?  Is it strict Authenticator/Passkey or do you allow backup (like personal email?)
  - **Any-Fly-5703** (2↑): Strict authenticator
    - **Check123ok** (2↑): Are you sure? Can you check authentication method log that shows how users authenticated. It a bit deep in entra
- **Craptcha** (3↑): I don’t think its Token Theft, I think its a AitM attack which are very very common nowadays and bypass regular (Non-phish-resistant) MFA.

The result of an AitM attack is that they have a copy of your token yes, but that’s because they are the ones who signed into the Microsoft servers to begin with.
  - **Any-Fly-5703** (1↑): I've been doing research on AitM attacks, but still don't fully understand how they differ from MitM. It seems that the password reset was enough to thwart further logins (I've been monitoring).

My suggestion to our European sales reps going forward is to stop using public networks as much as possible, and to use a respectable VPN if there's no other option. The guy who got hit works a lot in Eastern Europe, and I'm under the understanding that area is a hotbed for cybercrime.
    - **Craptcha** (2↑): They differ from MitM because they are gender neutral :P its the same thing

The AitM attack sends your user to a fake Microsoft sign-in page which acts as a web proxy and authenticates on the backend towards Microsoft. That allows them to capture the auth token and be “signed into” your tenant without being re-prompted for MFA

Often they’ll do an enterprise app registration to connect some open source mail client app for persistence. You should look at unknown app registrations that match the compromised users.
- **Maximum_Border_7739** (3↑): Yep, token theft. MFA didn’t break, the attacker just reused a valid session. You handled it solidly.

The bigger issue is knowing what data that account had access to - identity incidents are really data exposure incidents in disguise.
  - **Any-Fly-5703** (1↑): This was definitely a data exposure incident. I ran a full report of all the SharePoint sites he had access to, and a Purview audit to see everything that was touched around the time of the incident and going back several days by that user.

Fortunately, it seems his goal was simply to use us as a vector to send corrupted .pdf files to larger fish via our credibility.
