# Anti-Slop Rules for Slide Content

These rules apply to EVERY slide field across EVERY template.

## 1. Titles-as-quotes are FORBIDDEN

A quote is a sentence pulled from the BODY of an article, transcript, or post — not the headline, article title, or webpage title.

### Characteristics of REAL quotes
- Contains verbs in running prose: "We saw co-op placements fall 40% year-over-year"
- Often starts mid-thought, uses casual/specific language, includes numbers or names
- Length ≥40 chars, typically 80-200

### What a TITLE looks like (REJECT as a quote)
- Title case ("The Best Alumni Management Software Solutions in 2026")
- Starts with a noun phrase acting as headline
- No verb, or no concrete subject
- Appears word-for-word as the article's `Title:` field

### The check
Before placing any string into `evidence` / `quotes[].text` / `pullQuote.text`:
- Does this text appear as the `Title:` line of any chunk in the corpus, the WIKI ARCHIVE MENU, or the TOPIC-MATCHED ARTICLE BODIES block?
- If yes → REJECT and find a real body sentence instead.
- If the body is not in context → fetch it via `fetch_wiki_articles`, or pick a different evidenced quote. NEVER write `EVIDENCE GAP`, `Evidence Gap`, `TBD`, or any QA-style annotation in any user-facing field — the slide reader is an executive, not a QA reviewer.

## 2. Preferred sources for quotes (in priority order)

1. TOPIC-MATCHED ARTICLE BODIES (pre-fetched wiki bodies scoped to this question) — first pick
2. DEEP ARTICLE BODIES (wiki-extracted article text) — second pick
3. Reddit / social post BODY TEXT visible in the corpus — third pick
4. Academic abstract BODY (not title) — fourth pick
5. NEVER: the article title line, the `Title:` field of a chunk, a URL slug

## 3. Meta-narration ban (consulting-deliverable patterns)

Never use any of these in ANY output field:

- "Good morning" / "Good afternoon" / "Good evening"
- "Welcome to" / "Thank you for being here" / "Thank you for joining"
- "Today we will" / "Today we'll" / "We will present" / "We are going to"
- "We now move to" / "We are now entering" / "Let us now examine"
- "This is where we" / "In this section" / "In this presentation" / "In this deck"
- "As you can see" / "This slide shows" / "The next slide"
- "Our objective is to" / "Allow me to" / "Before we begin"
- "I'd like to start by" / "Let's dive into" / "Let's explore"

A consultant NEVER announces the framework, greets the audience, or narrates the structure. Lead with the insight.

## 4. Video-intro meta-narration (transcript-specific)

When quoting from a YouTube/webinar/podcast transcript, the `cleanTranscriptQuote()` renderer utility strips these patterns automatically, but the AI should still avoid selecting quotes whose substantive content is exhausted by:

- "So, let's dive into the four strategies that will..."
- "In today's video / webinar / episode / session..."
- "Hey everyone / hello folks / welcome back to..."
- "Thanks so much for joining / tuning in / watching..."
- "I'm going to walk you through..."
- "Make sure to subscribe / hit the like button / smash that like"
- "If you liked this video / see you in the next one"
- Webinar housekeeping: "This session is being recorded", "Drop your questions in chat", "If you need to step away..."

If a candidate quote becomes empty after cleaning, pick a DIFFERENT quote from the same source rather than rendering nothing.

## 5. Whisper disfluency patterns (stripped, not banned)

The cleaner strips these WITHIN a surviving sentence — you do not need to avoid quoting passages that contain them:

- Filler words: `um`, `uh`, `er`, `erm`, `ah`, `hmm`
- Repeated-word stutters: `the the`, `and and`, `a a`, `to to`
- Conversational glue that became filler: `, you know,`, `, I mean,`
- Mid-sentence restart markers: `. .`, `. ..`
- Leading "And so" / "And then" / "So then" at sentence start

Example input: `"we're um we're feeding uh America and and feeding Pennsylvania"`
Cleaned output: `"we're feeding America and feeding Pennsylvania"`

## 6. Corpus meta-commentary ban

A slide must NEVER describe the research corpus itself. Your job is to describe the SUBJECT (a company, person, institution, market), not the data apparatus we used to research it.

### FORBIDDEN on every slide, every field, every template
- "Within this corpus..." ✗ "The external corpus contains..."
- "In the corpus..." ✗ "The broader corpus..."
- "The strongest quantified outcome available in the corpus"
- "The clearest vendor source..." ✗ "The only named case..."
- "Most vendor evidence is..." ✗ "Our dataset shows..."
- "Evidence is scarce in this corpus" ✗ "Supporting evidence in the same vendor cluster"
- "The research corpus..." ✗ "Based on our collection..."

These phrases are ALWAYS a sign evidence was thin and the scaffold got filled with meta-commentary instead of subject content.

### When evidence IS thin, the correct move
1. Use FEWER slides than planned (drop a slide rather than fake it), AND
2. Tighten the surviving slides to claims that ARE evidenced. NEVER write "EVIDENCE GAP", "Evidence Gap", "TBD", or any QA-style annotation in any user-facing field — the slide reader is an executive, not a QA reviewer.

### Case-study specifically
Challenge / approach / outcome MUST name the subject and describe THEIR situation, not what we found in our sources.

- WRONG: "The corpus contains few named higher-ed cases with hard numbers"
- RIGHT: "Wyoming's advancement team needed to convert wealth ratings into readiness signals without expanding headcount"

### Block-quote specifically
- `quote.text` must be a VERBATIM passage ≥40 chars
- `quote.attribution` must be a real person, organization, or publication — NEVER "Customer story title", "Source title", "Headline", or the article's title

## 7. Banned slop phrases (350+ — instant rejection)

### Corporate clichés (high severity)
paradigm shift, game-changer, holistic approach, cutting-edge, best-in-class, leverage synergies, robust solution, seamless integration, actionable insights, thought leadership, value proposition, core competency, move the needle, circle back, deep dive, low-hanging fruit, synergy, ecosystem, disruptive, innovative solution

### AI slop (high severity)
in today's rapidly evolving landscape, it's important to note, it's worth noting, it should be noted, needless to say, at the end of the day, the reality is, the fact of the matter, when it comes to, in terms of, with respect to, as we navigate, in this ever-changing, the landscape of

### Hedge words (medium severity)
it seems, perhaps, it's possible, may or may not, to some extent, in some ways, arguably, potentially, conceivably, it could be said

### Filler phrases (medium severity)
moving forward, going forward, at this point in time, in the current climate, as we move forward, looking ahead, on a go-forward basis, at the present time

### False profundity
fundamental shift, seismic shift, unprecedented, transformative, revolutionary, groundbreaking, trailblazing, world-class

## 8. Action titles beat topic labels (every slide, every title field)

Every slide title MUST be a complete sentence stating a conclusion with data.

- BAD: "The Landscape", "Key Findings", "Recommendations", "The Path Forward"
- GOOD: "35% of first-year students do not return, costing $9B annually"
- GOOD: "Fragmented CRM systems force advancement teams to spend 40% of time on manual data entry"

**The Partner Test**: A senior partner reading ONLY slide titles must understand the complete argument.

## 9. Output rules (plain text only)

No `**bold**`, `*italic*`, `# headers`, or markdown in generated content. The rendering system handles formatting.

### No fabrication, no QA annotations
- Never invent author names, statistics, or institution names
- Never fabricate chart data or benchmarks
- If data doesn't exist for a chart, use a stat callout instead
- If a claim cannot be evidenced, omit the claim and tighten the slide around what IS evidenced. NEVER write "EVIDENCE GAP", "Evidence Gap", "TBD", or any meta-annotation in any user-facing field.

### Prose over lists
- Prioritize narrative prose over bulleted lists
- Use bulleted lists only when the schema explicitly requires arrays
- Each paragraph should weave 2-3 different sources showing convergent evidence

## 10. External intelligence diversity (mandatory)

The research corpus contains TWO categories:
- **UPLOADED CLIENT DOCUMENTS** (3-10 PDFs) — organizational context
- **EXTERNAL INTELLIGENCE** (~200 articles from academic, news, government, social sources) — primary evidence base

Rules:
- At least 50% of themes must cite external intelligence sources
- At least 30% of ALL citations must come from external sources
- Uploaded documents provide CONTEXT — external sources provide EVIDENCE
- If most citations reference the same 4-5 uploaded PDFs, the deliverable is FAILING
- The validation hook WILL REJECT output dominated by client documents

### Identifying source types
- **Uploaded client docs**: filenames like `*.pdf`, `*.txt` (e.g. "CLR Project Charter.txt", "Northeastern Assessment Final Report.pdf")
- **External intelligence**: platform names like "Higher Ed Dive", "Reddit", "OpenAlex", "ERIC", "Federal Register", "Hechinger Report", "arXiv", "NIST"
