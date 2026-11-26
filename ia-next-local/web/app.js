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
import { initStudio, refreshStudio, showSources, selection as sourceSelection } from './studio.js';
import { initPacks, openPacks, packsLabel, refreshPacks, selectedPacks } from './packs.js';
import { initEngagements, openManager, openSettings } from './engagements.js';
import { initMake, openMake } from './make.js';
import { initOrchestra, taskFlow, turnScene } from './orchestra.js';
import { initPlan, planCard } from './plan.js';
import { initMindTree, mindTree } from './mindtree.js';
import { ASK_EXAMPLES, ASK_PARTS, CAPS, DOCS, OPTIONS, coach, docAsk } from './catalog.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const KEYBOARD = window.matchMedia('(hover: hover) and (pointer: fine)').matches;   // Tab hints only where Tab exists
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
function toast(text, action) {
  const t = $('#toast');
  t.replaceChildren(document.createTextNode(text));
  if (action) {
    t.append(h('button', { class: 'toast__act', type: 'button', onclick: () => { t.hidden = true; action.run(); } }, action.label));
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, action ? 7000 : 4200);
}

function started(e) {
  const d = e && e.created ? new Date(e.created * 1000) : null;
  return d ? `started ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : '';
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

// The engagement a saved conversation worked in: the latest attached file or piece of work that names one.
function conversationEngagement(items) {
  for (const it of [...items].reverse()) {
    const f = it.type === 'files' && (it.files || []).find((x) => x.engagement_id);
    if (f) return f.engagement_id;
    for (const id of [...((it.rec && it.rec.started) || []), ...((it.rec && it.rec.tasks) || [])]) {
      const task = S.full.get(id) || S.tasks.find((x) => x.id === id);
      if (task && task.engagement_id) return task.engagement_id;
    }
  }
  return null;
}

async function reopenConversation(cid) {
  try {
    const c = await api(`/api/conversations/${encodeURIComponent(cid)}`);
    S.conv = c.id;
    S.items = Array.isArray(c.items) ? c.items : [];
    const eid = conversationEngagement(S.items);
    if (eid && S.engById.has(eid) && eid !== S.focus) setFocus(eid);
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
  const k = P.kindOfTask(t);
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
  if (heroState) heroState.textContent = S.busy ? 'Thinking.' : n ? `Working on ${plural(n, 'task')}.` : 'Ready.';
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
  const everything = h('li', { class: 'englist__row' }, h('button', { class: 'eng eng--all', type: 'button', onclick: () => { openEngagement(null); closeRail(); } },
    h('span', { class: 'eng__title', text: 'Everything' }), h('span', { class: 'eng__meta', text: 'All work and chats' })));
  if (!S.engs.length) {
    list.replaceChildren(everything, h('li', { class: 'englist__empty', text: 'No engagements yet. Your first request or upload starts one.' }), ...(toggle ? [toggle] : []));
    return;
  }
  list.replaceChildren(everything, ...S.engs.map((e) => {
    const n = e.task_count ?? (counts.get(e.id) || 0);
    const title = e.title || 'Untitled engagement';
    return h('li', { class: `englist__row${e.hidden ? ' englist__row--hidden' : ''}` }, h('button', {
      class: 'eng', type: 'button', 'aria-pressed': String(S.focus === e.id), 'data-eng': e.id,
      onclick: () => { openEngagement(e.id); closeRail(); },
    }, h('span', { class: 'eng__title', text: title }),
    h('span', { class: 'eng__meta', text: (e.hidden ? 'Hidden. ' : '') + [n ? plural(n, 'piece of work', 'pieces of work') : 'No work yet', started(e)].filter(Boolean).join(' · ') })));
  }), ...(toggle ? [toggle] : []));
}

// Field test 23 Nov (Gap 3): an engagement can be renamed at any time, from its sheet.
async function renameEngagement(e) {
  const title = window.prompt('Name this engagement', e.title || '');
  if (title === null || !title.trim() || title.trim() === e.title) return;
  try {
    await api(`/api/engagements/${encodeURIComponent(e.id)}/rename`, { method: 'POST', json: { title: title.trim() } });
    await refreshEngagements();
    renderFocus();
    toast('Renamed.');
  } catch (err) {
    toast((err && err.message) || 'That did not work. Try again.');
  }
}

async function hideEngagement(eid, hidden) {
  try {
    await api(`/api/engagements/${encodeURIComponent(eid)}/hidden`, { method: 'POST', json: { hidden } });
    if (hidden && S.focus === eid && !S.showHidden) setFocus(null);
    await refreshEngagements();
    toast(hidden ? 'Hidden from the list. Nothing was deleted.' : 'Back in the list.',
      hidden ? { label: 'Undo', run: () => hideEngagement(eid, false) } : null);
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
  refreshStudio(S.focus);
  refreshPacks();                                  // each engagement keeps its own data packs
  updateCoach();
}

const DEFAULT_PLACEHOLDER = 'Ask a question, or describe the work you need';

function renderFocus() {
  // The engagement a request is for is shown and chosen in the message box (owner, 2026-11-19: "make it easy to
  // select/specify engagements to associate with deliverables/artifacts"); the top-bar chip it replaced is gone.
  const e = S.focus && S.engById.get(S.focus);
  const input = $('#input');
  const label = $('#engBtnLabel');
  $('#focusBox').replaceChildren();
  if (label) {
    label.textContent = e ? e.title : 'New engagement';
    $('#engBtn').setAttribute('aria-pressed', String(!!e));
    $('#engBtn').title = e ? `Requests and new work go to ${e.title}. Click to change.` : 'IA Next starts a new engagement from your request. Click to choose one.';
  }
  input.placeholder = e ? `Ask about ${e.title}, or start new work in it` : DEFAULT_PLACEHOLDER;
}

// Choosing the engagement for a request: pick one, search, or start a new one with a name. It opens in the
// right-hand flyout like every panel; choosing sets the focus, which every message and every new piece of work uses.
function openEngagementPicker() {
  const counts = new Map();
  for (const x of S.tasks) counts.set(x.engagement_id, (counts.get(x.engagement_id) || 0) + 1);
  const choose = (eid) => {
    setFocus(eid);
    closeSheet();
    const e = eid && S.engById.get(eid);
    toast(e ? `New requests go to ${e.title}.` : 'IA Next will start a new engagement from your next request.');
    $('#input').focus();
  };
  const name = h('input', { class: 'enpick__name', type: 'text', placeholder: 'Name a new engagement', maxlength: '120', 'aria-label': 'Name a new engagement' });
  const create = async () => {
    const title = name.value.trim();
    // field test 23 Nov (U6): Create with an empty name did nothing and said nothing
    if (title.length < 3) { name.focus(); toast('Give the engagement a name of at least three letters, then press Create.'); return; }
    try {
      const r = await api('/api/engagements', { method: 'POST', json: { title, objective: title } });
      await refreshEngagements();
      choose(r.id);
    } catch { toast('The engagement could not be created. Try again.'); }
  };
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); create(); } });
  const list = h('div', { class: 'enpick__list', role: 'listbox', 'aria-label': 'Engagements' });
  const filter = h('input', { class: 'packpanel__filter', type: 'search', placeholder: 'Search engagements', 'aria-label': 'Search engagements' });
  const row = (label, meta, on, go, extra = '') => h('button', { class: `enpick__row${extra}${on ? ' is-on' : ''}`, type: 'button', role: 'option', 'aria-selected': String(on), onclick: go },
    h('span', { class: 'enpick__dot', 'aria-hidden': 'true' }),
    h('span', { class: 'enpick__main' }, h('span', { class: 'enpick__title', text: label }), h('span', { class: 'enpick__meta', text: meta })));
  const paint = () => {
    const q = filter.value.trim().toLowerCase();
    const rows = S.engs.filter((e) => !q || (e.title || '').toLowerCase().includes(q));
    list.replaceChildren(...(rows.length
      ? rows.map((e) => { const n = e.task_count ?? (counts.get(e.id) || 0); return row(e.title || 'Untitled engagement', [n ? plural(n, 'piece of work', 'pieces of work') : 'No work yet', started(e)].filter(Boolean).join(' · '), S.focus === e.id, () => choose(e.id)); })
      : [h('p', { class: 'packpanel__empty', text: 'No engagement matches that.' })]));
  };
  filter.addEventListener('input', paint);
  paint();
  openSheet({ title: 'Engagement', sub: 'Answers and new work use the files and findings of the engagement you choose.', body: h('div', { class: 'panel enpick' },
    h('button', { class: 'linkbtn', type: 'button', onclick: openManager }, 'Manage engagements: settings, tags, archive, merge'),
    h('div', { class: 'enpick__new' },
      row('New engagement, named from my request', 'IA Next starts one when the work begins', !S.focus, () => choose(null), ' enpick__auto'),
      h('div', { class: 'enpick__create' }, name, h('button', { class: 'btn btn--ink', type: 'button', onclick: create }, 'Create'))),
    filter, list) });
  setTimeout(() => filter.focus(), 0);
}

// ---- an engagement's flyout: its work, its chats and its files, in one place (owner, 2026-11-19: conversations,
// engagements and work were three confusing places). With no engagement it shows everything. Every panel in IA Next
// opens as this right-hand flyout.
// An engagement merged into another shows under the one that remains (Gap 3); its own id still serves its files.
function homeOf(eid) { return (S.mergedInto && S.mergedInto.get(eid)) || eid; }
function engagementOfItem(i) {
  if (i.type === 'media') return homeOf(i.eid);
  const t = S.full.get(i.key) || S.tasks.find((x) => x.id === i.key);
  return t ? homeOf(t.engagement_id) : null;
}

async function chatsPane(eid) {
  let list = [];
  try { list = (await api('/api/conversations')).conversations || []; } catch {
    return h('div', { class: 'empty' }, h('p', { text: 'The chats could not be loaded. Try again in a moment.' }));
  }
  const mine = eid ? list.filter((c) => (c.engagements || []).some((x) => homeOf(x) === eid)) : list;
  if (!mine.length) return h('div', { class: 'empty' }, h('p', { text: eid ? 'No chats in this engagement yet.' : 'No chats yet.' }));
  return h('ul', { class: 'convlist' }, mine.map((c) => {
    const where = !eid && (c.engagements || [])[0] && S.engById.get(c.engagements[0]);
    return h('li', null, h('button', { class: `convrow${c.id === S.conv ? ' convrow--current' : ''}`, type: 'button', onclick: () => reopenConversation(c.id) },
      h('span', { class: 'convrow__title', text: c.title || 'Untitled chat' }),
      h('span', { class: 'convrow__meta', text: [c.id === S.conv ? 'Open now' : P.ago(c.updated), plural(c.items, 'message'), where ? where.title : ''].filter(Boolean).join(' · ') })));
  }));
}

async function openEngagement(eid, tab = 'work') {
  const e = eid ? S.engById.get(eid) : null;
  if (eid && !e) return;
  if (e && S.focus !== eid) setFocus(eid);
  const tabsDef = e ? [['work', 'Work'], ['chats', 'Chats'], ['files', 'Files']] : [['work', 'Work'], ['chats', 'Chats']];
  const pane = h('div', { class: 'flypane' });
  const show = async (id) => {
    tabs.querySelectorAll('.ftab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    if (id === 'work') {
      const items = workItems().filter((i) => !eid || engagementOfItem(i) === eid);
      pane.replaceChildren(items.length ? h('div', { class: 'workgrid' }, items.map(workCard))
        : h('div', { class: 'empty' }, h('p', { text: 'No work yet. Ask for a report, a deck or a map and it appears here.' })));
    } else if (id === 'chats') {
      pane.replaceChildren(h('p', { class: 'panel__sub', text: 'Loading.' }));
      pane.replaceChildren(await chatsPane(eid));
    } else if (id === 'files') {
      pane.replaceChildren(h('div', { id: 'srcPane', 'data-eid': eid }, h('p', { class: 'panel__sub', text: 'Loading the files.' })));
      showSources(eid);
    }
  };
  const tabs = h('div', { class: 'ftabs', role: 'tablist' }, tabsDef.map(([id, label]) => h('button', {
    class: 'ftab', type: 'button', role: 'tab', 'data-tab': id, onclick: () => show(id) }, label)));
  const actions = e ? [
    h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => openSettings(e.id) }, 'Settings'),
    h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => { closeSheet(); hideEngagement(e.id, !e.hidden); } }, e.hidden ? 'Show in the list' : 'Hide from the list'),
    h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => { closeSheet(); setFocus(null); } }, 'Stop focusing')] : [];
  openSheet({ title: e ? e.title : 'Everything', size: 'work', actions, body: h('div', { class: 'flyout' }, tabs, pane) });
  show(tabsDef.some(([id]) => id === tab) ? tab : 'work');
}

function openRail() { $('#rail').classList.add('is-open'); $('#railScrim').hidden = false; $('#menuBtn').setAttribute('aria-expanded', 'true'); }
function closeRail() { $('#rail').classList.remove('is-open'); $('#railScrim').hidden = true; $('#menuBtn').setAttribute('aria-expanded', 'false'); }

// ---- home ----------------------------------------------------------------------------------------
// Minimal, with detail on demand (owner, 2026-11-19: "too wordy"; "don't show everything at once, have elegant panels
// that provide on demand expanded information"). The page shows one question, one group of capability tiles at a time
// (Gather, Make, Keep), and two quiet links. Choosing a tile opens a panel with what it does, who does it and its
// example requests; "How to ask" and "Where the evidence comes from" open side panels. Everything reads catalog.js.

const HOME = { tab: 'make' };

function openCapability(it, g) {
  openSheet({ title: it.title, sub: it.desc, body: capDetail(it, g, () => closeSheet()) });
}

// One panel per capability, shared by the home tiles and the composer's Make menu: what it does, who does it, its
// steering options (the old Studio tiles' choices) with Start, and example requests. `done` closes whatever opened it.
function capDetail(it, g, done = () => {}) {
  const fill = (text) => { done(); fillComposer(text); };
  const ask = (text, label, sendNow) => h('button', { class: 'exask', type: 'button',
    onclick: () => { if (sendNow) { done(); send(text); } else fill(text); } }, h('span', { text: label || text }), icon('arrow', 'ic--sm'));
  const opt = OPTIONS[it.id];
  let form = null;
  if (opt) {
    const values = {};
    const fields = opt.fields.map(([name, choices, placeholder]) => {
      if (choices) {
        values[name] = choices[0];
        const sel = h('select', { class: 'dopt__select', 'aria-label': `${it.title} ${name}` }, ...choices.map((c) => h('option', { value: c, text: c })));
        sel.addEventListener('change', () => { values[name] = sel.value; });
        return h('label', { class: 'dopt' }, h('span', { class: 'dopt__name mono', text: name }), sel);
      }
      values[name] = '';
      const inp = h('input', { class: 'dopt__input', type: 'text', placeholder, 'aria-label': `${it.title} ${name}` });
      inp.addEventListener('input', () => { values[name] = inp.value.trim(); });
      return h('label', { class: 'dopt dopt--wide' }, h('span', { class: 'dopt__name mono', text: name }), inp);
    });
    form = h('div', { class: 'detail__opts' }, ...fields,
      h('button', { class: 'btn btn--ink', type: 'button', onclick: () => fill(opt.ask(values)) }, 'Start', icon('arrow', 'ic--sm')));
  }
  return h('div', { class: 'detail', role: 'region', 'aria-label': it.title },
    h('div', { class: 'detail__head' },
      h('span', { class: 'detail__ic' }, icon(it.icon)),
      h('div', { class: 'detail__titles' },
        h('p', { class: 'kicker', text: g.group }),
        h('h2', { class: 'detail__title', text: it.title })),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Close', onclick: () => done(true) }, icon('close'))),
    h('p', { class: 'detail__desc', text: it.desc }),
    it.who ? h('p', { class: 'detail__who mono', text: it.who }) : null,
    h('p', { class: 'detail__for' }, h('span', { class: 'mono', text: 'For' }),
      h('b', { text: (S.focus && S.engById.get(S.focus)?.title) || 'a new engagement' }),
      h('button', { class: 'linkbtn', type: 'button', onclick: () => openEngagementPicker() }, 'Change')),
    form,
    it.docs ? h('div', { class: 'detail__docs' }, ...DOCS.map(([id, label]) => h('button', { class: 'docchip', type: 'button',
      onclick: () => fill(docAsk(id, label)) }, label, h('span', { class: 'docchip__tag mono', text: `#${id}` })))) : null,
    it.docs ? null : h('div', { class: 'detail__asks' },
      h('p', { class: 'detail__label mono', text: opt ? 'Or start with' : 'Start with' }),
      ask(it.ask), it.also ? ask(it.also.ask, it.also.label, it.also.send) : null,
      it.attach ? h('button', { class: 'btn', type: 'button', onclick: () => { done(); $('#fileInput').click(); } }, icon('clip', 'ic--sm'), 'Add files') : null));
}

function paintTiles() {
  const box = $('#homeTiles');
  if (!box) return;
  const g = CAPS.find((x) => x.id === HOME.tab) || CAPS[1];
  document.querySelectorAll('.htab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === g.id)));
  box.replaceChildren(
    h('div', { class: 'tiles2', role: 'tabpanel', 'aria-label': g.group }, g.items.map((it) => h('button', {
      class: 'ctile', type: 'button', 'aria-haspopup': 'dialog', title: it.short, onclick: () => openCapability(it, g) },
    icon(it.icon), h('span', { class: 'ctile__label', text: it.label || it.title })))));
}

function openAskPanel() {
  let current = 0;
  const sentence = h('p', { class: 'anatomy__sentence' });
  const tabs = h('div', { class: 'anatomy__tabs', role: 'tablist', 'aria-label': 'Example requests' });
  const paint = () => {
    sentence.replaceChildren(...ASK_EXAMPLES[current].parts.map((part, i) => h('span', { class: `anatomy__part anatomy__part--${i}` },
      h('span', { class: 'anatomy__words', text: part }), h('span', { class: 'anatomy__label mono', text: ASK_PARTS[i] }))));
    tabs.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-selected', String(i === current)));
  };
  ASK_EXAMPLES.forEach((ex, i) => tabs.append(h('button', { class: 'anatomy__tab', type: 'button', role: 'tab', onclick: () => { current = i; paint(); } }, ex.label)));
  paint();
  const tip = (title, text) => h('li', { class: 'tip' }, h('p', { class: 'tip__title', text: title }), h('p', { class: 'tip__text', text }));
  openSheet({ title: 'How to ask', size: 'work', sub: 'A good request names four things. Leave one out and IA Next asks, or uses the engagement in focus.', body: h('div', { class: 'panel' },
    h('figure', { class: 'anatomy' }, h('div', { class: 'anatomy__top' }, tabs,
      h('button', { class: 'btn btn--ink', type: 'button', onclick: () => { closeSheet(); fillComposer(ASK_EXAMPLES[current].parts.join(' ')); } }, 'Use this request', icon('arrow', 'ic--sm'))),
    sentence),
    h('ul', { class: 'tips' },
      tip('Hashtags pick the output', '#prd, #roadmap, #personas, #mindmap, #datatable, #audio, #themes. Make lists them all.'),
      tip('Focus an engagement', 'Its files and findings are used. New research runs only when you ask.'),
      tip('Name the data', 'A subreddit (r/NEU), a publication (Higher Ed Dive) or an industry.'))) });
}

function openDataPanel() {
  const go = (label, fn, packs) => h('button', { class: 'linkbtn', type: 'button', 'data-open-packs': packs ? '' : null,
    onclick: () => { closeSheet(); fn(); } }, label, icon('arrow', 'ic--sm'));
  const row = (ic, name, how, does, action) => h('tr', null,
    h('th', { scope: 'row' }, h('span', { class: 'srctab__name' }, icon(ic, 'ic--sm'), name)),
    h('td', null, how), h('td', null, does), h('td', { class: 'srctab__act' }, action || h('span', { class: 'srctab__auto', text: 'Automatic' })));
  openSheet({ title: 'Where the evidence comes from', size: 'work', sub: 'Research reads your files, the data packs you pick and the web. Reddit listening reads the subreddits you name.', body: h('div', { class: 'panel' },
    h('div', { class: 'srctab' }, h('div', { class: 'srctab__wrap' }, h('table', null,
      h('thead', null, h('tr', null, ...['Source', 'How you use it', 'What IA Next does', ''].map((x) => h('th', { scope: 'col', text: x })))),
      h('tbody', null,
        row('clip', 'Your files', 'Files, or drop them on the page', 'Reads and quotes each one', go('Add files', () => $('#fileInput').click())),
        row('packs', 'HiC data packs', ['Data packs, or Auto', h('span', { 'data-pack-stats': '', hidden: true }, ' (', h('span', { 'data-pack-stat': 'packs' }), ' packs, ',
          h('span', { 'data-pack-stat': 'sources' }), ' sources)')], 'Searches every source in each pack', go('Choose', openPacks, true)),
        row('social', 'Reddit', 'Name a subreddit: r/NEU', "Themes and sentiment from Social Research's engine", go('Try it', () => fillComposer(CAPS[0].items[1].ask))),
        row('book', 'Publications', 'Name one: "in Higher Ed Dive"', 'Searches it directly, keeps each date', go('Try it', () => fillComposer('Research [topic] in [publication name] and the web'))),
        row('globe', 'The web and news', 'Nothing to do', 'Searched on every report', null),
        row('layers', 'Earlier research', 'Nothing to do', 'Reused when it fits a new question', null)))))) });
  refreshPacks();                                   // fills the live pack counts
}

function renderHome() {
  $('#home').replaceChildren(
    h('header', { class: 'hello' },
      h('h1', { class: 'hello__title', text: 'What do you want to make?' }),
      h('p', { class: 'hello__sub' }, 'Ask in plain words, or pick a tile. ', h('span', { id: 'heroState', class: 'hero__state', text: 'Ready.' }))),
    h('div', { class: 'htabs', role: 'tablist', 'aria-label': 'What IA Next does' }, CAPS.map((g) => h('button', {
      class: 'htab', type: 'button', role: 'tab', 'data-tab': g.id, onclick: () => { HOME.tab = g.id; paintTiles(); } },
    h('span', { class: 'htab__n mono', text: g.step }), h('span', { class: 'htab__full', text: g.group }),
    h('span', { class: 'htab__short', text: g.group.split(' ')[0] })))),
    h('div', { id: 'homeTiles', class: 'hometiles' }),
    h('div', { class: 'hlinks' },
      h('button', { class: 'linkbtn', type: 'button', onclick: openAskPanel }, 'How to ask'),
      h('button', { class: 'linkbtn', type: 'button', onclick: openDataPanel }, 'Where the evidence comes from'),
      h('button', { class: 'linkbtn', type: 'button', onclick: openMake }, 'Everything in one list')),
    h('section', { id: 'recent', class: 'recent', 'aria-labelledby': 'recentTitle' }));
  paintTiles();
  S.bandSig = ''; S.recentSig = '';
  updateBand();
  updateRecent();
  updatePresence();
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
  if (fin) rows.push({ dot: 'done', text: `${fin} finished`, go: fin === 1 ? 'Open' : 'See them',
    act: () => openTaskSet(S.digestIds.finished, 'Finished since you last looked') });
  if (fail) rows.push({ dot: 'failed', text: `${fail} did not finish`, go: fail === 1 ? 'Open' : 'See them',
    act: () => openTaskSet(S.digestIds.failed, 'Did not finish') });
  if (d.pending_approvals) rows.push({ dot: 'ask', text: `${plural(d.pending_approvals, 'approval')} waiting`, go: 'Review', act: () => openApprovals() });
  if (d.paused_schedules.length) rows.push({ dot: 'muted', text: `${plural(d.paused_schedules.length, 'schedule')} paused`, go: 'Review', act: () => openPanel('schedules') });
  if (d.new_memory_candidates) rows.push({ dot: 'muted', text: `${plural(d.new_memory_candidates, 'note')} to review`, go: 'Memory', act: () => openPanel('memory') });
  return rows.slice(0, 4);
}

// What happened since you last looked lives behind one sidebar item (owner, 2026-11-19: the counts on the home page
// were "useless clutter"): the item shows a count, and the list opens in a side panel only when asked for.
function updateBand() {
  const n = digestRows().length;
  const badge = $('#railUpdates');
  if (badge) { badge.textContent = n ? String(n) : ''; badge.hidden = !n; }
}

function paintUpdates(body) {
  const rows = digestRows();
  body.replaceChildren(rows.length
    ? h('div', { class: 'panel' },
      h('ul', { class: 'uplist' }, rows.map((r) => h('li', null, h('button', { class: 'uprow', type: 'button', onclick: () => { closeSheet(); r.act(); } },
        h('span', { class: `dot dot--${r.dot}`, 'aria-hidden': 'true' }), h('span', { class: 'uprow__text', text: r.text }), h('span', { class: 'uprow__go', text: r.go }))))),
      h('div', null, h('button', { class: 'btn', type: 'button', onclick: async () => { await markDigestRead(); paintUpdates(body); } }, icon('check', 'ic--sm'), 'Mark as read')))
    : h('div', { class: 'empty' }, h('p', { text: 'Nothing new since you last looked.' })));
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
      if (st === 'approved' && a.tool === 'generate_video' && args.engagement_id) awaitNewVideo(args.engagement_id, card, a.id);
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

async function awaitNewVideo(eid, anchor, aid) {
  const before = new Set(((S.media.get(eid) || {}).videos || []).map((v) => v.view));
  const t0 = Date.now();
  const line = anchor.querySelector('.approval__done');
  // the clip is followed to its end: it stopped looking after six minutes and never said a clip had failed (QA 25 Nov)
  while (Date.now() - t0 < 60 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    if (!anchor.isConnected) return;
    if (aid) {
      try {
        const s = await api(`/api/approvals/${encodeURIComponent(aid)}/video`);
        if (s.state === 'failed') {
          if (line) line.textContent = `The video could not be made: ${s.error}`;
          return;
        }
        if (line && s.state === 'working') setText(line, `Approved. The video is being made on this machine (${P.duration(s.minutes * 60)} so far); it appears here when it is ready.`);
        if (line && s.state === 'interrupted') setText(line, 'Approved. The app restarted while the video was being made; it is being made again.');
        if (line && s.state === 'ready') setText(line, 'Approved. The video is ready.');
      } catch { /* keep waiting */ }
    }
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
  const items = workItems().slice(0, 4);
  const sig = items.map((i) => `${i.key}:${i.status}`).join('|');
  if (sig === S.recentSig) return;
  S.recentSig = sig;
  sec.hidden = !items.length;
  if (!items.length) { sec.replaceChildren(); return; }
  sec.replaceChildren(
    h('div', { class: 'recent__head' },
      h('h2', { class: 'recent__title mono', id: 'recentTitle', text: 'Recent work' }),
      h('button', { class: 'linkbtn', type: 'button', onclick: () => openPanel('work') }, 'See all')),
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
  const k = P.kindOfTask(t);
  box.append(h('span', { class: 'card__type' }, icon(k.icon), k.label));
  if (t.status === 'failed') { box.append(h('div', { class: 'thumb__glyph thumb__glyph--failed' }, icon(k.icon))); return box; }
  if (t.status !== 'done') { box.append(h('div', { class: 'thumb__glyph thumb__glyph--working' }, presenceEl({ state: 'working' }))); return box; }
  const view = `/api/tasks/${encodeURIComponent(t.id)}/view`;
  if (t.kind === 'diagram') {
    // the picture itself, never a page: a diagram shows in the conversation as drawn (plan Part 6, S8 and S4)
    box.append(h('img', { class: 'thumb__img thumb__img--contain', src: taskFile(t, pictureName(t)), alt: '', loading: 'lazy' }));
  } else if (['journey_map', 'deck', 'social', 'themes', 'datatable', 'audio_overview', 'video_transcript'].includes(t.kind)) {
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
    const k = P.kindOfTask(t);
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

// Uplift plan WS-1: the code-computed scorecard arrives a moment after the work finishes. A failed hard check adds a
// "Needs review" pill and the failing checks to the card in place, so the result's preview is not reloaded.
function paintReview(el, t) {
  const sc = t.scorecard;
  if (!sc || el.querySelector('.task__review')) return;
  const failed = (sc.checks || []).filter((c) => c.hard && !c.passed);
  const side = el.querySelector('.task__side');
  if (failed.length && side) side.prepend(h('span', { class: 'pill pill--review', text: 'Needs review', title: failed.map((c) => c.detail).join('; ') }));
  const head = el.querySelector('.task__head');
  if (!head) return;
  const passed = (sc.checks || []).filter((c) => c.passed).length;
  const rows = (sc.checks || []).map((c) => h('li', { class: c.passed ? 'ok' : (c.hard ? 'bad' : 'soft') },
    h('b', { text: `${c.passed ? 'Passed' : (c.hard ? 'Failed' : 'Check')}: ${c.name.replace(/_/g, ' ')}` }), ` ${c.detail}`));
  if (sc.judge !== null && sc.judge !== undefined) rows.push(h('li', { class: 'soft' }, h('b', { text: 'Reviewer model:' }), ` ${Number(sc.judge).toFixed(2)} (one opinion; the checks above decide)`));
  // the owner's verdict (uplift plan WS-1 step 3): a rejection and this scorecard become a failure case for the loop
  const verdict = h('p', { class: 'task__verdict' }, 'Your verdict: ',
    h('button', { class: 'btn btn--quiet', type: 'button', onclick: async (ev) => {
      try { await api(`/api/tasks/${encodeURIComponent(t.id)}/feedback`, { method: 'POST', json: { verdict: 'accept' } });
        ev.target.closest('.task__verdict').replaceChildren('Recorded: good.'); } catch { toast('Could not record that.'); } } }, 'Good'),
    ' ',
    h('button', { class: 'btn btn--quiet', type: 'button', onclick: async (ev) => {
      const why = window.prompt('What is wrong with it? (Your words teach the studio.)', '');
      if (why === null) return;
      try { await api(`/api/tasks/${encodeURIComponent(t.id)}/feedback`, { method: 'POST', json: { verdict: 'reject', text: why } });
        ev.target.closest('.task__verdict').replaceChildren('Recorded: needs work.'); } catch { toast('Could not record that.'); } } }, 'Needs work'));
  head.after(verdict);
  head.after(h('details', { class: 'task__review', ...(failed.length ? { open: '' } : {}) },
    // a soft check that did not pass is named in the summary too (23 Nov: "All 7 checks passed" sat above an eighth, flagged)
    h('summary', { text: failed.length ? `Needs review: ${failed.length} check${failed.length > 1 ? 's' : ''} failed`
      : (!(sc.checks || []).length ? 'Not checked: no automatic check applies to this kind of work'
        : passed === (sc.checks || []).length ? `All ${passed} checks passed`
        : `${passed} of ${(sc.checks || []).length} checks passed; ${(sc.checks || []).length - passed} to look at`) }),
    h('ul', null, rows)));
}

// QA 25 Nov (E1, E5): a running card is updated in place. It used to be rebuilt on every poll, which closed
// "Details" under the reader's cursor and replayed the entry animation of every row in the live view.
function setText(node, s) { if (node && node.textContent !== s) node.textContent = s; }
function stepsSig(t) { return JSON.stringify([t.status, (t.nodes || []).map((n) => [n.specialist, n.state, n.model, n.expected_s, !!n.summary])]); }

function paintTask(el, t, opts) {
  if (el.dataset.painted === 'done' && t.status === 'done') { paintReview(el, t); return; }   // results stay put; no iframe reloads
  const liveNow = t.status === 'running' || t.status === 'queued';
  if (liveNow && el.dataset.painted === t.status && el._parts && el._parts.pre.isConnected) {
    const q = el._parts;
    setText(q.title, P.taskTitle(t, S.engById.get(t.engagement_id)));
    setText(q.detail, P.taskDetail(t) || P.kindOfTask(t).label);
    setText(q.spend, `${P.usd(t.spent_usd)} so far`);
    const sig = stepsSig(t);
    if (sig !== q.sig) {
      const fresh = pipelineEl(t);
      q.pipe.replaceWith(fresh);
      q.pipe = fresh;
      q.sig = sig;
    } else {
      const working = (t.nodes || []).filter((n) => n.state === 'running').pop();
      setText(q.pipe.querySelector('.orc__said'), working && working.summary ? working.summary : '');
    }
    setText(q.pre, rawTask(t));
    return;
  }
  const wasOpen = new Set([...el.querySelectorAll('details[open] > summary')].map((s) => s.textContent));
  el.dataset.painted = t.status;
  const k = P.kindOfTask(t);
  const eng = S.engById.get(t.engagement_id);
  const st = P.taskState(t.status);
  const spend = P.isTerminal(t.status) ? `Cost ${P.usd(t.spent_usd)}` : `${P.usd(t.spent_usd)} so far`;

  const titleEl = h('p', { class: 'task__title', text: P.taskTitle(t, eng) });
  const detailEl = h('p', { class: 'task__detail', text: P.taskDetail(t) || k.label });
  const spendEl = h('span', { class: 'task__spend mono', text: spend });
  const head = h('div', { class: 'task__head' },
    h('div', { class: 'task__ic', title: k.label }, icon(k.icon)),
    h('div', null, titleEl, detailEl),
    h('div', { class: 'task__side' },
      h('span', { class: `pill pill--${st.key}`, text: st.word }),
      spendEl));

  const pipe = pipelineEl(t);
  const kids = [head, pipe];

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
    const feed = liveEl(t);
    if (feed) kids.push(feed);
  } else if (t.status === 'done') {
    kids.push(h('p', { class: 'task__outcome' }, h('b', { text: `${t.kind === 'audio_overview' && audioReady(t) ? 'Audio ready' : k.ready}. ` }), P.outcome(t)));
    if ((t.kind === 'research_report' && !P.isEvidence(t)) || t.kind === 'artifact') kids.push(checksEl(t, opts));
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
  const det = detailsEl('Details', rawTask(t));
  kids.push(det);
  el.replaceChildren(...kids);
  el.querySelectorAll('details > summary').forEach((s) => { if (wasOpen.has(s.textContent)) s.parentElement.open = true; });
  el._parts = liveNow ? { title: titleEl, detail: detailEl, spend: spendEl, pipe, sig: stepsSig(t), pre: det.querySelector('pre') } : null;
  if (t.status === 'done') paintReview(el, t);
}

function pipelineEl(t) { return taskFlow(t); }

// Field test 23 Nov (Gap 2): what a running task has found so far, shown as it arrives. Research writes live.json
// (sources as they are read, findings as their quotes are checked); themes write themes.json as each batch is named.
// One element per task survives the card's repaints, so rows already shown do not flash.
const liveEls = new Map();
function liveEl(t) {
  if (!['research_report', 'themes'].includes(t.kind)) return null;
  if (liveEls.has(t.id)) return liveEls.get(t.id);
  const el = h('div', { class: 'livefeed', 'aria-live': 'polite' });
  liveEls.set(t.id, el);
  const seen = new Set();
  const section = (key, title) => {
    let box = el.querySelector(`[data-live="${key}"]`);
    if (!box) {
      box = h('div', { class: 'livefeed__sec', 'data-live': key }, h('p', { class: 'livefeed__head', text: title }), h('ul', { class: 'livefeed__list' }));
      el.append(box);
    }
    return box;
  };
  const add = (key, title, id, node, count, open) => {
    const box = section(key, title);
    setText(box.querySelector('.livefeed__head'), count);
    if (seen.has(`${key}:${id}`)) return;
    seen.add(`${key}:${id}`);
    node.classList.add('livefeed__row');
    node.dataset.new = '';
    node.addEventListener('animationend', () => { delete node.dataset.new; }, { once: true });
    if (open) {                                   // the row opens for reading; the run carries on
      node.classList.add('livefeed__row--open');
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.addEventListener('click', open);
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    box.querySelector('ul').prepend(node);
  };
  const eid = t.engagement_id;
  let subjectsSig = '';
  const poll = async () => {
    const cur = S.full.get(t.id) || t;
    if (!el.isConnected && seen.size) { if (P.isTerminal(cur.status)) { clearInterval(timer); liveEls.delete(t.id); } return; }
    try {
      if (t.kind === 'themes') {
        const d = await api(taskFile(t, 'themes.json'));
        (d.themes || []).forEach((th) => add('themes', '', th.id, h('li', null,
          h('b', { text: th.name }), h('span', { text: ` ${th.passages} passages, ${(th.sources || []).length} source${(th.sources || []).length === 1 ? '' : 's'}` }),
          th.quote ? h('q', { text: th.quote.slice(0, 180) }) : null),
          `${(d.themes || []).length} of ${d.clusters || (d.themes || []).length} themes named so far`,
          () => openTheme(eid, th)));
      } else {
        const d = await api(taskFile(t, 'live.json'));
        if (d.note) {
          let note = el.querySelector('.livefeed__note');
          if (!note) { note = h('p', { class: 'livefeed__note' }); el.prepend(note); }
          setText(note, d.note);
        }
        const sig = JSON.stringify(d.subjects || []);
        if ((d.subjects || []).length && sig !== subjectsSig) {   // drawn again only when the subjects changed
          subjectsSig = sig;
          const fresh = !el.querySelector('[data-live="subjects"]');
          const box = section('subjects', '');
          setText(box.querySelector('.livefeed__head'), 'Subjects recurring across the sources so far');
          box.querySelector('ul').replaceChildren(h('li', { class: 'livefeed__subjects' }, d.subjects.map((x) =>
            h('button', { class: 'livefeed__subject', type: 'button', title: `${x.sources} sources. Open to read where they mention it.`, onclick: () => openSubject(eid, x.subject) },
              x.subject, h('i', { text: String(x.sources) })))));
          if (fresh) el.prepend(box);
        }
        (d.findings || []).forEach((f, i) => add('findings', '', i, h('li', null, h('b', { text: f.claim }),
          f.quote ? h('q', { text: f.quote.slice(0, 200) }) : null, h('span', { text: ` ${f.source}` })),
          `${(d.findings || []).length} findings checked against their sources so far`,
          f.source_id ? () => openSource(eid, f.source_id, {}, f.quote || '', f.claim || '') : null));
        (d.sources || []).forEach((s, i) => add('sources', '', i, h('li', null, h('b', { text: s.title }),
          h('span', { text: [s.publisher, s.date ? dayOf(s.date) : 'undated', s.pack && s.pack !== 'general' ? 'data pack' : ''].filter(Boolean).join(' · ') })),
          `${(d.sources || []).length} sources read so far`,
          s.id ? () => openSource(eid, s.id, s) : null));
      }
    } catch { /* nothing written yet */ }
    if (P.isTerminal(cur.status)) { clearInterval(timer); liveEls.delete(t.id); }
  };
  const timer = setInterval(poll, 4000);
  setTimeout(poll, 600);
  return el;
}

function dayOf(d) {
  const x = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- reading while work runs (QA 25 Nov, E1): a source in full, where a subject is mentioned, a theme, and a box to
// ask about what is open. None of it touches the run: the text is what the engagement already holds, and a question
// takes one turn on the card (or runs on the processor) while the work carries on.
function askBox(eid, scope) {
  const log = h('div', { class: 'reading__answers', 'aria-live': 'polite' });
  const input = h('textarea', { class: 'reading__q', rows: '2', placeholder: scope.placeholder, 'aria-label': scope.label });
  const send = h('button', { class: 'btn', type: 'button' }, 'Ask');
  const go = async () => {
    const q = input.value.trim();
    if (q.length < 3) return;
    send.disabled = true;
    input.value = '';
    const slot = h('p', { class: 'passage__note', text: 'Reading. Work that is running carries on.' });
    log.prepend(h('div', { class: 'reading__qa' }, h('p', { class: 'reading__asked', text: q }), slot));
    try {
      const r = await api(`/api/engagements/${encodeURIComponent(eid)}/ask`, { method: 'POST', json: { question: q, source_ids: scope.source_ids || [], subject: scope.subject || '' } });
      slot.replaceWith(h('div', { class: 'reading__reply', md: P.scrubIds ? P.scrubIds(r.reply || '') : (r.reply || '') }));
    } catch (e) {
      slot.textContent = (e && e.message) || 'The question could not be answered just now.';
    }
    send.disabled = false;
  };
  send.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
  return h('section', { class: 'reading__ask' }, h('p', { class: 'livefeed__head', text: scope.label }),
    h('div', { class: 'reading__askrow' }, input, send), log);
}

function markIn(text, needle) {
  const i = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (i < 0) return h('p', { class: 'reading__para', text });
  return h('p', { class: 'reading__para' }, text.slice(0, i), h('mark', { text: text.slice(i, i + needle.length) }), text.slice(i + needle.length));
}

async function openSource(eid, sid, meta = {}, quote = '', claim = '') {
  const body = h('div', { class: 'cite-sheet reading' }, h('p', { text: 'Loading the source.' }));
  openSheet({ title: 'Source', size: 'work', body });
  let s;
  try {
    s = await api(`/api/engagements/${encodeURIComponent(eid)}/reading?source=${encodeURIComponent(sid)}`);
  } catch {
    body.replaceChildren(h('p', { text: 'This source is not held yet. Try again in a moment.' }));
    return;
  }
  const date = s.date || meta.date || '';
  const line = [s.publisher || meta.publisher, date ? dayOf(date) : 'undated'].filter(Boolean).join(' · ');
  const url = s.url || meta.url || '';
  const head = h('header', { class: 'cite-sheet__head' },
    h('h3', { class: 'cite-sheet__title', text: s.title }),
    h('p', { class: 'cite-sheet__meta', text: line }),
    /^https?:/.test(url) ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'linkbtn' }, 'Open the original') : null,
    claim ? h('p', { class: 'cite-sheet__claim', text: `Finding: ${claim}` }) : null);
  const paras = String(s.text || '').split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
  const short = quote ? quote.slice(0, 80) : '';
  const text = h('article', { class: 'reading__text' }, paras.map((x) => markIn(x, x.toLowerCase().includes(quote.toLowerCase()) ? quote : short)));
  body.replaceChildren(head, askBox(eid, { source_ids: [sid], label: 'Ask about this source', placeholder: 'What does this source say about ...' }), text);
  const hit = text.querySelector('mark');
  if (hit) hit.scrollIntoView({ block: 'center' });
}

async function openSubject(eid, subject) {
  const body = h('div', { class: 'cite-sheet reading' }, h('p', { text: 'Finding where the sources mention it.' }));
  openSheet({ title: 'Subject', size: 'work', body });
  let d;
  try {
    d = await api(`/api/engagements/${encodeURIComponent(eid)}/mentions?subject=${encodeURIComponent(subject)}`);
  } catch {
    body.replaceChildren(h('p', { text: 'The sources could not be read just now. Try again in a moment.' }));
    return;
  }
  const rows = (d.sources || []).map((x) => h('li', { class: 'reading__src' },
    h('button', { class: 'linkbtn reading__srcbtn', type: 'button', onclick: () => openSource(eid, x.source_id, x, (x.sentences || [])[0] || '') }, x.title),
    (x.sentences || []).map((q) => { const n = markIn(q, subject); n.className = 'reading__sentence'; return n; })));
  body.replaceChildren(
    h('header', { class: 'cite-sheet__head' }, h('h3', { class: 'cite-sheet__title', text: subject }),
      h('p', { class: 'cite-sheet__meta', text: `${rows.length} source${rows.length === 1 ? '' : 's'} read so far mention it` })),
    askBox(eid, { subject, label: 'Ask about this subject', placeholder: `What do the sources say about ${subject}?` }),
    rows.length ? h('ul', { class: 'reading__list' }, rows) : h('p', { class: 'passage__note', text: 'No source read so far names it in a full sentence.' }));
}

function openTheme(eid, th) {
  const ids = (th.sources || []).map((x) => (typeof x === 'string' ? x : x && x.id)).filter(Boolean);
  const body = h('div', { class: 'cite-sheet reading' },
    h('header', { class: 'cite-sheet__head' }, h('h3', { class: 'cite-sheet__title', text: th.name }),
      h('p', { class: 'cite-sheet__meta', text: `${th.passages} passages from ${ids.length} source${ids.length === 1 ? '' : 's'}` }),
      th.summary ? h('p', { class: 'reading__para', text: th.summary }) : null),
    askBox(eid, { source_ids: ids.slice(0, 12), subject: th.name, label: 'Ask about this theme', placeholder: 'What is behind this theme?' }),
    (th.quotes || (th.quote ? [{ quote: th.quote }] : [])).length ? h('ul', { class: 'reading__list' },
      (th.quotes || [{ quote: th.quote }]).map((q) => h('li', { class: 'reading__src' },
        h('blockquote', { class: 'reading__sentence', text: `"${typeof q === 'string' ? q : q.quote}"` }),
        q && q.source_id ? h('button', { class: 'linkbtn', type: 'button', onclick: () => openSource(eid, q.source_id, {}, q.quote || '') }, q.source || 'Open its source') : null))) : null,
    ids.length ? h('div', null, h('p', { class: 'livefeed__head', text: 'Sources behind it' }),
      h('ul', { class: 'reading__list' }, ids.map((sid) => h('li', null,
        h('button', { class: 'linkbtn', type: 'button', onclick: () => openSource(eid, sid) }, `Open source ${sid}`))))) : null);
  openSheet({ title: 'Theme', size: 'work', body });
}

function rawTask(t) {
  // What is happening, in words (QA 25 Nov, E5): each step, its state, how long, and the model answering right now.
  const now = Date.now() / 1000;
  const lines = [`${P.kindOfTask(t).label}: ${P.taskState(t.status).word.toLowerCase()}`];
  if (t.summary) lines.push(`Summary: ${t.summary}`);
  if (t.error) lines.push(`Error: ${t.error}`);
  const nodes = t.nodes || [];
  if (nodes.length) lines.push('', 'Steps');
  for (const n of nodes) {
    const took = n.started ? P.duration((n.finished || now) - n.started) : '';
    const state = n.state === 'running' ? `working now, ${took} so far` : n.state === 'done' ? `done in ${took}` : n.state;
    lines.push(`${n.specialist}: ${state}`);
    if (n.model) lines.push(`   ${n.state === 'running' ? 'model answering' : 'answered by'}: ${n.model}`);
    if (n.summary) lines.push(`   ${n.summary}`);
    if (n.error) lines.push(`   error: ${n.error}`);
  }
  lines.push('', `Reference: task ${t.id}, engagement ${t.engagement_id}`);
  return lines.join('\n');
}

function resultEl(t, opts) {
  const wrap = h('div', { class: 'result' });
  const view = `/api/tasks/${encodeURIComponent(t.id)}/view`;
  const k = P.kindOfTask(t);
  if (t.kind === 'research_report' && !P.isEvidence(t)) {
    const md = h('div', { class: 'md' }, h('p', { text: 'Loading the report.' }));
    const reader = h('article', { class: `reader${opts.full ? '' : ' reader--clip'}`, 'data-eid': t.engagement_id }, md);
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
  } else if (t.kind === 'transcript' || P.isEvidence(t)) {
    const list = h('ul', { class: 'findings' }, h('li', { class: 'finding', text: 'Loading the findings.' }));
    wrap.append(list);
    Promise.all([getFindings(t.id), sourceMeta(t.engagement_id)]).then(([d, meta]) => {
      // sources-only evidence (a themes plan stops at collection): the card lists the sources it read
      const all = d.findings || (d.sources || []).filter((s) => s.currency || s.date || s.pack || s.publisher)
        .map((s) => ({ claim: s.title || s.id, quote: '', source_id: s.id }));
      const shown = opts.full ? all : all.slice(0, 3);
      // QA 25 Nov (E2): every finding names its publication, the article, its date, and opens the source at the quote
      list.replaceChildren(...shown.map((f) => {
        const s = meta[f.source_id] || {};
        const name = String(s.title || '').replace(/^[^:]{2,48}: /, (m) => (s.publisher && m.startsWith(s.publisher) ? '' : m));
        const cite = [f.speaker, s.publisher, name, s.date ? dayOf(s.date) : (s.title ? 'undated' : '')].filter(Boolean).join(' · ');
        return h('li', { class: 'finding' },
          h('p', { class: 'finding__claim', text: f.claim || '' }),
          f.quote ? h('blockquote', { class: 'finding__quote', text: f.quote }) : null,
          h('p', { class: 'finding__who' }, cite || 'Source not named',
            f.source_id ? h('button', { class: 'linkbtn finding__open', type: 'button', onclick: () => openSource(t.engagement_id, f.source_id, s, f.quote || '', f.quote ? f.claim || '' : '') }, 'Open the source') : null));
      }));
      if (!opts.full && all.length > shown.length) {
        list.append(h('li', null, h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => openTask(t.id) }, `See all ${all.length} findings`)));
      }
    }).catch(() => { list.replaceChildren(h('li', { class: 'finding', text: 'The findings could not be loaded.' })); });
  } else if (t.kind === 'diagram') {
    const src = taskFile(t, pictureName(t));
    wrap.append(h('a', { class: 'picture', href: src, target: '_blank', rel: 'noopener noreferrer', title: 'Open the picture full size' },
      h('img', { src: `${src}?v=${encodeURIComponent(t.updated || '')}`, alt: P.taskTitle(t, S.engById.get(t.engagement_id)), loading: 'lazy' })));
    wrap.append(mindTree(t.id));           // a mind map can also be explored: branches, sentences, the passages behind them
  } else if (['journey_map', 'deck', 'social', 'themes', 'datatable', 'audio_overview', 'video_transcript'].includes(t.kind)) {
    if (t.kind === 'audio_overview') wrap.append(audioEl(t));
    // the version stamp makes a re-rendered deck (a brand switch) load fresh instead of from the cache
    // A journey map's page is laid out by code from escaped text and carries its own small script (lanes on and off,
    // a phase brought forward). It runs in a sandbox that allows scripts and nothing else: no same-origin, and the
    // page's policy refuses every connection. The other exhibits have no script and keep the empty sandbox.
    wrap.append(h('iframe', { class: 'frame', src: `${view}?v=${encodeURIComponent(t.updated || '')}`, sandbox: `${t.kind === 'journey_map' ? 'allow-scripts ' : ''}allow-popups allow-popups-to-escape-sandbox`, title: k.label, loading: 'lazy', referrerpolicy: 'no-referrer' }));
  } else if (t.kind === 'artifact') {
    wrap.append(h('iframe', { class: 'frame', src: view, title: k.label, loading: 'lazy', referrerpolicy: 'no-referrer' }));
  } else if (t.kind === 'prototype') {
    // The wrapper page sandboxes the prototype itself (see the note at the top of this file).
    wrap.append(h('div', { class: 'framecrop' }, h('iframe', { class: 'frame', src: `${view}?embed=1`, title: 'Prototype', loading: 'lazy', referrerpolicy: 'no-referrer' })));
  }
  return wrap;
}

// id -> {title, publisher, date, url} for every source an engagement holds (the Sources panel's own list)
const metaCache = new Map();
function sourceMeta(eid) {
  const hit = metaCache.get(eid);
  if (hit && Date.now() - hit.at < 20000) return hit.p;
  const pr = api(`/api/engagements/${encodeURIComponent(eid)}/sources`)
    .then((d) => Object.fromEntries((d.sources || []).filter((s) => s.id).map((s) => [s.id, s])))
    .catch(() => ({}));
  metaCache.set(eid, { at: Date.now(), p: pr });
  return pr;
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
  artifact: 'Open the document', themes: 'Open the themes', diagram: 'Open the picture and its sources',
  datatable: 'Open the table', audio_overview: 'Open the transcript', video_transcript: 'Open the transcript',
};

// Files a studio output keeps in its task folder (served by the engagement files route).
function taskFile(t, name) {
  return `/api/engagements/${encodeURIComponent(t.engagement_id)}/files/results/tasks/${encodeURIComponent(t.id)}/${name}`;
}
function pictureName(t) {
  return ((t.brief && t.brief.mode) === 'infographic' || /infographic/i.test(t.summary || '')) ? 'infographic.png' : 'diagram.png';
}
function audioReady(t) { return /^Audio ready/.test(t.summary || ''); }

// Plan Part 6, S1: the voices play in the card once rendered; until then one button asks for the approval with its price.
function audioEl(t) {
  if (audioReady(t)) {
    // the voices, and the same voices over the engagement's slides as a video overview (made on request)
    const video = h('button', { class: 'btn btn--quiet', type: 'button', title: 'The voices over this engagement\u2019s newest slides, as an MP4' },
      icon('video', 'ic--sm'), 'Video overview');
    // 22 Nov: the button used to fetch the whole MP4 and save it with no sign of progress, so the owner saw a video
    // that did not load. It now says what is happening, then plays the video in the card with a download link.
    const holder = h('div', { class: 'videowrap' });
    video.addEventListener('click', async () => {
      video.disabled = true;
      const url = `/api/tasks/${encodeURIComponent(t.id)}/video`;
      holder.replaceChildren(h('p', { class: 'muted', text: 'Making the video overview on this machine. The first time takes about two minutes.' }));
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (!r.ok) { holder.replaceChildren(); toast('The video overview could not be made.'); return; }
        holder.replaceChildren(
          h('video', { src: url, controls: true, preload: 'metadata', playsinline: true, style: 'width:100%;max-width:960px;border-radius:4px;background:#000' }),
          h('a', { href: url, download: 'video-overview.mp4', class: 'btn btn--quiet', text: 'Download the MP4' }));
      } catch { holder.replaceChildren(); toast('The video overview could not be made.'); } finally { video.disabled = false; }
    });
    return h('div', { class: 'audiowrap' },
      h('audio', { class: 'player', controls: true, preload: 'none', src: `${taskFile(t, 'audio.mp3')}?v=${encodeURIComponent(t.updated || '')}` }), video, holder);
  }
  if (t.status !== 'done') return h('span');
  const btn = h('button', { class: 'btn btn--accent', type: 'button', onclick: async () => {
    btn.disabled = true;
    try {
      const out = await api(`/api/tasks/${encodeURIComponent(t.id)}/audio`, { method: 'POST' });
      if (out.approval === 'pending') toast(`Approve the voices on the approval card${out.estimate_usd ? ` (about ${Number(out.estimate_usd).toFixed(2)} USD)` : ''}.`);
      else if (out.rendering) {
        // the card says so itself and repaints when the voices exist (audio_rendered event); no reload needed
        toast('The voices are being made on this machine. The player appears on this card when they are ready.');
        btn.replaceChildren(icon('transcript', 'ic--sm'), 'Making the voices (a few minutes)');
        return;
      }
      else if (out.rendered) { await refreshTask(t.id); toast('The audio overview is ready to play.'); }
      else toast(out.message || out.error || 'The voices could not be rendered.');
    } catch (e) {
      toast((e && e.message) || 'The voices could not be rendered.');
    }
    btn.disabled = false;
  } }, icon('transcript', 'ic--sm'), 'Make the audio');
  return h('div', { class: 'audiorow' }, btn, h('span', { class: 'audiorow__note', text: 'The script is checked. The voices ask for your approval first.' }));
}

// Enhancement plan B7: the reviewer's verdict as one of three labels, with every check in plain words.
function checksEl(t, opts) {
  const wrap = h('div', { class: 'checks' }, h('p', { class: 'checks__head', text: 'Loading the checks.' }));
  api(`/api/tasks/${encodeURIComponent(t.id)}/verification`).then((v) => {
    if (!v || v.verified === false) throw new Error('no check record');
    const lv = P.checkLevel(v);
    const lines = P.checkLines(v);
    const who = v.judge && v.judge.judge_model ? `Reviewed by ${v.judge.judge_model}, a model from a different vendor than the writer.`
      : 'Checked by the rules in code: every quote found in its source, citations and wording. Ask for a deep review to add a second model.';
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

// Owner 2026-11-19: every finished artifact downloads as pictures, a PDF and 16:9 PowerPoint slides. The file is made
// on the server (the first time can take a minute for a long page), so the button says it is working until it arrives.
const EXPORTS = [['png', 'Image'], ['pdf', 'PDF'], ['pptx', 'PowerPoint']];
const EXPORT_KINDS = ['research_report', 'journey_map', 'deck', 'social', 'transcript', 'prototype', 'artifact', 'themes',
  'diagram', 'datatable', 'audio_overview', 'video_transcript'];
async function downloadExport(t, fmt, word, btn) {
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  const label = btn.querySelector('.dl__word');
  if (label) label.textContent = 'Preparing';
  try {
    const r = await fetch(`/api/tasks/${encodeURIComponent(t.id)}/export/${fmt}`);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.detail || `The ${word} could not be made.`);
    }
    const blob = await r.blob();
    const cd = r.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="([^"]+)"/);
    const name = m ? decodeURIComponent(m[1]) : `${t.kind}.${fmt}`;
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    toast((e && e.message) || `The ${word} could not be made.`);
  } finally {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    if (label) label.textContent = word;
  }
}
function downloadsEl(t) {
  return h('div', { class: 'dl', role: 'group', 'aria-label': 'Download' },
    h('span', { class: 'dl__label' }, icon('download', 'ic--sm'), 'Download'),
    ...EXPORTS.map(([fmt, word]) => {
      const b = h('button', { class: 'dl__btn', type: 'button', title: fmt === 'pptx' ? '16:9 slides' : (fmt === 'png' ? 'PNG pictures' : 'PDF pages') },
        h('span', { class: 'dl__word', text: word }));
      b.addEventListener('click', () => downloadExport(t, fmt, word, b));
      return b;
    }));
}

function actionsEl(t, opts) {
  const row = h('div', { class: 'task__actions' });
  const view = `/api/tasks/${encodeURIComponent(t.id)}/view`;
  if (t.status === 'done' && EXPORT_KINDS.includes(t.kind)) row.append(downloadsEl(t));
  if (t.kind === 'deck') {
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
  if (!opts.full) row.append(h('button', { class: 'btn', type: 'button', onclick: () => openTask(t.id) },
    P.isEvidence(t) ? 'See all findings' : (OPEN_WORDS[t.kind] || 'Open')));
  if (['journey_map', 'deck', 'social', 'prototype', 'artifact', 'themes', 'diagram', 'datatable', 'audio_overview', 'video_transcript'].includes(t.kind)) {
    row.append(h('a', { class: 'btn btn--quiet', href: view, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 'ic--sm'), 'Open in a new tab'));
  }
  if (t.status === 'done' && t.kind === 'video_transcript') {
    const sid = (String(t.summary || '').match(/stored as (S\d+)/) || [])[1] || '';
    const name = String((t.brief || {}).title || 'the recording');
    if (sid) {
      row.prepend(h('button', { class: 'btn btn--accent', type: 'button', title: 'The next message you send is written from this transcript', onclick: () => {
        if (!conversationFiles().some((x) => x.source_id === sid && x.engagement_id === t.engagement_id)) {
          recordAttachments([{ name: `${name} (transcript)`, source_id: sid }], t.engagement_id);
        }
        fillComposer(`From the transcript of "${name}", `);
      } }, icon('clip', 'ic--sm'), 'Use in my next message'));
    }
    // owner 22 Nov: links to download the transcripts
    for (const [file, word] of [['transcript.txt', 'TXT'], ['transcript.md', 'Markdown'], ['transcript.srt', 'SRT'], ['transcript.vtt', 'VTT']]) {
      row.append(h('a', { class: 'btn btn--quiet', href: taskFile(t, file), download: file }, icon('download', 'ic--sm'), `Transcript (${word})`));
    }
  }
  if (t.status === 'done' && t.kind === 'social') {
    row.append(h('a', { class: 'btn btn--quiet', href: `/api/tasks/${encodeURIComponent(t.id)}/posts.csv`, download: 'reddit-posts.csv' }, icon('download', 'ic--sm'), 'Download posts (CSV)'));
  }
  if (t.status === 'done' && t.kind === 'datatable') {
    row.append(h('a', { class: 'btn btn--quiet', href: taskFile(t, 'datatable.csv'), download: 'datatable.csv' }, icon('download', 'ic--sm'), 'Download CSV'));
  }
  if (t.status === 'done' && t.kind === 'audio_overview' && audioReady(t)) {
    row.append(h('a', { class: 'btn btn--quiet', href: taskFile(t, 'audio.mp3'), download: 'audio-overview.mp3' }, icon('download', 'ic--sm'), 'Download the audio'));
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
  const rec = { reply: r.reply || '', chips: [], tasks: [], approvals: [], plans: [], media: [], work: [], changed: [], started: [], raw: '' };
  const listed = [];
  for (const tr of r.trace || []) {
    const out = tr.output && typeof tr.output === 'object' ? tr.output : {};
    rec.chips.push(P.toolChip(tr.tool, out));
    if (typeof out.task_id === 'string' && !rec.tasks.includes(out.task_id)) rec.tasks.push(out.task_id);
    if ((tr.tool === 'task_status' || tr.tool === 'read_report') && !out.error && tr.input && typeof tr.input.task_id === 'string' && !rec.tasks.includes(tr.input.task_id)) rec.tasks.push(tr.input.task_id);
    if ((tr.tool === 'rebrand_deck' || tr.tool === 'revise_slide') && !out.error && typeof out.task_id === 'string') rec.changed.push(out.task_id);
    if (/^(start_|analyze_uploads$|retry_task$)/.test(tr.tool) && out.started && typeof out.task_id === 'string') rec.started.push(out.task_id);
    if (out.approval === 'pending' && typeof out.approval_id === 'string') rec.approvals.push(out.approval_id);
    if (out.plan === 'proposed' && typeof out.plan_id === 'string' && !rec.plans.includes(out.plan_id)) rec.plans.push(out.plan_id);
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
  for (const pid of rec.plans || []) body.append(planCard(pid));
  if (!S.focus && (rec.plans || []).length && !rec._focused) {       // "New engagement" became a real one (E9)
    rec._focused = true;
    api(`/api/plans/${encodeURIComponent(rec.plans[0])}`).then(async (pl) => {
      if (!pl || !pl.engagement_id || S.focus) return;
      if (!S.engById.has(pl.engagement_id)) await refreshEngagements();
      if (S.engById.has(pl.engagement_id)) setFocus(pl.engagement_id);
    }).catch(() => { /* the card still shows where it is filed */ });
  }
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
  if (item.type === 'recordings') return recordingsEl(item);
  return h('div');
}

// Attached recordings, as a request and its answer: what was attached, one card per recording with its steps (who is
// working, on what, for how long), and a line that says when each transcript is ready. A ready transcript joins the
// files of the conversation, so the next message is written from it (QA 25 Nov, E15).
function recordingsEl(item) {
  const files = item.files || [];
  const many = files.length > 1;
  const status = h('p', { class: 'recordings__status', role: 'status' });
  const cards = files.map((f) => taskCard(f.task_id));
  const state = new Map();
  const say = () => {
    const done = files.filter((f) => state.get(f.task_id) === 'done').length;
    const failed = files.filter((f) => ['failed', 'stopped'].includes(state.get(f.task_id))).length;
    const left = files.length - done - failed;
    status.classList.toggle('recordings__status--ready', !left && done > 0);
    setText(status, left
      ? `Whisper large-v3 is transcribing ${many ? `${files.length} recordings, one after another` : 'it'} on this machine. ${done ? `${plural(done, 'transcript')} ready so far. ` : ''}Each card shows who is working and how far it is.`
      : done ? `${many ? `${plural(done, 'transcript')} are` : 'The transcript is'} ready${failed ? ` (${failed} could not be transcribed)` : ''}. ${many ? 'They are' : 'It is'} attached to this conversation: ask about ${many ? 'them' : 'it'}, or say what to make from ${many ? 'them' : 'it'}.`
        : 'The recording could not be transcribed. Its card says why.');
  };
  const el = h('div', { class: 'recordings', 'data-recordings': item.id },
    h('div', { class: 'msg msg--user', text: `Attached to transcribe: ${files.map((f) => f.name).join(', ')}` }),
    h('div', { class: 'msg msg--agent' }, h('div', { class: 'msg__avatar' }, presenceEl({ still: true })),
      h('div', { class: 'msg__body' }, status, ...cards)));
  for (const f of files) {
    watch(f.task_id, status, (t) => {
      const was = state.get(f.task_id);
      state.set(f.task_id, t.status);
      say();
      if (t.status === 'done' && !f.ready) {
        f.ready = true;
        const sid = (String(t.summary || '').match(/stored as (S\d+)/) || [])[1] || '';
        f.source_id = sid;
        saveConversation();
        // only a transcript that finished while the page was open announces itself; a reopened conversation stays quiet
        if (was && was !== 'done') {
          toast(`Transcript ready: ${f.name}`);
          if (sid && !conversationFiles().some((x) => x.source_id === sid && x.engagement_id === t.engagement_id)) {
            recordAttachments([{ name: `${f.name} (transcript)`, source_id: sid }], t.engagement_id);
          }
          setDockSuggest(P.nextAfterTask(t));
        }
      }
    });
  }
  say();
  return el;
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
  const scene = turnScene();
  S.scene = scene;
  const word = h('span', { class: 'thinking__word', text: scene.caption() });
  const time = h('span', { class: 'thinking__time mono', text: '0 s', 'aria-hidden': 'true' });
  const live = h('div', { class: 'live' });
  const el = h('div', { class: 'msg msg--agent', id: 'thinking' },
    h('div', { class: 'msg__avatar' }),
    h('div', { class: 'msg__body' }, scene.el, h('div', { class: 'thinking thinking--scene' }, h('span', { role: 'status' }, word), time), live));
  $('#thread').append(el);
  scrollToEnd(true);
  S.liveBox = live;
  const t0 = Date.now();
  thinkTimer = setInterval(() => {
    const s = (Date.now() - t0) / 1000;
    time.textContent = P.duration(s);
    const say = scene.caption();
    if (word.textContent !== say) word.textContent = say;
  }, 1000);
}

function hideThinking() {
  clearInterval(thinkTimer);
  S.liveBox = null;
  S.scene = null;
  const el = $('#thinking');
  if (el) el.remove();
}

async function send(text, opts = {}) {
  text = String(text || '').trim();
  if (!text || S.busy) return;
  const open = slotRanges(text);
  if (open.length && $('#input').value.trim() === text && S.slotWarned !== text) {
    const [s, e] = open[0];
    S.slotWarned = text;                     // a second Enter on the same text sends it as written
    toast(`${text.slice(s, e)} is still the example's placeholder. Type over it, or press Enter again to send as is.`);
    $('#input').focus();
    $('#input').setSelectionRange(s, e);
    return;
  }
  S.slotWarned = null;
  if (opts.focus) setFocus(opts.focus);
  const input = $('#input');
  if (input.value.trim() === text) { input.value = ''; autosize(); updateCoach(); }
  setDockSuggest([]);
  S.busy = true;
  updateSendState();
  updatePresence();
  pushItem({ type: 'user', text });
  showThinking();
  const fast = setInterval(pollEvents, 700);
  try {
    await ensureConv();
    const body = { text };
    if (S.focus) body.engagement_id = S.focus;
    if (S.notes && S.notes.length) body.notes = S.notes.slice();
    const files = conversationFiles();
    if (files.length) body.attachments = files.map((f) => ({ engagement_id: f.engagement_id, source_id: f.source_id, fresh: !!f.fresh }));
    const picked = sourceSelection();                         // the Sources panel's checked sources (Part 6 C2)
    if (picked && picked.engagement_id === S.focus) body.selected_sources = picked;
    const packs = selectedPacks();                            // the data packs the person chose for research
    if (packs.length) body.packs = packs;
    const r = await api(`/api/conversations/${encodeURIComponent(S.conv)}/messages`, { method: 'POST', json: body });
    if (body.notes) { S.notes = []; LS.del('notes'); }   // the agent has them now
    if (files.some((f) => f.fresh)) { files.forEach((f) => { f.fresh = false; }); saveConversation(); }   // sent with this message
    document.querySelectorAll('#attachments .att--done').forEach((c) => c.remove());
    syncAttachments();
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
  t.style.overflowY = t.scrollHeight > 220 ? 'auto' : 'hidden';
  updateSendState();
}

function updateSendState() {
  $('#sendBtn').disabled = S.busy || !$('#input').value.trim();
}

// Request templates carry [slots] (catalog.js). The first is selected when a template lands in the box, Tab and
// Shift and Tab move between them, and a message is not sent while one the template put there is still unfilled.
const SLOT = /\[[^\]\n]{1,48}\]/g;
const slots = new Set();

function slotRanges(value) {
  const out = [];
  for (const m of value.matchAll(SLOT)) if (slots.has(m[0])) out.push([m.index, m.index + m[0].length]);
  return out;
}

function selectSlot(back = false) {
  const t = $('#input');
  const ranges = slotRanges(t.value);
  if (!ranges.length) return false;
  const at = back ? t.selectionStart : t.selectionEnd;
  const r = back ? ([...ranges].reverse().find(([s]) => s < at) || ranges[ranges.length - 1])
    : (ranges.find(([s]) => s >= at) || ranges[0]);
  t.focus();
  t.setSelectionRange(r[0], r[1]);
  return true;
}

function fillComposer(text) {
  const t = $('#input');
  t.value = text;
  for (const m of text.matchAll(SLOT)) slots.add(m[0]);
  autosize();
  t.focus();
  t.setSelectionRange(0, 0);
  if (!selectSlot()) t.setSelectionRange(text.length, text.length);
  updateCoach();
  const c = $('#composer');
  c.classList.remove('is-filled');
  void c.offsetWidth;
  c.classList.add('is-filled');
}

// Coaching while typing: once a request asks for an output, say what it asks for and offer the parts it lacks.
function updateCoach() {
  const box = $('#coach');
  const open = slotRanges($('#input').value);
  if (open.length) {                               // a template is still being filled in: name what is left
    const v = $('#input').value;
    box.replaceChildren(...[h('span', { class: 'kicker', text: 'Type over' }),
      ...open.map(([s, e]) => h('button', { class: 'coach__slot', type: 'button', title: 'Select it to type over it',
        onclick: () => { const t2 = $('#input'); t2.focus(); t2.setSelectionRange(s, e); } }, v.slice(s, e))),
      KEYBOARD ? h('span', { class: 'coach__hint', text: 'Tab moves between them' }) : null].filter(Boolean));
    box.hidden = false;
    return;
  }
  const c = coach($('#input').value);
  if (!c) { box.hidden = true; box.replaceChildren(); return; }
  const add = (label, slot, hint) => h('button', { class: 'coach__add', type: 'button', title: hint, onclick: () => {
    const t = $('#input');
    t.value = `${t.value.replace(/[\s.?!]+$/, '')} ${slot}`;
    slots.add(slot.match(SLOT)[0]);
    autosize();
    updateCoach();
    t.setSelectionRange(t.value.length, t.value.length);
    selectSlot(true);
  } }, icon('plus', 'ic--sm'), label);
  const have = (label) => h('span', { class: 'coach__have' }, icon('check', 'ic--sm'), label);
  const scoped = S.focus && S.engById.get(S.focus);
  const packs = selectedPacks().length;
  box.replaceChildren(...[                        // replaceChildren writes a null as the text "null": parts that do not apply are dropped
    h('span', { class: 'coach__what' }, h('span', { class: 'kicker', text: 'Asking for' }), ` ${c.what}`),
    c.wantsAudience ? (c.audience ? have('Audience') : add('Audience', 'for [audience]', 'Add who it is for: a role, a team or a person')) : null,
    c.data ? have('Data') : packs ? have(plural(packs, 'data pack')) : scoped ? have('Engagement')
      : c.engagementRef ? h('span', { class: 'coach__warn' }, icon('folder', 'ic--sm'), 'Focus an engagement first')
        : add('Data', 'from [my files, r/subreddit or an industry]', 'Add which data to read: files, a subreddit, a publication or an industry'),
  ].filter(Boolean));
  box.hidden = false;
}

function wireComposer() {
  const t = $('#input');
  t.addEventListener('input', () => { autosize(); updateCoach(); });
  t.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(t.value); return; }
    if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey && selectSlot(e.shiftKey)) e.preventDefault();
  });
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(t.value); });
  $('#attachBtn').addEventListener('click', () => openFilePicker());
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
// 22 Nov (owner): videos are transcribed on this machine by Whisper large-v3 as a task (videotranscript.py)
const VIDEO_EXT = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.mpeg', '.mpg', '.wmv', '.3gp'];
const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
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

// Every file the person has uploaded, whichever engagement it was uploaded in (owner, 25 Nov, E16: files are not
// locked to an engagement). Picked files are attached to the next message; when the message box shows an engagement
// they were not uploaded to, they are copied into it, and the first engagement keeps them.
async function openFilePicker() {
  const st = { q: '', picked: new Map(), files: [] };
  const list = h('div', { class: 'filepick__list', role: 'list' });
  const count = h('span', { class: 'filepick__count' });
  const attach = h('button', { class: 'btn btn--accent', type: 'button', disabled: true }, icon('clip', 'ic--sm'), 'Attach to my next message');
  const paint = () => {
    const q = st.q.trim().toLowerCase();
    const rows = st.files.filter((f) => !q || `${f.title} ${f.engagement}`.toLowerCase().includes(q));
    list.replaceChildren(...(rows.length ? rows.map((f) => {
      const key = `${f.engagement_id}:${f.id}`;
      const box = h('input', { type: 'checkbox', id: `fp-${key}`, checked: st.picked.has(key) ? '' : null });
      box.checked = st.picked.has(key);
      box.addEventListener('change', () => { if (box.checked) st.picked.set(key, f); else st.picked.delete(key); sync(); });
      // removing a file takes two clicks on the row itself (the viewer shows no confirm dialog), and can be undone
      const rm = h('button', { class: 'linkbtn filepick__rm', type: 'button', text: 'Remove' });
      rm.addEventListener('click', async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        if (rm.dataset.sure !== '1') { rm.dataset.sure = '1'; rm.textContent = 'Remove from your files?'; setTimeout(() => { rm.dataset.sure = ''; rm.textContent = 'Remove'; }, 4000); return; }
        try {
          await api(`/api/engagements/${encodeURIComponent(f.engagement_id)}/files/${encodeURIComponent(f.id)}/remove`, { method: 'POST', json: { removed: true } });
          st.files = st.files.filter((x) => x !== f);
          st.picked.delete(key);
          paint(); sync();
          toast(`${f.title || f.id} was removed from your files. Work already made from it keeps it.`);
        } catch (e) { toast((e && e.message) || 'That file could not be removed.'); }
      });
      return h('label', { class: 'filepick__row', role: 'listitem', for: `fp-${key}` }, box,
        h('span', { class: 'filepick__name', text: f.title || f.id }),
        h('span', { class: 'filepick__meta', text: `${f.engagement}${f.added ? ` · ${P.ago(f.added)}` : ''}` }), rm);
    }) : [h('p', { class: 'panel__sub', text: st.files.length ? 'No file matches.' : 'No files have been uploaded yet.' })]));
  };
  const sync = () => {
    const n = st.picked.size;
    attach.disabled = !n;
    count.textContent = n ? `${plural(n, 'file')} picked` : `${plural(st.files.length, 'file')} uploaded so far`;
  };
  const search = h('input', { class: 'packpanel__filter', type: 'search', id: 'filepickSearch', placeholder: 'Find a file by its name or its engagement', 'aria-label': 'Find a file' });
  search.addEventListener('input', () => { st.q = search.value; paint(); });
  attach.addEventListener('click', async () => {
    attach.disabled = true;
    const picked = [...st.picked.values()];
    // where they are used: the engagement in the message box, else the engagement the first file was uploaded to
    const target = (S.focus && S.engById.has(S.focus)) ? S.focus : picked[0].engagement_id;
    try {
      const away = picked.filter((f) => f.engagement_id !== target);
      let map = {};
      if (away.length) {
        const r = await api(`/api/engagements/${encodeURIComponent(target)}/files/use`, { method: 'POST',
          json: { files: away.map((f) => ({ engagement_id: f.engagement_id, id: f.id })) } });
        map = r.source_ids || {};
      }
      const added = picked.map((f) => ({ name: f.title || f.id,
        source_id: f.engagement_id === target ? f.id : map[`${f.engagement_id}:${f.id}`] })).filter((f) => f.source_id);
      if (!added.length) throw new Error('Those files could not be attached.');
      if (!S.focus) setFocus(target);
      recordAttachments(added, target);
      closeSheet();
      toast(`${plural(added.length, 'file')} attached to your next message.`);
      $('#input').focus();
    } catch (e) {
      attach.disabled = false;
      toast((e && e.message) || 'Those files could not be attached.');
    }
  });
  openSheet({ title: 'Your files', size: 'work', sub: 'Every file you have uploaded, from any engagement. Pick any of them for your next message, or add new ones.', body: h('div', { class: 'panel filepick' },
    h('div', { class: 'filepick__bar' },
      h('button', { class: 'btn', type: 'button', onclick: () => { closeSheet(); $('#fileInput').click(); } }, icon('clip', 'ic--sm'), 'Upload from this computer'),
      search),
    list,
    h('div', { class: 'filepick__foot' }, count, attach)) });
  list.replaceChildren(h('p', { class: 'panel__sub', text: 'Loading your files.' }));
  try {
    st.files = (await api('/api/files')).files || [];
  } catch { st.files = []; }
  paint();
  sync();
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
  const video = VIDEO_EXT.includes(extOf(file.name)) || (AUDIO_EXT.includes(extOf(file.name)) && file.size > 25 * 1024 * 1024);
  const audio = AUDIO_EXT.includes(extOf(file.name)) && !video;
  if (!TEXT_EXT.includes(extOf(file.name)) && !DOC_EXT.includes(extOf(file.name)) && !audio && !video) {
    chip.fail('Not a supported file type. Use a document, an image, text, subtitles, CSV, audio or video.');
    return Promise.resolve(false);
  }
  if (video && file.size > MAX_VIDEO_BYTES) {
    chip.fail('Files over 4 GB cannot be transcribed here.');
    return Promise.resolve(false);
  }
  if (!video && file.size > 25 * 1024 * 1024) {
    chip.fail(audio ? 'Audio over 25 MB. Split the recording and add the parts.' : 'File over 25 MB.');
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/engagements/${encodeURIComponent(eid)}/uploads`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { const p = Math.round((e.loaded / e.total) * 100); chip.progress(p, `Uploading ${p}%`); } };
    xhr.upload.onload = () => chip.progress(100, video ? 'Starting the transcript' : audio ? 'Transcribing' : DOC_EXT.includes(extOf(file.name)) ? 'Reading' : 'Adding');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && video) {
        // the transcript is a task with its own card (Fetcher, Transcriber, Writer, Archivist) and its downloads
        let tid = '';
        try { tid = String(JSON.parse(xhr.responseText).task_id || ''); } catch { tid = ''; }
        chip.done(tid ? 'Uploaded; its card is in the conversation' : 'Uploaded; Whisper large-v3 is transcribing it');
        noteForAgent(`"${file.name}" was attached and is being transcribed as its own task; its transcript becomes a source when done`);
        if (tid) refreshTask(tid);
        refreshAll();
        resolve(tid ? { name: file.name, task_id: tid, recording: true } : true);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const eng = S.engById.get(eid);
        const where = eng ? ` to ${eng.title}` : '';
        chip.done(audio ? `Transcribed and added${where}` : `Added${where}`);   // C4: the person sees where the file went
        let sid = '';
        try { sid = String(JSON.parse(xhr.responseText).source_id || ''); } catch { /* the file is added; it just is not listed */ }
        resolve(sid ? { name: file.name, source_id: sid } : true);
        return;
      }
      // the server's own reason is shown when it gives one (25 Nov: an incomplete recording said only that it failed)
      let why = '';
      try { why = String(JSON.parse(xhr.responseText).detail || ''); } catch { why = ''; }
      chip.fail(xhr.status === 422 && why ? why[0].toUpperCase() + why.slice(1) : uploadErr(xhr.status));
      resolve(false);
    };
    xhr.onerror = () => { chip.fail(uploadErr(0)); resolve(false); };
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('title', file.name);
    if (S.conv) fd.append('conversation', S.conv);
    xhr.send(fd);
  });
}

async function addFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  let eid = S.focus && S.engById.has(S.focus) ? S.focus : null;
  const usable = files.filter((f) => TEXT_EXT.includes(extOf(f.name)) || DOC_EXT.includes(extOf(f.name)) || AUDIO_EXT.includes(extOf(f.name)) || VIDEO_EXT.includes(extOf(f.name)));
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
  // QA 25 Nov (E15): attached recordings are a request. They get one entry in the conversation, with a card for each
  // recording the moment its upload is accepted; any number of recordings, transcribed one after another.
  let rec = null;
  if (files.some((f) => VIDEO_EXT.includes(extOf(f.name)) || AUDIO_EXT.includes(extOf(f.name)))) {
    try { await ensureConv(); } catch { /* the cards still appear; they are just not tied to a conversation */ }
  }
  for (const f of files) {
    const r = await uploadOne(f, eid);
    if (r) ok++;
    if (r && r.source_id) added.push(r);
    if (r && r.recording) {
      if (!rec) {
        rec = { type: 'recordings', id: `rec_${Date.now()}`, engagement_id: eid, files: [{ name: r.name, task_id: r.task_id }] };
        pushItem(rec);
      } else {
        rec.files.push({ name: r.name, task_id: r.task_id });
        saveConversation();
        const box = document.querySelector(`[data-recordings="${rec.id}"]`);
        if (box) box.replaceWith(itemEl(rec));
        scrollToEnd(true);
      }
    }
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
function setSheetSub(text) {
  const el = $('#sheetSub');
  el.textContent = text || '';
  el.title = text || '';
  el.hidden = !text;
}

function openSheet({ title, sub = '', size = '', body, actions = [] }) {
  const sheet = $('#sheet');
  lastFocus = document.activeElement;
  sheet.className = `sheet${size ? ` sheet--${size}` : ''}`;
  $('#sheetTitle').textContent = title;
  setSheetSub(sub);
  $('#sheetActions').replaceChildren(...actions);
  $('#sheetBody').replaceChildren(body);
  $('#sheetBody').scrollTop = 0;
  sheet.hidden = false;
  $('#sheetPanel').focus({ preventScroll: true });       // Tab reaches the close button; no box drawn on open (26 Nov)
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
  const k = t ? P.kindOfTask(t) : P.kindOfTask(S.tasks.find((x) => x.id === tid) || {});
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
  openSheet({ title: 'Waiting for your approval', body: h('div', { class: 'panel' },
    S.approvals.length ? S.approvals.map((a) => approvalCard(a)) : h('div', { class: 'empty' }, h('p', { text: 'Nothing is waiting for your approval.' }))) });
}

// The Library (Gap 1). Redesigned 26 Nov on the owner's note: "the three panel layout feels sloppy, hard to navigate,
// and the interface isn't as polished as the rest of the system". One search bar, one row of filter menus, the results
// beside the source being read; picked rows gather in a bar under the results and join the engagement in focus.
const LIB_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const libDate = (d) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(d || ''));
  return m && +m[2] >= 1 && +m[2] <= 12 ? [m[3] ? String(+m[3]) : '', LIB_MONTHS[+m[2] - 1], m[1]].filter(Boolean).join(' ') : '';
};
const libPack = (v) => (v === 'none' ? 'No pack' : String(v || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
const libEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LIB_KIND = { web: 'globe', upload: 'report', document: 'report', transcript: 'transcript', social: 'social', video: 'video' };

function libTitle(it) {
  // "PYMNTS: Convenience Beats Price" reads "Convenience Beats Price" beside its publisher; a short " | Site" tail goes
  let t = String(it.title || '').trim();
  const pub = String(it.publisher || '').trim();
  if (pub) t = t.replace(new RegExp(`^${libEsc(pub)}(?:\\.[a-z]{2,6})?\\s*[:|]\\s+`, 'i'), '');
  const tail = /\s+\|\s+[^|]{1,30}$/.exec(t);
  if (tail && t.length - tail[0].length >= 24) t = t.slice(0, t.length - tail[0].length);
  return t || String(it.title || '');
}

function libMarks(text, words) {
  // the searched words marked in the source's text; the source stays text, nothing in it is parsed as markup
  if (!words.length) return [text];
  const re = new RegExp(`(${words.map(libEsc).join('|')})`, 'gi');
  const low = words.map((w) => w.toLowerCase());
  const out = [];
  let n = 0;
  for (const part of String(text).split(re)) {
    if (!part) continue;
    if (n < 400 && low.includes(part.toLowerCase())) { out.push(h('mark', { text: part })); n += 1; } else out.push(part);
  }
  return out;
}

function libSnippet(it) {
  // the index marks the matched words with [[ ]]; without a match, an opening that repeats the title is skipped
  let s = String(it.snippet || '');
  if (!s.includes('[[')) {
    for (const t of [String(it.title || ''), libTitle(it)]) {
      if (t && s.toLowerCase().startsWith(t.toLowerCase())) { s = s.slice(t.length).replace(/^[\s.:|-]+/, ''); break; }
    }
    return s ? [s] : [];
  }
  return s.split(/(\[\[[^\]]*\]\])/).filter(Boolean).map((p) => (p.startsWith('[[') ? h('mark', { text: p.slice(2, -2) }) : p.replace(/\[\[|\]\]/g, '')));
}

function libMenu(root, { label, rows, value, fmt, onPick }) {
  // a filter menu: the button names the filter and its value; the list finds as the person types when it is long
  const cur = rows.find((r) => r.value === value);
  const btn = h('button', { class: `libf${value ? ' is-on' : ''}`, type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' },
    h('span', { class: 'libf__label', text: label }), value ? h('span', { class: 'libf__val', text: fmt(cur || { value }) }) : null,
    icon('chevron', 'libf__chev'));
  let pop = null;
  const outside = (ev) => { if (pop && !pop.contains(ev.target) && !btn.contains(ev.target)) close(false); };
  function close(refocus) {
    if (!pop) return;
    pop.remove();
    pop = null;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (root._closeMenu === closeMe) root._closeMenu = null;
    if (refocus) btn.focus();
  }
  const closeMe = () => close(false);
  function open() {
    if (root._closeMenu) root._closeMenu();
    const find = rows.length > 8 ? h('input', { class: 'libf__find', type: 'search', placeholder: `Find ${label.toLowerCase()}`, 'aria-label': `Find ${label.toLowerCase()}` }) : null;
    const list = h('div', { class: 'libf__list', role: 'listbox', 'aria-label': label });
    const opt = (r, text, count) => {
      const on = (r ? r.value : '') === (value || '');
      return h('button', { class: `libf__opt${on ? ' is-on' : ''}`, type: 'button', role: 'option', 'aria-selected': String(on),
        onclick: () => { close(false); onPick(r ? r.value : ''); } },
      h('span', { class: 'libf__check' }, icon('check')), h('span', { class: 'libf__text', text }),
      count != null ? h('span', { class: 'libf__count mono', text: String(count) }) : null);
    };
    const draw = () => {
      const f = find ? find.value.trim().toLowerCase() : '';
      const shown = rows.filter((r) => !f || fmt(r).toLowerCase().includes(f));
      list.replaceChildren(...[f ? null : opt(null, `Any ${label.toLowerCase()}`, null), ...shown.map((r) => opt(r, fmt(r), r.count)),
        shown.length ? null : h('p', { class: 'libf__none', text: 'No match.' })].filter(Boolean));
    };
    draw();
    if (find) find.addEventListener('input', draw);
    pop = h('div', { class: 'libf__pop' }, find, list);
    pop.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.stopPropagation(); close(true); return; }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const opts = [...pop.querySelectorAll('.libf__opt')];
        const i = opts.indexOf(document.activeElement);
        const n = ev.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1);
        if (opts[n]) opts[n].focus();
      }
    });
    root.append(pop);
    const rb = root.getBoundingClientRect();
    const bb = btn.getBoundingClientRect();
    const w = Math.min(320, rb.width - 24);
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(12, Math.min(bb.left - rb.left, rb.width - w - 12))}px`;
    pop.style.top = `${bb.bottom - rb.top + 6}px`;
    btn.setAttribute('aria-expanded', 'true');
    root._closeMenu = closeMe;
    document.addEventListener('pointerdown', outside, true);
    (find || pop.querySelector('.libf__opt.is-on') || pop.querySelector('.libf__opt') || btn).focus();
  }
  btn.addEventListener('click', (ev) => { ev.stopPropagation(); if (pop) close(true); else open(); });
  return btn;
}

function openLibrary() {
  const st = { q: '', engagement: '', pack: '', publisher: '', period: '', picked: new Set(), seq: 0, limit: 60, open: '', items: new Map() };
  const root = h('div', { class: 'lib' });
  const input = h('input', { class: 'lib__q', type: 'search', placeholder: 'Search everything collected: words, a publisher, a subject',
    'aria-label': 'Search the library', autocomplete: 'off', spellcheck: 'false' });
  const count = h('p', { class: 'lib__count', 'aria-live': 'polite' });
  const filters = h('div', { class: 'lib__filters', role: 'toolbar', 'aria-label': 'Filters' });
  const list = h('div', { class: 'lib__list', role: 'list', 'aria-label': 'Sources' });
  const pickedN = h('span', { class: 'lib__pickedn' });
  const addBtn = h('button', { class: 'btn btn--accent lib__add', type: 'button' }, 'Add');
  const selbar = h('div', { class: 'lib__sel', hidden: true }, pickedN,
    h('button', { class: 'lib__clear', type: 'button', onclick: () => { st.picked.clear(); syncPicked(); } }, 'Clear'), addBtn);
  const reader = h('div', { class: 'lib__reader', tabindex: '-1' });
  const focusTitle = () => (S.focus && S.engById.get(S.focus) ? S.engById.get(S.focus).title || '' : '');
  const words = () => st.q.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter((w) => w.length > 1);
  const empty = () => reader.replaceChildren(h('div', { class: 'lib__empty' },
    h('span', { class: 'lib__emptyic' }, icon('book')), h('p', { text: 'Choose a source to read it here.' })));

  const addTo = async (ids) => {
    if (!S.focus) { toast('Open an engagement first: picked sources join the engagement you are working in.'); return null; }
    const r = await api('/api/library/add', { method: 'POST', json: { ids, engagement_id: S.focus } });
    toast(`${r.added.length} added to ${focusTitle() || 'this engagement'}${r.skipped ? `; ${r.skipped} already there` : ''}.`);
    refreshStudio(S.focus);
    return r;
  };
  const syncPicked = () => {
    const n = st.picked.size;
    selbar.hidden = !n;
    pickedN.textContent = `${n} picked`;
    const t = focusTitle();
    addBtn.textContent = t ? `Add to ${t}` : 'Add to an engagement';
    addBtn.title = addBtn.textContent;
    list.querySelectorAll('.lib__row').forEach((row) => {
      const on = st.picked.has(row.dataset.id);
      row.classList.toggle('is-picked', on);
      const b = row.querySelector('.lib__box');
      if (b) b.checked = on;
    });
  };
  addBtn.addEventListener('click', async () => {
    addBtn.disabled = true;
    try {
      if (await addTo([...st.picked])) { st.picked.clear(); syncPicked(); run(); }
    } catch (e) { toast((e && e.message) || 'Could not add them.'); }
    addBtn.disabled = false;
  });

  const show = async (it, row) => {
    st.open = it.id;
    list.querySelectorAll('.lib__row.is-open').forEach((x) => x.classList.remove('is-open'));
    if (row) row.classList.add('is-open');
    root.classList.add('lib--reading');
    reader.replaceChildren(h('p', { class: 'lib__loading', text: 'Opening.' }));
    let d;
    try { d = await api(`/api/library/item/${encodeURIComponent(it.id)}`); } catch {
      if (st.open === it.id) reader.replaceChildren(h('p', { class: 'lib__loading', text: 'That source could not be opened.' }));
      return;
    }
    if (st.open !== it.id) return;
    const here = !!S.focus && d.engagement_id === S.focus;
    const one = h('button', { class: 'lib__act', type: 'button', disabled: here ? '' : null }, icon(here ? 'check' : 'plus'),
      here ? 'In this engagement' : (S.focus ? 'Add to this engagement' : 'Add to an engagement'));
    one.addEventListener('click', async () => {
      one.disabled = true;
      try { if (await addTo([d.id])) one.replaceChildren(icon('check'), 'Added'); else one.disabled = false; } catch (e) {
        toast((e && e.message) || 'Could not add it.');
        one.disabled = false;
      }
    });
    const kick = [d.publisher, libDate(d.date) || 'Undated', d.pack && d.pack !== 'general' ? `${libPack(d.pack)} pack` : ''].filter(Boolean).join(' · ');
    const w = words();
    const paras = String(d.text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 600);
    reader.replaceChildren(h('article', { class: 'lib__doc' },
      h('button', { class: 'lib__back', type: 'button', onclick: () => { root.classList.remove('lib--reading'); if (row && row.isConnected) row.focus(); } },
        icon('back'), 'Results'),
      h('p', { class: 'lib__kicker' }, icon(LIB_KIND[it.kind] || 'report'), h('span', { text: kick })),
      h('h2', { class: 'lib__doctitle', text: libTitle(d) }),
      h('div', { class: 'lib__acts' }, d.url ? h('a', { class: 'lib__act', href: d.url, target: '_blank', rel: 'noopener noreferrer' }, icon('external'), 'Open the original') : null, one),
      d.engagement ? h('p', { class: 'lib__docmeta', text: `Collected in ${d.engagement}` }) : h('hr', { class: 'lib__rule' }),
      h('div', { class: 'lib__doctext' }, ...paras.map((p) => h('p', {}, ...libMarks(p, w))))));
    reader.scrollTop = 0;
  };

  const rowEl = (it) => {
    const box = h('input', { type: 'checkbox', class: 'lib__box', 'aria-label': `Pick ${libTitle(it)}`, checked: st.picked.has(it.id) ? '' : null,
      onclick: (ev) => { ev.stopPropagation(); if (ev.target.checked) st.picked.add(it.id); else st.picked.delete(it.id); syncPicked(); } });
    const snip = libSnippet(it);
    const row = h('div', { class: `lib__row${st.open === it.id ? ' is-open' : ''}${st.picked.has(it.id) ? ' is-picked' : ''}`, role: 'listitem', tabindex: '0', 'data-id': it.id },
      box,
      h('div', { class: 'lib__main' },
        h('p', { class: 'lib__rowmeta' }, icon(LIB_KIND[it.kind] || 'report'), h('span', { text: [it.publisher, libDate(it.date) || 'Undated'].filter(Boolean).join(' · ') })),
        h('p', { class: 'lib__rowtitle', text: libTitle(it) }),
        snip.length ? h('p', { class: 'lib__snip' }, ...snip) : null,
        it.engagement && it.engagement_id !== st.engagement ? h('span', { class: 'lib__tag', text: it.engagement }) : null));
    row.addEventListener('click', () => show(it, row));
    row.addEventListener('keydown', (ev) => {
      if (ev.target !== row) return;
      if (ev.key === 'Enter') { ev.preventDefault(); show(it, row); } else if (ev.key === ' ') { ev.preventDefault(); box.click(); } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const next = ev.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
        if (next && next.classList.contains('lib__row') && st.items.has(next.dataset.id)) { next.focus(); show(st.items.get(next.dataset.id), next); }
      }
    });
    return row;
  };

  const KEYS = [['period', 'Period', (r) => r.label || r.value], ['pack', 'Data pack', (r) => libPack(r.value)],
    ['engagement', 'Engagement', (r) => r.label || r.value], ['publisher', 'Publisher', (r) => (r.value === 'unknown' ? 'Unknown publisher' : r.value)]];
  const anyFilter = () => KEYS.some(([k]) => st[k]);
  const clearFilters = () => { KEYS.forEach(([k]) => { st[k] = ''; }); st.limit = 60; run(); };
  const drawFilters = (f) => {
    if (root._closeMenu) root._closeMenu();
    filters.replaceChildren(...[...KEYS.map(([k, label, fmt]) => ((f[k] && f[k].length) || st[k]
      ? libMenu(root, { label, rows: f[k] || [], value: st[k], fmt, onPick: (v) => { st[k] = v; st.limit = 60; run(); } }) : null)),
    anyFilter() ? h('button', { class: 'lib__reset', type: 'button', onclick: clearFilters }, 'Clear filters') : null].filter(Boolean));
  };

  const run = async () => {
    const mine = ++st.seq;
    const p = new URLSearchParams({ q: st.q, engagement: st.engagement, pack: st.pack, publisher: st.publisher, period: st.period, limit: String(st.limit) });
    let d;
    try { d = await api(`/api/library/search?${p}`); } catch {
      if (mine === st.seq) list.replaceChildren(h('div', { class: 'lib__none' }, h('p', { text: 'The library could not be searched just now.' })));
      return;
    }
    if (mine !== st.seq) return;
    drawFilters(d.facets || {});
    count.textContent = d.total === d.matched ? `${d.total} source${d.total === 1 ? '' : 's'}` : `${d.total} of ${d.matched} sources`;
    st.items = new Map(d.items.map((it) => [it.id, it]));
    const rows = d.items.map(rowEl);
    if (d.total > d.items.length) {
      rows.push(st.limit < 200
        ? h('button', { class: 'lib__more', type: 'button', onclick: () => { st.limit = Math.min(200, st.limit + 60); run(); } }, 'Show more')
        : h('p', { class: 'lib__none', text: 'Narrow the search or a filter to see the rest.' }));
    }
    list.replaceChildren(...(rows.length ? rows : [h('div', { class: 'lib__none' },
      h('p', { text: st.q || anyFilter() ? 'Nothing collected matches that.' : 'Nothing has been collected yet.' }),
      anyFilter() ? h('button', { class: 'lib__reset', type: 'button', onclick: clearFilters }, 'Clear filters') : null)]));
    syncPicked();
  };

  let timer = null;
  input.addEventListener('input', () => { st.q = input.value; st.limit = 60; clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { const first = list.querySelector('.lib__row'); if (first) { ev.preventDefault(); first.focus(); } }
  });
  root.append(
    h('div', { class: 'lib__head' },
      h('div', { class: 'lib__bar' }, h('label', { class: 'lib__search' }, icon('search'), input), count),
      filters),
    h('div', { class: 'lib__panes' }, h('div', { class: 'lib__results' }, list, selbar), reader));
  empty();
  openSheet({ title: 'Library', size: 'library', body: root });
  run();
  setTimeout(() => input.focus(), 50);
}

async function openPanel(name) {
  if (name === 'library') { openLibrary(); return; }
  if (name === 'history' || name === 'work') { openEngagement(null, name === 'history' ? 'chats' : 'work'); return; }
  if (name === 'updates') {
    const body = h('div');
    openSheet({ title: 'Since you last looked', sub: 'What finished, failed or changed while you were away.', body });
    paintUpdates(body);
    return;
  }
  const body = h('div', { class: 'panel' }, h('p', { class: 'panel__sub', text: 'Loading.' }));
  const titles = { memory: 'What I remember', schedules: 'Scheduled work', spend: 'Spend' };
  const subs = { memory: 'New conversations start with this. Forget anything, at any time.',
    schedules: 'Work that runs on its own; you approve each schedule before it runs.', spend: 'Every model runs on this computer, so nothing here is billed.' };
  openSheet({ title: titles[name] || name, sub: subs[name], body });
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
    h('p', { class: 'panel__sub', text: 'Work above your per-task limit always asks first.' }));
}

// ---- refresh -------------------------------------------------------------------------------------
async function refreshEngagements() {
  const r = await api(`/api/engagements${S.showHidden ? '?include_hidden=1' : ''}`);
  S.engs = r.engagements || [];
  S.hiddenCount = Number(r.hidden_count) || 0;
  S.engById = new Map(S.engs.map((e) => [e.id, e]));
  S.mergedInto = new Map(S.engs.flatMap((e) => (e.merged || []).map((m) => [m, e.id])));
  // an engagement's saved data packs are the picker's starting choice on a browser that has none for it yet
  for (const e of S.engs) {
    const own = (e.settings || {}).packs;
    if (Array.isArray(own) && own.length && LS.get(`packs:${e.id}`, null) === null) LS.set(`packs:${e.id}`, own);
  }
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
async function refreshHealth() {
  const bar = document.getElementById('healthBar');
  if (!bar) return;
  try {
    const d = await api('/health/deep');
    const down = (d.services || []).filter((s) => !s.ok);
    if (!down.length) { bar.hidden = true; bar.replaceChildren(); return; }
    bar.replaceChildren(...down.map((s) => h('p', { class: 'healthbar__row' },
      h('b', { text: s.detail }), s.disables ? ` Affects: ${s.disables}.` : '')));
    bar.hidden = false;
  } catch { /* the page keeps working; the next poll tries again */ }
}

async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  if (S.focus) refreshStudio(S.focus);           // new uploads, collected sources and finished guides appear
  try {
    const [tasks, engs, appr, spend, digest] = await Promise.allSettled([
      api('/api/tasks'), api(`/api/engagements${S.showHidden ? '?include_hidden=1' : ''}`), api('/api/approvals'), api('/api/spend'), api('/api/digest')]);
    if (engs.status === 'fulfilled') {
      // the regular refresh keeps the "show hidden" choice and the hidden count, so the way back to a hidden
      // engagement never disappears after a reload (2026-11-19: it did, and 53 hidden engagements looked lost)
      S.engs = engs.value.engagements || [];
      S.hiddenCount = Number(engs.value.hidden_count) || 0;
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
    updateBand();
    if (homeVisible()) updateRecent();
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
      if (S.scene) S.scene.onEvent(e, S.conv);
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
      // field test 23 Nov (U2): a card on screen repaints when its work changes after it finished (voices rendered,
      // checks scored). The audio card kept "Script ready ... Make the audio" after the audio existed.
      if (e.task_id && ['audio_rendered', 'audio_failed', 'scorecard', 'task_done', 'task_failed'].includes(e.kind)
          && document.querySelector(`[data-task="${CSS.escape(e.task_id)}"]`)) refreshTask(e.task_id);
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
  const railMark = $('#railMark');                 // the rail now carries the NXT Humans logo (26 Nov)
  if (railMark) railMark.append(presenceEl({ still: true }));
  $('#headMark').append(presenceEl({ live: true }));
  initOrchestra({ h, icon, presenceEl, P });
  initPlan({ h, icon, api, P, taskCard, toast });
  initMindTree({ h, icon, api, ask: fillComposer });
  // "Ask about this" inside a study page: the wrapper page relays it from the sandboxed document. The text is the
  // document's, so it is only ever placed in the message box for the person to read and send, never sent by itself.
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.ianext !== 'ask' || typeof d.text !== 'string') return;
    fillComposer(`Tell me more about this: ${d.text.replace(/\s+/g, ' ').slice(0, 400)}`);
  });
  wireComposer();
  wireVoice();
  wireDrop();
  wireSheet();
  initStudio({ api, h, icon, send, toast, openSheet, openEngagement, getFocus: () => S.focus,
    openFiles: () => $('#fileInput').click(), openPacks, packsLabel, fillComposer });
  initPacks({ api, h, icon, toast, LS, openSheet, closeSheet, getFocus: () => S.focus });     // the data packs research searches (2026-11-19)
  initEngagements({ api, h, toast, LS, plural, ago: P.ago, openSheet, closeSheet, openEngagement, setFocus, refreshPacks,
    refresh: refreshEngagements });                                        // engagements managed as projects (Gap 3)
  $('#engManage').addEventListener('click', () => { closeRail(); openManager(); });
  // a pack choice made in the composer is saved as the engagement's default, so it follows the engagement
  document.addEventListener('ia:packs-chosen', (ev) => {
    if (!S.focus) return;
    api(`/api/engagements/${encodeURIComponent(S.focus)}/settings`, { method: 'POST', json: { settings: { packs: ev.detail.ids } } }).catch(() => {});
  });
  initMake({ h, icon, fillComposer, openSheet, closeSheet, detail: capDetail });
  $('#engBtn').addEventListener('click', openEngagementPicker);           // the engagement a request is for                                  // everything IA Next makes, from the composer
  document.addEventListener('ia:packs', () => updateCoach());            // chosen packs count as naming the data
  $('#menuBtn').addEventListener('click', openRail);
  $('#pendingBar').addEventListener('click', openApprovals);
  $('#railClose').addEventListener('click', closeRail);
  $('#railScrim').addEventListener('click', closeRail);
  $('#newConv').addEventListener('click', () => {
    // owner, 25 Nov (E16): files uploaded and not yet sent with a message are still meant for the next one. They stay
    // attached, and the conversation opens in the engagement they were uploaded to.
    const carry = conversationFiles().filter((f) => f.fresh && f.engagement_id && S.engById.has(f.engagement_id));
    S.conv = null;
    S.items = [];
    LS.del('conv');
    // field test 23 Nov (A3): a new conversation kept the last engagement and the last pack choice, so the next
    // request ran inside unrelated work with a pack nobody chose for it. It starts clean: no engagement, packs on Auto.
    LS.del('packs:none');
    setFocus(carry.length ? carry[0].engagement_id : null);
    try { refreshPacks(); } catch { /* the picker repaints on its next open */ }
    $('#thread').replaceChildren();
    $('#attachments').replaceChildren();
    syncAttachments();
    if (carry.length) {
      const eng = S.engById.get(carry[0].engagement_id);
      pushItem({ type: 'files', engagement: eng ? eng.title : '', files: carry.filter((f) => f.engagement_id === carry[0].engagement_id) });
    }
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
  refreshStudio(S.focus);
  await initEvents();
  loadMedia(S.engs.slice(0, 12).map((e) => e.id));

  setInterval(refreshAll, 15000);
  // Uplift plan WS-3 step 1: say what is down and what that disables (22 Nov: second-brain search was dead for hours
  // after the embedder stopped, and no screen said so).
  refreshHealth();
  setInterval(refreshHealth, 60000);
  setInterval(pollTasks, 3000);
  setInterval(tickClocks, 1000);
  pollTasks();
  if (window.matchMedia('(min-width: 921px)').matches) $('#input').focus();
}

init();
