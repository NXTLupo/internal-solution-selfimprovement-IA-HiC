---
id: social-intelligence/reddit-deep/professors/1rcupl9.md
url: "https://www.reddit.com/r/Professors/comments/1rcupl9/taking_it_down_from_academic_integrity_to_not/"
kind: "social-post"
source: "reddit-deep: r/professors"
subreddit: "professors"
title: "Taking it down from \"academic integrity\" to \"not following directions\" in CS."
author: "JoshuaTheProgrammer"
date: "2026-02-23T21:34:54.000Z"
score: 189
upvote_ratio: 0.96
num_comments: 47
flair: "Teaching / Pedagogy"
extracted_at: "2026-05-14T18:17:21.709Z"
extraction_method: "praw-deep"
research_goal: "Identify a comprehensive new strategy for co-op based on the current statement of work for NU, prior projects with NU, and fresh industry analysis of experiential learning and co-op engagement tactics to improve learner's chances of gaining meaningful experiential learning opportunities from pre-enrollment to graduate school\n"
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c0"
    char_span: [0, 2015]
    sentence_count: 9
    key_terms: [students, directions, "don't", use, academic, advanced, problem, set]
    concepts: [students, directions, "don't", academic, advanced]
    related_chunks: ["social-intelligence/reddit-deep/professors/1rcupl9.md#c5"]
    token_count: 453
    sources: [{"n":"reddit-deep: r/professors","u":"https://www.reddit.com/r/Professors/comments/1rcupl9/taking_it_down_from_academic_integrity_to_not/"}]
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c1"
    char_span: [2017, 3108]
    sentence_count: 7
    key_terms: [class, students, problem, computer, outside, science, student, "it's"]
    concepts: [class, students, problem, computer, outside]
    token_count: 226
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c2"
    char_span: [3122, 5095]
    sentence_count: 11
    key_terms: [incorrect, example, assignment, references, life-education-8030, citations, resources, students]
    concepts: [incorrect, life-education-8030, example, assignment, references]
    section: Comments
    token_count: 406
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c3"
    char_span: [5097, 7129]
    sentence_count: 12
    key_terms: [writing, sources, students, because, shoehorning, "i'll", "it's", integrity]
    concepts: [writing, sources, students, because, shoehorning]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c4"
    char_span: [7131, 9014]
    sentence_count: 14
    key_terms: [instructions, students, institutions, assignment, student, access, requirements, meet]
    concepts: [instructions, students, institutions, assignment, student]
    section: Comments
    token_count: 392
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c5"
    char_span: [9016, 11233]
    sentence_count: 18
    key_terms: [directions, restrictions, students, college, science, safety, themselves, guarantee]
    concepts: [directions, restrictions, students, college, science]
    related_chunks: ["social-intelligence/reddit-deep/professors/1rcupl9.md#c0"]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c6"
    char_span: [11235, 12166]
    sentence_count: 6
    key_terms: [students, use, penalizing, proctored, nothing, joshuatheprogrammer, exams, gave]
    concepts: [students, penalizing, proctored, nothing, exams]
    section: Comments
    token_count: 252
  - id: "social-intelligence/reddit-deep/professors/1rcupl9.md#c7"
    char_span: [12168, 13290]
    sentence_count: 9
    key_terms: [shinypenny01, question, through, joshuatheprogrammer, "can't", "don't", ready, get]
    concepts: [shinypenny01, question, through, "can't", "don't"]
    section: Comments
    token_count: 291
---
# Taking it down from "academic integrity" to "not following directions" in CS.

Source: [reddit-deep: r/professors](https://www.reddit.com/r/Professors/comments/1rcupl9/taking_it_down_from_academic_integrity_to_not/)
Posted by **JoshuaTheProgrammer** · **189↑** · **47 comments**

I wanted to make this post to give a summary of how I've managed to reduce my academic integrity conversations in a semester down to "you didn't follow directions; here's a 0" in my second-semester computer science course.

For those of you outside of CS, similar to math, there are many ways (some worse than others) to solve a problem, and many of these ways use advanced concepts that I simply don't talk about at all in my class. Generative AI, as we all know, breezes through the problems that we ask our students to solve, and its solutions can sometimes be a bit unorthodox by leveraging unexplained topics and syntax that are not in the scope of the course or the textbook. This is obviously an issue because we don't *want* students to bulldoze the assignments with AI; we want them to learn. It's becoming harder and harder to assess any kind of learning done in a non-proctored setting, and I don't want to have to always read an assignment submission and guess whether it was AI-generated if it uses an advanced concept.

So, what I did was implement a "system" where students must use a restricted set of features when programming. For example, if we're currently covering arrays, I will say, on the problem set, that anything beyond the arrays section (and a hand-picked selection of other features, e.g., exceptions, regular expressions, and things I routinely see students using) are banned, and their usage results in an automatic 0 on the problem set. Thus, students who decide to use these advanced concepts will earn a 0 and the conversation goes from "you cheated" to "you didn't follow the directions on the assignment." Even if they *did* use generative AI, I don't have to report them for academic misconduct.

Some of you may wonder, "Well, what about the student(s) who self-studied computer science outside of the class and want to use those advanced concepts?" My response is, part of computer science (and my class as a whole) is to teach students how to read and correctly interpret problem specifications and documentation. If a student who supposedly 'knows everything' is coming into my class, which I hear all the time, then they should be able to restrict themselves to the subset of features that I require for my class.

I also understand the concerns about limiting answer creativity for the students. That is, I get that we generally *want* our students to creatively solve a problem and demonstrate what they know and beyond. The problem is that, outside of the classroom, it's effectively impossible to assess this without worrying about whether it's AI generated.

I figured I would share this advice; it has really helped reduce the number of times I have to give 0s because of suspected AI usage.

Note: In my class, 60% of the course grade comes from in-person and proctored tests.

## Comments

- **Life-Education-8030** (68↑): Yes, I do this too in my rubrics in social sciences. I don’t waste time trying to prove AI.
  - **FrancinetheP** (11↑): Could you share an example rubric category that you’d use for a paper and the associated levels of performance? I’m struggling to map your example on to OP’s.
    - **Life-Education-8030** (27↑): The most typical areas where students and AI fail are in content and attribution.

**Example of poor use of content** leading to rejection of the assignment:  Student's posts did not refer to the assigned reading or course materials. 

Student may have used incorrect materials (e.g., wrong text, incorrect citations and references as a result).

Student may have referred  to only other outside resources, used unsupported opinions and/or used biased or poor quality sources.

Student may have failed to address any questions posed in the instructions. 

**Example of poor attribution** resulting in rejection of the assignment: Postings were presented as unsupported opinions with no citations or references at all, so student's work was presented as totally original and the analysis was not reliable.

Connection may have been made to external resources, but no connection was made to course readings or other assigned resources (e.g., videos) as required.

Indication of fake citations or references, including nonexistent sources, incorrect page numbers, using the wrong book, incorrect and/or varying copyright years, etc. 

Automatic failure for the assignment and possible report to the Academic Integrity Committee, especially if this is egregious or repeated behavior.
- **nezumipi** (53↑): Limiting their choices had learning benefits as well. For the students who are a little behind, it serves as a hint: the answer is in one of these chapters. For students who are a little ahead, you're challenging them to solve the problem without using a preferred technique, thereby forcing them to use other techniques. 

When I teach academic writing, I'll often challenge my students to write a paragraph under certain limitations, usually banning a word they're overusing. I don't do it because "so" is a bad word. I do it because I want them to learn flexibility and variety in their writing. My students who start every sentence with "so" learn to use other conjunctions!
  - **JoshuaTheProgrammer** (20↑): Yep, this is related to the “learning how to read problem specifications” part of my argument. I want students to solve the problems in the way I ask because I think it helps them become better programmers! Overengineering a solution is a common trap that beginning students fall into.
  - **CharacteristicPea** (4↑): So that’s a good idea.
- **mishmei** (18↑): a few courses I teach have a similar approach and I like it for the same reasons. e.g. a qualitative research course has fortnightly writing logs as part of the assessment, and these have to be completed using only the course materials (specific readings, lectures, etc). any outside sources, or no sources at all, you fail. so, very few frustrating integrity investigations. it's also easy to check if they're citing the materials correctly or just shoe-horned them in after the fact.
  - **thelifeworthliving** (3↑): Shoehorning after the fact is the #1 issue I have, and I know it’s because of AI but I’d love to find clear ways to comment on this without referring to AI or shoehorning. Would love ideas if you have them. The last one I saw, mere hours ago, I wrote something like “did not connect this quote to your argument or elaborate”. What do you all say?
    - **mishmei** (2↑): god yes, it's my #1 issue too. I think your response is useful, and I often take a similar approach. I'll note that sources haven't been incorporated into the writing; that the writing has to be produced *from* reading the sources, etc. 
I'll also stress (in really bad cases) that it's an integrity breach to cite sources that aren't actually linked to the writing. no need to mention AI. 

it's by no means perfect, and I know we're constantly on the back foot here, but it does help.
- **SharonWit** (38↑): “Not following directions” has been the best criterion for all my assessments.
  - **kierabs** (-5↑): I wonder what kind of institution you are teaching in. 

I’m at a community college: many of my students struggle to follow instructions. That doesn’t mean they’re using AI. Of course, I can give them poor grades for not following instructions, but I feel there really should be a difference between those who are genuinely trying to learn and those who are cheating using AI. A student who fails to meet assignment expectations because they genuinely tried and just didn’t understand what I was asking for should get a chance to redo the assignment, for example, whereas a student who put the prompt and sources into an AI and turned in an AI-generated essay does not deserve the same leniency. 

But this post suggests I should grade both students based on how well they followed instructions. So is my class an assessment of how well someone follows instructions? Or how well they meet course outcomes? They’re not always the same. 

OP’s strategy would probably be much more effective in non-open access institutions because instructors can expect their students to understand the assignment. Unfortunately, that’s not always the case in open access institutions.


I do expect students to submit work meeting specific minimum requirements, though. The amount of students who simply never meet those requirements—even within the weeklong grace period I gave them— 
has increased a lot in the last 5 years. 

TL;DR: if open access institutions failed every student who didn’t follow instructions, we’d have extremely low pass rates.
    - **jxlecler** (3↑): I also teach at a community college, and while I definitely see your perspective, I think I disagree. 

I teach a lab science where the basic ability to follow directions is a non-negotiable because we have some very serious safety directions. So serious, in fact, that I asked as I was onboarding: what do I do if a student is ignoring safety directions and putting themselves or a classmate in danger? The response, from everyone I asked in my chain of command, was to dismiss them for the period, require a meeting before they'd be allowed to return, and if they refused to leave then call public safety to have them escorted out if they're being a danger to themselves or others. 

Yes, many of these students need extra support. It's our job, more than at other institutions possibly, to provide extensive supports. However, this is still college, and they are still adults (even the dual enrollment students, legally). There IS the expectation that they've learned the K-5 skill of "following directions," but now the directions are "college-level science protocol" or other subject equivalent. We can guarantee access (to course content, tools, supports, etc.) but at the college level we cannot, and should not, guarantee success. We are not K-12.
    - **Life-Education-8030** (4↑): I work for an open access college. I expect confused students to ask for clarification and tell them so. If they do not, then they are saying they do understand.
- **geneusutwerk** (8↑): I'm implementing something similar in an advanced stats class. If you use a package that wasn't used in class you need to explain how it produces the same results
- **Aceofsquares_orig** (16↑): I also teach Computer Science, mostly DS&A, and for programming assignments this is what I do.  I restrict what can be used in the language.  Anytime a student uses something outside the restrictions I either penalize them or if it is egregious I give them a 0.  Unfortunately, LLMs can still properly generate solutions given the restrictions if they have enough training data on a certain language.  Only course of ensuring outcomes is proctoring.  Which isn't always the best nor is it always possible.
  - **JoshuaTheProgrammer** (13↑): Yep. I was reading a submission that had a comment saying: // Compliant with restrictions from section 3.1.

Gave them a 0 lol
    - **iTeachCSCI** (11↑): > Gave them a 0 lol

They earned the zero, you merely recorded it.
- **Adept_Tree4693** (7↑): This is what I’ve been doing for math since the appearance of problem solvers like photomath and Wolfram alpha.  I much prefer it to filing a bunch of academic violations.
- **_Decoy_Snail_** (7↑): Sorry, but what exactly stops your students from giving better prompts and telling AI to only use a given set of tools? I'm also teaching programming, I think oral/heavy proctored exams are the only way now.
  - **kierabs** (8↑): Not OP, but I’m guessing nothing. OP is penalizing students who use AI poorly while also penalizing students who are genuinely confused. OP is also passing students who use AI competently.
  - **JoshuaTheProgrammer** (3↑): Admittedly, nothing, and I agree this is a weak point of the system. Next semester, proctored exams are 70% of my grade (now, they are 60%).

Do you have any ideas on how to *actually* reduce cheating? My issue is that I *want* my students to practice programming outside of class with the problem sets that I assign. If they don’t, they won’t be ready for the next CS courses in their path and they won’t be ready for the exam.
    - **_Decoy_Snail_** (4↑): Unfortunately, we can't make anyone study if they don't want to, we can only catch those who don't at the oral exams. If they know they can't pass they will have to do homework.
- **shinypenny01** (11↑): All they have to do is post your assignment descriptions in full and AI will solve it. It’s just improving their AI answers.
  - **JoshuaTheProgrammer** (4↑): You’d be surprised at how easily they forget to do this. The instructions are at the very top and they probably post question by question. It’s not a PDF but a website
  - **DrMaybe74** (4↑): You overestimate the rigor of cheaters. Will some smart ones get through? Sure.
    - **shinypenny01** (1↑): Most will get through, you’re catching the laziest 10%.
- **mediaisdelicious** (7↑): This is a also a nice feature of specifications grading.
