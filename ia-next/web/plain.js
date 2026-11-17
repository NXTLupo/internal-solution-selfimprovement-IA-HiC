// Plain words for everything the system reports. The workspace never shows task ids, raw errors or pipeline
// terms in the main view; those stay behind a "Details" disclosure. Every function here returns text only.

export const KINDS = {
  research_report: {
    label: 'Report', noun: 'This report', ready: 'Report ready', icon: 'report',
    steps: ['Brief Lead', 'Research Lead', 'Analyst', 'Writer and Verifier'],
  },
  journey_map: {
    label: 'Journey map', noun: 'This journey map', ready: 'Journey map ready', icon: 'journey',
    steps: ['Journey Cartographer'],
  },
  deck: {
    label: 'Deck', noun: 'This deck', ready: 'Deck ready', icon: 'deck',
    steps: ['Deck Composer'],
  },
  social: {
    label: 'Reddit listening', noun: 'This Reddit analysis', ready: 'Reddit analysis ready', icon: 'social',
    steps: ['Social Collector', 'Social Analyst'],
  },
  transcript: {
    label: 'File analysis', noun: 'This file analysis', ready: 'Findings ready', icon: 'transcript',
    steps: ['Transcript Analyst'],
  },
  prototype: {
    label: 'Prototype', noun: 'This prototype', ready: 'Prototype ready', icon: 'prototype',
    steps: ['Prototyper'],
  },
};

export function kindOf(kind) {
  return KINDS[kind] || { label: 'Work', noun: 'This work', ready: 'Ready', icon: 'report', steps: [] };
}

export const STEP_INFO = {
  'Brief Lead': { does: 'Checks the brief', part: 'The brief check' },
  'Research Lead': { does: 'Finds and reads sources', part: 'The source search' },
  Analyst: { does: 'Pulls findings with exact quotes', part: 'The findings step' },
  'Writer and Verifier': { does: 'Writes the report; a second model checks it', part: 'The checking step' },
  'Journey Cartographer': { does: 'Maps the journey stage by stage', part: 'The mapping step' },
  'Deck Composer': { does: 'Writes and builds the slides', part: 'The slide-building step' },
  'Social Collector': { does: 'Collects Reddit posts and comments', part: 'The Reddit collection step' },
  'Social Analyst': { does: 'Groups posts into themes by sentiment', part: 'The theme step' },
  'Transcript Analyst': { does: 'Reads your files for quoted findings', part: 'The file-reading step' },
  Prototyper: { does: 'Builds and checks the clickable page', part: 'The building step' },
  'Media Producer': { does: 'Makes images and short video', part: 'The media step' },
};

// The studio roster shown on the home page.
export const ROSTER = ['Brief Lead', 'Research Lead', 'Analyst', 'Writer and Verifier', 'Journey Cartographer',
  'Deck Composer', 'Social Collector', 'Social Analyst', 'Transcript Analyst', 'Prototyper', 'Media Producer'];

// ---- states ----------------------------------------------------------------------------------------
export function stepState(node, taskStatus) {
  const ended = taskStatus === 'failed' || taskStatus === 'stopped';
  if (!node) return ended ? { key: 'skipped', word: 'Not started' } : { key: 'waiting', word: 'Waiting' };
  if (node.state === 'running') {
    return ended ? { key: 'failed', word: taskStatus === 'stopped' ? 'Stopped' : 'Did not finish' } : { key: 'working', word: 'Working' };
  }
  if (node.state === 'failed') return { key: 'failed', word: /stopped by you/i.test(node.error || '') ? 'Stopped' : 'Did not finish' };
  if (['available', 'published', 'acknowledged'].includes(node.state)) return { key: 'done', word: 'Done' };
  return { key: 'waiting', word: 'Waiting' };
}

export function taskState(status) {
  return {
    queued: { key: 'waiting', word: 'Waiting to start' },
    running: { key: 'working', word: 'Working' },
    stopping: { key: 'working', word: 'Stopping' },
    done: { key: 'done', word: 'Ready' },
    failed: { key: 'failed', word: 'Did not finish' },
    stopped: { key: 'failed', word: 'Stopped' },
  }[status] || { key: 'waiting', word: 'Waiting' };
}

export function isTerminal(status) { return status === 'done' || status === 'failed' || status === 'stopped'; }

// ---- titles --------------------------------------------------------------------------------------
function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

export function taskTitle(task, eng) {
  const b = task.brief || {};
  const engTitle = clean(eng && eng.title);
  const fromBrief = {
    research_report: b.goal, journey_map: b.persona, deck: b.audience, social: b.query && `Reddit: ${b.query}`,
    transcript: b.objective, prototype: b.experience,
  }[task.kind];
  return engTitle || clean(fromBrief) || kindOf(task.kind).label;
}

// The brands a deck renders in (ia_next/deck.py BRAND_NAMES; values from HiC's design system).
export const BRAND_NAMES = { nxt: 'NXT Humans', nu: 'Northeastern', deciem: 'DECIEM' };

export function taskDetail(task) {
  const b = task.brief || {};
  switch (task.kind) {
    case 'research_report': return b.audience ? `Report for ${lower1(b.audience)}` : 'Researched report';
    case 'journey_map': return b.persona ? `Journey map of ${lower1(b.persona)}` : 'Journey map';
    case 'deck': {
      const brand = BRAND_NAMES[b.brand || 'nxt'] || BRAND_NAMES.nxt;
      return `${b.audience ? `Deck for ${lower1(b.audience)}` : 'Editable deck'}, ${brand} brand`;
    }
    case 'social': {
      if (!b.query) return 'Reddit listening';
      const subs = (b.subreddits || []).map((s) => `r/${s}`).join(', ');
      return `Reddit listening on "${clean(b.query)}"${subs ? ` in ${subs}` : ''}`;
    }
    case 'transcript': return b.objective ? `File analysis: ${lower1(b.objective)}` : 'Analysis of your uploaded files';
    case 'prototype': return b.experience ? `Prototype of ${lower1(b.experience)}` : 'Clickable prototype';
    default: return '';
  }
}

const COMMON_FIRST = new Set(('managing partner partners student students first-year first career-services career chief head heads '
  + 'senior junior university college product marketing sales operations executive executives leaders leadership team teams '
  + 'board director directors manager managers recruiter recruiters people customers customer clients client analysts '
  + 'consultants mid-size small large retail hospital clinic bank regional new prospective current parents engineers '
  + 'designers founders investors owners staff employees members users buyers shoppers patients nurses teachers faculty '
  + 'advisors advisers deans heads vice global national local internal hiring talent finance procurement').split(' '));

function lower1(s) {
  s = clean(s);
  if (!s) return s;
  // Lower a leading capital only on common words ("Managing partner" -> "managing partner"); proper nouns
  // and acronyms ("Drexel students", "AI leads") keep their capital.
  const first = s.split(/\s/)[0].toLowerCase();
  return COMMON_FIRST.has(first) && /^[A-Z][a-z-]/.test(s) || /^(A|An|The)\s/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

// ---- outcomes ------------------------------------------------------------------------------------
function num(s, re) { const m = String(s || '').match(re); return m ? Number(m[1]) : null; }
function plural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }

// ---- a report's checks (enhancement plan B7) --------------------------------------------------------
// A report used to say "Ready" whatever its reviewer found (scores 0.30 to 0.79 under one green label). Three labels,
// set by thresholds on the reviewer's score and the open points, and every check in plain words.
const CHECK_RULES = {
  'em-dash': 'uses a banned dash character',
  slop: 'uses a stock phrase from the banned list',
  'quote-not-in-source': 'quotes words that are not in the cited source',
  'unknown-citation': 'cites a source that is not in the source list',
  'naked-number': 'states a number outside a quoted source',
};
export const CHECK_STRONG = 0.85;
export const CHECK_WEAK = 0.6;

export function checkLevel(v) {
  const failing = ((v && v.judge && v.judge.items) || []).filter((i) => !i.pass).length;
  const det = ((v && v.deterministic_findings) || []).length;
  const score = Number((v && v.score) || 0);
  const open = failing + det;
  if (score >= CHECK_STRONG && !open) return { key: 'done', word: 'Checks passed', open };
  if (score < CHECK_WEAK) return { key: 'failed', word: 'Needs your review', open };
  return { key: 'waiting', word: 'Points to review', open };
}

export function checkLines(v) {
  const out = [];
  for (const f of (v && v.deterministic_findings) || []) {
    const detail = clean(f.detail).slice(0, 160);
    out.push({ pass: false, text: `The report ${CHECK_RULES[f.rule] || 'breaks a writing rule'}${detail ? `: ${detail}` : ''}.` });
  }
  for (const i of (v && v.judge && v.judge.items) || []) out.push({ pass: !!i.pass, text: clean(i.criterion), why: clean(i.reason) });
  return out.sort((a, b) => Number(a.pass) - Number(b.pass));     // open points first
}

export function outcome(task) {
  const s = task.summary || '';
  switch (task.kind) {
    case 'research_report': {
      const f = num(s, /(\d+) findings?/), src = num(s, /from (\d+) sources?/), open = num(s, /(\d+) open verification/);
      if (f == null) break;
      let t = `${plural(f, 'finding')}${src != null ? ` from ${plural(src, 'source')}` : ''}, every quote checked against its source.`;
      if (open) t += ` The reviewing model flagged ${plural(open, 'point')} for a closer look.`;
      else if (open === 0) t += ' The reviewing model raised no open points.';
      return t;
    }
    case 'journey_map': {
      const st = num(s, /(\d+) stages?/), p = num(s, /(\d+) quoted pains?/);
      if (st == null) break;
      return `${plural(st, 'stage')}${p != null ? ` and ${plural(p, 'pain point')}` : ''}, each pain backed by a quote checked against its source.`;
    }
    case 'deck': {
      const sl = num(s, /(\d+) slides?/), q = num(s, /(\d+) verified quotes?/);
      if (sl == null) break;
      return `${plural(sl, 'slide')}${q != null ? ` with ${plural(q, 'quote')} checked against their sources` : ''}, ready to edit in PowerPoint.`;
    }
    case 'social': {
      const th = num(s, /(\d+) themes?/), p = num(s, /from (\d+) Reddit posts?/);
      if (th == null) break;
      return `${plural(th, 'theme')}${p != null ? ` from ${plural(p, 'Reddit post')}` : ''}, grouped by sentiment, with quotes checked against each post.`;
    }
    case 'transcript': {
      const f = num(s, /(\d+) findings?/), u = num(s, /from (\d+) uploaded/);
      if (f == null) break;
      return `${plural(f, 'finding')}${u != null ? ` from ${plural(u, 'uploaded file')}` : ''}, each with a quote checked against the file.`;
    }
    case 'prototype': {
      const f = num(s, /built from (\d+) findings?/);
      return f != null ? `A clickable page built from ${plural(f, 'finding')}, checked before it was saved.` : 'A clickable page, checked before it was saved.';
    }
    default: break;
  }
  return 'Ready to open.';
}

const REASONS = [
  [/stopped by you/i, { whole: 'You stopped it. What it had already written is kept.' }],
  [/no quotable evidence/i, { whole: 'The uploaded files hold no passage that can be quoted as evidence.' }],
  [/interrupted by a restart/i, { whole: 'The service restarted while this was running, so it stopped partway.' }],
  [/no finished research|run a research report first|has a done research/i, { whole: 'It needs a finished research report in the same engagement first.' }],
  [/budget|BudgetExceeded|spend limit|over the approved/i, { whole: 'It reached its spending limit before finishing.' }],
  [/brief is missing/i, { whole: 'The brief was missing details it needs.' }],
  [/no uploaded|has no uploaded/i, { whole: 'There are no uploaded files in this engagement yet.' }],
  [/credential|oauth|reddit_client/i, { whole: 'Reddit access is not set up on this system.' }],
  [/no JSON|JSONDecode|Expecting value|could not parse|not valid JSON/i, { part: 'could not read the {who} answer' }],
  [/\b(429|529|503)\b|rate.?limit|overloaded|unavailable/i, { part: 'could not reach the model provider, which was busy' }],
  [/timed? ?out|timeout|deadline/i, { part: 'took too long to answer' }],
  [/returned no result|returned nothing|empty report|empty reply/i, { part: 'came back empty' }],
];

export function failure(task) {
  const k = kindOf(task.kind);
  const raw = String(task.error || '');
  const failedNode = (task.nodes || []).find((n) => n.state === 'failed') || (task.nodes || []).find((n) => n.state === 'running');
  const nodeErr = String((failedNode && failedNode.error) || '');
  const text = `${raw} ${nodeErr}`;
  const part = failedNode ? (STEP_INFO[failedNode.specialist] || {}).part || 'One step' : 'One step';
  for (const [re, r] of REASONS) {
    if (!re.test(text)) continue;
    if (r.whole) return `${k.noun} did not finish. ${r.whole}`;
    const who = failedNode && failedNode.specialist === 'Writer and Verifier' ? "reviewer's" : "model's";
    return `${k.noun} did not finish. ${part} ${r.part.replace('{who}', who)}.`;
  }
  return `${k.noun} did not finish. ${part} stopped with an error.`;
}

// The request that re-runs a task, sent to the agent with the task's engagement focused.
export function retryRequest(task) {
  const b = task.brief || {};
  switch (task.kind) {
    case 'research_report': return `Run this research report again with the same brief: ${clean(b.goal)}${b.audience ? ` Audience: ${clean(b.audience)}.` : ''}`;
    case 'journey_map': return `Map this journey again: ${clean(b.persona)}.${b.scope ? ` Scope: ${clean(b.scope)}` : ''}`;
    case 'deck': return `Make the deck again for ${lower1(b.audience) || 'the same audience'}.`;
    case 'social': return `Run the Reddit analysis again for "${clean(b.query)}"${(b.subreddits || []).length ? ` in ${b.subreddits.map((s) => 'r/' + s).join(', ')}` : ''}.`;
    case 'transcript': return `Analyze the uploaded files in this engagement again: ${clean(b.objective)}`;
    case 'prototype': return `Build this prototype again: ${clean(b.experience)}`;
    default: return 'Please run that again.';
  }
}

// ---- what to do next -----------------------------------------------------------------------------
// send: true runs it at once (cheap questions); otherwise the prompt fills the composer for review.
export function nextAfterTask(task) {
  const b = task.brief || {};
  const aud = lower1(b.audience) || 'the main audience';
  switch (task.kind) {
    case 'research_report': return [
      { label: 'Map the journey', text: 'Map the journey of the main audience in this engagement from the research findings.' },
      { label: 'Make a deck', text: `Make a deck from this research for ${aud}.` },
      { label: 'Build a prototype', text: 'Build a clickable prototype that responds to the findings in this research.' },
      { label: 'Refresh it weekly', text: 'Refresh this research every week and tell me what changed.' },
    ];
    case 'journey_map': return [
      { label: 'Make a deck', text: 'Make a deck from the research and journey map in this engagement.' },
      { label: 'Prototype the fix', text: 'Build a clickable prototype that removes the biggest pain point in this journey.' },
      { label: 'Make a cover image', text: 'Make a cover image for this journey map.' },
    ];
    case 'deck': return [
      { label: 'Make a cover image', text: 'Make a cover image for this deck.' },
      { label: 'Make an opening clip', text: 'Make a 6-second opening video clip for this deck.' },
      { label: 'Build a prototype', text: 'Build a clickable prototype from the findings in this engagement.' },
    ];
    case 'social': return [
      { label: 'Test against published sources', text: 'Write a cited research report that tests these Reddit themes against published sources.' },
      { label: 'Listen every week', text: 'Run this Reddit analysis every week and tell me what changed.' },
      { label: 'Build a prototype', text: 'Build a clickable prototype that answers the frustrations in these posts.' },
    ];
    case 'transcript': return [
      { label: 'Write a report', text: 'Write a cited report from the findings in my uploaded files.' },
      { label: 'Map the journey', text: 'Map the journey described in my uploaded files.' },
      { label: 'Make a deck', text: 'Make a deck from the findings in my uploaded files.' },
    ];
    case 'prototype': return [
      { label: 'Make a cover image', text: 'Make a cover image that shows this experience in use.' },
      { label: 'Try a simpler version', text: 'Build a second version of this prototype with a simpler first screen.' },
    ];
    default: return [];
  }
}

export function nextAfterMedia(kind) {
  return kind === 'video'
    ? [{ label: 'Make a still image', text: 'Make a still image in the same style as this video.' }]
    : [{ label: 'Make another version', text: 'Make another version of this image with a different setting.' },
      { label: 'Turn it into a short clip', text: 'Make a 6-second video clip in the same style as this image.' }];
}

const STARTERS = [
  { label: 'Show my recent work', text: 'Show my recent work', send: true },
  { label: 'What can you do?', text: 'What can you do?', send: true },
  { label: 'What do you remember about me?', text: 'What do you remember about me?', send: true },
];

export function nextAfterReply(rec, asked) {
  const tools = new Set((rec.chips || []).map((c) => c.tool));
  const out = [];
  if (rec.tasks && rec.tasks.length && [...tools].some((t) => /^start_|analyze_uploads/.test(t))) {
    out.push({ label: 'How is it going?', text: 'How is that work going?', send: true });
  }
  if (tools.has('list_engagements')) out.push({ label: 'Open the latest report', text: 'Show me the latest finished report.', send: true });
  if (tools.has('remember')) out.push({ label: 'What do you remember?', text: 'What do you remember about me?', send: true });
  for (const s of STARTERS) {
    if (out.length >= 3) break;
    if (s.text.toLowerCase() === String(asked || '').trim().toLowerCase()) continue;
    if (!out.some((o) => o.text === s.text)) out.push(s);
  }
  return out.slice(0, 3);
}

// ---- tool activity -------------------------------------------------------------------------------
const TOOL_WORDS = {
  start_research_report: ['Started a research report', 'Could not start the report'],
  start_journey_map: ['Started a journey map', 'Could not start the journey map'],
  start_deck: ['Started a deck', 'Could not start the deck'],
  rebrand_deck: ['Re-rendered the deck in a new brand at no cost', 'Could not change the deck brand'],
  revise_slide: ['Revised one slide; the others are unchanged', 'Could not revise the slide'],
  start_social_analysis: ['Started Reddit listening', 'Could not start Reddit listening'],
  analyze_uploads: ['Started reading your files', 'Could not read your files'],
  start_prototype: ['Started a prototype', 'Could not start the prototype'],
  generate_image: ['Made an image', 'Could not make the image'],
  generate_video: ['Made a video', 'Could not make the video'],
  task_status: ['Checked progress', 'Could not check progress'],
  stop_task: ['Asked the work to stop', 'Could not stop the work'],
  retry_task: ['Started the work again with the same budget', 'Could not start the work again'],
  read_report: ['Read the finished work', 'Could not open the work'],
  recall: ['Searched memory and evidence', 'Could not search memory'],
  remember: ['Saved to memory', 'Could not save to memory'],
  forget: ['Removed from memory', 'Could not remove from memory'],
  send_email: ['Prepared an email', 'Could not prepare the email'],
  list_engagements: ['Looked up your work', 'Could not look up your work'],
  schedule_task: ['Set up a schedule', 'Could not set up the schedule'],
};

export function toolChip(tool, out) {
  out = out || {};
  const [ok, bad] = TOOL_WORDS[tool] || ['Used a tool', 'A tool did not work'];
  if (out.approval === 'pending') return { tool, text: 'Asked for your approval', tone: 'ask' };
  if (out.approval === 'denied') return { tool, text: 'Not done: you declined it', tone: 'muted' };
  if (out.needs_confirmation) return { tool, text: 'Checked with you before paying for new research', tone: 'ask' };
  if (out.error) return { tool, text: bad, tone: 'bad' };
  if (out.started === false) return { tool, text: 'Found the same work already under way', tone: 'ok' };
  return { tool, text: ok, tone: 'ok' };
}

// Live events seen while the agent is answering.
export function eventChip(ev) {
  const d = ev.data || {};
  switch (ev.kind) {
    case 'engagement_created': return `Opened an engagement: ${clean(d.title).slice(0, 80)}`;
    case 'task_queued': return `Handed ${article(kindOf(d.kind).label)} to the studio`;
    case 'approval_requested': return 'Asked for your approval';
    case 'image_generated': return 'Made an image';
    case 'video_generated': return 'Made a video';
    case 'schedule_created': return 'Set up a schedule';
    case 'source_uploaded': return 'Added a file';
    default: return null;
  }
}

function article(label) { return (/^[aeiou]/i.test(label) ? 'an ' : 'a ') + label.toLowerCase(); }

// ---- approvals -----------------------------------------------------------------------------------
const TOOL_NAMES = {
  start_research_report: 'a research report', start_social_analysis: 'Reddit listening', start_journey_map: 'a journey map',
  start_deck: 'a deck', start_prototype: 'a prototype', analyze_uploads: 'an analysis of your files',
  generate_image: 'an image', generate_video: 'a video',
};

export function approvalText(a, threshold) {
  let args = {};
  try { args = JSON.parse(a.args_json || '{}'); } catch { args = {}; }
  const limit = `Your limit for one piece of work without approval is ${Number(threshold || 3).toFixed(2)} USD.`;
  switch (a.tool) {
    case 'start_research_report':
      return { title: 'Approve a research report budget', what: clean(args.goal) || clean(args.engagement_title),
        cost: `Budget ${Number(args.budget_usd || 0).toFixed(2)} USD. ${limit}` };
    case 'start_social_analysis':
      return { title: 'Approve a Reddit listening budget', what: `Posts about "${clean(args.query)}"`,
        cost: `Budget ${Number(args.budget_usd || 0).toFixed(2)} USD. ${limit}` };
    case 'generate_video': {
      const est = (String(a.reason || '').match(/about ([\d.]+) USD/) || [])[1];
      return { title: `Approve a ${args.seconds || ''}-second video`.replace('a -second', 'a'), what: clean(args.prompt),
        cost: est ? `About ${est} USD. Video always asks first.` : 'Video always asks first.' };
    }
    case 'create_schedule':
      return { title: 'Approve scheduled work', what: `${cap1(TOOL_NAMES[args.tool] || 'this work')}, ${interval(args.every_minutes)}`,
        cost: 'Each run is paid for separately and follows the same budget rules.' };
    case 'send_email':
      return { title: `Approve sending an email to ${clean(args.to)}`, what: clean(args.subject), cost: 'Nothing leaves the system without your approval.' };
    case 'retry_task':
      return { title: 'Approve trying the work again', what: 'The same request, with the same budget as before.',
        cost: `${clean(a.reason)}.` };
    case 'evaluate_skill':
      return { title: 'Approve a test of new writing instructions', what: 'The new instructions are compared with the current ones on past work.', cost: '' };
    default:
      return { title: 'Approve this action', what: clean(a.reason), cost: '' };
  }
}

function cap1(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

export function interval(min) {
  const m = Number(min || 0);
  if (!m) return 'on a schedule';
  if (m % 10080 === 0) return m === 10080 ? 'every week' : `every ${m / 10080} weeks`;
  if (m % 1440 === 0) return m === 1440 ? 'every day' : `every ${m / 1440} days`;
  if (m % 60 === 0) return m === 60 ? 'every hour' : `every ${m / 60} hours`;
  return `every ${m} minutes`;
}

export function scheduleName(tool) {
  return cap1(TOOL_NAMES[tool] || 'Scheduled work').replace(/^A |^An /, '');
}

// ---- small formatters ----------------------------------------------------------------------------
export function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.round(s / 3600); return `${h} hour${h === 1 ? '' : 's'} ago`; }
  if (s < 172800) return 'yesterday';
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function duration(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function usd(v) { return `${Number(v || 0).toFixed(2)} USD`; }

export function modelName(id) {
  const s = String(id || '');
  const parts = s.split('-');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^\d+(\.\d+)?$/.test(p) && /^\d+$/.test(parts[i + 1] || '') && !/\./.test(p)) { out.push(`${p}.${parts[i + 1]}`); i++; continue; }
    out.push(p === 'gpt' ? 'GPT' : p[0] ? p[0].toUpperCase() + p.slice(1) : p);
  }
  return out.join(' ');
}

// Remove internal ids from model text before it is shown; the person never needs them.
export function scrubIds(text) {
  return String(text || '')
    // "(task task_ab12...)" and "(engagement id eng_...)" go whole: the noun before the id is part of the label
    .replace(/\s?[([`]\s*(?:(?:task|engagement|approval|schedule|conversation|step|label)\s+(?:id\s+)?)?(task|eng|appr|sched|conv|node|label)_[0-9a-f]{8,}\s*[)\]`]/gi, '')
    .replace(/\b(?:task|engagement|approval|schedule|step)\s+(?:id\s+)?(?=(task|eng|appr|sched|node)_[0-9a-f]{8,}\b)/gi, '')
    // an id inside a path ("/api/tasks/task_ab12.../view") is part of a working link, never rewritten
    .replace(/(?<![/\w])(task|eng|appr|sched|conv|node)_[0-9a-f]{8,}\b/g, (m) => ({ task: 'the task', eng: 'the engagement', appr: 'the approval', sched: 'the schedule', conv: 'this conversation', node: 'that step' }[m.split('_')[0]]))
    .replace(/\s*\u2014\s*/g, ', ');
}

export function memoryEntry(raw) {
  const m = String(raw).match(/^(.*?)\s*\(source:\s*([^,)]+),\s*(\d{4}-\d{2}-\d{2})\)\s*$/s);
  if (!m) return { text: String(raw).replace(/^-\s*/, ''), meta: '' };
  const where = { conversation: 'from a conversation', workspace: 'from the workspace', reviewer: 'noted by the memory check' }[m[2].trim()] || '';
  const date = new Date(m[3] + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return { text: m[1].replace(/^-\s*/, ''), meta: `Saved ${date}${where ? ', ' + where : ''}` };
}

export function engagementTitleFromFile(name) {
  const base = String(name || 'Uploaded files').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (base ? base[0].toUpperCase() + base.slice(1) : 'Uploaded files').slice(0, 80);
}
