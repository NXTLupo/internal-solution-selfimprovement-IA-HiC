---
id: social-intelligence/reddit-deep/machinelearning/1syc6ee.md
url: "https://www.reddit.com/r/MachineLearning/comments/1syc6ee/what_is_the_scientific_value_of_administering_the/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "What is the scientific value of administering the standard Rorschach test to LLMs when the training data is almost certainly contaminated? (R) + [D]"
author: "Impossible_Echo4029"
date: "2026-04-28T19:50:10.000Z"
score: 31
upvote_ratio: 0.83
num_comments: 12
flair: "Discussion"
extracted_at: "2026-05-11T17:27:06.577Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1syc6ee.md#c0"
    char_span: [0, 772]
    sentence_count: 3
    key_terms: [machinelearning, rorschach, comments, standard, llms, administering, comprehensive, human-related]
    token_count: 201
  - id: "social-intelligence/reddit-deep/machinelearning/1syc6ee.md#c1"
    char_span: [774, 2965]
    sentence_count: 11
    key_terms: [iwy2xjawrd27dlehrua2flbqixmqbzcnrjbmfwcf9pzbaymjiwmzkxnzg4mjawodkyaaee-wkkp6fkzrmaaunvtn6bjknoligcftgu0-clfs6cc49kz1gcr6ccdcariwa, data, training, contamination, methodological, models, psychological, scientific]
    token_count: 512
  - id: "social-intelligence/reddit-deep/machinelearning/1syc6ee.md#c2"
    char_span: [2867, 3153]
    sentence_count: 1
    key_terms: [iwy2xjawrd27dlehrua2flbqixmqbzcnrjbmfwcf9pzbaymjiwmzkxnzg4mjawodkyaaee-wkkp6fkzrmaaunvtn6bjknoligcftgu0-, fkzrmaaunvtn6bjknoligcftgu0-clfs6cc49kz1gcr6ccdcariwa, e88186, fbclid, mental, https, jmir, org]
    token_count: 196
  - id: "social-intelligence/reddit-deep/machinelearning/1syc6ee.md#c3"
    char_span: [3168, 4780]
    sentence_count: 9
    key_terms: [rorschach, value, scientific, c840-83e8-9749-aea5f1bc96fc, generate, lipflip, "there's", researchrelevant9083]
    section: Comments
    token_count: 431
  - id: "social-intelligence/reddit-deep/machinelearning/1syc6ee.md#c4"
    char_span: [4782, 5563]
    sentence_count: 2
    key_terms: [rorschach, answers, ambiguity, inkblots, evident, full-sprinkles-2653, whole, idea]
    section: Comments
    token_count: 186
---
# What is the scientific value of administering the standard Rorschach test to LLMs when the training data is almost certainly contaminated? (R) + [D]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1syc6ee/what_is_the_scientific_value_of_administering_the/)
Posted by **Impossible_Echo4029** · **31↑** · **12 comments**

A recent paper published in *JMIR Mental Health* (Csigó & Cserey, 2026) caught my attention. The researchers administered the 10 standard Rorschach inkblot cards to three multimodal LLMs (GPT-4o, Grok 3, Gemini 2.0) and coded their responses using the Exner Comprehensive System. They analyzed the models' "perceptual styles," determinants (like human movement vs. color), and human-related content themes.

However, I am seriously struggling to understand the methodological validity of this setup, and I’m curious what the scientific community thinks. My main concerns are:  
Massive Data Contamination: The 10 standard Rorschach cards, along with decades of psychological literature, scoring manuals (like the Exner system), and typical human responses, are widely available on the internet. It is highly probable that this data is already embedded in the models' training weights.  
Testing Retrieval, Not Perception: Because they used the standard, century-old inkblots instead of novel, AI-generated, or strictly controlled ambiguous images, aren't they just testing the models' ability to retrieve the most statistically probable lexical associations for those specific images from their training data?  
Lack of Controls: As I understand according to the paper, the researchers used the public web interfaces with default settings (no API, no temperature control) and seemingly only ran the test once per model, generating a tiny sample size.  
Ironically, the authors explicitly admit in their "Limitations" section that the models likely encountered the stimuli and scoring concepts during training, which could influence outputs independently of any image understanding. So, methodologically what is the actual scientific value of conducting projective psychological tests on LLMs without using novel stimuli to - at least try - rule out data contamination? What do you think, based of mechanisms of LLMs, does a study like this tell us anything meaningful about how AI processes visual ambiguity, or is it merely demonstrating advanced pattern matching and text completion based on widely known psychometric data? And - how do studies with such glaring methodological loopholes regarding LLM training data contamination make it through peer review in decent journals? Maybe I'm a little bit critical here, I just wanted to be a little provocative. Here is the study: [https://mental.jmir.org/2026/1/e88186?fbclid=IwY2xjawRd27dleHRuA2FlbQIxMQBzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEe-wkKP6fKZRmAAuNvtN6BjknolIGcfTGu0-cLFs6CC49kZ1gcR6ccdcaRiWA\_aem\_7hHg5G96xjDZ-04YlSs1Ew](https://mental.jmir.org/2026/1/e88186?fbclid=IwY2xjawRd27dleHRuA2FlbQIxMQBzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEe-wkKP6fKZRmAAuNvtN6BjknolIGcfTGu0-cLFs6CC49kZ1gcR6ccdcaRiWA_aem_7hHg5G96xjDZ-04YlSs1Ew)

## Comments

- **Blakut** (54↑): wow they gave a pseudosciense test to an LLM, this is low
- **cure-4-pain** (40↑): Rubbish.
- **StealthX051** (16↑): Look I'm into medical ml and there's some things we do that are just dumb. There's plenty of "we built an xgboost tabular model to predict x clinical outcome paper" which like doesn't really move the field forward in any meaningful way but still publishes. I don't know why we still benchmark llms on step 1 either but we certainly do so. I wouldn't think too deeply on it
- **Disastrous_Room_927** (16↑): the Rorschach has minimal scientific value to begin with
- **lipflip** (2↑): Let me condense your question a bit: what is the scientific value of jmir?
  - **Impossible_Echo4029** (2↑): I absolutely agree, my problem is that it seems to me, some researcher try to study AI without knowing anything about the basic mechanisms of that. The meaning of this study for me: is LLMs able to recognise that this is a Rorschach table, and then generate response from their previously learned data. Maybe I'm wrong, but for me the rest of the research is therefore pointless.
    - **lipflip** (1↑): I haven't read it. But from the abstract, you are probably right.
- **eposnix** (1↑): I don't see any value here but it's a fun experiment nonetheless. I had GPT generate a vibrant Rorschach test in one chat and had it identfy the blot in another. As expected, it saw a butterfly.

https://chatgpt.com/share/69f24c62-c840-83e8-9749-aea5f1bc96fc
- **ResearchRelevant9083** (1↑): i guess this depends on the signal to noise in those decades of psychological literature you mention.

i tend to be highly cynical about the ability of those fields to generate useful results but not an expert in personality psych myself.
  - **Impossible_Echo4029** (1↑): As I understand - the authors main idea was at first: the ambiguity of Rorschach inkblots may be able to "stress test" the ai (LLMs) with ambiguity, but then they discovered that the whole idea was a misconception. it became evident for them (which is evident) that the LLMs identified the pictures as Rorschach inkblots, then forumulated answers based on literature about common human answers (like "it"s a bat")... The other aims of the whole thing also remain unclear
- **Full-Sprinkles-2653** (2↑): Rorschach materials such as dosens of patient answers can be found on the internet… by the way I don’t know…
