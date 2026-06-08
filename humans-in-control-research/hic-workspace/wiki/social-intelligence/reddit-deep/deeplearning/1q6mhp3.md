---
id: social-intelligence/reddit-deep/deeplearning/1q6mhp3.md
url: "https://www.reddit.com/r/deeplearning/comments/1q6mhp3/best_ways_to_explain_what_an_llm_is_doing/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Best ways to explain what an LLM is doing?"
author: "throwaway0134hdj"
date: "2026-01-07T17:58:44.000Z"
score: 4
upvote_ratio: 0.83
num_comments: 16
flair: ""
extracted_at: "2026-05-11T17:26:50.056Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c0"
    char_span: [0, 2341]
    sentence_count: 18
    key_terms: [self-attention, words, get, like, possible, sequence, encoder-decoder, output]
    token_count: 491
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c1"
    char_span: [2343, 2455]
    sentence_count: 3
    key_terms: [technology, describe, variants, thanks, works, bert, like]
    token_count: 23
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c2"
    char_span: [2470, 4932]
    sentence_count: 18
    key_terms: [element, attention, set, output, transformations, matrix, rubber, build]
    section: Comments
    token_count: 511
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c3"
    char_span: [4934, 6884]
    sentence_count: 9
    key_terms: [data, training, transformer, parameter, size, explanation, "it's", dimensions]
    section: Comments
    token_count: 445
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c4"
    char_span: [6886, 9229]
    sentence_count: 20
    key_terms: [scaling, learning, throwaway0134hdj, wahnsinnwanscene, meaning, understanding, intelligent, data]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c5"
    char_span: [8922, 9682]
    sentence_count: 7
    key_terms: [sentience, time, semblance, thought, data, "it's", self, differentiate]
    section: Comments
    token_count: 170
  - id: "social-intelligence/reddit-deep/deeplearning/1q6mhp3.md#c6"
    char_span: [9684, 10094]
    sentence_count: 3
    key_terms: [like, new, breakthroughs, architecture, intelligence, earthsworld, algorithms, currently]
    section: Comments
    token_count: 99
---
# Best ways to explain what an LLM is doing?

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1q6mhp3/best_ways_to_explain_what_an_llm_is_doing/)
Posted by **throwaway0134hdj** · **4↑** · **16 comments**

I come from a traditional software dev background and I am trying to get grasp on this fundamental technology. I read that ChatGPT is effectively the transformer architecture in action + all the hardware that makes it possible (GPUs/TCUs). And well, there is a ton of jargon to unpack. Fundamental what I’ve heard repeatedly is that it’s trying to predict the next word, like autocomplete. But it appears to do so much more than that, like being able to analyze an entire codebase and then add new features, or write books, or generate images/videos and countless other things. How is this possible?

 A google search tells me the key concepts “self-attention” which is probably a lot in and of itself, but how I’ve seen it described is that means it’s able to take in all the users information at once (parallel processing) rather than perhaps piece of by piece like before, made possible through gains in hardware performance. So all words or code or whatever get weighted in sequence relative to each other, capturing context and long-range depended efficiency. 

 Next part I hear a lot about it the “encoder-decoder” where the encoder processes the input and the decoder generates the output, pretty generic and fluffy on the surface though.

Next is positional encoding which adds info about the order of words, as attention itself and doesn’t inherently know sequence.

I get that each word is tokenized (atomic units of text like words or letters) and converted to their numerical counterpart (vector embeddings). Then the positional encoding adds optional info to these vector embeddings. Then the windowed stack has a multi-head self-attention model which analyses relationships b/w all words in the input. Feedforwards network then processes the attention-weighted data. And this relates through numerous layers building up a rich representation of the data. 

The decoder stack then uses self-attention on previously generated output and uses encoder-decoder attention to focus on relevant parts of the encoded input. And that dentures the output sequence that we get back, word-by-word.

I know there are other variants to this like BERT. But how would you describe how this technology works?

Thanks

## Comments

- **Round-Conversation30** (1↑): I would recommend watching Andrej Karpathy’s videos on his YouTube Channel. He gives a detailed run through how LLMs work.
- **BL4CK_AXE** (1↑): I’d spend a few hours on the “Attention is All You Need” paper to build some intuition that sticks. From what I’d articulate: 

Prior to transformers there were RNNs. These worked by stepping through each element of the input and building a hidden state/combined representation of all things prior. Theoretically this is enough, but it’s really slow for long sequences since each element depends on the prior entire hidden state to build representations. 

Transformers change this by representing each element as a weighted sum of all other elements and just build the final output as a set (matrix in practice), of each weighted element. I like to think of it like taking an element and putting different strength rubber bands between that element and every other element of the input, with some rubber bands having a large pull on a specific element and others almost none. The stronger the rubber band the more “attention” an element pays to another element. I’m not sure on this, but the attention isn’t  always both ways. Element x may attend greatly to element y but y may not attend as much to x. Importantly, this can be done in parallel, since the output for a given element is independent of output for other elements; it is solely a function of the input and the q,k,v transformations that build the attention matrix and the output. 

The transformations are pretty cool but I’ll minimally explain them. Basically the input is transformed into query view of the set a key view of the set and a value view of the set. Similarly scores between each element of the query and key sets are developed to produce an N x N attention score matrix (think nested for loop). Then a probability distribution is applied to each row to make it a right stochastic matrix M. This is essentially building the rubber band strengths I mentioned earlier. Finally the attention weights in M are applied properly to the value set V such that each element of the value set is the weighted sum of itself multiplied by the attention weight of all of the other elements in the set (going through the math/code is useful here). We also need 3 transformations q,k,v since we need two things to describe an interaction (q,k) and then we need to use those description to develop/scale the output (v).   

Additionally there are multiple head to add capacity, an MLP to provide non linear features building post the attention mechanism and positional encodings (read roformer paper for this if you’re really curious)

I am new to this stuff as well so please correct if wrong!
  - **Apart_Situation972** (1↑): that was a great explanation.
    - **BL4CK_AXE** (1↑): Actually? I’m building one rn so I’ve just been reading papers. 

Would you add or critique anything?
- **ibm** (1↑): We've got an explanation :) 

[https://youtu.be/5sLYAQS9sWQ](https://youtu.be/5sLYAQS9sWQ)
- **UndyingDemon** (0↑): One key concept, massive amounts of time, training on an incomprehensible amount of data, human generated text data, visual data, audio data, into the pretraining phase, with the help of the tokenizer and transformer. 

LLM have come a long way since their beginning, now reaching the trillion parameter zone and size for mainstream models like chatgpt. But I don't think people fully understand what parameter size is. Simply put it's the total size and dimensions that make up the model including, transformer layer sized, embedding dimensions and total data included in training. A large parameter count is simply an indication of how massive the training sample was, as well as know it's active knowledge base during Inference. 

The reason why these mainstream models seem so mystical and elegant in their use of language, that's almost as precise and on par with human dialogue, is due to that training size. 1000s if hours spent , via the Tokenizer embedding sequence, sub word, whole word, random number I'd, then the transformer reasons over all of it, making patterns and connections across all data. 

By the end, it's almost 95%+ range to accurately predict the vest, coherent and fluent response to any user query, and if it can't, it uses its inner data to make up an fantasy non factual yet highly plausible answer, known as hallucination.  

The engineering work that goes into it might seem amazing and impressive.  But even so at this scale, LLM still doesn't have a grounded or symbolic meaning or understanding of language at all. It has no idea what you say to it nor what it says back. This gap hasn't been sorted yet.
  - **throwaway0134hdj** (0↑): Yeah it’s a series of algorithms, but there is no genuine understanding or ghost in the machine here. Just the impressive feat of data, time, algorithms, hardware, and curations.
    - **UndyingDemon** (1↑): Exactly. And until they do it differently and give meaning and autonomous it shall remain as such, a simple chat bot tool
- **wahnsinnwanscene** (0↑): Before you delve deep into the weeds, you need to know that no one knows why it works too begin with. The same way as how there isn't an answer to how humans are intelligent, the same applies here.  The primary idea is there is a way of extracting signal from a set of seemingly unstructured data that is unannotated. This is self supervised learning. The next word prediction stems from research into cloze tasks where prediction of missing words in a sentence would provide signal for backpropagation. Combining everything into a wide and deep architecture meant all of a sudden models that could solve downstream tasks that weren't explicitly trained on.  This emergent behaviour plus improvements in the quadratic time complexity is the reason for the transformers success in the LLM.
  - **throwaway0134hdj** (0↑): Does that lead to AGI? Meaning if we keep scaling it up do you think we may see emergence of genuine sentience? Or sentient doesn’t appear through running a series of algos against static text.
    - **wahnsinnwanscene** (1↑): Scaling up is about increasing compute or data, but think about scaling out which is across modalities and embodiment. In some sense continual learning is this act of scaling. That's the area of research labs are headed towards. In a way deep learning has proven that anything with structure can organise others into a structure that can output a semblance of intelligent thought. Sentience on the other hand is kind of nebulous. There's a spark of it in papers about how models can choose to obfuscate its internal thought process and how it can differentiate between training and test time.  In way it's able to formulate an idea of a Self, though it could just be us projecting the beginnings of self awareness on the model behaviour. Be that as it may, given time whether it's a semblance of sentience or sentience itself might be a moot point.
    - **Apart_Situation972** (1↑): no it does not. LLMs are inherently flawed due to their mathematics. We have also basically used all of the world's internet data, and have been running off of synthetic data for a long time. 

Algorithms need greater intelligence with less resources to achieve that, so a new architecture is required. Currently, world models are the new runner up. But most likely 2 more major breakthroughs after that to have true AGI imo.
- **earthsworld** (-1↑): Good grief, it's like you all don't have a clue what is right in front of you...

>A google search

ASK GPT TO EXPLAIN IT TO YOU LIKE YOU'RE x YEARS OLD.
