/* The composer's Make menu (2026-11-19). Every kind of work IA Next does, read from catalog.js, one short line each,
   in the right-hand flyout like every panel in IA Next. Choosing an item expands the same panel the home page's tiles
   open (app.js capDetail): what it does, its steering options and example requests. A request lands in the message
   box with its first [slot] selected, and the flyout closes. */
import { CAPS } from './catalog.js';

let D = null;
const KEYBOARD = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const st = { open_id: null };

export function initMake(deps) {
  D = deps;
  document.getElementById('makeBtn')?.addEventListener('click', () => openMake());
}

export function openMake() {
  if (!D) return;
  st.open_id = null;
  const body = D.h('div', { class: 'makepanel' });
  D.openSheet({ title: 'Make', sub: `Pick one to see its options and examples${KEYBOARD ? '. Tab moves between [brackets]' : ''}.`, body });
  draw(body);
}

function draw(body) {
  const { h, icon } = D;
  body.replaceChildren(
    ...CAPS.map((g) => h('section', { class: 'makegroup' },
      h('h3', { class: 'makegroup__title' }, h('span', { class: 'mono', text: g.step }), g.group),
      ...g.items.map((it) => {
        const isOpen = st.open_id === it.id;
        const row = h('button', { class: `makeitem${isOpen ? ' is-open' : ''}`, type: 'button', 'aria-expanded': String(isOpen),
          onclick: () => {
            st.open_id = isOpen ? null : it.id;
            draw(body);
            const wrap = body.querySelector('.makeitem__wrap');
            wrap?.querySelector('.makeitem')?.focus();
            requestAnimationFrame(() => wrap?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
          } },
        h('span', { class: 'makeitem__ic' }, icon(it.icon)),
        h('span', { class: 'makeitem__main' },
          h('span', { class: 'makeitem__title', text: it.title }),
          h('span', { class: 'makeitem__desc', text: it.short || it.desc })),
        it.tag ? h('span', { class: 'makeitem__tag mono', text: `#${it.tag}` }) : null);
        if (!isOpen) return row;
        return h('div', { class: 'makeitem__wrap' }, row,
          D.detail(it, g, (closeOnly) => { if (closeOnly === true) { st.open_id = null; draw(body); } else D.closeSheet(); }));
      }))));
}
