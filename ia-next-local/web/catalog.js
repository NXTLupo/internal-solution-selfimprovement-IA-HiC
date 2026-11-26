/* What IA Next can do, in one place (2026-11-19 information architecture pass). The home page, the composer's Make
   menu and the composer coaching all read this catalog, so a capability added here appears everywhere at once.

   Each item's `ask` is a request template. Words in [brackets] are slots: the composer selects the first one, Tab
   moves to the next, and a message is not sent while a slot is still unfilled. */

export const CAPS = [
  {
    id: 'gather', step: '01', group: 'Gather evidence',
    note: 'Every quote is checked against the page or file it came from.',
    items: [
      { id: 'research', icon: 'report', title: 'Researched report', label: 'Research', short: "A cited report from data packs, publications and the web", tag: '',
        desc: 'Searches HiC data packs, publications you name and the web, then writes a cited report that a second model reviews.',
        who: 'Research Lead, Analyst, Writer and Verifier',
        ask: 'Write a researched, cited report on [topic] for [audience]' },
      { id: 'reddit', icon: 'social', title: 'Reddit listening', label: 'Reddit', short: "Themes and sentiment from a subreddit", tag: '',
        desc: 'Themes and sentiment from a subreddit, each theme with quotes from the posts.',
        who: 'Social Collector, Social Analyst',
        ask: 'What are people on r/[subreddit] saying about [topic]?' },
      { id: 'files', icon: 'transcript', title: 'Your files', label: 'Your files', short: "Quotes from your transcripts and documents", tag: '', attach: true,
        desc: 'Findings with exact quotes and speakers from transcripts, notes, documents and audio you add.',
        who: 'Transcript Analyst',
        ask: 'Analyze the uploaded files in this engagement' },
    ],
  },
  {
    id: 'make', step: '02', group: 'Make a deliverable',
    note: 'Built from the evidence in the engagement you focus.',
    items: [
      { id: 'deck', icon: 'deck', title: 'Slide deck', label: 'Slide deck', short: "An editable PowerPoint in three brands", tag: '',
        desc: 'An editable PowerPoint with conclusion titles and checked quotes, in the NXT, Northeastern or DECIEM brand.',
        who: 'Deck Composer',
        ask: 'Make a slide deck from this engagement for [audience]' },
      { id: 'journey', icon: 'journey', title: 'Journey map', label: 'Journey map', short: "One persona's journey, stage by stage", tag: '',
        desc: "One persona's journey, stage by stage, with pain points quoted from the evidence.",
        who: 'Journey Cartographer',
        ask: 'Map the journey of [persona] from this engagement' },
      { id: 'themes', icon: 'social', title: 'Themes', label: 'Themes', short: "The themes in your material, each with a quote", tag: 'themes',
        desc: 'The themes in the material, each named and backed by a verbatim quote.',
        who: 'Analyst',
        ask: 'Find the themes in this engagement #themes' },
      { id: 'picture', icon: 'image', title: 'Mind map or infographic', label: 'Mind map', short: "A mind map or infographic from checked passages", tag: 'mindmap',
        desc: "Drawn by HiC's renderer. Every label rests on a passage checked word for word.",
        who: 'Information Designer',
        ask: 'Draw a mind map of [subject] from this engagement #mindmap' },
      { id: 'table', icon: 'grid', title: 'Data table', label: 'Data table', short: "Things the sources name, compared, with a CSV", tag: 'datatable',
        desc: 'The organizations, systems or programs the sources name, by the attributes you choose, with a CSV download.',
        who: 'Table Analyst',
        ask: 'Build a table of the [things] named in this engagement, with [attributes] #datatable' },
      { id: 'audio', icon: 'transcript', title: 'Audio overview', label: 'Audio', short: "A two-voice overview with a cited transcript", tag: 'audio',
        desc: 'A two-voice deep dive, brief, critique or debate with a cited transcript. The voices ask first.',
        who: 'Audio Producer',
        ask: 'Make a short audio overview of this engagement #audio',
        also: { label: 'Or a debate between two views', ask: 'Make a debate audio overview of [the main recommendation] #podcast' } },
      { id: 'prototype', icon: 'prototype', title: 'Clickable prototype', label: 'Prototype', short: "A clickable page shaped by the findings", tag: '',
        desc: 'A working page you can click through, shaped by the findings and checked before it is saved.',
        who: 'Prototyper',
        ask: 'Build a clickable prototype of [product] for [audience]' },
      { id: 'image', icon: 'image', title: 'Images', label: 'Image', short: "A photograph or illustration for a cover or slide", tag: '',
        desc: 'Documentary-style photographs or clean illustrations for covers and slides, never with text in them.',
        who: 'Media Producer',
        ask: 'Make a cover image of [scene]' },
      { id: 'video', icon: 'video', title: 'Short video clip', label: 'Video', short: "A short clip with sound; asks for approval first", tag: '',
        desc: 'A 3 to 15 second clip with sound. It always asks for your approval before it is made.',
        who: 'Media Producer',
        ask: 'Make a 6-second clip of [scene]' },
      { id: 'docs', icon: 'report', title: 'Documents', label: 'Documents', short: "A PRD, roadmap, personas and 15 more kinds", tag: 'prd', docs: true,
        desc: "A PRD, roadmap, strategy, personas, service blueprint or one of 13 more from HiC's artifact studio.",
        who: 'HiC artifact studio',
        ask: 'Write a product requirements document for [product] from this engagement #prd' },
    ],
  },
  {
    id: 'keep', step: '03', group: 'Keep it going',
    note: 'Paid, outgoing and repeating work always asks first.',
    items: [
      { id: 'schedule', icon: 'schedule', title: 'Scheduled watch', label: 'Schedule', short: "Re-run research or listening and see what changed", tag: '',
        desc: 'Re-run a report or Reddit listening on a schedule and see what changed.',
        ask: 'Refresh my latest research every Monday and tell me what changed' },
      { id: 'memory', icon: 'memory', title: 'Memory', label: 'Memory', short: "What IA Next remembers about you", tag: '', panel: 'memory',
        desc: 'Tell IA Next what to remember about you and your work. See it or forget it at any time.',
        ask: 'Remember that [something about you or your work]',
        also: { label: 'Ask what it remembers', ask: 'What do you remember about me?', send: true } },
      { id: 'email', icon: 'mail', title: 'Email a result', label: 'Email', short: "Send finished work; asks for approval first", tag: '',
        desc: 'Send finished work to someone by email, after you approve the message.',
        ask: 'Email [the finished work] to [address]' },
    ],
  },
];

/** Steering options a capability's panel offers (moved here from the old Studio tiles, 2026-11-19, so making things
    lives in one place). Each field is [name, choices] or [name, null, placeholder] for free text; `ask` turns the
    chosen values into the request that lands in the message box. */
const lower = (s) => String(s || '').toLowerCase();
export const OPTIONS = {
  deck: { fields: [['style', ['Detailed', 'Presenter']], ['brand', ['NXT', 'Northeastern', 'DECIEM']]],
    ask: (o) => `Make a ${lower(o.style)} slide deck in the ${o.brand} brand from this engagement for [audience]` },
  audio: { fields: [['format', ['Deep dive', 'Brief', 'Critique', 'Debate']], ['length', ['Default', 'Short', 'Long']]],
    ask: (o) => `Make a ${o.length === 'Default' ? '' : `${lower(o.length)} `}${lower(o.format)} audio overview of this engagement ${o.format === 'Debate' ? '#podcast' : '#audio'}` },
  picture: { fields: [['kind', ['Mind map', 'Infographic']], ['orientation', ['Landscape', 'Portrait', 'Square']], ['detail', ['Standard', 'Concise', 'Detailed']]],
    ask: (o) => (o.kind === 'Mind map' ? 'Draw a mind map of [subject] from this engagement #mindmap'
      : `Make a ${lower(o.orientation)} infographic (${lower(o.detail)} detail) of [subject] from this engagement #infographic`) },
  table: { fields: [['compare', null, 'What should it compare? (optional)']],
    ask: (o) => `Build a table of the [things] named in this engagement, ${o.compare ? `comparing ${o.compare}` : 'with [attributes]'} #datatable` },
  prototype: { fields: [['for', null, 'Who is it for? (optional)']],
    ask: (o) => `Build a clickable prototype of [product] for ${o.for || '[audience]'}` },
};

/** HiC's artifact studio kinds (ia_next/artifacts.py KINDS, without the mind map, which has its own item). */
export const DOCS = [
  ['prd', 'Product requirements'], ['roadmap', 'Roadmap'], ['recommendations', 'Recommendations'],
  ['strategy', 'Strategy'], ['brief', 'Executive brief'], ['blueprint', 'Service blueprint'], ['personas', 'Personas'],
  ['competitive', 'Competitive analysis'], ['gap', 'Gap analysis'], ['arch', 'Architecture map'], ['org', 'Org chart'],
  ['tech-audit', 'Technology audit'], ['case-study', 'Case study'], ['report', 'Report'], ['whitepaper', 'White paper'],
  ['explainer', 'Explainer'], ['heuristic-ux', 'Heuristic UX review'], ['research-plan', 'Research plan'],
  ['studyguide', 'Study guide'], ['faq', 'FAQ'], ['chronology', 'Timeline'], ['flashcards', 'Flashcards'], ['quiz', 'Quiz'],
];

/** The words for a document kind inside a sentence: "a product requirements document", "an executive brief". */
const NOUNS = { prd: 'product requirements document', 'heuristic-ux': 'heuristic UX review', 'tech-audit': 'technology audit' };
const PLURAL = new Set(['recommendations', 'personas', 'flashcards']);         // "Write personas", never "a personas"
export function docNoun(id, label) {
  const noun = NOUNS[id] || label.toLowerCase();
  if (PLURAL.has(id)) return noun;
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

export function docAsk(id, label) {
  return `Write ${docNoun(id, label)} from this engagement for [audience] #${id}`;
}

/** Worked requests for the "How to ask" figure: the four parts a good request names. */
export const ASK_PARTS = ['What you want', 'About', 'For whom', 'From which data'];
export const ASK_EXAMPLES = [
  { label: 'A deck', parts: ['Make a slide deck', 'on how regional banks use AI chatbots', 'for the chief operating officer',
    'from my uploads and the Financial Services data pack'] },
  { label: 'Reddit', parts: ['Find the themes and sentiment', 'in what students say about AI tools', "for the provost's office",
    'on r/NEU since September'] },
  { label: 'A document', parts: ['Write a #prd', 'for a co-op advising assistant', 'for the product team',
    'from the interviews in this engagement'] },
];

/** Composer coaching: what the request asks for, and whether it names an audience and its data. */
const OUTPUTS = [
  [/\b(deck|slides?|powerpoint|pptx)\b/i, 'a slide deck', true],
  [/#(prd|roadmap|recommendations|strategy|brief|blueprint|personas|competitive|gap|arch|org|tech-audit|case-study|whitepaper|explainer|heuristic-ux|research-plan)\b|\b(requirements document|roadmap|personas?|service blueprint|competitive analysis|gap analysis|case study|white ?paper|explainer|org chart|executive brief)\b/i, 'a document', true],
  [/\bjourney\b/i, 'a journey map', false],
  [/#mindmap|#diagram|#infographic|\b(mind ?map|infographic|diagram|flowchart)\b/i, 'a picture', false],
  [/#datatable|\b(data )?table\b/i, 'a data table', false],
  [/#audio|#podcast|\b(audio overview|podcast)\b/i, 'an audio overview', false],
  [/\bprototype\b/i, 'a prototype', true],
  [/#themes|\bthemes?\b/i, 'themes', false],
  [/\b(research(ed)? report|cited report|research)\b/i, 'research', true],
  [/\b(report|briefing)\b/i, 'a report', true],
  [/\b(image|photo|picture of|video|clip)\b/i, 'media', false],
];
const AUDIENCE = /\bfor (the |a |an |my |our |our team'?s? )?[a-z]{3,}/i;
const DATA = /\br\/[a-z0-9_]{2,}|\breddit\b|\b(upload(s|ed)?|my files|attached|transcripts?|interviews?|data packs?|pack|sources?|survey)\b/i;
const ENGAGEMENT = /\b(this|the) engagement\b/i;                    // counts only with an engagement in focus
const PUBLICATION = /\b(in|from) [A-Z][\w&]+ [A-Z][\w&]+/;          // "in Higher Ed Dive": case matters here

export function coach(text) {
  const t = String(text || '');
  if (t.trim().length < 8) return null;
  const hit = OUTPUTS.find(([re]) => re.test(t));
  if (!hit) return null;
  return { what: hit[1], wantsAudience: hit[2], audience: AUDIENCE.test(t), data: DATA.test(t) || PUBLICATION.test(t),
           engagementRef: ENGAGEMENT.test(t) };
}
