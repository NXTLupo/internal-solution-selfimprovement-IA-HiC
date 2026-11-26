/* Engagements managed as projects (field test 23 Nov, Gap 3; owner, 24 Nov: "managing engagements like projects,
   naming them, editing their settings"). Two panels, both in the right-hand flyout like every panel in IA Next:

   - the manager: every engagement in one list, searched and filtered by tag, with several selected at once to
     archive, restore, pin, tag or merge;
   - one engagement's settings: its name, client, description and tags, and the defaults its new work starts from
     (data packs, the period its evidence must come from, depth, brand, audience).

   Nothing here deletes anything: archive hides, merge folds work under one engagement and can be undone. */
let D = null;

const PERIODS = [['', 'Decide from each request'], ['1', 'Today'], ['7', 'The last 7 days'], ['30', 'The last 30 days'],
  ['90', 'The last 90 days'], ['365', 'The last 12 months'], ['any', 'Any date']];
const DEPTHS = [['', 'Decide from each request'], ['fast', 'Fast: one writer, checks in code'], ['deep', 'Deep: more sources and a second review']];
const BRANDS = [['', 'NXT Humans'], ['nu', 'Northeastern'], ['deciem', 'DECIEM']];

export function initEngagements(deps) { D = deps; }

function ago(ts) { return ts ? D.ago(ts) : ''; }
function meta(e) {
  return [e.client, e.task_count ? D.plural(e.task_count, 'piece of work', 'pieces of work') : 'No work yet',
    e.source_count ? D.plural(e.source_count, 'source') : '', e.last_activity ? ago(e.last_activity) : '',
    (e.merged || []).length ? `${e.merged.length} merged in` : ''].filter(Boolean).join(' · ');
}
async function post(path, json) { return D.api(path, { method: 'POST', json }); }
function fail(err) { D.toast((err && err.message) || 'That did not work. Try again.'); }

// ---- the manager ---------------------------------------------------------------------------------------------------
export async function openManager() {
  const { h } = D;
  const st = { q: '', tag: '', archived: false, picked: new Set(), rows: [] };
  const search = h('input', { class: 'packpanel__filter engm__q', type: 'search', placeholder: 'Search by name, client or tag', 'aria-label': 'Search engagements' });
  const tags = h('div', { class: 'engm__tags' });
  const list = h('div', { class: 'engm__list', role: 'list' });
  const bar = h('div', { class: 'engm__bar', hidden: true });
  const name = h('input', { class: 'packpanel__filter', type: 'text', placeholder: 'Name a new engagement', maxlength: '120', 'aria-label': 'Name a new engagement' });
  const create = h('button', { class: 'btn', type: 'button', onclick: async () => {
    const title = name.value.trim();
    if (title.length < 3) { name.focus(); D.toast('Give the engagement a name of at least three letters.'); return; }
    try {
      const r = await post('/api/engagements', { title, objective: title });
      name.value = '';
      await load();
      openSettings(r.id, openManager);
    } catch (e) { fail(e); }
  } }, 'Create');
  const archivedBtn = h('button', { class: 'linkbtn', type: 'button', onclick: () => { st.archived = !st.archived; st.picked.clear(); load(); } });

  const load = async () => {
    try { st.rows = (await D.api('/api/engagements?include_hidden=1')).engagements || []; } catch { st.rows = []; }
    await D.refresh();
    draw();
  };
  const shown = () => {
    const q = st.q.trim().toLowerCase();
    return st.rows.filter((e) => !e.merged_into && (st.archived ? e.hidden : !e.hidden)
      && (!st.tag || (e.tags || []).includes(st.tag))
      && (!q || [e.title, e.client, e.description, ...(e.tags || [])].join(' ').toLowerCase().includes(q)));
  };
  const bulk = async (body, done) => {
    try { await post('/api/engagements/bulk', { ids: [...st.picked], ...body }); st.picked.clear(); await load(); if (done) D.toast(done); } catch (e) { fail(e); }
  };
  const drawBar = () => {
    const n = st.picked.size;
    bar.hidden = !n;
    if (!n) return;
    const tagIn = h('input', { class: 'packpanel__filter engm__tagin', type: 'text', placeholder: 'Tag', maxlength: '40', 'aria-label': 'Tag to add' });
    bar.replaceChildren(
      h('span', { class: 'engm__count', text: `${n} selected` }),
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => bulk({ archived: !st.archived }, st.archived ? 'Back in the list.' : 'Archived. Nothing was deleted.') }, st.archived ? 'Restore' : 'Archive'),
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => bulk({ pinned: true }) }, 'Pin'),
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => bulk({ pinned: false }) }, 'Unpin'),
      tagIn,
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => { const t = tagIn.value.trim(); if (t) bulk({ add_tags: [t] }); else tagIn.focus(); } }, 'Add tag'),
      n >= 2 ? h('button', { class: 'btn', type: 'button', onclick: () => openMerge([...st.picked].map((id) => st.rows.find((e) => e.id === id)).filter(Boolean), load) }, 'Merge') : null);
  };
  const draw = () => {
    const rows = shown();
    const all = [...new Set(st.rows.filter((e) => !e.merged_into).flatMap((e) => e.tags || []))].sort((a, b) => a.localeCompare(b));
    tags.replaceChildren(...all.map((t) => h('button', { class: `lib__chip engm__tag${st.tag === t ? ' is-on' : ''}`, type: 'button',
      onclick: () => { st.tag = st.tag === t ? '' : t; draw(); } }, h('span', { text: t }))));
    const hiddenN = st.rows.filter((e) => e.hidden && !e.merged_into).length;
    archivedBtn.textContent = st.archived ? 'Back to current engagements' : (hiddenN ? `Archived and hidden (${hiddenN})` : '');
    archivedBtn.hidden = !st.archived && !hiddenN;
    list.replaceChildren(...(rows.length ? rows.map((e) => {
      const box = h('input', { type: 'checkbox', 'aria-label': `Select ${e.title}`, checked: st.picked.has(e.id) ? '' : null,
        onchange: (ev) => { if (ev.target.checked) st.picked.add(e.id); else st.picked.delete(e.id); drawBar(); } });
      return h('div', { class: `engm__row${e.pinned ? ' is-pinned' : ''}`, role: 'listitem', 'data-eng': e.id }, box,
        h('button', { class: 'engm__main', type: 'button', title: 'Open this engagement', onclick: () => { D.closeSheet(); D.openEngagement(e.id); } },
          h('span', { class: 'engm__name', text: (e.pinned ? 'Pinned · ' : '') + (e.title || 'Untitled engagement') }),
          h('span', { class: 'engm__meta', text: meta(e) }),
          (e.tags || []).length ? h('span', { class: 'engm__rowtags' }, e.tags.map((t) => h('span', { class: 'engm__pill', text: t }))) : null),
        h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => openSettings(e.id, openManager) }, 'Settings'));
    }) : [h('p', { class: 'packpanel__empty', text: st.q || st.tag ? 'No engagement matches that.' : st.archived ? 'Nothing is archived.' : 'No engagements yet.' })]));
    drawBar();
  };
  search.addEventListener('input', () => { st.q = search.value; draw(); });
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') create.click(); });
  D.openSheet({ title: 'Engagements', size: 'work', body: h('div', { class: 'engm' },
    h('div', { class: 'engm__top' }, search, h('div', { class: 'field engm__new' }, name, create)),
    tags, bar, list, archivedBtn) });
  await load();
}

// ---- merge ---------------------------------------------------------------------------------------------------------
function openMerge(rows, after) {
  const { h } = D;
  let keep = rows[0].id;
  const name = h('input', { class: 'packpanel__filter', type: 'text', placeholder: 'Name of the new engagement', maxlength: '120', hidden: true, 'aria-label': 'Name of the new engagement' });
  const option = (value, title, sub) => h('label', { class: 'packrow' },
    h('input', { type: 'radio', name: 'engmKeep', checked: value === keep ? '' : null, onchange: () => { keep = value; name.hidden = value !== ''; if (!name.hidden) name.focus(); } }),
    h('span', { class: 'packrow__main' }, h('span', { class: 'packrow__name', text: title }), h('span', { class: 'packrow__desc', text: sub })));
  const go = h('button', { class: 'btn btn--accent', type: 'button', onclick: async () => {
    if (!keep && name.value.trim().length < 3) { name.focus(); D.toast('Name the new engagement.'); return; }
    go.disabled = true;
    try {
      const r = await post('/api/engagements/merge', { ids: rows.map((e) => e.id), into: keep, title: name.value.trim() });
      D.toast(`Merged ${r.merged.length} into one engagement; ${r.sources_copied} sources copied across. Nothing was deleted.`);
      await D.refresh();
      D.setFocus(r.into);
      if (after) openManager(); else D.closeSheet();
    } catch (e) { go.disabled = false; fail(e); }
  } }, 'Merge');
  D.openSheet({ title: `Merge ${rows.length} engagements`, actions: [go], body: h('div', { class: 'engm' },
    h('p', { class: 'panel__sub', text: 'Choose the engagement that remains. The others’ work and chats show under it, their sources are copied into it, and they leave the list. Each can be separated again from its settings.' }),
    ...rows.map((e) => option(e.id, e.title || 'Untitled engagement', meta(e))),
    option('', 'A new engagement', 'All of the selected fold into it'), name) });
}

// ---- one engagement's settings ---------------------------------------------------------------------------------------
export async function openSettings(eid, back) {
  const { h } = D;
  let e, packs = [];
  try { e = await D.api(`/api/engagements/${encodeURIComponent(eid)}/settings`); } catch (err) { fail(err); return; }
  try { packs = (await D.api('/api/packs')).packs || []; } catch { packs = []; }
  const s = e.settings || {};
  const text = (value, attrs = {}) => h('input', { class: 'packpanel__filter', type: 'text', value: value || '', ...attrs });
  const select = (rows, value) => h('select', { class: 'packpanel__filter' }, rows.map(([v, label]) => h('option', { value: v, selected: v === (value || '') ? '' : null, text: label })));
  const field = (label, control, hint) => h('label', { class: 'engm__field' }, h('span', { class: 'engm__label', text: label }), control, hint ? h('span', { class: 'engm__hint', text: hint }) : null);
  const title = text(e.title, { maxlength: '160', 'aria-label': 'Name' });
  const client = text(e.client, { maxlength: '120', placeholder: 'The organization this work is for' });
  const desc = h('textarea', { class: 'packpanel__filter engm__desc', rows: '3', maxlength: '2000', placeholder: 'What this engagement is for. IA Next reads this as its purpose.' });
  desc.value = e.description || '';
  const tags = text((e.tags || []).join(', '), { placeholder: 'Separate tags with commas' });
  const audience = text(s.audience, { maxlength: '200', placeholder: 'Who the work is written for, for example: the provost’s cabinet' });
  const period = select(PERIODS, s.period);
  const depth = select(DEPTHS, s.depth);
  const brand = select(BRANDS, s.brand);
  const chosen = new Set(s.packs || []);
  const packList = h('div', { class: 'engm__packs' }, packs.length ? packs.map((p) => h('label', { class: `packrow${chosen.has(p.id) ? ' is-on' : ''}` },
    h('input', { type: 'checkbox', checked: chosen.has(p.id) ? '' : null, onchange: (ev) => { if (ev.target.checked) chosen.add(p.id); else chosen.delete(p.id); ev.target.closest('.packrow').classList.toggle('is-on', ev.target.checked); packSummary(); } }),
    h('span', { class: 'packrow__main' }, h('span', { class: 'packrow__name', text: p.name })),
    h('span', { class: 'packrow__n mono', text: `${p.sourceCount} sources` })))
    : [h('p', { class: 'packpanel__empty', text: 'HiC is not running, so its data packs cannot be listed. The saved choice is kept.' })]);
  const packsLine = h('summary');
  function packSummary() { packsLine.textContent = `Data packs: ${chosen.size ? `${chosen.size} chosen` : 'chosen from each request'}`; }
  packSummary();
  const packsBox = h('details', { class: 'engm__more' }, packsLine, packList);
  const save = h('button', { class: 'btn btn--accent', type: 'button', onclick: async () => {
    save.disabled = true;
    try {
      const body = { title: title.value, client: client.value, description: desc.value,
        tags: tags.value.split(',').map((t) => t.trim()).filter(Boolean),
        settings: { period: period.value, depth: depth.value, brand: brand.value, audience: audience.value,
          ...(packs.length ? { packs: [...chosen] } : {}) } };
      await post(`/api/engagements/${encodeURIComponent(eid)}/settings`, body);
      if (packs.length) D.LS.set(`packs:${eid}`, [...chosen]);
      await D.refresh();
      D.refreshPacks();
      D.toast('Saved. New work in this engagement starts from these settings.');
      if (back) back(); else D.closeSheet();
    } catch (err) { save.disabled = false; fail(err); }
  } }, 'Save');
  const flag = (label, changes, done) => h('button', { class: 'btn btn--quiet', type: 'button', onclick: async () => {
    try { await post(`/api/engagements/${encodeURIComponent(eid)}/settings`, changes); await D.refresh(); D.toast(done); if (back) back(); else D.closeSheet(); } catch (err) { fail(err); }
  } }, label);
  const merged = (e.merged || []).length ? h('div', { class: 'engm__merged' },
    h('p', { class: 'engm__label', text: 'Merged into this engagement' }),
    ...e.merged.map((id, i) => h('div', { class: 'engm__mergedrow' }, h('span', { text: e.merged_titles[i] || id }),
      h('button', { class: 'linkbtn', type: 'button', onclick: async () => {
        try { await post(`/api/engagements/${encodeURIComponent(id)}/unmerge`, {}); await D.refresh(); D.toast('Separated. It is back in the list.'); openSettings(eid, back); } catch (err) { fail(err); }
      } }, 'Separate')))) : null;
  D.openSheet({ title: 'Engagement settings', actions: [save], body: h('div', { class: 'engm engm--form' },
    field('Name', title), field('Client', client), field('Description', desc), field('Tags', tags),
    h('p', { class: 'engm__section', text: 'Defaults for new work' }),
    field('Evidence from', period, 'A period named in a request still wins.'),
    field('Depth', depth), field('Brand', brand), field('Written for', audience), packsBox,
    merged,
    h('div', { class: 'engm__foot' },
      flag(e.pinned ? 'Unpin' : 'Pin to the top', { pinned: !e.pinned }, e.pinned ? 'Unpinned.' : 'Pinned to the top of the list.'),
      flag(e.archived || e.hidden ? 'Restore to the list' : 'Archive', { archived: !(e.archived || e.hidden) }, e.archived || e.hidden ? 'Back in the list.' : 'Archived. Nothing was deleted.'),
      back ? h('button', { class: 'btn btn--quiet', type: 'button', onclick: back }, 'Back to all engagements') : null)) });
  setTimeout(() => title.focus(), 50);
}
