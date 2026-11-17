// IA Next workspace. Vanilla ES module, no framework.
// Security rules kept everywhere below:
//  - every piece of model, web or upload text is set with textContent (the h() helper), or rendered through
//    renderMarkdown, which escapes HTML first; innerHTML is only ever assigned renderMarkdown output;
//  - a prototype is only ever shown through /api/tasks/{id}/view, the server's wrapper page, which loads the
//    prototype document in its own iframe sandboxed to allow-scripts (no same-origin). The wrapper itself is
//    server-written HTML and is framed here without a sandbox, because the prototype's CSP
//    (frame-ancestors 'self') refuses to render under an opaque-origin ancestor. Journey maps, decks and
//    social exhibits (no scripts) are framed with an empty sandbox. No model-written page ever gets
//    same-origin rights.
import { renderMarkdown } from './md.js';
import * as P from './plain.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (sel, root = document) => root.querySelector(sel);

// ---- diagrams in replies (16 Nov audit: #diagram and #mindmap printed raw Mermaid) ---------------------------
// md.js turns a ```mermaid block into <pre class="mermaid"> (escaped text). The bundled Mermaid library is loaded
// only when such a block appears, runs with securityLevel "strict", and draws each block once it is in the page.
// A block that will not draw shows its source instead of an empty frame.
let mermaidReady = null;
function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/static/vendor/mermaid.min.js';
      s.onload = () => {
        window.mermaid.initialize({
          startOnLoad: false, securityLevel: 'strict', theme: 'base',
          themeVariables: { primaryColor: '#EBF7F8', primaryBorderColor: '#115054', primaryTextColor: '#141414',
            lineColor: '#115054', secondaryColor: '#F4F4EF', tertiaryColor: '#FFFFFF', fontFamily: 'Archivo, Arial, sans-serif' },
          flowchart: { curve: 'basis', htmlLabels: false },
        });
        resolve(window.mermaid);
      };
      s.onerror = () => { mermaidReady = null; reject(new Error('mermaid did not load')); };
      document.head.append(s);
    });
  }
  return mermaidReady;
}
const PENDING_DIAGRAM = 'pre.mermaid:not([data-processed]):not([data-drawing])';
async function drawDiagrams() {
  const nodes = [...document.querySelectorAll(PENDING_DIAGRAM)];
  if (!nodes.length) return;
  nodes.forEach((n) => n.setAttribute('data-drawing', ''));
  let m;
  try { m = await loadMermaid(); } catch { nodes.forEach((n) => n.closest('.md-diagram')?.classList.add('md-diagram--failed')); return; }
  for (const n of nodes) {
    try { await m.run({ nodes: [n] }); }
    catch { n.closest('.md-diagram')?.classList.add('md-diagram--failed'); }
  }
}
new MutationObserver(() => { if (document.querySelector(PENDING_DIAGRAM)) drawDiagrams(); })
  .observe(document.documentElement, { childList: true, subtree: true });

// ---- small helpers -------------------------------------------------------------------------------
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'md') el.innerHTML = renderMarkdown(v);       // escaped by the renderer
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function icon(name, cls = '') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', `ic ${cls}`.trim());
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', `#i-${name}`);
  s.append(u);
  return s;
}

// The presence mark: the agent (core) with its studio of specialists (satellites).
function presenceEl({ live = false, dark = false, still = false, state = 'idle' } = {}) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 64 64');
  s.setAttribute('class', `presence${dark ? ' presence--dark' : ''}${still ? ' presence--static' : ''}`);
  s.setAttribute('aria-hidden', 'true');
  s.dataset.state = state;
  if (live) s.dataset.live = '1';
  const mk = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  s.append(mk('circle', { class: 'orbit', cx: 32, cy: 32, r: 22 }));
  const g = mk('g', { class: 'sats' });
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * Math.PI / 180;
    const c = mk('circle', { class: 'sat', cx: (32 + 22 * Math.cos(a)).toFixed(2), cy: (32 + 22 * Math.sin(a)).toFixed(2), r: 3.3 });
    c.style.setProperty('--i', String(i));
    g.append(c);
  }
  s.append(g, mk('circle', { class: 'core', cx: 32, cy: 32, r: 9.5 }));
  return s;
}

class ApiError extends Error {
  constructor(status, body) { super(String(body || '')); this.status = status; }
}

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.json !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.json); }
  let r;
  try { r = await fetch(path, init); } catch (e) { throw new ApiError(0, e.message); }
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await r.json().catch(() => ({})) : await r.text();
  if (!r.ok) throw new ApiError(r.status, typeof body === 'string' ? body : (body.detail || JSON.stringify(body)));
  return body;
}

const LS = {
  get(k, d) { try { const v = localStorage.getItem(`ianext.${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`ianext.${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(`ianext.${k}`); } catch { /* storage unavailable */ } },
};

let toastTimer = null;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
}

function plural(n, one, many) { return `${n} ${n === 1 ? one : (many || `${one}s`)}`; }
function isView(url) { return typeof url === 'string' && /^\/api\/engagements\/[A-Za-z0-9_-]+\/files\/results\/(images|videos)\/[A-Za-z0-9_.-]+$/.test(url); }

// ---- state ---------------------------------------------------------------------------------------
const saved = LS.get('conv', null);
const S = {
  conv: saved && saved.id ? saved.id : null,
  items: saved && Array.isArray(saved.items) ? saved.items : [],
  focus: LS.get('focus', null),
  engs: [], engById: new Map(),
  tasks: [], full: new Map(),
  approvals: [], threshold: 3,
  digest: null, digestIds: { key: '', finished: [], failed: [] },
  spend: null, media: new Map(),
  busy: false, lastEvent: 0, liveBox: null,
  rated: LS.get('rated', {}),
  notes: LS.get('notes', []),
  showHidden: !!LS.get('showHidden', false),
  hiddenCount: 0,
  recentSig: '', engSig: '', bandSig: '',
  reports: new Map(),
};

// The conversation is kept in this browser and on the server, so a past conversation can be reopened from any
// browser and the agent can pick it up after a restart (Part 1: past conversations could not be reopened).
let remoteSave = null;
function saveConversation() {
  LS.set('conv', { id: S.conv, items: S.items.slice(-60) });
  if (!S.conv) return;
  clearTimeout(remoteSave);
  const cid = S.conv;
  const items = S.items.slice(-60);
  remoteSave = setTimeout(() => {
    api(`/api/conversations/${encodeURIComponent(cid)}/items`, { method: 'PUT', json: { items } }).catch(() => { /* kept locally */ });
  }, 1200);
}

async function reopenConversation(cid) {
  try {
    const c = await api(`/api/conversations/${encodeURIComponent(cid)}`);
    S.conv = c.id;
    S.items = Array.isArray(c.items) ? c.items : [];
    LS.set('conv', { id: S.conv, items: S.items.slice(-60) });
    closeSheet();
    if (S.items.length) renderThread(); else showView();
    updateConvCost();
    $('#input').focus();
  } catch {
    toast('That conversation could not be opened.');
  }
}

// ---- notes for the agent (enhancement plan B6) ------------------------------------------------------
// Things that happen in the workspace outside the conversation (an upload that failed, an approval decided on a card,
// work that finished or was stopped, a video made after approval) ride with the next message, so the agent never
// analyses another file after a refused upload or says nothing was made when a video is ready.
function noteForAgent(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!t) return;
  S.notes = [...(S.notes || []), t].slice(-8);
  LS.set('notes', S.notes);
}

const PAGE_OPENED = Date.now() / 1000 - 5;      // server event times are seconds; a little slack for clock skew

// Media made in the background joins the saved conversation, so it is still there after a reload.
function addMediaItem(kind, view, label) {
  if (!isView(view)) return;
  if (S.items.some((i) => i.type === 'agent' && i.rec && (i.rec.media || []).some((m) => m.view === view))) return;
  pushItem({ type: 'agent', rec: { reply: '', chips: [{ tool: 'media', text: label, tone: 'ok' }], tasks: [], approvals: [],
    media: [{ kind, view }], work: [], changed: [], raw: '' } });
  noteForAgent(`${label}: ${view.split('/files/')[1]}`);
}

// ---- watchers: every visible task card and work card follows its task ----------------------------
const watchers = new Map();          // task id -> Set of { el, paint, born }

function watch(tid, el, paint) {
  if (!watchers.has(tid)) watchers.set(tid, new Set());
  watchers.get(tid).add({ el, paint, born: Date.now() });
  const t = S.full.get(tid);
  if (t) paint(t);
  else fetchTask(tid);
}

const inflight = new Map();
function fetchTask(tid) {
  if (inflight.has(tid)) return inflight.get(tid);
  const p = api(`/api/tasks/${encodeURIComponent(tid)}`)
    .then((t) => { setTask(t); return t; })
    .catch((e) => { if (e.status === 404) dropWatchers(tid); return null; })
    .finally(() => inflight.delete(tid));
  inflight.set(tid, p);
  return p;
}

// A finished task changed in place (a deck re-rendered in another brand): forget the cached copy, let every card
// showing it repaint, and fetch it again.
function refreshTask(tid) {
  S.full.delete(tid);
  document.querySelectorAll(`[data-task="${CSS.escape(tid)}"]`).forEach((el) => { delete el.dataset.painted; });
  return fetchTask(tid);
}

function dropWatchers(tid) {
  for (const w of watchers.get(tid) || []) {
    if (w.el.isConnected && w.el.classList.contains('task')) {
      w.el.replaceChildren(h('p', { class: 'task__outcome', text: 'This work is no longer available.' }));
    }
  }
  watchers.delete(tid);
}

function setTask(t) {
  const prev = S.full.get(t.id);
  S.full.set(t.id, t);
  const set = watchers.get(t.id);
  if (set) {
    for (const w of [...set]) {
      if (!w.el.isConnected && Date.now() - w.born > 8000) { set.delete(w); continue; }
      w.paint(t);
    }
  }
  if (prev && !P.isTerminal(prev.status) && P.isTerminal(t.status)) onTaskFinished(t);
  updateRoster();
  updatePresence();
}

async function pollTasks() {
  const ids = new Set();
  for (const [tid, set] of watchers) {
    const t = S.full.get(tid);
    if (set.size && (!t || !P.isTerminal(t.status))) ids.add(tid);
  }
  for (const row of S.tasks) if (!P.isTerminal(row.status)) ids.add(row.id);
  await Promise.all([...ids].map(fetchTask));
}

function onTaskFinished(t) {
  const k = P.kindOf(t.kind);
  const how = t.status === 'done' ? 'finished' : t.status === 'stopped' ? 'was stopped by the person' : 'did not finish';
  noteForAgent(`${k.label} [${t.id}] ${how}${t.status === 'done' && t.summary ? `: ${t.summary}` : t.error ? `: ${t.error}` : ''}`);
  toast(t.status === 'done' ? `${k.ready}: ${P.taskTitle(t, S.engById.get(t.engagement_id))}` : P.failure(t));
  refreshAll();
}

// ---- presence and status ---------------------------------------------------------------------------
function runningTasks() {
  const ids = new Set();
  for (const row of S.tasks) if (!P.isTerminal(row.status)) ids.add(row.id);
  for (const t of S.full.values()) {
    if (!P.isTerminal(t.status)) ids.add(t.id);
    else ids.delete(t.id);
  }
  return ids.size;
}

// What this conversation has cost so far: its answers plus the work it started (the Today chip is studio-wide).
function updateConvCost() {
  let usd = 0;
  const ids = new Set();
  for (const it of S.items) {
    if (it.type !== 'agent') continue;
    usd += Number(it.usd) || 0;
    for (const id of (it.rec && it.rec.started) || []) ids.add(id);
  }
  for (const id of ids) {
    const t = S.full.get(id) || S.tasks.find((x) => x.id === id);
    usd += Number(t && t.spent_usd) || 0;
  }
  const box = $('#convCost');
  if (!box) return;
  box.hidden = !S.items.length;
  $('#convCostUsd').textContent = P.usd(usd);
}

function updatePresence() {
  updateConvCost();
  const n = runningTasks();
  const state = S.busy ? 'thinking' : n ? 'working' : 'idle';
  document.querySelectorAll('.presence[data-live]').forEach((p) => { p.dataset.state = state; });
  $('#statusWord').textContent = S.busy ? 'Thinking' : n ? `Working on ${plural(n, 'task')}` : 'Ready';
  const heroState = $('#heroState');
  if (heroState) heroState.textContent = S.busy ? 'Thinking about your message.' : n ? `The studio is working on ${plural(n, 'task')}.` : 'Ready when you are.';
}

function updateRoster() {
  const live = new Set();
  for (const t of S.full.values()) {
    if (t.status !== 'running') continue;
    for (const n of t.nodes || []) if (n.state === 'running') live.add(n.specialist);
  }
  document.querySelectorAll('.roster__item').forEach((li) => { li.dataset.live = live.has(li.dataset.specialist) ? '1' : '0'; });
}

function tickClocks() {
  const now = Date.now() / 1000;
  document.querySelectorAll('[data-since]').forEach((el) => { el.textContent = P.duration(now - Number(el.dataset.since)); });
}

// ---- rail: engagements and focus ----------------------------------------------------------------
function renderRail() {
  const counts = new Map();
  for (const t of S.tasks) counts.set(t.engagement_id, (counts.get(t.engagement_id) || 0) + 1);
  const sig = JSON.stringify([S.focus, S.showHidden, S.hiddenCount, S.engs.map((e) => [e.id, e.title, e.hidden, counts.get(e.id) || 0])]);
  if (sig === S.engSig) return;
  S.engSig = sig;
  const list = $('#engList');
  // C6: engagements made by automated checks, or hidden by the person, stay out of the list until asked for
  const toggle = S.hiddenCount ? h('li', null, h('button', {
    class: 'englist__toggle', type: 'button', 'aria-pressed': String(!!S.showHidden),
    onclick: () => { S.showHidden = !S.showHidden; LS.set('showHidden', S.showHidden); refreshEngagements(); },
    text: S.showHidden ? 'Leave out hidden engagements' : `Show ${plural(S.hiddenCount, 'hidden engagement', 'hidden engagements')}`,
  })) : null;
  if (!S.engs.length) {
    list.replaceChildren(h('li', { class: 'englist__empty', text: 'No engagements yet. Your first request or upload starts one.' }), ...(toggle ? [toggle] : []));
    return;
  }
  list.replaceChildren(...S.engs.map((e) => {
    const n = counts.get(e.id) || 0;
    const title = e.title || 'Untitled engagement';
    return h('li', { class: `englist__row${e.hidden ? ' englist__row--hidden' : ''}` }, h('button', {
      class: 'eng', type: 'button', 'aria-pressed': String(S.focus === e.id), 'data-eng': e.id,
      onclick: () => { setFocus(S.focus === e.id ? null : e.id); closeRail(); },
    }, h('span', { class: 'eng__title', text: title }),
    h('span', { class: 'eng__meta', text: (e.hidden ? 'Hidden. ' : '') + (n ? plural(n, 'piece of work', 'pieces of work') : 'No work yet') })),
    h('button', { class: 'eng__hide', type: 'button', 'aria-label': `${e.hidden ? 'Show' : 'Hide'} ${title}`,
      text: e.hidden ? 'Show' : 'Hide', onclick: () => hideEngagement(e.id, !e.hidden) }));
  }), ...(toggle ? [toggle] : []));
}

async function hideEngagement(eid, hidden) {
  try {
    await api(`/api/engagements/${encodeURIComponent(eid)}/hidden`, { method: 'POST', json: { hidden } });
    if (hidden && S.focus === eid && !S.showHidden) setFocus(null);
    await refreshEngagements();
    toast(hidden ? 'Hidden from the list. Nothing was deleted.' : 'Back in the list.');
  } catch {
    toast('That did not work. Try again.');
  }
}

function setFocus(eid) {
  S.focus = eid && S.engById.has(eid) ? eid : null;
  if (S.focus) LS.set('focus', S.focus); else LS.del('focus');
  S.engSig = '';
  renderRail();
  renderFocus();
}

const DEFAULT_PLACEHOLDER = 'Ask a question, or describe the work you need';

function renderFocus() {
  const box = $('#focusBox');
  const e = S.focus && S.engById.get(S.focus);
  const input = $('#input');
  if (!e) {
    box.replaceChildren();
    input.placeholder = DEFAULT_PLACEHOLDER;
    return;
  }
  box.replaceChildren(h('span', { class: 'focuschip' },
    icon('folder', 'ic--sm'),
    h('span', { class: 'focuschip__text' }, 'Focused on ', h('b', { text: e.title })),
    h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Stop focusing on this engagement', title: 'Stop focusing', onclick: () => setFocus(null) }, icon('close', 'ic--sm'))));
  input.placeholder = `Ask about ${e.title}, or start new work in it`;
}

function openRail() { $('#rail').classList.add('is-open'); $('#railScrim').hidden = false; $('#menuBtn').setAttribute('aria-expanded', 'true'); }
function closeRail() { $('#rail').classList.remove('is-open'); $('#railScrim').hidden = true; $('#menuBtn').setAttribute('aria-expanded', 'false'); }

// ---- home ----------------------------------------------------------------------------------------
const CAPS = [
  {
    group: 'Gather evidence', note: 'what the studio reads', items: [
      { icon: 'report', title: 'Researched, cited report', desc: 'A written report from web sources. Every quote is checked against the page it came from, and a model from another vendor reviews the draft.', who: ['Research Lead', 'Analyst', 'Writer and Verifier'],
        prompts: ['Research how regional banks use AI in customer service, for a chief operating officer', 'Write a cited brief on four-day work week pilots and what they found'] },
      { icon: 'social', title: 'Reddit listening', desc: 'What people say on Reddit about a topic, grouped into themes by sentiment, with quotes from the posts.', who: ['Social Collector', 'Social Analyst'],
        prompts: ['What do people on r/personalfinance say about switching banks?', 'Listen to Reddit on electric vehicle charging frustrations'] },
      { icon: 'transcript', title: 'Interviews and documents', desc: 'Upload transcripts, notes, subtitles or audio. You get findings with exact quotes and who said them.', who: ['Transcript Analyst'],
        prompts: ['Analyze the uploaded files in this engagement'], attach: true },
    ],
  },
  {
    group: 'Turn findings into', note: 'built from checked findings', items: [
      { icon: 'journey', title: 'Journey map', desc: "One persona's journey, stage by stage, with pain points quoted from the research.", who: ['Journey Cartographer'],
        prompts: ['Map the journey of a first-time buyer from my latest research'] },
      { icon: 'deck', title: 'Editable PowerPoint deck', desc: 'Six to ten slides with conclusion titles and checked quotes. Real text boxes you can edit, never pictures of text.', who: ['Deck Composer'],
        prompts: ['Make a deck from my latest research for the managing partner'] },
      { icon: 'prototype', title: 'Clickable prototype', desc: 'A working page you can click through, shaped by the findings and checked before it is saved.', who: ['Prototyper'],
        prompts: ['Build a clickable prototype of a dashboard that shows where a team uses AI'] },
      { icon: 'image', title: 'Images and short video', desc: 'Documentary-style images for covers and slides. Short video clips always ask for your approval first.', who: ['Media Producer'],
        prompts: ['Make a cover image of a busy career fair', 'Make a 6-second clip of a hospital front desk at opening time'] },
    ],
  },
  {
    group: 'Keep it going', note: 'work that continues', items: [
      { icon: 'schedule', title: 'Scheduled watch', desc: 'Re-run a report or Reddit listening every week so you see what changed. You approve each schedule first.', who: [],
        prompts: ['Refresh my latest research every Monday and tell me what changed'] },
      { icon: 'memory', title: 'Memory', desc: 'Tell me what to remember about you and your work. See it, or forget it, at any time.', who: [],
        prompts: ['Remember that I lead the higher education practice', 'What do you remember about me?'] },
    ],
  },
];

function renderHome() {
  const hero = h('div', { class: 'hero' },
    h('div', { class: 'hero__mark' }, presenceEl({ live: true })),
    h('div', null,
      h('h1', { class: 'hero__title', text: 'Your research partner, with a studio of specialists behind it.' }),
      h('p', { class: 'hero__lede' },
        'Ask in plain words. I brief the right specialists, every quote is checked against its source, and you can watch each step as it runs. ',
        h('span', { id: 'heroState', class: 'hero__state', text: 'Ready when you are.' })),
      h('ul', { class: 'roster', 'aria-label': 'The studio' },
        P.ROSTER.map((name) => h('li', { class: 'roster__item', 'data-specialist': name, title: (P.STEP_INFO[name] || {}).does || '' },
          h('span', { class: 'roster__dot', 'aria-hidden': 'true' }), name))),
      h('div', { class: 'hero__quick' },
        h('button', { class: 'prompt prompt--send', type: 'button', onclick: () => send('Show my recent work') }, icon('send'), 'Show my recent work'),
        h('button', { class: 'prompt', type: 'button', onclick: () => fillComposer('Write a researched, cited report on ') }, 'Start a researched report'),
        h('button', { class: 'prompt', type: 'button', onclick: () => $('#fileInput').click() }, icon('clip'), 'Add interview notes or recordings'))));

  const caps = h('section', { class: 'capsec', 'aria-labelledby': 'capsTitle' },
    h('div', { class: 'caps__head' },
      h('h2', { class: 'caps__title', id: 'capsTitle', text: 'What you can ask for' }),
      h('p', { class: 'caps__note', text: 'Click an example to put it in the message box, change anything you like, then press Enter.' })),
    h('div', { class: 'caps' }, CAPS.map((g) => h('div', { class: 'capgroup' },
      h('h3', { class: 'capgroup__head' }, g.group, h('span', { text: g.note })),
      g.items.map((c) => h('div', { class: 'cap' },
        h('div', { class: 'cap__ic' }, icon(c.icon)),
        h('div', null,
          h('p', { class: 'cap__title', text: c.title }),
          h('p', { class: 'cap__desc', text: c.desc }),
          c.who.length ? h('p', { class: 'cap__who', 'aria-label': 'Specialists' }, c.who.map((w) => h('span', { text: w }))) : null,
          h('div', { class: 'cap__prompts' },
            c.prompts.map((p) => h('button', { class: 'prompt', type: 'button', onclick: () => fillComposer(p) }, p)),
            c.attach ? h('button', { class: 'prompt prompt--send', type: 'button', onclick: () => $('#fileInput').click() }, icon('clip'), 'Attach files') : null))))))));

  $('#home').replaceChildren(h('div', { class: 'top' }, hero, h('div', { id: 'band', class: 'band' })), caps,
    h('section', { id: 'recent', 'aria-labelledby': 'recentTitle' }));
  S.bandSig = ''; S.recentSig = '';
  updateBand();
  updateRecent();
  updatePresence();
  updateRoster();
}

function homeVisible() { return !$('#home').hidden; }

function showView() {
  const empty = !S.items.length;
  $('#home').hidden = !empty;
  $('#thread').hidden = empty;
  if (empty && !$('#home').childElementCount) renderHome();
  updatePendingBar();
}

// ---- digest and approvals ------------------------------------------------------------------------
async function eventsSince(after, maxPages = 10) {
  const out = [];
  let cursor = after;
  for (let i = 0; i < maxPages; i++) {
    const r = await api(`/api/events?after=${cursor}`);
    const ev = r.events || [];
    out.push(...ev);
    if (ev.length < 200) break;
    cursor = ev[ev.length - 1].id;
  }
  return out;
}

async function loadDigestIds() {
  const d = S.digest;
  if (!d) return;
  const key = `${d.since_event}:${d.last_event}`;
  if (S.digestIds.key === key) return;
  try {
    const ev = await eventsSince(d.since_event);
    const fin = [], fail = [];
    for (const e of ev) {
      if (!e.task_id) continue;
      if (e.kind === 'task_done') { if (!fin.includes(e.task_id)) fin.push(e.task_id); }
      if (e.kind === 'task_failed') { if (!fail.includes(e.task_id)) fail.push(e.task_id); }
    }
    S.digestIds = { key, finished: fin.reverse(), failed: fail.reverse() };
  } catch { /* keep the counts from the digest */ }
}

function digestRows() {
  const d = S.digest;
  if (!d) return [];
  const rows = [];
  const fin = S.digestIds.finished.length || d.finished.length;
  const fail = S.digestIds.failed.length || d.failed.length;
  if (fin) rows.push({ dot: 'done', text: `${plural(fin, 'piece of work', 'pieces of work')} finished`, go: fin === 1 ? 'Open' : 'See them',
    act: () => openTaskSet(S.digestIds.finished, 'Finished since you last looked') });
  if (fail) rows.push({ dot: 'failed', text: `${fail} did not finish`, go: fail === 1 ? 'Open' : 'See them',
    act: () => openTaskSet(S.digestIds.failed, 'Did not finish') });
  if (d.pending_approvals) rows.push({ dot: 'ask', text: `${plural(d.pending_approvals, 'approval')} waiting for you`, go: 'Review', act: () => openApprovals() });
  if (d.paused_schedules.length) rows.push({ dot: 'muted', text: `${plural(d.paused_schedules.length, 'schedule')} paused after repeated failures`, go: 'Review', act: () => openPanel('schedules') });
  if (d.new_memory_candidates) rows.push({ dot: 'muted', text: `${plural(d.new_memory_candidates, 'possible note')} about you, kept only after a check`, go: 'Memory', act: () => openPanel('memory') });
  return rows.slice(0, 4);
}

function updateBand() {
  const band = $('#band');
  if (!band) return;
  const rows = digestRows();
  const sig = JSON.stringify([rows.map((r) => r.text), S.approvals.map((a) => a.id)]);
  if (sig === S.bandSig) return;
  S.bandSig = sig;
  const digest = h('section', { class: 'digest', 'aria-labelledby': 'digestTitle' },
    h('h2', { class: 'block__title', id: 'digestTitle', text: 'Since you last looked' }),
    rows.length
      ? h('ul', { class: 'digest__list' }, rows.map((r) => h('li', null, h('button', { class: 'digest__row', type: 'button', onclick: r.act },
        h('span', { class: `dot dot--${r.dot}`, 'aria-hidden': 'true' }), h('span', { text: r.text }), h('span', { class: 'go', text: r.go })))))
      : h('p', { class: 'digest__empty', text: 'Nothing new since you last looked.' }),
    rows.length ? h('div', { class: 'digest__foot' },
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: markDigestRead }, icon('check', 'ic--sm'), 'Mark as read')) : null);
  const kids = [digest];
  if (S.approvals.length) {
    kids.push(h('section', { class: 'approvals', id: 'approvalsBlock', 'aria-labelledby': 'apprTitle' },
      h('h2', { class: 'block__title', id: 'apprTitle', text: 'Waiting for your approval' }),
      S.approvals.map((a) => approvalCard(a))));
  }
  band.replaceChildren(...kids);
}

async function markDigestRead() {
  try {
    await api('/api/digest/seen', { method: 'POST' });
    S.digest = await api('/api/digest');
    S.digestIds = { key: '', finished: [], failed: [] };
    S.bandSig = '';
    updateBand();
    toast('Marked as read.');
  } catch { toast('Could not mark it as read. Try again in a moment.'); }
}

function approvalCard(a) {
  const txt = P.approvalText(a, S.threshold);
  const actions = h('div', { class: 'approval__actions' });
  const card = h('div', { class: 'approval', 'data-approval': a.id },
    h('div', { class: 'approval__ic' }, icon('approve')),
    h('p', { class: 'approval__title', text: txt.title }),
    txt.what ? h('p', { class: 'approval__what', text: txt.what }) : null,
    txt.cost ? h('p', { class: 'approval__cost', text: txt.cost }) : null,
    actions);
  const decide = async (approve) => {
    actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      const r = await api(`/api/approvals/${encodeURIComponent(a.id)}`, { method: 'POST', json: { approve } });
      const st = r.approval && r.approval.status;
      const started = r.started || {};
      let args = {};
      try { args = JSON.parse(a.args_json || '{}'); } catch { args = {}; }
      let msg = 'Declined. Nothing was done.';
      if (st === 'approved') {
        if (started.task_id) msg = 'Approved. The work has started.';
        else if (a.tool === 'generate_video') msg = 'Approved. The video is being made; it appears here when it is ready.';
        else if (a.tool === 'create_schedule') msg = `Approved. The schedule is set to run ${P.interval(args.every_minutes)}.`;
        else msg = 'Approved.';
      }
      actions.replaceWith(h('p', { class: 'approval__done', text: msg }));
      noteForAgent(`The person ${st === 'approved' ? 'approved' : 'declined'}: ${txt.title}${txt.what ? ` (${txt.what})` : ''}`);
      if (st === 'approved' && started.task_id) {
        card.after(card.closest('.thread') ? taskCard(started.task_id) : h('div', { class: 'approval__actions' },
          h('button', { class: 'btn btn--teal', type: 'button', onclick: () => openTask(started.task_id) }, 'Watch it run')));
      }
      if (st === 'approved' && a.tool === 'generate_video' && args.engagement_id) awaitNewVideo(args.engagement_id, card);
      S.approvals = S.approvals.filter((x) => x.id !== a.id);
      updatePendingBar();
      refreshAll();
    } catch (e) {
      actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      toast(e.status === 404 ? 'That approval no longer exists.' : 'Could not record your decision. Try again.');
    }
  };
  actions.append(
    h('button', { class: 'btn btn--accent', type: 'button', onclick: () => decide(true) }, icon('check', 'ic--sm'), 'Approve'),
    h('button', { class: 'btn', type: 'button', onclick: () => decide(false) }, 'Decline'));
  return card;
}

async function awaitNewVideo(eid, anchor) {
  const before = new Set(((S.media.get(eid) || {}).videos || []).map((v) => v.view));
  const t0 = Date.now();
  while (Date.now() - t0 < 6 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    if (!anchor.isConnected) return;
    try {
      const m = await api(`/api/engagements/${encodeURIComponent(eid)}/media`);
      S.media.set(eid, m);
      const fresh = (m.videos || []).find((v) => !before.has(v.view));
      if (fresh && isView(fresh.view)) {
        addMediaItem('video', fresh.view, 'The video you approved is ready');
        S.recentSig = '';
        updateRecent();
        return;
      }
    } catch { /* keep waiting */ }
  }
}

function updatePendingBar() {
  const chip = $('#pendingBar');
  const n = S.approvals.length;
  if (!n) { chip.hidden = true; return; }
  chip.hidden = false;
  chip.setAttribute('aria-label', `${plural(n, 'approval')} waiting for you. Review`);
  chip.replaceChildren(icon('approve', 'ic--sm'), h('span', { class: 'apprchip__text', text: `${plural(n, 'approval')} waiting` }));
}

// ---- recent work ---------------------------------------------------------------------------------
function rowAsTask(row) {
  return { ...row, brief: {}, nodes: [] };
}

function workItems() {
  const items = S.tasks.map((t) => ({ type: 'task', key: t.id, ts: t.created, status: t.status }));
  for (const [eid, m] of S.media) {
    for (const im of (m.images || []).filter((x) => isView(x.view))) items.push({ type: 'media', kind: 'image', key: im.view, view: im.view, ts: im.modified, eid, status: 'done' });
    for (const v of (m.videos || []).filter((x) => isView(x.view))) items.push({ type: 'media', kind: 'video', key: v.view, view: v.view, ts: v.modified, eid, status: 'done' });
  }
  return items.sort((a, b) => b.ts - a.ts);
}

function updateRecent() {
  const sec = $('#recent');
  if (!sec) return;
  const items = workItems().slice(0, 8);
  const sig = items.map((i) => `${i.key}:${i.status}`).join('|');
  if (sig === S.recentSig) return;
  S.recentSig = sig;
  if (!items.length) {
    sec.replaceChildren(h('div', { class: 'recent__head' }, h('h2', { class: 'block__title', id: 'recentTitle', text: 'Recent work' })),
      h('div', { class: 'empty' }, h('p', { text: 'Nothing here yet. Finished reports, maps, decks, prototypes, images and videos appear here as cards you can open.' })));
    return;
  }
  sec.replaceChildren(
    h('div', { class: 'recent__head' },
      h('h2', { class: 'block__title', id: 'recentTitle', text: 'Recent work' }),
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => openPanel('work') }, 'See all work')),
    h('div', { class: 'workgrid' }, items.map(workCard)));
}

const thumbObserver = new ResizeObserver((entries) => {
  for (const e of entries) {
    const f = e.target.querySelector('.thumb__frame');
    if (!f) continue;
    const k = e.contentRect.width / 1200;
    f.style.transform = `scale(${k.toFixed(4)})`;
  }
});

function thumbFor(t) {
  const box = h('div', { class: 'card__thumb', 'aria-hidden': 'true' });
  const k = P.kindOf(t.kind);
  box.append(h('span', { class: 'card__type' }, icon(k.icon), k.label));
  if (t.status === 'failed') { box.append(h('div', { class: 'thumb__glyph thumb__glyph--failed' }, icon(k.icon))); return box; }
  if (t.status !== 'done') { box.append(h('div', { class: 'thumb__glyph thumb__glyph--working' }, presenceEl({ state: 'working' }))); return box; }
  const view = `/api/tasks/${encodeURIComponent(t.id)}/view`;
  if (['journey_map', 'deck', 'social', 'themes'].includes(t.kind)) {
    box.append(h('iframe', { class: 'thumb__frame', src: view, sandbox: '', loading: 'lazy', tabindex: '-1', title: `${k.label} preview`, referrerpolicy: 'no-referrer' }));
    thumbObserver.observe(box);
  } else if (t.kind === 'artifact') {
    // The wrapper page sandboxes HiC's document itself, as it does a prototype.
    box.append(h('iframe', { class: 'thumb__frame', src: view, loading: 'lazy', tabindex: '-1', title: 'Document preview', referrerpolicy: 'no-referrer' }));
    thumbObserver.observe(box);
  } else if (t.kind === 'prototype') {
    // The wrapper page sandboxes the prototype itself (see the note at the top of this file).
    box.append(h('iframe', { class: 'thumb__frame', src: `${view}?embed=1`, loading: 'lazy', tabindex: '-1', title: 'Prototype preview', referrerpolicy: 'no-referrer' }));
    thumbObserver.observe(box);
  } else if (t.kind === 'research_report') {
    const title = h('h4', { text: P.taskTitle(t, S.engById.get(t.engagement_id)) });
    const para = h('p');
    box.append(h('div', { class: 'thumb__page' }, title, para));
    getReport(t.id).then((md) => {
      const lines = md.split('\n').map((l) => l.trim());
      const h1 = lines.find((l) => /^#\s/.test(l));
      const p = lines.find((l) => l && !/^(#|-|\*|\||\d+\.|>)/.test(l));
      if (h1) title.textContent = h1.replace(/^#\s*/, '');
      if (p) para.textContent = p.replace(/\*\*/g, '').replace(/\s*\[S\d+\]/g, '');
    }).catch(() => {});
  } else if (t.kind === 'transcript') {
    const q = h('q');
    const who = h('span');
    box.append(h('div', { class: 'thumb__quote' }, q, who));
    getFindings(t.id).then((d) => {
      const f = (d.findings || [])[0];
      if (f) { q.textContent = f.quote || f.claim || ''; who.textContent = f.speaker ? f.speaker : ''; }
    }).catch(() => {});
  } else {
    box.append(h('div', { class: 'thumb__glyph' }, icon(k.icon)));
  }
  return box;
}

function workCard(item) {
  if (item.type === 'media') return mediaCard(item);
  const tid = item.key;
  const row = S.tasks.find((x) => x.id === tid);
  const card = h('article', { class: 'card', 'data-task': tid });
  let shown = null;
  const paint = (t) => {
    const k = P.kindOf(t.kind);
    const eng = S.engById.get(t.engagement_id);
    const title = P.taskTitle(t, eng);
    const st = P.taskState(t.status);
    const detail = P.taskDetail(t);
    if (shown && shown.status === t.status) {
      const d = card.querySelector('.card__detail');
      if (d && detail) d.textContent = detail;
      return;
    }
    shown = { status: t.status };
    const thumb = thumbFor(t);
    thumb.addEventListener('click', () => openTask(tid));
    card.replaceChildren(thumb,
      h('h3', { class: 'card__title', text: title }),
      h('p', { class: 'card__detail', text: detail }),
      h('div', { class: 'card__foot' },
        h('span', { class: `pill pill--${st.key}`, text: t.status === 'done' ? `${st.word}, ${P.ago(t.updated || t.created)}` : st.word }),
        h('button', { class: 'btn card__open', type: 'button', 'aria-label': `Open ${k.label.toLowerCase()}: ${title}`, onclick: () => openTask(tid) }, 'Open')));
  };
  if (S.full.has(tid)) paint(S.full.get(tid));
  else if (row) paint(rowAsTask(row));
  else card.append(h('p', { class: 'card__detail', text: 'Loading.' }));
  watch(tid, card, paint);
  return card;
}

function mediaCard(item) {
  const eng = S.engById.get(item.eid);
  const label = item.kind === 'video' ? 'Video' : 'Image';
  const thumb = h('div', { class: `card__thumb${item.kind === 'video' ? ' card__thumb--video' : ''}`, 'aria-hidden': 'true', onclick: () => openMedia(item) },
    h('span', { class: 'card__type' }, icon(item.kind), label),
    item.kind === 'video'
      ? [h('video', { class: 'thumb__img', src: `${item.view}#t=0.5`, muted: true, preload: 'metadata', playsinline: true, tabindex: '-1' }),
        h('div', { class: 'thumb__play' }, h('span', null, icon('play')))]
      : h('img', { class: 'thumb__img', src: item.view, alt: '', loading: 'lazy' }));
  return h('article', { class: 'card' }, thumb,
    h('h3', { class: 'card__title', text: eng ? eng.title : label }),
    h('p', { class: 'card__detail', text: `${label} made by the Media Producer` }),
    h('div', { class: 'card__foot' },
      h('span', { class: 'pill pill--done', text: `Ready, ${P.ago(item.ts)}` }),
      h('button', { class: 'btn card__open', type: 'button', 'aria-label': `Open ${label.toLowerCase()}`, onclick: () => openMedia(item) }, 'Open')));
}

function getReport(tid) {
  if (!S.reports.has(tid)) S.reports.set(tid, api(`/api/tasks/${encodeURIComponent(tid)}/report`).then((x) => String(x)));
  return S.reports.get(tid);
}

function getFindings(tid) {
  return getReport(tid).then((txt) => { try { return JSON.parse(txt); } catch { return { findings: [] }; } });
}

// ---- task card -----------------------------------------------------------------------------------
function taskCard(tid, opts = {}) {
  const el = h('div', { class: `task${opts.full ? ' task--full' : ''}`, 'data-task': tid },
    h('p', { class: 'task__outcome', text: 'Loading this work.' }));
  watch(tid, el, (t) => paintTask(el, t, opts));
  return el;
}

function paintTask(el, t, opts) {
  if (el.dataset.painted === 'done' && t.status === 'done') return;      // results stay put; no iframe reloads
  el.dataset.painted = t.status;
  const k = P.kindOf(t.kind);
  const eng = S.engById.get(t.engagement_id);
  const st = P.taskState(t.status);
  const spend = P.isTerminal(t.status) ? `Cost ${P.usd(t.spent_usd)}` : `${P.usd(t.spent_usd)} so far`;

  const head = h('div', { class: 'task__head' },
    h('div', { class: 'task__ic', title: k.label }, icon(k.icon)),
    h('div', null,
      h('p', { class: 'task__title', text: P.taskTitle(t, eng) }),
      h('p', { class: 'task__detail', text: P.taskDetail(t) || k.label })),
    h('div', { class: 'task__side' },
      h('span', { class: `pill pill--${st.key}`, text: st.word }),
      h('span', { class: 'task__spend mono', text: spend })));

  const kids = [head, pipelineEl(t)];

  if (t.status === 'stopping') {
    kids.push(h('p', { class: 'task__outcome', text: 'Stopping after the current step. What it has written so far is kept.' }));
  } else if (t.status === 'running' || t.status === 'queued') {
    kids.push(h('p', { class: 'task__outcome' },
      t.status === 'queued' ? 'Waiting to start. ' : h('span', null, 'Working for ', h('span', { class: 'mono', 'data-since': String(t.created), text: P.duration(Date.now() / 1000 - t.created) }), '. '),
      'You can keep talking; this card updates by itself.'));
    // enhancement plan B4: a Stop the server confirms; the card shows "Stopping" until the step in flight returns
    const stopBtn = h('button', { class: 'btn btn--quiet', type: 'button', onclick: async () => {
      stopBtn.disabled = true;
      try {
        await api(`/api/tasks/${encodeURIComponent(t.id)}/stop`, { method: 'POST' });
        toast('Stopping after the current step.');
      } catch (e) {
        toast((e && e.message) || 'Could not stop it.');
      }
      refreshTask(t.id);
    } }, icon('close', 'ic--sm'), 'Stop');
    kids.push(h('div', { class: 'task__actions' }, stopBtn));
  } else if (t.status === 'done') {
    kids.push(h('p', { class: 'task__outcome' }, h('b', { text: `${k.ready}. ` }), P.outcome(t)));
    if (t.kind === 'research_report' || t.kind === 'artifact') kids.push(checksEl(t, opts));
    if (opts.full) kids.push(actionsEl(t, opts), resultEl(t, opts));
    else kids.push(resultEl(t, opts), actionsEl(t, opts));
    kids.push(feedbackEl(t));
    const next = P.nextAfterTask(t);
    if (next.length) kids.push(suggestEl(next, 'What next', t.engagement_id));
  } else if (t.status === 'failed' || t.status === 'stopped') {
    // enhancement plan B4: Try again starts the same task with the same budget (it used to re-ask in words and drop it)
    const retryBtn = h('button', { class: 'btn btn--warn', type: 'button', onclick: async () => {
      retryBtn.disabled = true;
      try {
        const r = await api(`/api/tasks/${encodeURIComponent(t.id)}/retry`, { method: 'POST' });
        if (r.task_id) {
          toast('Started again with the same budget.');
          el.replaceWith(taskCard(r.task_id, opts));
        } else if (r.approval_row) {
          toast('Waiting for your approval to spend that budget again.');
          el.replaceWith(approvalCard(r.approval_row));
        }
        refreshAll();
      } catch (e) {
        retryBtn.disabled = false;
        toast((e && e.message) || 'Could not start it again.');
      }
    } }, icon('retry', 'ic--sm'), 'Try again');
    kids.push(h('div', { class: 'task__fail' }, h('p', { text: P.failure(t) }), retryBtn));
  }
  kids.push(detailsEl('Details', rawTask(t)));
  el.replaceChildren(...kids);
}

function pipelineEl(t) {
  const k = P.kindOf(t.kind);
  const names = [...k.steps];
  for (const n of t.nodes || []) if (!names.includes(n.specialist)) names.push(n.specialist);
  return h('ol', { class: 'pipeline', style: `--n:${Math.max(names.length, 1)}`, 'aria-label': 'Specialist steps' },
    names.map((name) => {
      const node = (t.nodes || []).filter((n) => n.specialist === name).pop();
      const ss = P.stepState(node, t.status);
      const took = node && ss.key === 'done' && node.finished && node.started ? `, ${P.duration(node.finished - node.started)}` : '';
      return h('li', { class: 'step', 'data-state': ss.key },
        h('div', { class: 'step__track' }, h('span', { class: 'step__dot' }, ss.key === 'done' ? icon('check') : ss.key === 'failed' ? icon('close') : null)),
        h('p', { class: 'step__name', text: name }),
        h('p', { class: 'step__does', text: (P.STEP_INFO[name] || {}).does || '' }),
        h('p', { class: 'step__word', text: ss.word + took }));
    }));
}

function rawTask(t) {
  const lines = [`Task ${t.id}`, `Kind ${t.kind}, status ${t.status}`, `Engagement ${t.engagement_id}`, `Spent ${t.spent_usd} USD of ${t.budget_usd} USD`];
  if (t.summary) lines.push(`Summary: ${t.summary}`);
  if (t.error) lines.push(`Error: ${t.error}`);
  for (const n of t.nodes || []) lines.push(`- ${n.specialist} (${n.model}): ${n.state}${n.summary ? `; ${n.summary}` : ''}${n.error ? `; error: ${n.error}` : ''}`);
  return lines.join('\n');
}

function resultEl(t, opts) {
  const wrap = h('div', { class: 'result' });
  const view = `/api/tasks/${encodeURIComponent(t.id)}/view`;
  const k = P.kindOf(t.kind);
  if (t.kind === 'research_report') {
    const md = h('div', { class: 'md' }, h('p', { text: 'Loading the report.' }));
    const reader = h('article', { class: `reader${opts.full ? '' : ' reader--clip'}` }, md);
    if (opts.full) {
      const toc = h('nav', { class: 'toc', 'aria-label': 'Contents' });
      wrap.append(h('div', { class: 'readerwrap' }, reader, toc));
      getReport(t.id).then((text) => {
        md.innerHTML = renderMarkdown(P.scrubIds(text));              // escaped by the renderer
        const hs = [...md.querySelectorAll('h3, h4')];
        toc.replaceChildren(h('p', { class: 'toc__title', text: 'Contents' }), ...hs.map((hd, i) => {
          hd.id = `sec-${t.id.slice(-6)}-${i}`;
          return h('a', { href: `#${hd.id}`, 'data-level': hd.tagName === 'H3' ? '2' : '3', text: hd.textContent,
            onclick: (e) => { e.preventDefault(); hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
        }));
      }).catch(() => { md.replaceChildren(h('p', { text: 'The report could not be loaded. Close this and open it again.' })); });
    } else {
      wrap.append(reader);
      getReport(t.id).then((text) => {
        const cut = text.split('\n').slice(0, 26).join('\n');
        md.innerHTML = renderMarkdown(P.scrubIds(cut));               // escaped by the renderer
      }).catch(() => { md.replaceChildren(h('p', { text: 'The report could not be loaded.' })); });
    }
  } else if (t.kind === 'transcript') {
    const list = h('ul', { class: 'findings' }, h('li', { class: 'finding', text: 'Loading the findings.' }));
    wrap.append(list);
    Promise.all([getFindings(t.id), opts.full ? sourceTitles(t.engagement_id) : Promise.resolve({})]).then(([d, titles]) => {
      const all = d.findings || [];
      const shown = opts.full ? all : all.slice(0, 3);
      list.replaceChildren(...shown.map((f) => h('li', { class: 'finding' },
        h('p', { class: 'finding__claim', text: f.claim || '' }),
        f.quote ? h('blockquote', { class: 'finding__quote', text: f.quote }) : null,
        h('p', { class: 'finding__who', text: [f.speaker, titles[f.source_id]].filter(Boolean).join(', ') }))));
      if (!opts.full && all.length > shown.length) {
        list.append(h('li', null, h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => openTask(t.id) }, `See all ${all.length} findings`)));
      }
    }).catch(() => { list.replaceChildren(h('li', { class: 'finding', text: 'The findings could not be loaded.' })); });
  } else if (['journey_map', 'deck', 'social', 'themes'].includes(t.kind)) {
    // the version stamp makes a re-rendered deck (a brand switch) load fresh instead of from the cache
    wrap.append(h('iframe', { class: 'frame', src: `${view}?v=${encodeURIComponent(t.updated || '')}`, sandbox: '', title: k.label, loading: 'lazy', referrerpolicy: 'no-referrer' }));
  } else if (t.kind === 'artifact') {
    wrap.append(h('iframe', { class: 'frame', src: view, title: k.label, loading: 'lazy', referrerpolicy: 'no-referrer' }));
  } else if (t.kind === 'prototype') {
    // The wrapper page sandboxes the prototype itself (see the note at the top of this file).
    wrap.append(h('div', { class: 'framecrop' }, h('iframe', { class: 'frame', src: `${view}?embed=1`, title: 'Prototype', loading: 'lazy', referrerpolicy: 'no-referrer' })));
  }
  return wrap;
}

const sourceCache = new Map();
function sourceTitles(eid) {
  if (!sourceCache.has(eid)) {
    sourceCache.set(eid, api(`/api/engagements/${encodeURIComponent(eid)}/files/results/uploaded_sources.json`)
      .then((d) => Object.fromEntries((d.sources || []).map((s) => [s.id, s.title])))
      .catch(() => ({})));
  }
  return sourceCache.get(eid);
}

const OPEN_WORDS = {
  research_report: 'Read the full report', journey_map: 'Open the journey map', deck: 'Open the deck',
  social: 'Open the analysis', transcript: 'See all findings', prototype: 'Open the prototype full size',
  artifact: 'Open the document', themes: 'Open the themes',
};

// Enhancement plan B7: the reviewer's verdict as one of three labels, with every check in plain words.
function checksEl(t, opts) {
  const wrap = h('div', { class: 'checks' }, h('p', { class: 'checks__head', text: 'Loading the checks.' }));
  api(`/api/tasks/${encodeURIComponent(t.id)}/verification`).then((v) => {
    const lv = P.checkLevel(v);
    const lines = P.checkLines(v);
    const who = v.judge && v.judge.judge_model ? `Reviewed by ${v.judge.judge_model}, a model from a different vendor than the writer.` : '';
    const head = h('div', { class: 'checks__head' }, h('span', { class: `pill pill--${lv.key}`, text: lv.word }),
      h('span', { class: 'checks__count', text: lv.open ? `${lv.open} point${lv.open === 1 ? '' : 's'} to look at` : 'Nothing open' }));
    const list = h('ul', { class: 'checks__list' }, lines.map((l) => h('li', { class: `check check--${l.pass ? 'pass' : 'open'}` },
      icon(l.pass ? 'check' : 'close', 'ic--sm'),
      h('div', null, h('p', { class: 'check__text', text: l.text }), l.why ? h('p', { class: 'check__why', text: l.why }) : null))));
    wrap.replaceChildren(head, h('details', { class: 'checks__details', open: !!opts.full && lv.key !== 'done' },
      h('summary', { text: 'See every check' }), who ? h('p', { class: 'check__why', text: who }) : null, list));
  }).catch(() => { wrap.replaceChildren(h('p', { class: 'checks__head', text: 'The checks for this report are not available.' })); });
  return wrap;
}

function actionsEl(t, opts) {
  const row = h('div', { class: 'task__actions' });
  const view = `/api/tasks/${encodeURIComponent(t.id)}/view`;
  if (t.kind === 'deck') {
    row.append(h('a', { class: 'btn btn--accent', href: `/api/tasks/${encodeURIComponent(t.id)}/download`, download: 'deck.pptx' }, icon('download', 'ic--sm'), 'Download PowerPoint'));
    // Plan Part 7 (BR3): the same slides in the other brand, re-rendered with no model call and no cost.
    const other = ((t.brief && t.brief.brand) || 'nxt') === 'nu' ? 'nxt' : 'nu';
    const btn = h('button', { class: 'btn btn--quiet', type: 'button', title: 'Same slides and sources, re-rendered at no cost',
      onclick: async () => {
        btn.disabled = true;
        btn.textContent = `Switching to ${P.BRAND_NAMES[other]}`;
        try {
          await api(`/api/tasks/${encodeURIComponent(t.id)}/rebrand`, { method: 'POST', json: { brand: other } });
          await refreshTask(t.id);
          toast(`The deck is now in the ${P.BRAND_NAMES[other]} brand.`);
        } catch (e) {
          btn.disabled = false;
          btn.textContent = `Switch to ${P.BRAND_NAMES[other]} brand`;
          toast((e && e.message) || 'The brand could not be switched.');
        }
      } }, `Switch to ${P.BRAND_NAMES[other]} brand`);
    row.append(btn);
  }
  if (!opts.full) row.append(h('button', { class: 'btn', type: 'button', onclick: () => openTask(t.id) }, OPEN_WORDS[t.kind] || 'Open'));
  if (['journey_map', 'deck', 'social', 'prototype', 'artifact', 'themes'].includes(t.kind)) {
    row.append(h('a', { class: 'btn btn--quiet', href: view, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 'ic--sm'), 'Open in a new tab'));
  }
  if (t.kind === 'artifact' && t.status === 'done') {
    row.append(h('a', { class: 'btn btn--quiet', href: `/api/tasks/${encodeURIComponent(t.id)}/artifact/download` }, 'Download the HTML'));
  }
  return row;
}

function feedbackEl(t) {
  const wrap = h('div', { class: 'feedback' });
  const done = () => wrap.replaceChildren(h('span', { class: 'feedback__done' }, icon('check', 'ic--sm'), ' Thanks. Your rating is saved.'));
  if (S.rated[t.id]) { done(); return wrap; }
  const form = h('div', { class: 'feedback__form', hidden: true });
  let choice = null;
  const pick = (label, btn) => {
    choice = label;
    wrap.querySelectorAll('.feedback__btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const input = h('input', { type: 'text', maxlength: '300', 'aria-label': 'Reason (optional)',
      placeholder: label === 'approved' ? 'What made it useful? (optional)' : 'What was wrong? (optional)' });
    const submit = async () => {
      try {
        await api(`/api/tasks/${encodeURIComponent(t.id)}/label`, { method: 'POST', json: { label: choice, reason: input.value.trim() } });
        S.rated[t.id] = choice;
        LS.set('rated', S.rated);
        done();
      } catch { toast('Could not save the rating. Try again.'); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    form.replaceChildren(input, h('button', { class: 'btn btn--teal', type: 'button', onclick: submit }, 'Save rating'));
    form.hidden = false;
    input.focus();
  };
  const up = h('button', { class: 'btn feedback__btn', type: 'button', 'aria-pressed': 'false', onclick: () => pick('approved', up) }, icon('up', 'ic--sm'), 'Useful');
  const down = h('button', { class: 'btn feedback__btn', type: 'button', 'aria-pressed': 'false', onclick: () => pick('rejected', down) }, icon('down', 'ic--sm'), 'Not right');
  wrap.append(h('span', { class: 'feedback__q', text: 'Was this useful?' }), up, down, form);
  return wrap;
}

function suggestEl(items, label, eid) {
  return h('div', { class: 'suggest' },
    label ? h('span', { class: 'suggest__label', text: label }) : null,
    items.map((s) => h('button', { class: `prompt${s.send ? ' prompt--send' : ''}`, type: 'button', title: s.text,
      onclick: () => {
        if (eid) setFocus(eid);
        closeSheet();
        if (s.send) send(s.text); else fillComposer(s.text);
      } }, s.send ? icon('send') : null, s.label)));
}

function detailsEl(summary, text) {
  return h('details', { class: 'details' }, h('summary', { text: summary }), h('pre', { text }));
}

// ---- conversation ---------------------------------------------------------------------------------
function normalizeTurn(r) {
  const rec = { reply: r.reply || '', chips: [], tasks: [], approvals: [], media: [], work: [], changed: [], started: [], raw: '' };
  const listed = [];
  for (const tr of r.trace || []) {
    const out = tr.output && typeof tr.output === 'object' ? tr.output : {};
    rec.chips.push(P.toolChip(tr.tool, out));
    if (typeof out.task_id === 'string' && !rec.tasks.includes(out.task_id)) rec.tasks.push(out.task_id);
    if ((tr.tool === 'task_status' || tr.tool === 'read_report') && !out.error && tr.input && typeof tr.input.task_id === 'string' && !rec.tasks.includes(tr.input.task_id)) rec.tasks.push(tr.input.task_id);
    if ((tr.tool === 'rebrand_deck' || tr.tool === 'revise_slide') && !out.error && typeof out.task_id === 'string') rec.changed.push(out.task_id);
    if (/^(start_|analyze_uploads$|retry_task$)/.test(tr.tool) && out.started && typeof out.task_id === 'string') rec.started.push(out.task_id);
    if (out.approval === 'pending' && typeof out.approval_id === 'string') rec.approvals.push(out.approval_id);
    if (isView(out.view)) rec.media.push({ kind: out.video ? 'video' : 'image', view: out.view });
    if (tr.tool === 'list_engagements' && Array.isArray(out.engagements)) {
      for (const e of out.engagements) for (const t of e.tasks || []) if (t && t.id && (!S.focus || e.id === S.focus)) listed.push(t);
    }
  }
  rec.work = listed.sort((a, b) => (b.created || 0) - (a.created || 0)).map((t) => t.id).filter((id) => !rec.tasks.includes(id)).slice(0, 8);
  rec.chips = rec.chips.filter((c, i, arr) => arr.findIndex((x) => x.text === c.text) === i);
  try {
    rec.raw = JSON.stringify((r.trace || []).map((tr) => ({ tool: tr.tool, input: tr.input, output: tr.output })), null, 1).slice(0, 8000);
  } catch { rec.raw = ''; }
  return rec;
}

function agentEl(item) {
  const rec = item.rec;
  const body = h('div', { class: 'msg__body' });
  if (rec.chips.length) body.append(h('div', { class: 'chips', 'aria-label': 'What I did' }, rec.chips.map((c) => h('span', { class: `chip chip--${c.tone}`, text: c.text }))));
  if (rec.reply) body.append(h('div', { class: 'md', md: P.scrubIds(rec.reply) }));
  if (rec.media.length) {
    body.append(h('div', { class: 'media' }, rec.media.map((m) => (m.kind === 'video'
      ? h('video', { src: m.view, controls: true, preload: 'metadata', playsinline: true })
      : h('img', { src: m.view, alt: 'Image made for this engagement', loading: 'lazy' })))));
  }
  for (const aid of rec.approvals) body.append(approvalSlot(aid));
  for (const tid of rec.tasks) body.append(taskCard(tid, { ask: item.ask }));
  if (rec.work.length) body.append(h('div', { class: 'workgrid workgrid--inline' }, rec.work.map((id) => workCard({ type: 'task', key: id }))));
  if (rec.raw && rec.raw !== '[]') body.append(detailsEl('Details', rec.raw));
  return h('div', { class: 'msg msg--agent' }, h('div', { class: 'msg__avatar' }, presenceEl({ still: true })), body);
}

function approvalSlot(aid) {
  const slot = h('div');
  const a = S.approvals.find((x) => x.id === aid);
  if (a) slot.append(approvalCard(a));
  else {
    api('/api/approvals').then((r) => {
      const row = (r.pending || []).find((x) => x.id === aid);
      if (row) slot.append(approvalCard(row));
    }).catch(() => {});
  }
  return slot;
}

function errorEl(item) {
  const msg = item.status === 0
    ? 'I could not reach the IA Next service. Check that it is running, then try again.'
    : item.status === 400 ? 'That message could not be sent. Change it and try again.'
      : 'I could not answer that. The model service returned an error.';
  return h('div', { class: 'msg msg--agent' }, h('div', { class: 'msg__avatar' }, presenceEl({ still: true })),
    h('div', { class: 'msg__body' }, h('div', { class: 'errline' },
      h('p', { text: msg }),
      h('div', { class: 'task__actions' }, h('button', { class: 'btn btn--warn', type: 'button', onclick: () => send(item.ask) }, icon('retry', 'ic--sm'), 'Try again')),
      detailsEl('Details', item.detail || ''))));
}

function itemEl(item) {
  if (item.type === 'user') return h('div', { class: 'msg msg--user', text: item.text });
  if (item.type === 'agent') return agentEl(item);
  if (item.type === 'error') return errorEl(item);
  if (item.type === 'files') return filesEl(item);
  return h('div');
}

function renderThread() {
  $('#thread').replaceChildren(...S.items.map(itemEl));
  showView();
  scrollToEnd(false);
  const last = [...S.items].reverse().find((i) => i.type === 'agent');
  setDockSuggest(last ? P.nextAfterReply(last.rec, last.ask) : []);
}

function pushItem(item) {
  S.items.push(item);
  saveConversation();
  showView();
  $('#thread').append(itemEl(item));
  scrollToEnd(true);
}

function scrollToEnd(smooth) {
  const sc = $('#scroll');
  requestAnimationFrame(() => sc.scrollTo({ top: sc.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }));
}

function setDockSuggest(items) {
  const box = $('#dockSuggest');
  if (!items.length) { box.hidden = true; box.replaceChildren(); return; }
  box.hidden = false;
  box.replaceChildren(...items.map((s) => h('button', { class: `prompt${s.send ? ' prompt--send' : ''}`, type: 'button', title: s.text,
    onclick: () => (s.send ? send(s.text) : fillComposer(s.text)) }, s.send ? icon('send') : null, s.label)));
}

async function ensureConv() {
  if (!S.conv) {
    const r = await api('/api/conversations', { method: 'POST' });
    S.conv = r.id;
    saveConversation();
  }
  return S.conv;
}

let thinkTimer = null;
function showThinking() {
  const word = h('span', { class: 'thinking__word', text: 'Thinking' });
  const time = h('span', { class: 'thinking__time mono', text: '0 s', 'aria-hidden': 'true' });
  const live = h('div', { class: 'live' });
  const el = h('div', { class: 'msg msg--agent', id: 'thinking' },
    h('div', { class: 'msg__avatar' }, presenceEl({ state: 'thinking', live: true })),
    h('div', { class: 'msg__body' }, h('div', { class: 'thinking' }, h('span', { role: 'status' }, word), time), live));
  $('#thread').append(el);
  scrollToEnd(true);
  S.liveBox = live;
  const t0 = Date.now();
  thinkTimer = setInterval(() => {
    const s = (Date.now() - t0) / 1000;
    time.textContent = P.duration(s);
    word.textContent = s > 25 ? 'Still thinking' : 'Thinking';
  }, 1000);
}

function hideThinking() {
  clearInterval(thinkTimer);
  S.liveBox = null;
  const el = $('#thinking');
  if (el) el.remove();
}

async function send(text, opts = {}) {
  text = String(text || '').trim();
  if (!text || S.busy) return;
  if (opts.focus) setFocus(opts.focus);
  const input = $('#input');
  if (input.value.trim() === text) { input.value = ''; autosize(); }
  setDockSuggest([]);
  S.busy = true;
  updateSendState();
  updatePresence();
  pushItem({ type: 'user', text });
  showThinking();
  const fast = setInterval(pollEvents, 1500);
  try {
    await ensureConv();
    const body = { text };
    if (S.focus) body.engagement_id = S.focus;
    if (S.notes && S.notes.length) body.notes = S.notes.slice();
    const files = conversationFiles();
    if (files.length) body.attachments = files.map((f) => ({ engagement_id: f.engagement_id, source_id: f.source_id, fresh: !!f.fresh }));
    const r = await api(`/api/conversations/${encodeURIComponent(S.conv)}/messages`, { method: 'POST', json: body });
    if (body.notes) { S.notes = []; LS.del('notes'); }   // the agent has them now
    if (files.some((f) => f.fresh)) { files.forEach((f) => { f.fresh = false; }); saveConversation(); }   // sent with this message
    const rec = normalizeTurn(r);
    rec.changed.forEach(refreshTask);      // cards already on the page show the re-rendered deck, not the cached one
    hideThinking();
    pushItem({ type: 'agent', rec, ask: text, usd: Number(r.usd) || 0 });
    setDockSuggest(P.nextAfterReply(rec, text));
    if (rec.media.length) loadMedia(S.engs.slice(0, 12).map((e) => e.id));
  } catch (e) {
    hideThinking();
    pushItem({ type: 'error', ask: text, status: e.status ?? 0, detail: e.message });
  } finally {
    clearInterval(fast);
    S.busy = false;
    updateSendState();
    updatePresence();
    refreshAll();
  }
}

// ---- composer ------------------------------------------------------------------------------------
function autosize() {
  const t = $('#input');
  t.style.height = 'auto';
  t.style.height = `${Math.min(t.scrollHeight, 220)}px`;
  updateSendState();
}

function updateSendState() {
  $('#sendBtn').disabled = S.busy || !$('#input').value.trim();
}

function fillComposer(text) {
  const t = $('#input');
  t.value = text;
  autosize();
  t.focus();
  t.setSelectionRange(text.length, text.length);
  const c = $('#composer');
  c.classList.remove('is-filled');
  void c.offsetWidth;
  c.classList.add('is-filled');
}

function wireComposer() {
  const t = $('#input');
  t.addEventListener('input', autosize);
  t.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(t.value); }
  });
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(t.value); });
  $('#attachBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
}

function wireVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $('#micBtn');
  if (!SR) { mic.hidden = true; return; }
  mic.hidden = false;
  const hint = $('#composerHint');
  const hintText = hint.textContent;
  let rec = null;
  mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    const input = $('#input');
    const base = input.value ? `${input.value.replace(/\s+$/, '')} ` : '';
    rec = new SR();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = '';
      for (const r of e.results) text += r[0].transcript;
      input.value = base + text.trimStart();
      autosize();
    };
    rec.onerror = (e) => {
      toast(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Microphone access is blocked. Allow it in the browser to dictate.'
        : e.error === 'no-speech' ? 'No speech heard. Click the microphone and try again.' : 'Dictation stopped.');
    };
    rec.onend = () => { rec = null; mic.setAttribute('aria-pressed', 'false'); mic.setAttribute('aria-label', 'Dictate'); hint.textContent = hintText; $('#input').focus(); };
    try {
      rec.start();
      mic.setAttribute('aria-pressed', 'true');
      mic.setAttribute('aria-label', 'Stop dictating');
      hint.textContent = 'Listening. Click the microphone again to stop.';
    } catch { rec = null; toast('Dictation could not start in this browser.'); }
  });
}

// ---- uploads ---------------------------------------------------------------------------------------
const TEXT_EXT = ['.txt', '.md', '.vtt', '.srt', '.csv'];
const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.webm', '.mp4', '.ogg'];
// Part 2: read by HiC through the host (PDF, scanned PDF, Word, PowerPoint, Excel, images); needs the suite running.
const DOC_EXT = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.json', '.xml', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
const extOf = (name) => (String(name).toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];

function attachmentChip(file) {
  const state = h('span', { class: 'att__state', text: 'Waiting' });
  const bar = h('span', { class: 'att__bar', style: 'width:0%' });
  const remove = h('button', { class: 'iconbtn', type: 'button', 'aria-label': `Remove ${file.name} from this list`, hidden: true, onclick: () => { chip.remove(); syncAttachments(); } }, icon('close', 'ic--sm'));
  const chip = h('div', { class: 'att' }, icon(AUDIO_EXT.includes(extOf(file.name)) ? 'transcript' : 'report', 'ic--sm'),
    h('span', null, h('span', { class: 'att__name', text: file.name }), ' ', state), remove, bar);
  $('#attachments').append(chip);
  syncAttachments();
  return {
    progress(p, text) { state.textContent = text; bar.style.width = `${p}%`; },
    done(text) { chip.classList.add('att--done'); state.textContent = text; bar.remove(); remove.hidden = false; },
    fail(text) { chip.classList.add('att--failed'); state.textContent = text; bar.remove(); remove.hidden = false; },
  };
}

// ---- files attached in this conversation (plan Part 9 C2) ----------------------------------------------------------
// They live in the conversation's items, so they are saved with it and come back when it is reopened. Every message
// carries the list; files attached since the last message are marked fresh. The agent builds from exactly these.
function conversationFiles() {
  return S.items.filter((i) => i.type === 'files').flatMap((i) => i.files || []);
}

// One line per drop: files added together move together ("Use a new engagement for these files"). 17 Nov full pass:
// one line per file let three documents be split into three engagements.
function recordAttachments(added, eid) {
  const eng = S.engById.get(eid);
  pushItem({ type: 'files', engagement: eng ? eng.title : '',
    files: added.map((f) => ({ engagement_id: eid, source_id: f.source_id, name: f.name, fresh: true })) });
}

function filesEl(item) {
  const names = (item.files || []).map((f) => f.name).join(', ');
  const label = h('span', { text: `Attached${item.engagement ? ` to ${item.engagement}` : ''}: ${names}` });
  // C4: files that belong somewhere else get an engagement of their own in one click (copied; nothing is lost)
  const move = item.files && item.files.length && !item.rehomed ? h('button', {
    class: 'linkbtn', type: 'button', text: 'Use a new engagement for these files',
    onclick: async () => {
      move.disabled = true;
      try {
        const from = item.files[0].engagement_id;
        const r = await api(`/api/engagements/${encodeURIComponent(from)}/uploads/new-engagement`, {
          method: 'POST', json: { source_ids: item.files.map((f) => f.source_id) } });
        item.files = item.files.map((f) => ({ ...f, engagement_id: r.engagement_id, source_id: r.source_ids[f.source_id] || f.source_id }));
        item.engagement = r.title;
        item.rehomed = true;
        saveConversation();
        await refreshEngagements();
        setFocus(r.engagement_id);
        label.textContent = `Attached to ${r.title}: ${names}`;
        move.remove();
        toast(`The files now have their own engagement: ${r.title}`);
      } catch {
        move.disabled = false;
        toast('Could not start a new engagement for these files. Try again.');
      }
    },
  }) : null;
  return h('div', { class: 'msg msg--files' }, icon('clip', 'ic--sm'), label, move);
}

function syncAttachments() {
  const box = $('#attachments');
  box.hidden = !box.childElementCount;
}

function uploadErr(status) {
  if (status === 413) return 'Audio over 25 MB. Split the recording and add the parts.';
  if (status === 415) return 'Not a supported file type.';
  if (status === 502) return 'The recording could not be transcribed. Try a clearer or shorter file.';
  if (status === 404) return 'The engagement could not be found.';
  if (status === 503) return 'Reading this kind of file needs HiC running. Text, CSV and audio work without it.';
  if (status === 422) return 'No readable text was found in this file.';
  if (status === 0) return 'The upload did not reach the service.';
  return 'The upload failed. Try again.';
}

function uploadOne(file, eid) {
  const shown = attachmentChip(file);
  const chip = { ...shown, fail(text) { shown.fail(text); noteForAgent(`The upload of "${file.name}" did not work (${text}); that file is not in the engagement`); } };
  const audio = AUDIO_EXT.includes(extOf(file.name));
  if (!TEXT_EXT.includes(extOf(file.name)) && !DOC_EXT.includes(extOf(file.name)) && !audio) {
    chip.fail('Not a supported file type. Use a document, an image, text, subtitles, CSV or audio.');
    return Promise.resolve(false);
  }
  if (file.size > 25 * 1024 * 1024) {
    chip.fail(audio ? 'Audio over 25 MB. Split the recording and add the parts.' : 'File over 25 MB.');
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/engagements/${encodeURIComponent(eid)}/uploads`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { const p = Math.round((e.loaded / e.total) * 100); chip.progress(p, `Uploading ${p}%`); } };
    xhr.upload.onload = () => chip.progress(100, audio ? 'Transcribing' : DOC_EXT.includes(extOf(file.name)) ? 'Reading' : 'Adding');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const eng = S.engById.get(eid);
        const where = eng ? ` to ${eng.title}` : '';
        chip.done(audio ? `Transcribed and added${where}` : `Added${where}`);   // C4: the person sees where the file went
        let sid = '';
        try { sid = String(JSON.parse(xhr.responseText).source_id || ''); } catch { /* the file is added; it just is not listed */ }
        resolve(sid ? { name: file.name, source_id: sid } : true);
        return;
      }
      chip.fail(uploadErr(xhr.status));
      resolve(false);
    };
    xhr.onerror = () => { chip.fail(uploadErr(0)); resolve(false); };
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('title', file.name);
    xhr.send(fd);
  });
}

async function addFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  let eid = S.focus && S.engById.has(S.focus) ? S.focus : null;
  const usable = files.filter((f) => TEXT_EXT.includes(extOf(f.name)) || DOC_EXT.includes(extOf(f.name)) || AUDIO_EXT.includes(extOf(f.name)));
  if (!eid && usable.length) {
    const title = P.engagementTitleFromFile(usable[0].name);
    try {
      const r = await api('/api/engagements', { method: 'POST', json: {
        title, objective: `Find what matters in the uploaded file${usable.length > 1 ? 's' : ''}: ${usable.map((f) => f.name).join(', ')}`.slice(0, 500) } });
      eid = r.id;
      await refreshEngagements();
      setFocus(eid);
      toast(`Started an engagement for your files: ${title}`);
    } catch {
      toast('Could not start an engagement for these files. Try again.');
      return;
    }
  }
  let ok = 0;
  const added = [];
  for (const f of files) {
    const r = await uploadOne(f, eid);
    if (r) ok++;
    if (r && r.source_id) added.push(r);
  }
  if (added.length) recordAttachments(added, eid);
  if (ok) {
    setDockSuggest([{ label: 'Analyze the uploaded files in this engagement', text: 'Analyze the uploaded files in this engagement' }]);
    $('#input').focus();
  }
}

function wireDrop() {
  let depth = 0;
  const zone = $('#dropzone');
  const hasFiles = (e) => [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');
  const show = () => {
    const e = S.focus && S.engById.get(S.focus);
    $('#dropTitle').textContent = e ? `Drop files to add them to ${e.title}` : 'Drop files to start an engagement with them';
    zone.hidden = false;
  };
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; show(); });
  window.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) zone.hidden = true; });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    zone.hidden = true;
    addFiles(e.dataTransfer.files);
  });
}

// ---- sheet: drawers and the viewer ------------------------------------------------------------------
let lastFocus = null;
function openSheet({ title, size = '', body, actions = [] }) {
  const sheet = $('#sheet');
  lastFocus = document.activeElement;
  sheet.className = `sheet${size ? ` sheet--${size}` : ''}`;
  $('#sheetTitle').textContent = title;
  $('#sheetActions').replaceChildren(...actions);
  $('#sheetBody').replaceChildren(body);
  $('#sheetBody').scrollTop = 0;
  sheet.hidden = false;
  $('#sheetPanel').querySelector('[data-close]').focus();
}

function closeSheet() {
  const sheet = $('#sheet');
  if (sheet.hidden) return;
  sheet.hidden = true;
  $('#sheetBody').replaceChildren();
  if (lastFocus && lastFocus.isConnected) lastFocus.focus();
}

function wireSheet() {
  $('#sheet').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#sheet').hidden) closeSheet();
    else if ($('#rail').classList.contains('is-open')) closeRail();
  });
  // Keep keyboard focus inside the open sheet.
  $('#sheetPanel').addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...$('#sheetPanel').querySelectorAll('button, a[href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hidden && x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => { closeRail(); openPanel(b.dataset.panel); }));
}

function openTask(tid) {
  const t = S.full.get(tid);
  const k = P.kindOf(t ? t.kind : (S.tasks.find((x) => x.id === tid) || {}).kind);
  openSheet({ title: k.label, size: 'wide', body: taskCard(tid, { full: true }) });
}

function openMedia(item) {
  const label = item.kind === 'video' ? 'Video' : 'Image';
  const eng = S.engById.get(item.eid);
  const media = item.kind === 'video'
    ? h('video', { src: item.view, controls: true, preload: 'metadata', playsinline: true })
    : h('img', { src: item.view, alt: eng ? `Image for ${eng.title}` : 'Image' });
  openSheet({
    title: label, size: 'wide',
    actions: [h('a', { class: 'btn btn--quiet', href: item.view, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 'ic--sm'), 'Open in a new tab')],
    body: h('div', { class: 'mediaview' },
      eng ? h('p', { class: 'panel__sub', text: `${label} for ${eng.title}, made ${P.ago(item.ts)}.` }) : null,
      media, suggestEl(P.nextAfterMedia(item.kind), 'What next', item.eid)),
  });
}

function openTaskSet(ids, title) {
  if (ids.length === 1) { openTask(ids[0]); return; }
  const items = ids.length ? ids.map((id) => ({ type: 'task', key: id })) : workItems();
  openSheet({ title, size: 'work', body: h('div', { class: 'workgrid' }, items.map(workCard)) });
}

function openApprovals() {
  if (homeVisible() && $('#approvalsBlock')) { $('#approvalsBlock').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  openSheet({ title: 'Waiting for your approval', body: h('div', { class: 'panel' },
    S.approvals.length ? S.approvals.map((a) => approvalCard(a)) : h('div', { class: 'empty' }, h('p', { text: 'Nothing is waiting for your approval.' }))) });
}

async function openPanel(name) {
  if (name === 'history') {
    const body = h('div', { class: 'panel' }, h('p', { class: 'panel__sub', text: 'Loading.' }));
    openSheet({ title: 'Past conversations', body });
    try {
      const list = (await api('/api/conversations')).conversations || [];
      body.replaceChildren(list.length
        ? h('ul', { class: 'convlist' }, list.map((c) => h('li', null, h('button', {
          class: `convrow${c.id === S.conv ? ' convrow--current' : ''}`, type: 'button', onclick: () => reopenConversation(c.id) },
          h('span', { class: 'convrow__title', text: c.title || 'Untitled conversation' }),
          h('span', { class: 'convrow__meta', text: `${c.id === S.conv ? 'Open now, ' : ''}${P.ago(c.updated)}, ${c.items} messages` })))))
        : h('div', { class: 'empty' }, h('p', { text: 'No past conversations yet.' })));
    } catch {
      body.replaceChildren(h('div', { class: 'empty' }, h('p', { text: 'This could not be loaded. Check that the service is running, then open it again.' })));
    }
    return;
  }
  if (name === 'work') {
    const items = workItems();
    openSheet({ title: 'All work', size: 'work', body: items.length ? h('div', { class: 'workgrid' }, items.map(workCard))
      : h('div', { class: 'empty' }, h('p', { text: 'Nothing here yet. Ask for a report, a journey map, a deck or a prototype to get started.' })) });
    return;
  }
  const body = h('div', { class: 'panel' }, h('p', { class: 'panel__sub', text: 'Loading.' }));
  const titles = { memory: 'What I remember', schedules: 'Scheduled work', spend: 'Spend' };
  openSheet({ title: titles[name] || name, body });
  try {
    if (name === 'memory') await paintMemory(body);
    else if (name === 'schedules') await paintSchedules(body);
    else if (name === 'spend') await paintSpend(body);
  } catch {
    body.replaceChildren(h('div', { class: 'empty' }, h('p', { text: 'This could not be loaded. Check that the service is running, then open it again.' })));
  }
}

function memoryEntries(text) {
  return String(text || '').split('\n- ').map((e) => e.trim()).filter((e) => e && !e.startsWith('#')).map((e) => e.replace(/^-\s*/, ''));
}

async function paintMemory(body) {
  const m = await api('/api/memory');
  const groups = [['About you', memoryEntries(m.user), 'user'], ['Notes about your work', memoryEntries(m.memory), 'memory']];
  const forget = async (raw, row) => {
    try {
      const r = await api('/api/memory/forget', { method: 'POST', json: { match: raw } });
      row.remove();
      toast(r.removed && r.removed.length > 1 ? `Forgot ${r.removed.length} entries.` : 'Forgotten.');
    } catch { toast('Could not forget that. Try again.'); }
  };
  const kindSel = h('select', { 'aria-label': 'Where to save it' }, h('option', { value: 'user', text: 'About me' }), h('option', { value: 'memory', text: 'About my work' }));
  const input = h('input', { type: 'text', placeholder: 'Something to remember', 'aria-label': 'Something to remember', maxlength: '400' });
  const add = async () => {
    const text = input.value.trim();
    if (text.length < 3) { input.focus(); return; }
    try {
      await api('/api/memory/remember', { method: 'POST', json: { text, kind: kindSel.value } });
      toast('Saved. New conversations will know this.');
      await paintMemory(body);
    } catch { toast('Could not save that. Try again.'); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  const total = groups.reduce((n, g) => n + g[1].length, 0);
  body.replaceChildren(
    h('p', { class: 'panel__sub', text: 'New conversations start with this. Forget anything, at any time.' }),
    ...(total ? groups.filter((g) => g[1].length).map(([title, entries]) => h('div', { class: 'panel__group' },
      h('h3', { class: 'panel__h', text: title }),
      entries.map((raw) => {
        const e = P.memoryEntry(raw);
        const row = h('div', { class: 'mem' }, h('p', { class: 'mem__text', text: e.text }), h('p', { class: 'mem__meta', text: e.meta }));
        row.append(h('button', { class: 'btn', type: 'button', onclick: () => forget(raw, row) }, 'Forget'));
        return row;
      })))
      : [h('div', { class: 'empty' }, h('p', { text: 'Nothing saved yet. Tell me in the conversation, or add it here.' }),
        h('button', { class: 'prompt', type: 'button', onclick: () => { closeSheet(); fillComposer('Remember that I lead the higher education practice'); } }, 'Remember that I lead the higher education practice'))]),
    h('div', { class: 'panel__group' }, h('h3', { class: 'panel__h', text: 'Add something' }), h('div', { class: 'field' }, input, kindSel),
      h('div', null, h('button', { class: 'btn btn--teal', type: 'button', onclick: add }, 'Remember this'))));
}

async function paintSchedules(body) {
  const r = await api('/api/schedules');
  const list = r.schedules || [];
  if (!list.length) {
    body.replaceChildren(h('div', { class: 'empty' },
      h('p', { text: 'No scheduled work yet. Ask for a weekly refresh of a report or of Reddit listening; you approve each schedule before it runs.' }),
      h('button', { class: 'prompt', type: 'button', onclick: () => { closeSheet(); fillComposer('Refresh my latest research every Monday and tell me what changed'); } }, 'Refresh my latest research every Monday')));
    return;
  }
  body.replaceChildren(...list.map((s) => {
    const active = s.status === 'active';
    const next = s.next_run ? new Date(s.next_run * 1000).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    return h('div', { class: 'sched' },
      h('p', { class: 'sched__name', text: `${P.scheduleName(s.tool)}, ${P.interval(s.every_minutes)}` }),
      h('p', { class: 'sched__meta', text: active ? (next ? `Next run ${next}` : 'Active') : (s.last_error ? 'Paused after it failed several times in a row' : 'Paused') }),
      h('button', { class: 'btn', type: 'button', onclick: async () => {
        try { await api(`/api/schedules/${encodeURIComponent(s.id)}/${active ? 'pause' : 'resume'}`, { method: 'POST' }); toast(active ? 'Paused.' : 'Resumed.'); await paintSchedules(body); refreshAll(); } catch { toast('Could not change the schedule. Try again.'); }
      } }, active ? 'Pause' : 'Resume'));
  }));
}

async function paintSpend(body) {
  const s = await api('/api/spend');
  S.spend = s;
  const max = Math.max(0.0001, ...(s.by_model_7d || []).map((m) => m.usd || 0));
  body.replaceChildren(
    h('div', { class: 'figures' },
      h('div', { class: 'figure' }, h('p', { class: 'figure__label', text: 'Today' }), h('p', { class: 'figure__value', text: P.usd(s.today_usd) }), h('p', { class: 'figure__note', text: plural(s.today_calls, 'model call') })),
      h('div', { class: 'figure' }, h('p', { class: 'figure__label', text: 'Last 7 days' }), h('p', { class: 'figure__value', text: P.usd(s.week_usd) }), h('p', { class: 'figure__note', text: plural(s.week_calls, 'model call') }))),
    (s.by_model_7d || []).length ? h('div', { class: 'panel__group' }, h('h3', { class: 'panel__h', text: 'By model, last 7 days' }),
      h('div', { class: 'bars' }, s.by_model_7d.map((m) => h('div', { class: 'bar' },
        h('span', { text: P.modelName(m.model) }), h('span', { class: 'bar__value', text: `${P.usd(m.usd)}, ${plural(m.calls, 'call')}` }),
        h('div', { class: 'bar__track' }, h('div', { class: 'bar__fill', style: `width:${Math.max(2, (100 * (m.usd || 0)) / max).toFixed(1)}%` })))))) : null,
    h('p', { class: 'panel__sub', text: 'Models without a published price are counted at a cautious estimate, so real spend is usually lower. Work above your per-task limit always asks first.' }));
}

// ---- refresh -------------------------------------------------------------------------------------
async function refreshEngagements() {
  const r = await api(`/api/engagements${S.showHidden ? '?include_hidden=1' : ''}`);
  S.engs = r.engagements || [];
  S.hiddenCount = Number(r.hidden_count) || 0;
  S.engById = new Map(S.engs.map((e) => [e.id, e]));
  if (S.focus && !S.engById.has(S.focus)) setFocus(null);
  renderRail();
  renderFocus();
}

async function loadMedia(eids) {
  await Promise.all(eids.map(async (eid) => {
    try { S.media.set(eid, await api(`/api/engagements/${encodeURIComponent(eid)}/media`)); } catch { /* skip */ }
  }));
  updateRecent();
}

let refreshing = false;
async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  try {
    const [tasks, engs, appr, spend, digest] = await Promise.allSettled([
      api('/api/tasks'), api('/api/engagements'), api('/api/approvals'), api('/api/spend'), api('/api/digest')]);
    if (engs.status === 'fulfilled') {
      S.engs = engs.value.engagements || [];
      S.engById = new Map(S.engs.map((e) => [e.id, e]));
    }
    if (tasks.status === 'fulfilled') S.tasks = tasks.value.tasks || [];
    if (appr.status === 'fulfilled') S.approvals = appr.value.pending || [];
    if (spend.status === 'fulfilled') {
      S.spend = spend.value;
      $('#spendToday').textContent = P.usd(S.spend.today_usd);
      $('#railSpend').textContent = P.usd(S.spend.today_usd);
    }
    if (digest.status === 'fulfilled') { S.digest = digest.value; await loadDigestIds(); }
    const offline = [tasks, engs].every((x) => x.status === 'rejected');
    $('#statusWord').textContent = offline ? 'Service unreachable' : $('#statusWord').textContent;
    renderRail();
    renderFocus();
    if (!offline) updatePresence();
    if (homeVisible()) { updateBand(); updateRecent(); }
    updatePendingBar();
    if (!S.busy) pollEvents();
  } finally {
    refreshing = false;
  }
}

async function initEvents() {
  S.lastEvent = (S.digest && S.digest.last_event) || 0;
  try {
    const ev = await eventsSince(S.lastEvent, 20);
    if (ev.length) S.lastEvent = ev[ev.length - 1].id;
  } catch { /* the next poll catches up */ }
}

let polling = false;
async function pollEvents() {
  if (polling) return;
  polling = true;
  try {
    const ev = await eventsSince(S.lastEvent, 5);
    const mediaEngs = new Set();
    let taskChange = false;
    for (const e of ev) {
      S.lastEvent = Math.max(S.lastEvent, e.id);
      if (S.liveBox) {
        const text = P.eventChip(e);
        if (text) S.liveBox.append(h('span', { class: `chip${e.kind === 'approval_requested' ? ' chip--ask' : ''}`, text }));
      }
      if ((e.kind === 'image_generated' || e.kind === 'video_generated') && e.engagement_id) {
        mediaEngs.add(e.engagement_id);
        // A video is made after an approval, outside any answer: keep it in the conversation so a reload does not lose
        // it. Images come inside an answer (the reply shows them), and events from before this page opened are history.
        const path = e.data && e.data.path;
        if (e.kind === 'video_generated' && !S.busy && path && Number(e.ts || 0) >= PAGE_OPENED) {
          addMediaItem('video', `/api/engagements/${e.engagement_id}/files/${path}`, 'The video you approved is ready');
        }
      }
      if (/^task_/.test(e.kind)) taskChange = true;
    }
    if (mediaEngs.size) loadMedia([...mediaEngs]);
    if (taskChange && !S.busy) {
      const r = await api('/api/tasks');
      S.tasks = r.tasks || [];
      if (homeVisible()) updateRecent();
      updatePresence();
    }
  } catch { /* the next poll tries again */ } finally {
    polling = false;
  }
}

// ---- start ---------------------------------------------------------------------------------------
async function init() {
  $('#railMark').append(presenceEl({ dark: true, still: true }));
  $('#headMark').append(presenceEl({ live: true }));
  wireComposer();
  wireVoice();
  wireDrop();
  wireSheet();
  $('#menuBtn').addEventListener('click', openRail);
  $('#pendingBar').addEventListener('click', openApprovals);
  $('#railClose').addEventListener('click', closeRail);
  $('#railScrim').addEventListener('click', closeRail);
  $('#newConv').addEventListener('click', () => {
    S.conv = null;
    S.items = [];
    LS.del('conv');
    $('#thread').replaceChildren();
    setDockSuggest([]);
    showView();
    closeRail();
    if (homeVisible()) { S.bandSig = ''; S.recentSig = ''; updateBand(); updateRecent(); }
    $('#scroll').scrollTop = 0;
    $('#input').focus();
  });

  try { const seats = await api('/api/seats'); S.threshold = seats.task_spend_approval_usd || 3; } catch { /* default */ }
  await refreshAll();
  if (S.items.length) renderThread(); else showView();
  renderFocus();
  await initEvents();
  loadMedia(S.engs.slice(0, 12).map((e) => e.id));

  setInterval(refreshAll, 15000);
  setInterval(pollTasks, 3000);
  setInterval(tickClocks, 1000);
  pollTasks();
  if (window.matchMedia('(min-width: 921px)').matches) $('#input').focus();
}

init();
