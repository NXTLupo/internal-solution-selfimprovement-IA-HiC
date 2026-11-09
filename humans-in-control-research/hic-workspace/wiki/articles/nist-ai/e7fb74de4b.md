---
id: articles/nist-ai/e7fb74de4b.md
url: "https://www.nist.gov/news-events/news/2026/03/nist-helps-fingerprint-examiners-new-data-and-software-release"
url_hash: "e7fb74de4b"
kind: "article"
source: "nist_ai"
title: "NIST Helps Fingerprint Examiners With New Data and Software Release"
author: ""
date: "Mon, 23 Mar 2026 12:00:00 +0000"
tier: 1
method: "source-native"
extracted_at: "2026-10-09T16:55:44.029896+00:00"
chars: 4894
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th 1-understand-emerging-northeastern-university-student-and-other-college-student"
collected_at: "2026-10-09T16:55:41.410Z"
relevance: 0
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "41f32270e24af9a5"
relevance_by_goal: {"aa6916010743":0}
chunks:
  - id: "articles/nist-ai/e7fb74de4b.md#c0"
    char_span: [0, 198]
    sentence_count: 1
    key_terms: [nist-helps-fingerprint-examiners-new-data-and-software-release, nist, fingerprint, news-events, examiners, software, release, source]
    token_count: 52
    sources: [{"n":"nist_ai","u":"https://www.nist.gov/news-events/news/2026/03/nist-helps-fingerprint-examiners-new-data-and-software-release","kind":"article","date":"2026-03-23"}]
  - id: "articles/nist-ai/e7fb74de4b.md#c1"
    char_span: [200, 2834]
    sentence_count: 12
    key_terms: [fingerprints, print, annotations, fingerprint, quality, prints, available, data]
    concepts: [fingerprints, annotations, fingerprint, print, quality]
    related_chunks: ["articles/nist-ai/e7fb74de4b.md#c2"]
    token_count: 512
    sources: [{"n":"nist_ai","u":"https://www.nist.gov/news-events/news/2026/03/nist-helps-fingerprint-examiners-new-data-and-software-release","kind":"article","date":"2026-03-23"}]
  - id: "articles/nist-ai/e7fb74de4b.md#c2"
    char_span: [2529, 5024]
    sentence_count: 19
    key_terms: [software, print, quality, nist, help, fiumara, latent, prints]
    concepts: [software, print, quality, investigation, fiumara]
    related_chunks: ["articles/nist-ai/e7fb74de4b.md#c1"]
    token_count: 512
    sources: [{"n":"nist_ai","u":"https://www.nist.gov/news-events/news/2026/03/nist-helps-fingerprint-examiners-new-data-and-software-release","kind":"article","date":"2026-03-23"}]
  - id: "articles/nist-ai/e7fb74de4b.md#c3"
    char_span: [4756, 5095]
    sentence_count: 12
    key_terms: [nist, collaboration, practitioners, researchers, innovation, annotated, phalanxes, resources]
    token_count: 97
    sources: [{"n":"nist_ai","u":"https://www.nist.gov/news-events/news/2026/03/nist-helps-fingerprint-examiners-new-data-and-software-release","kind":"article","date":"2026-03-23"}]
---
# NIST Helps Fingerprint Examiners With New Data and Software Release

Source: [nist_ai](https://www.nist.gov/news-events/news/2026/03/nist-helps-fingerprint-examiners-new-data-and-software-release)

Sifting through fingerprints gathered from crime scenes is the job of fingerprint analysts and — increasingly — their computers. Training humans and their machine partners for this meticulous work is no easy task, but help has arrived in the form of a new data and software release from the National Institute of Standards and Technology (NIST).
The data, consisting of thousands of fingerprints along with notes detailing their quality, follows the release of an open-source software package that can help assess print quality rapidly. Together, they offer a pair of tools for improving the expertise of forensic scientists.
“These two resources will help improve the science of fingerprint identification,” said NIST computer scientist Greg Fiumara. “The data is the largest and most complete fingerprint dataset now available, and the software is a modified version of a print analysis tool used by U.S. law enforcement that we are making freely available to the world.”
The fingerprint data, available as part of NIST Technical Note (TN) 2367, augments a previous release, Special Database (SD) 302, that NIST initially made available in 2019. It contains about 10,000 fingerprints gathered in a lab environment from 200 volunteers, who consented to their prints’ use for research purposes. All other personal information was scrubbed from the database, including the volunteers’ names and places of residence.
“The prints are from people we recruited to come in and do things like write a note, pick up a circuit board, handle a dollar bill, that sort of thing,” Fiumara said. “Then we recovered the prints they left behind using different methods that crime scene investigators commonly use.”
Since the data’s initial release, more than 1,000 research organizations from more than 90 countries have downloaded it. But it was not complete. Only about half of its fingerprints contained annotations — specific details about a print that offer a guide to evaluating the print’s quality. It is these annotations that make the database such a valuable teaching tool, because they show new examiners — and increasingly, AI — what to look for and what to avoid when evaluating a print.
Recently, experts went back and created annotations for the remainder of the prints. As with fingerprints gathered from actual crime scenes, the prints in the dataset vary widely in quality: In some spots, the lines left by a fingertip’s tiny, curving ridges are clear and unbroken, while in others these lines are smudged or incomplete. The annotations, which include regions that are color-coded to indicate different levels of print quality, will help educate humans and AI alike, Fiumara said.
“These images are good for classroom education, to teach examiners how to look for identifying features,” he said. “And they will also help teach AI algorithms where to look and how to weigh a feature’s importance. With this kind of training, a fingerprint evaluation algorithm will get better.”
For software developers as well as print examiners, the second resource in the release will provide additional value. NIST recently obtained software called LQMetric that was designed to assess the quality of fingerprints, but whose use was limited to U.S. law enforcement. Over the past year, NIST funded the conversion of the software to a version that would run on Mac, Windows or Linux systems, and then made it open source for anyone in the world to use. The newly reconfigured software, which NIST is calling OpenLQM, can function as a standalone program or be incorporated into other software like a plug-in.
“You give OpenLQM a fingerprint and it returns a number from 0-100 that is an assessment of the print’s quality,” Fiumara said. “It can help print assessors work more quickly, which is important in forensic science when you often have hundreds of prints to review from a crime scene. You want to help them separate out the prints that contain the highest level of detail. That’s where the software comes in.”
Both the dataset and the software have proved valuable to users.
“LQMetric software has been an invaluable asset,” said Anthony Koertner, a certified latent print examiner at the Department of the Army Criminal Investigation Division’s U.S. Army Criminal Investigation Laboratory. “It’s been pivotal in our efforts to achieve greater objectivity and reproducibility in latent print quality assessments. The open-source release, complemented by NIST Special Database 302, represents a significant advancement for the global forensic community. Together, they provide powerful new resources for practitioners and researchers to drive innovation and enhance collaboration in the field.”
Report: G. Fiumara, M. Schwarz, J. Heising, J. Peterson, K. Ko, P. Flanagan and K. Marshall. NIST Special Database 302: Annotated Latent Distal Phalanxes. NIST TN 2367. March 2026. DOI: 10.6028/NIST.TN.2367
