---
id: social-intelligence/reddit-deep/engineeringstudents/1sgtswt.md
url: "https://www.reddit.com/r/EngineeringStudents/comments/1sgtswt/mostly_done_with_my_degree_was_linear_algebra/"
kind: "social-post"
source: "reddit-deep: r/engineeringstudents"
subreddit: "engineeringstudents"
title: "mostly done with my degree: was linear algebra really necessary?"
author: "Yadin__"
date: "2026-04-09T16:01:36.000Z"
score: 59
upvote_ratio: 0.79
num_comments: 64
flair: "Discussion"
extracted_at: "2026-05-24T14:08:39.230Z"
extraction_method: "praw-deep"
research_goal: "Develop a comprehensive new strategy for Northeastern University's co-op program, integrating insights from current SOW, prior projects, and fresh industry analysis of experiential learning and co-op engagement tactics. The strategy must enhance learner access to meaningful experiential opportunities from pre-enrollment through graduate school."
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/engineeringstudents/1sgtswt.md#c0"
    char_span: [0, 1809]
    sentence_count: 10
    key_terms: [algebra, linear, engineering, engineeringstudents, compute, degree, "don't", equations]
    token_count: 397
  - id: "social-intelligence/reddit-deep/engineeringstudents/1sgtswt.md#c1"
    char_span: [1823, 3213]
    sentence_count: 7
    key_terms: [did, fea, functions, spherical, infinite, algebra, cosine, linear]
    section: Comments
    token_count: 314
  - id: "social-intelligence/reddit-deep/engineeringstudents/1sgtswt.md#c2"
    char_span: [3215, 5133]
    sentence_count: 10
    key_terms: [algebra, linear, calculus, require, vectors, matlab, basic, never]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/engineeringstudents/1sgtswt.md#c3"
    char_span: [5135, 5916]
    sentence_count: 5
    key_terms: [engineer, algebra, depends, working, design, linear, system, "that's"]
    section: Comments
    token_count: 207
  - id: "social-intelligence/reddit-deep/engineeringstudents/1sgtswt.md#c4"
    char_span: [5918, 7962]
    sentence_count: 8
    key_terms: [algebra, linear, necessary, need, calculus, "doesn't", count, doing]
    section: Comments
    token_count: 478
---
# mostly done with my degree: was linear algebra really necessary?

Source: [reddit-deep: r/engineeringstudents](https://www.reddit.com/r/EngineeringStudents/comments/1sgtswt/mostly_done_with_my_degree_was_linear_algebra/)
Posted by **Yadin__** · **59↑** · **64 comments**

A random thought that I had after giving advice to someone who asked about what math pre requisites they should have before trying out engineering classes to see if they like it.

I'm a third year ME and I'm mostly done with all of the actual learning for my degree. Most of what I have left is project based courses.

Thinking back on it, apart from ONE course(vibrations) I never had to use anything more than the most basic linear algebra knowledge: what vectors are, what a determinant is and how to compute it, how to multiply and invert matrices, how to convert a system of equations into matrix form, diagonalization, and that's about it I think.

Compare this with the other basic math courses, where I definitely needed to know what a Taylor expansion is, what a derivative is and how to compute it, how to compute all sorts of integrals, how to solve a bunch of different types of differential equations,etc

I honestly don't feel like 80% of the linear algebra I took was actually relevant in any way to my degree or developed my thinking in any way that was useful to engineering. Couldn't there be a "linear algebra for engineers" course where they teach us only the things that we need and cut out the fluff?

Is this just a symptom of me being an ME? I don't really know how it is in other engineering fields

NOTE: I do not mean that linear algebra is not relevant for "practical skills" and is only good for theory. I mean that even for the theory you don't really need more than the most surface level linear algebra.

## Comments

- **Dr__Mantis** (180↑): If you ever do FEA, CFD, or need to solve PDEs it will be very relevant
  - **Murky-Selection-5565** (57↑): I think you mean if you ever go build FEA software. Most good engineering programs are essentially training future researchers, not engineers. Although I will say that having a strong theoretical background helps when you are in industry, it can just be hard to hit the ground running right out of school when your education was so focused on theory and not practical skills.
  - **Yadin__** (4↑): I did have to do basic FEA for the one course that did require non-"trivial" linear algebra I mentioned in my post. CFD I never did.

PDEs I did have to solve quite alot and never really needed linear algebra? what are you referring to? for reference I mostly did it using seperation of variables
    - **ScientistFromSouth** (9↑): I think they are talking about a more advanced understanding of PDE where you just kind of decompose all the solutions as convolutions of the initial condition with the infinite set of eigenfunctions of the operator of the PDE.

 E.g. the heat equation on a square grid has sine and cosine as its basis functions and we get an infinite sum of sine and cosine terms weighted by coefficients calculated by an integral. In cylindrical coordinates, we would encounter Bessel functions, and in spherical, we get spherical harmonics.

This is equivalent to finding the eigenvalues/vectors of a matrix, diagonalizing it, and using it to rewrite other vectors as a function of the basis set.
- **Namelecc** (62↑): Did you never use matlab once in university? Linear algebra has consistently shown up fo me.
  - **Yadin__** (9↑): I did. quite alot actually. To work with matlab you need to know what vectors are and how to multiply/index matrices properly. that's about it for any basic application of matlab
    - **LeSeanMcoy** (18↑): Truthfully you’re never going to use any math more than likely in that same sense. I’ve never really done calculus, linear algebra, or anything outside of basic math in my career because software does it all for you. But understanding how everything works at its core is really valuable as an engineer and kinda what it’s largely all about. Helps you build intuition and when to say “that doesn’t look/feel right”
    - **Namelecc** (13↑): Well there ya go, basic linear algebra came in handy, and you didn’t even notice it!
- **ZealousidealGap3966** (99↑): Probably the most applicable math class in engineering.
  - **Yadin__** (-15↑): more than calculus and differential equations? I don't think so. I don't think I can name even a single class I took that didn't require any calculus, while I can probably name some that didn't require any linear algebra(thermodynamics and heat transfer are two big ones)

and even of the ones that do require linear algebra, it's the most surface level knowledge that only makes up for about 20% of the linear algebra course. On the other hand for calculus it was about 80% relevant
    - **Ok-Pollution-5465** (26↑): Not useful vs not needed are two different things tho, Linear Algebra can speed up problems quite a bit in heat transfer, dynamic systems, etc. Basically anytime you're using a system of equations which is pretty often.
    - **SherbertQuirky3789** (10↑): It is 

Actual engineer here
    - **SherbertQuirky3789** (2↑): Also why do you make up bullshit percentages lol
- **Few_Whereas5206** (13↑): When you start working you will not even use calculus 1 or 95% of the other subject matter you learned.  Lol.
  - **Crash-55** (5↑): It depends upon what you are working on.  All composite calculations are matrix based.  .
  - **Legal_Enthusiasm_440** (1↑): That probably depends on the discipline, no? For example, what if you are a design engineer that does structural analysis?
    - **Few_Whereas5206** (3↑): I was a design engineer for 6 years.   The software does almost everything.
- **mgomezch** (12↑): what

every time you solve a system of equations that's linear algebra

every time you model a system with vectors that's linear algebra

what the hell kind of mech eng are you doing that you're not using linear algebra left and right
  - **Yadin__** (-7↑): did you even read the post?
    - **mgomezch** (5↑): yes, i read the post.  i think you need to reconsider how you define "linear algebra".  you're acting like 99% of the linear algebra you do somehow doesn't count as linear algebra because it's just "the basics".  that makes no sense.  there isn't a true-scotsman linear algebra, it's all just linear algebra.  obviously implementing complicated algorithms in a solver isn't something you need to do since it's already implemented in software that you just use but that doesn't mean 90% of a mech eng's math somehow doesn't count as the real thing.  all of vector algebra and vector calculus is part of linear algebra and almost everything in mechanical engineering models problems using vectors and systems of equations that ultimately form a linear algebra structurally.  you don't need to be doing gauß-siedel all day for it to count as doing linear algebra.
- **cocobodraw** (9↑): Yes it’s necessary. Of course if you specifically pursue jobs that don’t use it then no it’s not necessary for you, but you could say that about anything.
- **a11i9at0r** (3↑): you'll need it if you get into anything involving the transformation of discrete parts, like robotics or mechanical assemblies.
- **yycTechGuy** (2↑): I don't know what engineering degree you got but I used every math class I ever took to the fullest extent.  Linear algebra, calculus, matrices, transforms, etc.
- **ciolman55** (2↑): I'm using it all the time in multivarible calculus and diff equations. Robotics courses uses it. Solids and dynamics uses them. Surface membranes in fluids. I've probably used 60 percent of the course material so far in my second year.
- **thunderthighlasagna** (2↑): My school didn’t require it for MEs but I took it to get a technical elective done. It’s helpful but certainly not necessary for the major unless you’re getting super deep into vibrations and control systems
