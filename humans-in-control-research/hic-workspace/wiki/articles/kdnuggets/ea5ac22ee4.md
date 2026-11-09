---
id: articles/kdnuggets/ea5ac22ee4.md
url: "https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization"
url_hash: "ea5ac22ee4"
kind: "article"
source: "KDnuggets"
title: "Constraining Output Space for SLM Narrow Automation Optimization"
author: ""
date: "Thu, 13 Aug 2026 12:00:17 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-08-13T17:04:51.056093+00:00"
chars: 10000
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
collected_at: "2026-08-13T17:04:51.341Z"
relevance: 40
engagement_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
content_hash: "e9ac05c0e1e195c4"
relevance_by_goal: {"bb7e192171b3":40}
chunks:
  - id: "articles/kdnuggets/ea5ac22ee4.md#c0"
    char_span: [0, 2420]
    sentence_count: 13
    key_terms: [constraining, output, automation, constraining-output-space-small-language-model-narrow-automation-optimization, optimization, space, narrow, model]
    concepts: [constraining, output, automation, optimization, space]
    token_count: 484
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
  - id: "articles/kdnuggets/ea5ac22ee4.md#c1"
    char_span: [2423, 3577]
    sentence_count: 11
    key_terms: [answer, billing, fallback, generate, account, forward, asking, tokens]
    concepts: [answer, billing, fallback, generate, account]
    token_count: 227
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
  - id: "articles/kdnuggets/ea5ac22ee4.md#c2"
    char_span: [3580, 5727]
    sentence_count: 3
    key_terms: [tokenizer, time, model, tickets, import, prompt, ticket, automodelforcausallm]
    concepts: [tokenizer, automodelforcausallm, model, tickets, import]
    related_chunks: ["articles/kdnuggets/ea5ac22ee4.md#c5"]
    token_count: 512
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
  - id: "articles/kdnuggets/ea5ac22ee4.md#c3"
    char_span: [5418, 7243]
    sentence_count: 1
    key_terms: [tickets, label, predictions, output, print, unparseable, generation, free-form]
    concepts: [tickets, predictions, label, output, unparseable]
    related_chunks: ["articles/kdnuggets/ea5ac22ee4.md#c6"]
    token_count: 512
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
  - id: "articles/kdnuggets/ea5ac22ee4.md#c4"
    char_span: [6960, 7319]
    sentence_count: 1
    key_terms: [technical, constraining, execution, entirety, settings, whenever, address, billing]
    concepts: [technical]
    token_count: 80
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
  - id: "articles/kdnuggets/ea5ac22ee4.md#c5"
    char_span: [7322, 9503]
    sentence_count: 2
    key_terms: [logits, label, torch, tokenizer, model, import, labels, ticket]
    concepts: [logits, label, torch, tokenizer, automodelforcausallm]
    related_chunks: ["articles/kdnuggets/ea5ac22ee4.md#c2"]
    token_count: 512
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
  - id: "articles/kdnuggets/ea5ac22ee4.md#c6"
    char_span: [9243, 10195]
    sentence_count: 1
    key_terms: [predictions, logits, confidence, output, label, print, probs, confidences]
    concepts: [predictions, confidence, logits, output, confidences]
    related_chunks: ["articles/kdnuggets/ea5ac22ee4.md#c3"]
    token_count: 255
    sources: [{"n":"KDnuggets","u":"https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization","kind":"article","date":"2026-08-13"}]
---
# Constraining Output Space for SLM Narrow Automation Optimization

Source: [KDnuggets](https://www.kdnuggets.com/constraining-output-space-small-language-model-narrow-automation-optimization)

Constraining Output Space for SLM Narrow Automation Optimization
This article will kick off a series on narrow automation optimization for SLMs, and as the first entry will cover one of the more most useful techniques for doing so: constraining the output space instead of parsing generated text.
 
So much of the attention in applied AI goes to frontier-scale reasoning; however, a large share of the actual production workload necessity in industry is far less glamorous: narrow automation. Tasks that fall into this category include properly routing a support ticket, extracting a field from a form, tagging a document, and flagging a record for human review. These tasks all have common characteristics: constrained input, a fixed output space, and enormous call volume. They are also exactly the types of tasks that are well-suited to small language models (SLMs). A model that fits comfortably on one GPU, or is even CPU-bound, and is able to return an answer in milliseconds can often be the correct engineering choice over an API call to a large language model (LLM) that could cost a thousand times more per item.
The trouble is that teams tend to carry frontier-model habits over to small models. They write long conversational prompts and let the model generate free-form text before hunting through it with regular expressions. They call the model once at a time from inside a Python loop. Against a local SLM, these types of inefficiencies are accentuated: when a single forward pass takes ten milliseconds, everything you wrap around that forward pass becomes the bottleneck; loose output handling turns directly into measurable error rates.
This article will kick off a series on narrow automation optimization for SLMs, and as the first entry will cover one of the more most useful techniques for doing so: constraining the output space instead of parsing generated text.
To set a level playing field, all benchmarks below use Qwen2.5-0.5B-Instruct in float16 through Hugging Face Transformers, running on an M2 Macbook Air with 24GB RAM and a 16-core Neural Engine.
First, setup a Python environment and install your requirements:
pip install torch transformers accelerate
# Why Constraining the Output Space?
 
A classification task has a fixed answer set. If you are routing tickets into billing, technical, or account, there are exactly three valid outputs and no others. Yet the standard pattern is to ask the model to write the answer, generate a handful of tokens, and then search the resulting string for something recognizable.
This fails in two ways simultaneously. First, it is slow: generate() runs one sequential forward pass per output token, so asking for eight tokens costs roughly eight times the compute of asking for the answer directly. Second, it is unreliable: a small model will happily reply with "Sure! This looks like a billing issue.", or "Billing/Account", or a category you never defined. Every one of those responses requires either a fallback rule or a retry, and every fallback rule is a place for error accumulation.
The fix is to stop generating and start scoring. Run one forward pass, read the model's next-token distribution, and restrict your decision to the token IDs of your candidate labels. The answer becomes impossible to get wrong structurally, and you get a calibrated confidence score as a byproduct.
# Parsing Free Text
 
Here is the naive version, generating free text and parsing it after the fact. Save it to file and run it from the command line.
import os
import time
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
torch.set_num_threads(os.cpu_count() or 1)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, dtype=torch.float32)
model.eval()
# our toy data to classify (600 records)
LABELS = ["billing", "technical", "account"]
tickets = [
    "My card was charged twice for the same invoice.",
    "The mobile app crashes whenever I open the settings page.",
    "I need to change the email address on my profile.",
] * 200
def build_prompt(ticket):
    messages = [
        {
            "role": "system",
            "content": "You classify support tickets. Answer with exactly one of: billing, technical, account.",
        },
        {"role": "user", "content": f"Ticket: {ticket}\nCategory:"},
    ]
    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
# nothing constrains the output here, so we let the model write a short answer and search it for a label (tokens++)
# each new token costs its own forward pass, and one ticket per call means no batching to amortize that (time++)
prompts = [build_prompt(t) for t in tickets]
predictions = []
# time inference
start = time.time()
for n, prompt in enumerate(prompts, start=1):
    # this loop runs for minutes on CPU, so report progress rather than sitting silent
    if n % 50 == 0:
        rate = (time.time() - start) / n
        print(f"  {n}/{len(prompts)} tickets ({rate:.2f}s each)", flush=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=8,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
    # generate() returns prompt + continuation, so slice the prompt off before decoding
    generated = output[0, inputs["input_ids"].shape[1] :]
    text = tokenizer.decode(generated, skip_special_tokens=True).strip().lower()
    # substring match against the label list
    predictions.append(next((label for label in LABELS if label in text), "UNPARSED"))
duration = time.time() - start
# output task metrics
print(f"Free-form generation took: {duration:.2f} seconds")
print(f"Unparseable outputs: {predictions.count('UNPARSED')} / {len(predictions)}")
# sample of inference output
for ticket, label in zip(tickets[-3:], predictions[-3:], strict=True):
    print(f"{ticket} -> {label}")
Output:
Loading weights: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 290/290 [00:01<00:00, 263.89it/s]
  50/600 tickets (0.19s each)
  100/600 tickets (0.19s each)
  150/600 tickets (0.19s each)
  200/600 tickets (0.19s each)
  250/600 tickets (0.19s each)
  300/600 tickets (0.19s each)
  350/600 tickets (0.19s each)
  400/600 tickets (0.19s each)
  450/600 tickets (0.19s each)
  500/600 tickets (0.19s each)
  550/600 tickets (0.19s each)
  600/600 tickets (0.19s each)
Free-form generation took: 134.01 seconds
Unparseable outputs: 0 / 600
My card was charged twice for the same invoice. -> billing
The mobile app crashes whenever I open the settings page. -> technical
I need to change the email address on my profile. -> technical
While the the entirety of the batch came back in a shape the parser could handle, we will note the 134 second execution time.
# Constraining the Output Space
 
Now let's try a constrained version, which scores the label set directly from a single forward pass:
import os
import time
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
torch.set_num_threads(os.cpu_count() or 1)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.float32)
model.eval()
# our toy data to classify (600 records)
LABELS = ["billing", "technical", "account"]
tickets = [
    "My card was charged twice for the same invoice.",
    "The mobile app crashes whenever I open the settings page.",
    "I need to change the email address on my profile.",
] * 200
def build_prompt(ticket):
    messages = [
        {
            "role": "system",
            "content": "You classify support tickets. Answer with exactly one of: billing, technical, account.",
        },
        {"role": "user", "content": f"Ticket: {ticket}\nCategory:"},
    ]
    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
# prompt ends with "<|im_start|>assistant\n", so the model's next token starts the label
# comparing the logits of each label's FIRST token is enough to pick a winner, provided those first tokens are distinct
label_first_ids = [tokenizer.encode(label, add_special_tokens=False)[0] for label in LABELS]
assert len(set(label_first_ids)) == len(LABELS), (
    "Labels share a first token; score full label sequences instead (see notes)."
)
label_first_ids = torch.tensor(label_first_ids, device=model.device)
# one forward pass per ticket, no generation loop: the decision contained entirely in the next-token logits
prompts = [build_prompt(t) for t in tickets]
predictions = []
confidences = []
# time inference
start = time.time()
for prompt in prompts:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.inference_mode():
        logits = model(**inputs).logits[0, -1, :]
    # softmax over just the label logits, so the probabilities sum to 1 across the candidates
    probs = torch.softmax(logits[label_first_ids].float(), dim=-1)
    best = int(probs.argmax())
    predictions.append(LABELS[best])
    confidences.append(float(probs[best]))
duration = time.time() - start
# output task metrics
print(f"Constrained scoring took: {duration:.2f} seconds")
print(f"Unparseable outputs: {predictions.count('UNPARSED')} / {len(predictions)}")
# sample of inference output
for ticket, label, confidence in zip(
    tickets[-3:], predictions[-3:], confidences[-3:], strict=True
):
    print(f"{ticket} -> {label} (confidence {confidence:.3f})")
Output:
Loading weights: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 290/290 [00:01<00:00, 285.60it/s]
Constrained scori
