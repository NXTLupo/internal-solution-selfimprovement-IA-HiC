---
id: social-intelligence/reddit-deep/drexel/1ufx5yu.md
url: "https://www.reddit.com/r/Drexel/comments/1ufx5yu/quick_technical_clarification_for_ranking_system/"
kind: "social-post"
source: "reddit-deep: r/drexel"
subreddit: "drexel"
title: "Quick technical clarification for ranking system"
author: "Glad-Efficiency9414"
date: "2026-06-26T04:59:44.000Z"
score: 5
upvote_ratio: 0.86
num_comments: 18
flair: "Discussion"
extracted_at: "2026-10-01T20:49:29.421Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/drexel/1ufx5yu.md#c0"
    char_span: [0, 963]
    sentence_count: 5
    key_terms: [job, offer, clarification, alternate, qualified, technical, comments, current]
    concepts: [offer, clarification, alternate, qualified, technical]
    token_count: 220
    sources: [{"n":"reddit-deep: r/drexel","u":"https://www.reddit.com/r/Drexel/comments/1ufx5yu/quick_technical_clarification_for_ranking_system/","kind":"social-post","date":"2026-06-26","author":"Glad-Efficiency9414","subreddit":"drexel"}]
  - id: "social-intelligence/reddit-deep/drexel/1ufx5yu.md#c1"
    char_span: [978, 2988]
    sentence_count: 12
    key_terms: [offer, rank, employer, ranking, ranked, algorithm, position, unable-support]
    concepts: [offer, employer, ranking, ranked, algorithm]
    section: Comments
    token_count: 474
    sources: [{"n":"reddit-deep: r/drexel","u":"https://www.reddit.com/r/Drexel/comments/1ufx5yu/quick_technical_clarification_for_ranking_system/","kind":"social-post","date":"2026-06-26","author":"Glad-Efficiency9414","subreddit":"drexel"}]
  - id: "social-intelligence/reddit-deep/drexel/1ufx5yu.md#c2"
    char_span: [2990, 3251]
    sentence_count: 1
    key_terms: [glad-efficiency9414, offer, sad-percentage7812, rank, guaranteed, relatively, scenario, ranking]
    concepts: [offer]
    section: Comments
    token_count: 70
    sources: [{"n":"reddit-deep: r/drexel","u":"https://www.reddit.com/r/Drexel/comments/1ufx5yu/quick_technical_clarification_for_ranking_system/","kind":"social-post","date":"2026-06-26","author":"Glad-Efficiency9414","subreddit":"drexel"}]
---
# Quick technical clarification for ranking system

Source: [reddit-deep: r/drexel](https://www.reddit.com/r/Drexel/comments/1ufx5yu/quick_technical_clarification_for_ranking_system/)
Posted by **Glad-Efficiency9414** · **5↑** · **18 comments**

Quick technical clarification: In my SCDConline portal, I am currently deciding between two positions:  
  
Ranked #1: Job Current Status: Qualified Alternate  
  
Ranked #2: Job Current Status: Job Offer  
  
My primary goal is to try for the Rank #1. However, I want to confirm with absolute certainty that my actual Job Offer from Rank #2 serves as a guaranteed safety net. By ranking a Qualified Alternate position as #1 and a formal Job Offer as #2, I am not at risk of losing both? I want to ensure that if my first choice does not successfully clear or drop down to me, the system will automatically default to my second choice without any risk of another candidate taking the job offer.

Thanks for answering!

## Comments

- **Unable-Support** (4↑): My understanding is that due to some ranking math and a bias toward employer rankings, if you rank an offer above 3rd then you will automatically match with them.
  - **Hier_Xu** (3↑): Yep this is exactly correct. For those lurking and want a more depth explanation, if you rank an offer second, that means the employer rank is 1 and your rank would be 2, summing to 3.

So for all other selected candidates for the position, there are two cases. The first one is if the top QA ranked the position first. Then, the employer rank was 2 but the candidate rank was 1, also summing up to 3. As mentioned, the tie is broken via the employer ranking, so since they ranked you first, you would still get the offer. This logic repeats for any QA you rank first of course (e.g. you would never get it over someone accepting the same offer). The other case is the top QA ranking the position not first, but then the sum of the employer and candidate rank is lower than your sum, so either way, you get the offer you ranked second.

The side effect of this algorithm means that as explained, ranking a job offer second means accepting it unless you ranked another job offer first. Thus, you can't use an offer as a 100% safety net once ranking it third either.

(I'm not sure how this changes with positions with multiple openings though)
    - **coopdealio** (2↑): YEP.
    - **Unable-Support** (2↑): I was thinking about your original comment when I wrote it lol. Hi Kevin.
    - **Jazzlike_Number_19** (1↑): just out of curiosity, how are you certain this is how the algorithm works?
- **ZeroWevile** (3↑): If you choose to rank then the offer is no longer guaranteed. 

Unsure of the actual algorithm or if it has changed, but the way it was described around 2014/2015 was students are ranked by employers too (1 gets offer while 2 onwards are displayed as qualified alternatives), so lowest sum of ranks gets placed at the job and I believe employer rank takes priority in event of a tie. 

This scenario should be relatively safe to rank, but you are still nearly guaranteed job 2 if you are ranking it second.
  - **Glad-Efficiency9414** (1↑): thanks, im taking the offer
- **Sad-Percentage7812** (1↑): Offer is no longer valid if you decide to rank.
