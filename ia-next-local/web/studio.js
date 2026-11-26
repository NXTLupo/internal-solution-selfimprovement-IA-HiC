// An engagement's sources (enhancement plan Part 6: C2 source selection scopes everything; N1 every source has a
// guide; C1 a citation opens the exact passage). Since 2026-11-19 they are the Files tab of the engagement's
// right-hand flyout, like every other panel: this module keeps the focused engagement's sources loaded (the sources
// switched off scope every message, panel open or not) and draws them only into that tab (#srcPane). Which sources
// are switched off is a per-viewer convenience kept in this browser; the server checks every id it receives.

let D = null;            // dependencies from app.js: { api, h, icon, send, toast, openSheet, getFocus, openFiles, openPacks, packsLabel }
const cur = { eid: null, sources: [], poll: null, sig: '', coverage: null };

const ORIGIN = {
  upload: 'Your file', pack: 'Data pack', named: 'Named publication', reused: 'Second brain', web: 'Web',
  library: 'Library', reddit: 'Reddit',
};

function offKey(eid) { return `ia-next:sources-off:${eid}`; }
function offSet(eid) {
  try { return new Set(JSON.parse(localStorage.getItem(offKey(eid)) || '[]')); } catch { return new Set(); }
}
function saveOff(eid, set) {
  try { localStorage.setItem(offKey(eid), JSON.stringify([...set])); } catch { /* private window: the panel still works for this visit */ }
}

/** The checked sources to send with a message, or null when every source is on (nothing to scope). */
export function selection() {
  const single = cur.sources.filter((s) => !s.group);
  if (!cur.eid || !single.length) return null;
  const off = offSet(cur.eid);
  const on = single.filter((s) => !off.has(s.id)).map((s) => s.id);
  if (!on.length || on.length === single.length) return null;
  return { engagement_id: cur.eid, source_ids: on };
}

export function initStudio(deps) {
  D = deps;
  document.addEventListener('click', onCiteClick);
  document.addEventListener('ia:packs', (e) => {
    document.querySelectorAll('.studio__packlabel').forEach((el) => { el.textContent = e.detail.label; });
  });
}

/** Draw the Files tab now (the flyout just opened it): the next load paints even when nothing changed. */
export function showSources(eid) { cur.sig = ''; return refreshStudio(eid); }

/** Load the focused engagement's sources (null clears them); draw them when the Files tab is open. Polls while a
    guide is being read. */
export async function refreshStudio(eid) {
  if (cur.poll) { clearTimeout(cur.poll); cur.poll = null; }
  if (!eid) {
    cur.eid = null; cur.sources = []; cur.sig = '';
    return;
  }
  if (cur.eid !== eid) { cur.eid = eid; cur.sources = []; cur.sig = ''; }
  let rows = [];
  try {
    const got = await D.api(`/api/engagements/${encodeURIComponent(eid)}/sources`);
    rows = got.sources || [];
    cur.coverage = got.coverage || null;
  } catch {
    if (!cur.sources.length) draw(eid, [], 'The sources could not be loaded. They will load again shortly.');
    cur.poll = setTimeout(() => refreshStudio(cur.eid), 8000);
    return;
  }
  if (cur.eid !== eid) return;                 // the person focused another engagement meanwhile
  cur.sources = rows;
  const sig = JSON.stringify([rows.map((r) => [r.id, r.title, r.guide && r.guide.status]), cur.coverage]);
  if (sig !== cur.sig) { cur.sig = sig; draw(eid, rows); }
  if (rows.some((r) => r.guide && r.guide.status === 'reading')) cur.poll = setTimeout(() => refreshStudio(eid), 4000);
}

function draw(eid, rows, note = '') {
  const { h } = D;
  const panel = document.getElementById('srcPane');
  if (!panel || panel.dataset.eid !== eid) return;
  const open = new Set([...panel.querySelectorAll('details.src[open]')].map((d) => d.dataset.id));
  const off = offSet(eid);
  const count = h('span', { class: 'studio__count mono' });
  const single = rows.filter((r) => !r.group);
  const paintCount = () => {
    const on = single.filter((r) => !off.has(r.id)).length;
    count.textContent = single.length ? `${on} of ${single.length} on` : '';
  };
  paintCount();
  const setAll = (value) => {
    single.forEach((r) => { if (value) off.delete(r.id); else off.add(r.id); });
    saveOff(eid, off);
    panel.querySelectorAll('input.src__check').forEach((c) => { c.checked = value; });
    paintCount();
  };
  const list = h('ul', { class: 'srclist', 'aria-label': 'Sources' }, ...rows.map((r) => sourceRow(eid, r, off, open, paintCount)));
  // Where more evidence comes from, one click away: files for this engagement, and the data packs research searches
  const packBtn = h('button', { class: 'studio__add', type: 'button', 'data-open-packs': '', onclick: () => D.openPacks && D.openPacks() },
    D.icon('packs', 'ic--sm'), h('span', { class: 'studio__packlabel', text: D.packsLabel ? D.packsLabel() : 'Data packs' }));
  const sources = h('section', { class: 'studio__sec', 'aria-label': 'Files and sources' },
    h('div', { class: 'studio__head' }, h('p', { class: 'studio__hint', text: single.length
      ? 'Sources switched off are left out of answers and outputs.'
      : rows.length ? 'Reddit listening is below. Add files or research to add more.'
        : (note || 'No sources yet. Add files or ask for research.') }), count),
    h('div', { class: 'studio__adds' },
      h('button', { class: 'studio__add', type: 'button', onclick: () => D.openFiles && D.openFiles() }, D.icon('plus', 'ic--sm'), 'Add files'),
      packBtn),
    single.length ? h('div', { class: 'studio__bulk' },
      h('button', { class: 'linkbtn', type: 'button', onclick: () => setAll(true) }, 'All on'),
      h('button', { class: 'linkbtn', type: 'button', onclick: () => setAll(false) }, 'All off')) : null,
    list, coverageLine(cur.coverage));
  panel.replaceChildren(sources);
}

/** The second brain's hold on this engagement, on demand (uplift plan WS-3 step 3). */
function coverageLine(c) {
  if (!c || !c.sources) return null;
  const { h } = D;
  const wait = c.waiting_for_embedder;
  return h('details', { class: 'studio__coverage' },
    h('summary', { text: 'Second brain' }),
    h('p', { text: `${c.archived} of ${c.sources} sources archived in the wiki, read as ${c.chunks} passages.` }),
    wait ? h('p', { text: `${wait} not yet searchable: they are added when the embedding service is back.` }) : null);
}

function groupRow(r) {
  const { h, icon } = D;
  return h('li', { class: 'srcrow srcrow--group' }, h('span', { class: 'src__mark', 'aria-hidden': 'true' }, icon('social', 'ic--sm')),
    h('div', { class: 'src' },
      h('p', { class: 'src__title', text: r.title }),
      h('p', { class: 'src__meta', text: [`${r.count} posts`, r.date].filter(Boolean).join(' · ') }),
      h('p', { class: 'guide__summary', text: (r.guide && r.guide.summary) || '' }),
      r.url && /^https?:/.test(r.url) ? h('div', { class: 'src__links' },
        h('a', { class: 'linkbtn', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Social Research')) : null));
}

function sourceRow(eid, r, off, open, paintCount) {
  const { h } = D;
  if (r.group) return groupRow(r);
  const check = h('input', { type: 'checkbox', class: 'src__check', id: `src-${r.id}`, 'aria-label': `Use ${r.title}` });
  check.checked = !off.has(r.id);
  check.addEventListener('change', () => {
    if (check.checked) off.delete(r.id); else off.add(r.id);
    saveOff(eid, off);
    paintCount();
  });
  const meta = [ORIGIN[r.origin] || r.origin, r.publisher, (r.date || '').slice(0, 10), r.same_as ? `same page as ${r.same_as}` : '']
    .filter(Boolean).join(' · ');
  const g = r.guide || { status: 'none' };
  let guideEl;
  if (g.status === 'ready') {
    guideEl = h('div', { class: 'guide' },
      g.summary ? h('p', { class: 'guide__summary', text: g.summary }) : null,
      (g.key_topics || []).length ? h('div', { class: 'guide__topics' }, ...g.key_topics.map((t) => h('span', { class: 'chip', text: t }))) : null,
      (g.questions || []).length ? h('div', { class: 'guide__qs' }, ...g.questions.map((q) =>
        h('button', { class: 'guide__q', type: 'button', onclick: () => D.send(q, { focus: eid }) }, q))) : null);
  } else if (g.status === 'reading') {
    guideEl = h('p', { class: 'guide__state', text: 'Reading this source and writing its guide.' });
  } else {
    const label = g.status === 'failed' ? 'Try the guide again' : 'Write a guide for this source';
    guideEl = h('div', { class: 'guide' },
      g.status === 'failed' ? h('p', { class: 'guide__state', text: `No guide yet: ${g.error || 'the guide could not be written'}.` }) : null,
      h('button', { class: 'linkbtn', type: 'button', onclick: async (e) => {
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Reading';
        try { await D.api(`/api/engagements/${encodeURIComponent(eid)}/sources/${encodeURIComponent(r.id)}/guide`, { method: 'POST' }); } catch { D.toast('The guide could not be written. Try again later.'); }
        cur.sig = '';
        refreshStudio(eid);
      } }, label));
  }
  const det = h('details', { class: 'src', 'data-id': r.id },
    h('summary', { class: 'src__sum' }, h('span', { class: 'src__title', text: r.title }), h('span', { class: 'src__meta', text: meta })),
    guideEl,
    h('div', { class: 'src__links' },
      h('button', { class: 'linkbtn', type: 'button', onclick: () => openCitation(eid, r.id) }, 'Quotes and passages'),
      r.url && /^https?:/.test(r.url) ? h('a', { class: 'linkbtn', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open the original') : null));
  if (open.has(r.id)) det.open = true;
  return h('li', { class: 'srcrow' }, check, det);
}

// ---- C1: a citation opens the exact passage ----------------------------------------------------------------------
function onCiteClick(e) {
  const b = e.target.closest && e.target.closest('.cite__btn');
  if (!b) return;
  e.preventDefault();
  const eid = (b.closest('[data-eid]') || {}).dataset?.eid || D.getFocus();
  if (!eid) { D.toast('Focus the engagement this answer is about to open its sources.'); return; }
  openCitation(eid, b.dataset.src);
}

function markQuote(text, quote) {
  const { h } = D;
  const i = quote ? text.toLowerCase().indexOf(quote.toLowerCase()) : -1;
  if (i < 0) return h('p', { class: 'passage__text', text });
  return h('p', { class: 'passage__text' }, text.slice(0, i), h('mark', { text: text.slice(i, i + quote.length) }), text.slice(i + quote.length));
}

export async function openCitation(eid, sid) {
  const { h, api } = D;
  const body = h('div', { class: 'cite-sheet' }, h('p', { text: 'Loading the source.' }));
  const back = h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => D.openEngagement(eid, 'files') }, D.icon('back', 'ic--sm'), 'Back to files');
  D.openSheet({ title: `Source ${sid}`, body, actions: [back] });
  let s;
  try { s = await api(`/api/engagements/${encodeURIComponent(eid)}/passage?source=${encodeURIComponent(sid)}`); } catch (err) {
    body.replaceChildren(h('p', { text: err.status === 404 ? 'This engagement has no source with that number.' : 'The source could not be loaded. Try again shortly.' }));
    return;
  }
  const meta = [s.publisher, (s.date || '').slice(0, 10)].filter(Boolean).join(' · ');
  const head = h('header', { class: 'cite-sheet__head' },
    h('h3', { class: 'cite-sheet__title', text: s.title }),
    meta ? h('p', { class: 'cite-sheet__meta', text: meta }) : null,
    s.url && /^https?:/.test(s.url) ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', class: 'linkbtn' }, 'Open the original') : null);
  const items = (s.quotes || []).map((q) => {
    const slot = h('div', { class: 'passage' });
    const show = h('button', { class: 'linkbtn', type: 'button', onclick: async () => {
      show.disabled = true;
      if (!q.pointer) { slot.replaceChildren(h('p', { class: 'passage__note', text: 'This quote spans two passages, so it is shown as quoted.' })); return; }
      try {
        const p = await api(`/api/engagements/${encodeURIComponent(eid)}/passage?pointer=${encodeURIComponent(q.pointer)}`);
        slot.replaceChildren(markQuote(p.text || '', q.quote));
      } catch { slot.replaceChildren(h('p', { class: 'passage__note', text: 'The passage could not be loaded.' })); show.disabled = false; }
    } }, 'Show the passage');
    return h('li', { class: 'cite-sheet__q' },
      h('blockquote', { text: `"${q.quote}"` }),
      q.claim ? h('p', { class: 'cite-sheet__claim', text: q.claim }) : null,
      show, slot);
  });
  body.replaceChildren(head, items.length
    ? h('ol', { class: 'cite-sheet__list' }, ...items)
    : h('div', null, h('p', { class: 'passage__note', text: 'No verified quote has been taken from this source yet. The opening of the source:' }),
      h('p', { class: 'passage__text', text: s.excerpt || '' })));
}
