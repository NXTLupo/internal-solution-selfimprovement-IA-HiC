---
id: social-intelligence/reddit-deep/cybersecurity/1smuk2f.md
url: "https://www.reddit.com/r/cybersecurity/comments/1smuk2f/exploring_suricata_ids_for_internal_work_planning/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Exploring Suricata IDS for Internal Work Planning"
author: "ArcZ77"
date: "2026-04-16T05:36:51.000Z"
score: 7
upvote_ratio: 1
num_comments: 13
flair: "Business Security Questions & Discussion"
extracted_at: "2026-06-20T17:52:50.785Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c0"
    char_span: [0, 1763]
    sentence_count: 7
    key_terms: [use, server, ids, plan, suricata, cybersecurity, environment, installed]
    concepts: [server, suricata, cybersecurity, environment, installed]
    related_chunks: ["social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c1"]
    token_count: 430
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1smuk2f/exploring_suricata_ids_for_internal_work_planning/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c1"
    char_span: [1765, 3698]
    sentence_count: 12
    key_terms: [server, top, office, like, another, add, geo, info]
    concepts: [server, office, another, different, suricata]
    related_chunks: ["social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c0"]
    token_count: 460
  - id: "social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c2"
    char_span: [3712, 5773]
    sentence_count: 14
    key_terms: [setup, alerts, thanks, trends, tuning, alert, fine, like]
    concepts: [setup, alerts, thanks, trends, tuning]
    related_chunks: ["social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c3"]
    section: Comments
    token_count: 492
  - id: "social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c3"
    char_span: [5775, 7360]
    sentence_count: 6
    key_terms: [alerts, dennisthetennis404, thanks, alert, add, like, top, signatures]
    concepts: [dennisthetennis404, alerts, thanks, alert, signatures]
    related_chunks: ["social-intelligence/reddit-deep/cybersecurity/1smuk2f.md#c2"]
    section: Comments
    token_count: 404
---
# Exploring Suricata IDS for Internal Work Planning

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1smuk2f/exploring_suricata_ids_for_internal_work_planning/)
Posted by **ArcZ77** · **7↑** · **13 comments**

Hey All,  
So well , i am planning to deploy Suricata in our internal Team's office , I have been assigned to do , but i am not that informed about IDS / IPS,  
I do know what and what not , but still there is a lot of new things, we have time on our hands to plan and do things , but here is what we are at : 

We have our Enviornment like this : 

ISP -> Router./Firewall(Mikrotik) -> Unifi Swithc -> espan port -> Suricata Machine ( kinda like a dedicated server for it )

So the initial plan is just to use the IDS mode , once we implement it, we will use it for some time to then fine tune the rules and maybe in future use the IPS Mode.  
As of now we have the firewall with whitelisting which did all the work , but it was mostly for our BUS Network.  
We plan to use it for our BUS as well is Public wifi as well.

  
As for the IDS's current setup : 

Have installed and implemented it on a similar testing environment, to do the initial tests.  
So ids is installed , i have used some of the open source rulesets that were available.  
 for the dashboarding part We initially planned to connect it with our SIEM ,but then we changed due to Some server limitations.  
So now we plan on making another server for it , will use filebeat to forward the logs with TLS , and logstash to manage them on the Server for our dashboard using opensearch and grafana for dashbords.  
So yeah this is what we have managed in last few days in the test environment,   
I am bit thinking about the actual use case part : 

1. What kind's of dashboard can we create form this ?  
(Currently we have - Live events , top events type, top source/destination ip , Top Alert Signature , Log's info , Trying to add geo map as well - not sure why grafan on remote server is not able to show geo map's info, but on same server as suricata it is able to show geo map info - Will see )  
\- Another One for monitoring the resources of the Server using Prometheus.  
\- Another for DNS infor , DNS , Top http, https visits , Top Ip.

What else can we add , which might be required , and if i should change somethign on the above.

  
2. Retention policy : 

So yeah , this is one of the things, so we have like Different location of offices hence we plan to use central server for dashboarding & log stashing.  
We will have a hardware of Suricata on our offices forwarding to this.  
So Well the thing is , we have like 20pc's per office , around approximately 30 mobiles + some IOT devices as well in the office as well so very unsure How much of device's space and ram requirement should we have for   
A) The device of IDS which will be physically there in the office.  
B) The Cloud Server.  
So if any one has any idea about the amount we should keep i mean just an idea if for one office as - would be a good start for our testing.

  
3. So Yes another thing, these ids log's would different from our SIEM ones , so where and how can we train our team to understand these ( Don't want any paid options as of now , because yeah most probably i will be doing a lot of it - and team does not wanna outsource \_ TDLR - I am cooked. )  
But no worries it might be a good learning experience.

So yes , This and that , and so like how should i prepare more for it , what else can i add to it.  
Where can i learn more about it, and like how should i plan the IRP plan and documents for it.  
Thank you guys for reading through,   
Appreciate the time you have given.

## Comments

- **Ghost7R1N17Y** (3↑): Hey, honestly you’re on a pretty good track already.
Just few quick things from my side:
SPAN setup is fine for IDS, but don’t fully trust it under load.(packet drops happen)
Your dashboards are okay, but try adding stuff like top noisy hosts, new domains, and alert trends, not just counts.
Maybe skip Logstash for now, Filebeat → OpenSearch is enough early on.
For sizing, your setup should be fine with ~8–16GB RAM on Suricata box and more on central. (OpenSearch needs it)
Big thing tho focus on tuning alerts + baseline traffic, otherwise you’ll just drown in noise after few days.😅

For learning, honestly just take real alerts and investigate them with your team, that helps way more than any course.
  - **ArcZ77** (2↑): Hey ! Thanks for you feedback man !  
Yup i did thought about the SPAN setup , for packets getting dropped.. you got any other suggestion ?  
For the dashboarding part , yeah that seems much better, for this would i have to add any new rules in it ?  so like to track different "new domains" ,   
For alert Trends currently am just using the signature of top 20. ( Still need to go through all the log signature to see what should be the Limits set for alert's number. ( Should defiantly create a more centered on the alert's part ig. ) let me know if you have done or have any recommendations.

Logstash , oky will check that out and remove it if needed.

Yeah More on the central,  trying to figure it out. Also like any idea how much space on the drive will he use ?

Yeah i know , tuning is important - anything where i can get some info on which might have a curated listi on tuned alerts or for reference .  
  
Thanks man that was a valuable feedback !  
Hope you have a Awesome day !
- **k_sai_krishna** (2↑): your setup looks fine for ids mode

for dashboards maybe add alert trends  
and noisy hosts, helps in tuning

for sizing don’t stress too much now  
start small and adjust later

for learning just watch logs daily  
you will understand patterns slowly
  - **ArcZ77** (1↑): Heyy ! Thanks.. 

for dashboarding can you recommend what exactly like i was using the alert signature for now , after Ghost and your comment i believe i better prepare a Alert focused dashboard ,  can you recommend me things to add on to it.     
Thanks once again !
    - **k_sai_krishna** (1↑): Yup
    - **Ghost7R1N17Y** (1↑): Heyy, yeah alert focused dashboard is a good move.
I’d keep it simple and add:
-alerts over time (for spikes)
-top hosts generating alerts
-hosts triggering multiple alerts
-new/rare signatures
-basic severity split
That’s already way more useful than just top signatures.
Later you can tweak as you see real traffic.👍
- **dennisthetennis404** (2↑): Solid setup, add severity trend and top internal IP dashboards, fix the geo map by installing MaxMind GeoIP on the remote Grafana server, size your sensor at 8GB RAM with 500GB storage, plan for 5-10GB logs per office per day on the central server, keep 30 days hot and 90 days cold, use Suricata docs and Emerging Threats ruleset to train the team, and build your IRP runbooks from real alerts rather than writing everything upfront.
  - **ArcZ77** (1↑): Damn, this seems like the best advice i have gotten so far, thanks for going through all that read man, apricate you giving me all that good advice.   
God bless you brother , life saver !  
Do you work in a similar thing or done something like this ?
  - **ArcZ77** (1↑): Haha , thanks man for all the hard work gaining the experience. -  ! i will do that.. and as you mentioned.. i will come back in case i hit a wall.
    - **dennisthetennis404** (1↑): Please do!
