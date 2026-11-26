/* Data packs picker (2026-11-19). The person chooses which of HiC's industry and theme data packs a research report
   searches: every source in each chosen pack, plus HiC's news and social sources. The list is read live from
   /api/packs (a pack HiC adds appears here), the choice is remembered per engagement and sent with every message, and
   with nothing chosen ("Auto") IA Next picks the packs from the question. It opens in the right-hand flyout, like
   every panel in IA Next. */
let D = null;
const st = { packs: [], general: 0, inPacks: 0, available: null, filter: '' };

function key() { return `packs:${D.getFocus() || 'none'}`; }
/** HiC's descriptions open with a count written when the pack was made ("250 free sources: ..."); the row shows the
    live count, so that stale one is dropped. */
function describe(p) {
  const d = String(p.description || '').replace(/^\s*\d[\d,]*\s+(free\s+)?sources?\s*[:,-]\s*/i, '').trim();
  return d ? d[0].toUpperCase() + d.slice(1) : (p.industries || []).join(', ');
}
function byId(id) { return st.packs.find((p) => p.id === id); }

/** The pack ids the person chose for the engagement in view; [] means Auto. */
export function selectedPacks() {
  if (!D) return [];
  const ids = D.LS.get(key(), []);
  return Array.isArray(ids) ? ids.filter((id) => !st.packs.length || byId(id)) : [];
}

function save(ids) {
  D.LS.set(key(), ids);
  render();
  document.dispatchEvent(new CustomEvent('ia:packs-chosen', { detail: { ids } }));     // the person's own choice
}
function toggle(id) {
  const ids = selectedPacks();
  save(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
}

async function load() {
  try {
    const r = await D.api('/api/packs');
    st.packs = r.packs || [];
    st.general = r.general_sources || 0;
    st.inPacks = r.pack_sources || 0;
    st.available = !!r.available;
  } catch { st.available = false; }
  render();
}

/** The words on the Data packs button: "Data packs: Auto", the one pack's name, or "3 data packs". */
export function packsLabel() {
  const ids = selectedPacks();
  return ids.length === 0 ? 'Data packs: Auto' : ids.length === 1 ? (byId(ids[0])?.name || 'Data pack') : `${ids.length} data packs`;
}

/** Live figures for the page: how many packs, distinct sources in them, and sources in no pack. */
function paintStats() {
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');
  const val = { packs: st.packs.length, sources: st.inPacks, general: st.general };
  document.querySelectorAll('[data-pack-stat]').forEach((el) => {
    const v = val[el.dataset.packStat];
    if (v) el.textContent = fmt(v);
  });
  document.querySelectorAll('[data-pack-stats]').forEach((el) => { el.hidden = !(st.available && st.packs.length); });
}

function render() {
  const ids = selectedPacks();
  const btn = document.getElementById('packBtn');
  const label = document.getElementById('packBtnLabel');
  paintStats();
  document.dispatchEvent(new CustomEvent('ia:packs', { detail: { label: packsLabel(), ids } }));
  if (btn && label) {
    label.textContent = packsLabel();
    btn.setAttribute('aria-pressed', ids.length ? 'true' : 'false');
    btn.title = st.available === false ? 'HiC is not running, so its data packs are unavailable'
      : 'Choose the HiC data packs research searches';
  }
  drawList();                                      // the flyout, when it is open
}

function drawList() {
  const list = document.getElementById('packList');
  const count = document.getElementById('packCount');
  const auto = document.getElementById('packAuto');
  if (!list) return;
  const ids = selectedPacks();
  const q = st.filter.trim().toLowerCase();
  const match = (p) => !q || [p.name, describe(p), ...(p.industries || [])].join(' ').toLowerCase().includes(q);
  const row = (p) => D.h('label', { class: `packrow${ids.includes(p.id) ? ' is-on' : ''}` },
    D.h('input', { type: 'checkbox', checked: ids.includes(p.id), onchange: () => toggle(p.id) }),
    D.h('span', { class: 'packrow__main' },
      D.h('span', { class: 'packrow__name', text: p.name }),
      D.h('span', { class: 'packrow__desc', text: describe(p) })),
    D.h('span', { class: 'packrow__n mono', text: `${p.sourceCount} sources` }));
  const group = (title, kind) => {
    const items = st.packs.filter((p) => p.kind === kind && match(p));
    return items.length ? D.h('section', { class: 'packgroup' },
      D.h('h3', { class: 'packgroup__title', text: title }), ...items.map(row)) : null;
  };
  list.replaceChildren(...(st.available === false
    ? [D.h('p', { class: 'packpanel__empty', text: 'HiC is not running, so its data packs are unavailable. Research still searches the web.' })]
    : st.available === null ? [D.h('p', { class: 'packpanel__empty', text: 'Loading the data packs…' })]
      : [group('Industries', 'industry'), group('Themes', 'theme'),
         st.packs.some(match) ? null : D.h('p', { class: 'packpanel__empty', text: 'No pack matches that.' })].filter(Boolean)));
  if (count) count.textContent = ids.length ? `${ids.length} selected` : 'Auto: IA Next picks from your question';
  if (auto) auto.disabled = !ids.length;
}

function panelBody() {
  const body = D.h('div', { class: 'packpanel' },
    D.h('input', { class: 'packpanel__filter', type: 'search', placeholder: 'Filter: healthcare, museums, insurance…',
                   value: st.filter, 'aria-label': 'Filter data packs',
                   oninput: (e) => { st.filter = e.target.value; drawList(); } }),
    D.h('div', { class: 'packpanel__list', id: 'packList' }),
    D.h('div', { class: 'packpanel__foot' },
      D.h('span', { class: 'packpanel__count', id: 'packCount' }),
      D.h('button', { class: 'btn', type: 'button', id: 'packAuto', text: 'Auto', onclick: () => save([]) }),
      D.h('button', { class: 'btn btn--accent', type: 'button', text: 'Done', onclick: () => D.closeSheet() })));
  return body;
}

/** Open the picker in the right-hand flyout, from the composer, the home page or an engagement's Files tab. */
export function openPacks() {
  if (!D) return;
  if (st.available !== true) load();
  D.openSheet({ title: 'Data packs', sub: 'Research searches every source in the packs you pick. With none picked, IA Next chooses.', body: panelBody() });
  drawList();
  setTimeout(() => document.querySelector('.packpanel__filter')?.focus(), 0);
}

/** Re-draw for the engagement now in view (each engagement keeps its own packs). */
export function refreshPacks() { if (D) render(); }

export function initPacks(deps) {
  D = deps;
  const btn = document.getElementById('packBtn');
  if (!btn) return;
  btn.addEventListener('click', () => openPacks());
  load();
}
