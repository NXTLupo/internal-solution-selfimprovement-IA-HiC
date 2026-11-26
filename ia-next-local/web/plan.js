// The plan card: before an artifact is made, the agent's request to the studio comes back as a plan (ia_next/plan.py).
// The card shows each step, which are required, what each does and how long it is expected to take on this machine.
// The person switches the optional steps on or off and starts it. Once started, the same rows show what is running,
// and the work's own cards appear beneath them.

import { dot } from './orchestra.js';

let kit = null;                        // { h, icon, api, P, taskCard, toast }
export function initPlan(k) { kit = k; }

function timeWords(s, P) {
  if (s.key === 'material') return '';
  if (s.seconds == null) return 'not yet timed';
  return `about ${P.duration(s.seconds)}`;
}

function timeTitle(s) {
  if (s.seconds == null) return 'This step has not finished on this machine yet, so there is no time to show';
  return s.runs ? `The middle value of the last ${s.runs} finished run${s.runs === 1 ? '' : 's'} on this machine`
    : 'Measured once when this build was set up; it updates as runs finish here';
}

export function planCard(pid) {
  const { h, api } = kit;
  const el = h('section', { class: 'plan', 'data-plan': pid, 'data-status': 'loading', 'aria-label': 'Plan for this work' },
    h('p', { class: 'plan__loading', text: 'Writing the plan.' }));
  const st = { plan: null, off: new Set(), timer: null, shown: new Set(), busy: false, chosen: {} };

  async function load() {
    try {
      st.plan = await api(`/api/plans/${encodeURIComponent(pid)}`);
      if (st.plan.status === 'proposed' && !st.touched) {
        st.off = new Set(st.plan.steps.filter((s) => !s.required && !s.on).map((s) => s.key));
      }
      paint();
    } catch (e) {
      el.replaceChildren(h('p', { class: 'plan__loading', text: e.status === 404 ? 'This plan is no longer available.' : 'The plan could not be loaded.' }));
    }
    clearTimeout(st.timer);
    if (st.plan && st.plan.status === 'running' && el.isConnected) st.timer = setTimeout(load, 3000);
  }

  function paint() {
    const { P, icon, taskCard, toast } = kit;
    const p = st.plan;
    const proposed = p.status === 'proposed';
    el.dataset.status = p.status;
    const isOn = (s) => (proposed ? s.required || !st.off.has(s.key) : s.on);
    const total = p.steps.filter(isOn).reduce((n, s) => n + (s.seconds || 0), 0);
    const untimed = p.steps.some((s) => isOn(s) && s.seconds == null);
    const word = { proposed: 'Plan', running: 'In progress', done: 'Finished', failed: 'Did not finish', dismissed: 'Set aside' }[p.status] || 'Plan';

    const head = h('header', { class: 'plan__head' },
      h('div', { class: 'plan__what' },
        h('p', { class: 'plan__kicker', text: `${word} · ${p.label}` }),
        p.request ? h('p', { class: 'plan__ask', text: p.request }) : null),
      proposed ? h('p', { class: 'plan__total mono', title: 'The steps that are switched on, added up' },
        total ? `about ${P.duration(total)}` : '', untimed ? h('span', { class: 'plan__plus', text: total ? ' and more' : 'not yet timed' }) : null) : null);

    const rows = p.steps.map((s, i) => {
      const on = isOn(s);
      const state = proposed ? (s.key === 'material' ? 'done' : on ? 'waiting' : 'skipped') : s.state;
      const ctl = h('span', { class: 'plan__ctl' });
      if (proposed && !s.required) {
        const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': `${s.name}: ${on ? 'on' : 'off'}`,
          onclick: () => { st.touched = true; if (st.off.has(s.key)) st.off.delete(s.key); else st.off.add(s.key); paint(); } }, h('i'));
        ctl.append(sw);
      } else if (proposed && s.key !== 'material') {
        ctl.append(h('span', { class: 'plan__req', text: 'Required' }));
      } else if (!proposed && state === 'skipped') {
        ctl.append(h('span', { class: 'plan__req', text: 'Skipped' }));
      }
      const body = h('div', { class: 'plan__body' },
        h('p', { class: 'plan__name', text: s.name }),
        h('p', { class: 'plan__does', text: s.does }),
        s.note && on ? h('p', { class: 'plan__note', text: s.note }) : null);
      return h('li', { class: 'plan__step', 'data-state': state, style: `--i:${i}` },
        dot(state === 'skipped' ? 'waiting' : state), body,
        h('span', { class: 'plan__dur mono', title: timeTitle(s), text: on ? timeWords(s, P) : '' }), ctl);
    });

    // the choices this artifact takes (shape, detail, format, length, brand): one row of small pickers
    const opts = (p.options || []).length ? h('div', { class: 'plan__opts' }, p.options.map((o) => {
      const value = st.chosen[o.key] ?? o.value;
      return h('div', { class: 'plan__opt', role: 'radiogroup', 'aria-label': o.label },
        h('span', { class: 'plan__optk', text: o.label }),
        h('span', { class: 'seg' }, o.choices.map((c) => h('button', { type: 'button', role: 'radio', class: 'seg__b',
          'aria-checked': String(c.value === value), disabled: proposed ? null : '',
          onclick: () => { st.chosen[o.key] = c.value; paint(); } }, c.label))));
    })) : null;

    // what the studio was asked to make, to read before starting (the outline of a deck, the persona of a journey)
    const brief = (p.brief || []).length ? h('dl', { class: 'plan__brief' }, p.brief.flatMap((b) => [
      h('dt', { text: b.label }),
      h('dd', null, b.items ? h('ol', null, b.items.map((x) => h('li', { text: x }))) : b.value)])) : null;

    const kids = [head, brief, opts, h('ol', { class: `plan__steps orc${st.painted ? '' : ' plan__steps--in'}` }, rows)];
    st.painted = true;

    if (proposed) {
      const go = h('button', { class: 'btn btn--accent', type: 'button', disabled: st.busy || null,
        onclick: async () => {
          st.busy = true; paint();
          try {
            st.plan = await api(`/api/plans/${encodeURIComponent(pid)}/start`, { method: 'POST', json: { skip: [...st.off], options: st.chosen } });
          } catch (e) { toast(`The plan did not start: ${e.message}`); }
          st.busy = false;
          load();
        } }, icon('send', 'ic--sm'), 'Start');
      const no = h('button', { class: 'btn btn--quiet', type: 'button', disabled: st.busy || null,
        onclick: async () => {
          try { st.plan = await api(`/api/plans/${encodeURIComponent(pid)}/dismiss`, { method: 'POST' }); paint(); } catch (e) { toast(e.message); }
        } }, 'Not now');
      kids.push(h('footer', { class: 'plan__foot' }, go, no));
    } else if (p.note) {
      kids.push(h('p', { class: `plan__outcome${p.status === 'failed' ? ' plan__outcome--bad' : ''}`, text: p.note }));
    }

    // the work this plan started, each on its own live card, added once
    const work = el.querySelector('.plan__work') || h('div', { class: 'plan__work' });
    for (const tid of [p.research_task, p.task_id]) {
      if (tid && !st.shown.has(tid)) { st.shown.add(tid); work.append(taskCard(tid)); }
    }
    kids.push(work);
    el.replaceChildren(...kids.filter(Boolean));
  }

  load();
  return el;
}
