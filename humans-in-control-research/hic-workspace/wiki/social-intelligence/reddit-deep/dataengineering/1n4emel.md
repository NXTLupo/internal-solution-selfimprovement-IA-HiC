---
id: social-intelligence/reddit-deep/dataengineering/1n4emel.md
url: "https://www.reddit.com/r/dataengineering/comments/1n4emel/hl7_data_integration_pipeline/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "HL7 Data Integration Pipeline"
author: "therealtibblesnbits"
date: "2025-08-30T22:36:10.000Z"
score: 8
upvote_ratio: 0.85
num_comments: 7
flair: "Open Source"
extracted_at: "2026-06-11T18:58:17.196Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1n4emel.md#c0"
    char_span: [0, 1754]
    sentence_count: 10
    key_terms: [data, integration, healthcare, dataengineering, project, working, https, com]
    concepts: [integration, healthcare, dataengineering, project, working]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1n4emel.md#c1"]
    token_count: 408
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1n4emel/hl7_data_integration_pipeline/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1n4emel.md#c1"
    char_span: [1768, 3104]
    sentence_count: 10
    key_terms: [fhir, mappings, dataengineering, something, project, https, odd-government8896, appdgarsgl09yvjfj]
    concepts: [dataengineering, mappings, something, project, https]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1n4emel.md#c0"]
    section: Comments
    token_count: 338
  - id: "social-intelligence/reddit-deep/dataengineering/1n4emel.md#c2"
    char_span: [3106, 5221]
    sentence_count: 21
    key_terms: [data, mapping, field, synthea, "you're", demonstrating, implementing, edi]
    concepts: [mapping, field, demonstrating, synthea, implementing]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/dataengineering/1n4emel.md#c3"
    char_span: [5223, 5785]
    sentence_count: 7
    key_terms: [data, healthcare, tieaccomplished7039, demonstrate, information, everything, understand, engineers]
    concepts: [healthcare]
    section: Comments
    token_count: 123
---
# HL7 Data Integration Pipeline

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1n4emel/hl7_data_integration_pipeline/)
Posted by **therealtibblesnbits** · **8↑** · **7 comments**

I've been looking for Data Integration Engineer jobs in the healthcare space lately, and that motivated me to build my own, rudimentary data ingestion engine based on how I think tools like Mirth, Rhapsody, or Boomi would work. I wanted to share it here to get feedback, especially from any data engineers working in the healthcare, public health, or healthtech space.

The gist of the project is that it's a Dockerized pipeline that produces synthetic HL7 messages and then passes the data through a series of steps including ingestion, quality assurance checks, and conversion to FHIR. Everything is monitored and tracked with Prometheus and displayed with Grafana. Kafka is used as the message queue, and MinIO is used to replicate an S3 bucket.

If you're the type of person that likes digging around in code, you can check the project out [here](https://github.com/bryanbritten/hl7-integration).

If you're the type of person that would rather watch a video overview, you can check that out [here](https://www.loom.com/share/3de54014865b4cb7aa59b87ec940626d?sid=271f23fd-7ade-4f82-864f-e2a288a96a36).

I'd love to get feedback on what I'm getting right and what I could include to better represent my capacity for working as a Data Integration Engineer in healthcare. I am already planning to extend the segments and message types that are generated, and will be adding a terminology server (another Docker service) to facilitate working with LOINC, SNOMED, and IDC-10 values.

Thanks in advance for checking my project out!

## Comments

- **AutoModerator** (1↑): You can find our open-source project showcase here: https://dataengineering.wiki/Community/Projects

If you would like your project to be featured, submit it here: https://airtable.com/appDgaRSGl09yvjFj/pagmImKixEISPcGQz/form

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **Odd-Government8896** (2↑): Hey - I worked in the health informatics/interop space as a DE/applied DS.

Just some thoughts without digging through the code... most people have HL7 figured out. Some of our biggest challenges are mapping CCDA's (QHINs have a million special snowflakes), FHIR, and EDI X12 (claims). While Synthea can build CCDA and FHIR, we also are lacking EDI X12's big time.

The MS CCDA/HL7 -> FHIR converter is meh. We still hit the same issues... mappings mappings mappings.

As someone who interviews DE's in this field (in the US)... if you want to demonstrate you understand these datamodels, just put a bunch of ADT's in a dataframe and display a chart. Doesn't need to be more than that. If you wanna do something fancy, you could do something with CQL on FHIR (this would cover all kinds of topics and show you know how to work with a real world problem/scenario).

Good luck homie.
  - **SearchAtlantis** (2↑): LOL QHIN tells me you've actually worked in that part of the space. 
Agreed all around. 
Biggest problem with HL7 and derivatives is everyone has a special field to stash things in. Real MRN is field X, we stash an internal universal ID in Y field etc. The mapping is the hard part.
  - **mertertrern** (2↑): X12 EDI is brutal. No two sources implement it the same, and the file sizes they generate can be expensive to parse out. It also costs a lot to get the latest standards for the field mappings. If someone solved this problem in Rust and open sourced it, a lot of consultants would fold overnight.
  - **therealtibblesnbits** (1↑): I really appreciate your feedback on this! Based on your feedback, it sounds like there's two things I should focus on:

1. Working with more complicated data (i.e. C-CDA and EDI X12)  
2. Demonstrate my ability to do mapping

Implementing C-CDA is fairly straightforward thanks to Synthea, and theoretically I can extend my segment generators to generate EDI X12 just as easily as HL7.

Implementing mapping will be a little bit harder. Synthea produces pretty clean data, at least in the sense that I believe it places data in the fields where they need to go, the fields are used as intended, and the data is relatively predictable. 

Do you have any recommendations on how I could implement the types of issues that require mapping the data to expected outputs?
    - **Odd-Government8896** (1↑): Synthea is great for prototyping dashboards and some basic parsers. You're right, that the data is far too clean. If you're just focussed on mapping, you're basically demonstrating you know how to work with xml and/or json. It won't actually capture the true challenges we face in the industry.

My emotions on the topic change weekly depending on what crisis is coming down the pipe from sales/product. But honestly, unless you plan on working for a vendor that does mappings, I might not even worry about it.

You might be better off demonstrating you understand concepts like semantic harmonization and master data management.

You really wanna impress people? Check out the CQL Framework and the word "eCQM". That's where you demonstrate you know how to work with clinical data in a way that generates revenue. Don't forget about me when you make it prime time :)
- **TieAccomplished7039** (1↑): Hello all!

I have been looking to understand the healthcare data for data engineers. Anyone here please help me with giving overview on health information exchange forums, about HEDIS measures, cpt/loinc codes and everything around healthcare data. Any small insight from you will be helpful.
