// The interactive mind map. The picture of a mind map is framed without scripts, so the tree a person explores is
// drawn here, in the workspace, from the map's saved data (/api/tasks/{id}/mindmap): the subject, each branch, the
// sentences under it and the checked passages behind them.
//
//   - a branch opens and closes (click, Enter, or the right and left arrow keys); up and down move between nodes;
//   - Open all / Close all, and zoom in and out;
//   - "Ask about this" on any node puts a question about it in the composer;
//   - each branch shows the quoted passages it rests on, with the source's name.
//
// Gemini Notebook's mind map has the tree, the zoom and the click-to-ask; it has no passages behind its nodes.

let kit = null;                        // { h, icon, api, ask }
export function initMindTree(k) { kit = k; }

const ZOOMS = [0.8, 0.9, 1, 1.15, 1.3];

export function mindTree(tid) {
  const { h, api } = kit;
  const el = h('section', { class: 'mt', 'aria-label': 'Mind map you can explore', hidden: true });
  api(`/api/tasks/${encodeURIComponent(tid)}/mindmap`).then((d) => {
    if (!d || !Array.isArray(d.branches) || !d.branches.length) return;
    el.hidden = false;
    paint(el, d);
  }).catch(() => { /* not a mind map: the picture stands alone */ });
  return el;
}

function paint(el, d) {
  const { h, icon, ask } = kit;
  let zoom = 2;
  const tree = h('div', { class: 'mt__tree', role: 'tree', 'aria-label': d.hub || d.title || 'Mind map' });
  const askBtn = (about) => h('button', { class: 'mt__ask', type: 'button', title: 'Put a question about this in the message box',
    onclick: (e) => { e.stopPropagation(); ask(`In the mind map "${d.title || d.hub}", tell me more about: ${about}`); } }, 'Ask about this');

  const makeBranch = (b, i) => {
    const kids = h('ul', { class: 'mt__kids', role: 'group' },
      (b.points || []).map((p) => h('li', { class: 'mt__kid', role: 'treeitem', tabindex: '-1' },
        h('span', { class: 'mt__kidtext', text: p }), askBtn(p))),
      (b.evidence || []).length ? h('li', { class: 'mt__src', role: 'none' },
        h('p', { class: 'mt__srck', text: (b.evidence.length === 1 ? 'Rests on this passage' : `Rests on these ${b.evidence.length} passages`) }),
        b.evidence.slice(0, 4).map((e) => h('blockquote', { class: 'mt__quote' },
          h('span', { text: `"${String(e.quote || '').trim()}"` }), h('cite', { text: e.source || e.source_id || '' })))) : null);
    const head = h('div', { class: 'mt__branchhead' },
      h('span', { class: 'mt__chev', 'aria-hidden': 'true' }, icon('chevron', 'ic--sm')),
      h('span', { class: 'mt__label', text: b.label }),
      h('span', { class: 'mt__n mono', 'aria-hidden': 'true', text: String((b.points || []).length) }));
    const li = h('li', { class: 'mt__branch', role: 'treeitem', tabindex: i ? '-1' : '0', 'aria-expanded': 'false', style: `--i:${i}` },
      head, askBtn(b.label), kids);
    head.addEventListener('click', () => toggle(li));
    return li;
  };
  // Four levels when the map has areas: the subject, each area, its branches, their sentences. Every level opens.
  let branches = [], areas = [];
  if (Array.isArray(d.areas) && d.areas.length > 1) {
    let n = 0;
    areas = d.areas.map((a, ai) => {
      const mine = (a.branches || []).map((b) => makeBranch(b, n++));
      mine.forEach((b) => b.setAttribute('tabindex', '-1'));
      branches = branches.concat(mine);
      const head = h('div', { class: 'mt__areahead' },
        h('span', { class: 'mt__chev', 'aria-hidden': 'true' }, icon('chevron', 'ic--sm')),
        h('span', { class: 'mt__arealabel', text: a.label }),
        h('span', { class: 'mt__n mono', 'aria-hidden': 'true', text: String(mine.length) }));
      const li = h('li', { class: 'mt__area', role: 'treeitem', tabindex: ai ? '-1' : '0', 'aria-expanded': 'false' },
        head, askBtn(a.label), h('ul', { class: 'mt__branches mt__branches--in', role: 'group' }, mine));
      head.addEventListener('click', () => toggle(li));
      return li;
    });
    tree.append(h('div', { class: 'mt__hub', text: d.hub || d.title || '' }), h('ul', { class: 'mt__areas', role: 'none' }, areas));
  } else {
    branches = d.branches.map(makeBranch);
    tree.append(h('div', { class: 'mt__hub', text: d.hub || d.title || '' }), h('ul', { class: 'mt__branches', role: 'none' }, branches));
  }

  function toggle(li, open) {
    const now = open ?? li.getAttribute('aria-expanded') !== 'true';
    li.setAttribute('aria-expanded', String(now));
  }
  const visible = () => [...tree.querySelectorAll('.mt__area, .mt__branch, .mt__kid')].filter((n) => n.offsetParent !== null);
  function focus(node) {
    tree.querySelectorAll('[tabindex="0"]').forEach((n) => n.setAttribute('tabindex', '-1'));
    node.setAttribute('tabindex', '0');
    node.focus();
  }
  tree.addEventListener('keydown', (e) => {
    const cur = e.target.closest('.mt__kid, .mt__branch, .mt__area');
    if (!cur || e.target.closest('button')) return;
    const list = visible();
    const at = list.indexOf(cur);
    const opens = cur.matches('.mt__branch, .mt__area');
    const parent = cur.parentElement.closest('.mt__branch, .mt__area');
    if (e.key === 'ArrowDown' && at < list.length - 1) focus(list[at + 1]);
    else if (e.key === 'ArrowUp' && at > 0) focus(list[at - 1]);
    else if (e.key === 'ArrowRight' && opens) { if (cur.getAttribute('aria-expanded') === 'true') { const k = cur.querySelector(cur.matches('.mt__area') ? '.mt__branch' : '.mt__kid'); if (k) focus(k); } else toggle(cur, true); }
    else if (e.key === 'ArrowLeft') { if (opens && cur.getAttribute('aria-expanded') === 'true') toggle(cur, false); else if (parent) focus(parent); }
    else if ((e.key === 'Enter' || e.key === ' ') && opens) toggle(cur);
    else if (e.key === 'Home') focus(list[0]);
    else if (e.key === 'End') focus(list[list.length - 1]);
    else return;
    e.preventDefault();
  });

  const setZoom = (z) => { zoom = Math.max(0, Math.min(ZOOMS.length - 1, z)); tree.style.setProperty('--z', String(ZOOMS[zoom])); };
  const bar = h('div', { class: 'mt__bar' },
    h('p', { class: 'mt__k', text: 'Explore the map' }),
    h('span', { class: 'mt__tools' },
      d.nodes ? h('span', { class: 'mt__count mono', text: `${d.nodes} nodes` }) : null,
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => areas.concat(branches).forEach((b) => toggle(b, true)) }, 'Open all'),
      h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => areas.concat(branches).forEach((b) => toggle(b, false)) }, 'Close all'),
      h('button', { class: 'btn btn--quiet mt__z', type: 'button', 'aria-label': 'Zoom out', onclick: () => setZoom(zoom - 1) }, '−'),
      h('button', { class: 'btn btn--quiet mt__z', type: 'button', 'aria-label': 'Zoom in', onclick: () => setZoom(zoom + 1) }, '+')));
  el.replaceChildren(bar, h('div', { class: 'mt__scroll' }, tree));
  if (areas.length) areas.forEach((a) => toggle(a, true));      // every area open, so the branches show at once
  else toggle(branches[0], true);
}
