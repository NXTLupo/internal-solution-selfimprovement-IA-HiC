# The HiC second brain in the IA Next Library (26 Nov 2026)

Owner's goal: "The original Humans in Control has over $1000 worth of collected data in its wiki/manifest (second
brain) that is gone from the new IA Next Local Library. Audit the HiC second brain, wiki, and manifest, and then I want
an intelligent migration of those data ... following our NEW AND IMPROVED chunking and indexing and retrieval
workflows (spotting opportunities to improve our current system based on what you find in your audit of HiC, which
was NOT perfect, so don't break our current system with prior defects or un-optimized approach). I WANT ALL PRIOR
DATA IN My LIBRARY, selectable for engagements, chunked, tagged, manifest indexed, recallable by the AI chat, usable as
source material for deliverables and artifacts, browsable, cited, and linked back to source articles and
documentation. I want it all neat, tidy, organized." Then: "If the full text was never stored, I want you to use IA
Next to find and restore ALL of those data", "I want deep crawling where HiC may have stopped at a doorway/landing
page, instead of finding links to download full pdfs, or read full articles", and "everything hinges on that value
proposition of deep research".

## What the audit of HiC found

Read-only audit of `humans-in-control-research/hic-workspace/wiki` (25,983 files, 24,551 pages, 2.66 GB), its manifest
and its chunk store. Scan output: scratch `scan.jsonl`.

- The store HiC searches (`.vectors.local-768.db`, all-mpnet-base-v2, 768 dimensions) held 25,786 pages and 124,649
  chunks, but 1,724 of those pages were deleted from disk, 27 were engagement JSON files, and 4,832 pages disagreed
  with their own chunk lists (13,578 chunks could never be cited; 4,035 pointers had no vector).
- The embedder reads 384 tokens; 59.5% of chunks were longer, so their tails were never embedded. The embedded text
  carried no title, publisher or date. The search took the 4,096 nearest of 124,649 vectors and filtered afterwards,
  so duplicates and model-written pages filled the window. The duplicate check keyed on a field no record carried.
- 4,894 pages duplicated another by address (4,690 Reddit posts stored twice); client uploads were 1,080 pages for 195
  documents; about 21,000 vectors were identical.
- 1,197 articles were capped at 10,000 characters and 980 were 500-character snippets: the full text was never stored.
- 55 bot walls, error and paywall pages, 119 navigation-boilerplate pages, 111 near-empty pages; 1,210 pages without a
  date and 32 with dates in forms nothing parsed; 146 publishers spelled two ways; 82 pages with damaged characters.
- 1,787 pages were written by HiC's own models (insights, theme syntheses, compile and lint reports, focused research)
  and sat in the same index as collected evidence; 51 Gemini pages had a model's summary for text and a domain for a
  title.
- The chunker cut 512-token windows mid-sentence and mid-word and merged chunks across sections.

## What the migration does instead (hicmigrate.py, librarysearch.py, chunking.py, pagetext.py)

Rebuilt from the pages on disk, never from HiC's vectors. The old wiki is mounted read-only at `/hic-wiki`.

1. Import: each page is labelled (article, Reddit post, client document, transcript, HiC analysis, reference);
   operational pages (engagement state, lint and compile reports, design notes) and alias pages stay in HiC. Text is
   cleaned (reader preambles, repeated title and source lines, link markup, damaged characters). Dates become ISO, a
   date written as midnight UTC keeping its day; one spelling per publisher. Duplicates collapse on the canonical
   address (https, no www, no tracking parameters, Reddit hosts merged) or, for documents, on the text; a collected
   copy always wins over a model's summary, and every copy's path and project is kept as provenance. Each page is
   stored whole in the Library (no 12,000 or 10,000 character cap) with tags (industries, subreddit, project) and its
   link in the site's own form without tracking parameters (199 migrated links carried utm_ parameters; the tidy phase
   cleans rows already written and moves their restore record with them).
2. Passages: every page, and every source IA Next collects from now on, is cut by `chunking.py`: whole paragraphs to
   about 1,400 characters, a heading starts a passage and stays with its text, long paragraphs split only at sentence
   ends with one sentence of overlap, never a cut inside a word, a short tail joins only its own section.
3. Vectors: qwen3-embedding (local, 1024 dimensions, window far longer than a passage), with the page's title,
   publisher and date in front of every passage. Search fuses full-text (BM25) and meaning (cosine over every vector,
   numpy) by reciprocal rank, filters kind and period before cutting the list, and lets no page fill more than two
   places. Model-written pages and reference notes are browsable but never returned as evidence.
4. Restore: every collected article with a real address is read again by the deep reader: the page's main text with
   its paragraphs (trafilatura), a PDF read whole (PyMuPDF), and a doorway page (landing page, abstract, teaser)
   followed to the PDF or article behind it. The fresh text replaces the stored one only when it is the same document
   and clearly more of it, or the stored one was junk; a Gemini summary becomes a real article when its page is read.
   Every outcome is recorded (restored, kept, failed, with the reason and the document actually read).
5. Deep crawling past doorways (owner's crawling guide, 26 Nov). What the guide asks and what IA Next does:
   - a headless browser for JavaScript pages and click-through gates: the reader container (`reader/`, Chromium via
     Playwright) opens a page the plain fetch could not read (refused with 401, 403 or 5xx, unreachable, no text, a
     script-built shell, or a doorway that led nowhere), presses a cookie, age or disclaimer gate's accept button and
     returns the rendered page; each page gets a fresh context, so no cookies are kept. It does not scroll: on
     Insurance Journal, scrolling loaded the site's next story and the extractor kept that one, so a rendering is
     now kept only when its text itself carries the page title's words;
   - no bypass: a bot check or CAPTCHA (Cloudflare "Just a moment", "Robot Challenge Screen") is reported with its
     reason, never got past; no stealth user agent; a 404 or a 429 (slow down) never goes to the browser;
   - depth control: depth two, inside a budget of five addresses per page (a press release's "full report" link to a
     report page, and that page's PDF); a second-level link is followed only when it is a PDF or on the same site;
   - link filtering: home pages and section indexes give only their declared PDF; a listing gives only PDF links; a
     followed article must share at least 40% of the landing title's words, so a "read more" that lands on a sponsored
     post or another story is dropped;
   - separate HTML and PDF paths: PDFs are read whole with PyMuPDF's block reader, paragraphs kept and hyphenated line
     ends mended. A layout-aware converter (pymupdf4llm) was measured on a 17-page arXiv paper: 25.6 s against 0.2 s,
     for nearly the same text, so bulk restoring keeps the block reader;
   - safety: the reader refuses every private, loopback and link-local address and every single-label host, so a page
     it opens cannot reach IA Next or anything else on this machine; it holds no keys and no volume and publishes no
     port.
   A retry phase sends the articles the first restore could not improve (refused by the site, or a doorway that led to
   a different page) through the new path once; a missing page and a page already tried in a browser are not retried.
   Measured on the first pages: DemandSphere's model-release timeline gave 432 characters to a plain fetch and 28,949
   once the reader accepted its consent notice; Forbes, Civil Eats and AgCanada show bot checks and stay as they were.

Where it lands: the Library (filters for kind, collection, project, period, pack, publisher; the reader shows where a
page came from, whether its full text was restored and from which document, what it was collected for, and that a
model-written page is not a source); "Add to this engagement" brings a page with its passages, so builders read it
whole and cite its passages, and it is never archived into HiC again; the chat's recall searches the Library first
(HiC only when the Library has nothing); research runs reuse Library articles inside their period; a `lib/...#cN`
citation resolves on this machine.

Improvements to IA Next itself found on the way: research runs now read pages with the deep reader (paragraphs kept,
PDFs read, doorways followed; the old reader kept menus and footers and collapsed every paragraph); the full-text
index now follows updates and deletions (it only followed inserts); the Library's search by meaning compares every
passage in one matrix product (it compared each page's opening in a Python loop); dates written as midnight UTC no
longer move to the previous day; "06/02/2026" and "2026/10/05" parse.

## Results

(filled in when the run finishes)
