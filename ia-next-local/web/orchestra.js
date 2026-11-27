// The live view of the agent at work. Two scenes, both drawn only from what the server reports:
//
//   turnScene()  one chat turn: You -> Agent, and a branch for every tool the agent calls, as it calls it
//                (events agent_step and agent_tool, plus the work it hands to the studio).
//   taskFlow(t)  one piece of studio work: Agent -> each specialist step, with the model answering, the governed skill
//                the step loaded (event skill_used) and a packet moving along the hand-off that is happening now.
//
// Nothing here is decorative timing: a node appears when its event arrives, and a step that has not started shows as
// waiting. Motion is CSS only and stops under prefers-reduced-motion.

const SVGNS = 'http://www.w3.org/2000/svg';
const SYNC_S = 4.8;                    // every loop's period divides this, so a redrawn card keeps its phase

let kit = null;                        // { h, icon, presenceEl, P } from app.js
export function initOrchestra(k) { kit = k; }

function sync(el) {
  el.style.setProperty('--sync', `${-((Date.now() / 1000) % SYNC_S).toFixed(2)}s`);
  return el;
}

export function shortModel(model) {
  const m = String(model || '').toLowerCase();
  if (!m) return '';
  if (m.includes('nemotron')) return 'Nemotron';
  if (m.includes('qwen')) return 'Qwen';
  if (m.includes('ornith')) return 'Ornith';
  if (m.includes('minicpm')) return 'MiniCPM';
  if (m.includes('kandinsky')) return 'Kandinsky';
  if (m.includes('sd3')) return 'Stable Diffusion';
  if (m.includes('whisper')) return 'Whisper';
  if (m.includes('piper')) return 'Piper';
  if (m.includes('claude')) return 'Claude';
  if (m.includes('gemini')) return 'Gemini';
  if (m.includes('gpt')) return 'GPT';
  const tail = String(model).split(/[/:]/).filter(Boolean).pop() || String(model);
  return tail.length > 18 ? `${tail.slice(0, 17)}…` : tail;
}

function words(s) { return String(s || '').replace(/_/g, ' ').trim(); }
function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// What a tool call is, in the person's words: [name on the node, sentence while it runs]
const TOOL_WORDS = {
  start_research_report: ['Research report', 'Planning a research report'],
  start_social_analysis: ['Reddit listening', 'Planning Reddit listening'],
  start_journey_map: ['Journey map', 'Planning a journey map'],
  start_deck: ['Deck', 'Planning a deck'],
  start_prototype: ['Prototype', 'Planning a prototype'],
  start_artifact: ['Document', 'Planning a document'],
  start_themes: ['Themes', 'Planning themes'],
  start_diagram: ['Picture', 'Planning a picture'],
  start_datatable: ['Data table', 'Planning a data table'],
  start_audio_overview: ['Audio overview', 'Planning an audio overview'],
  render_audio_overview: ['Voices', 'Asking for the voices'],
  analyze_uploads: ['Your files', 'Reading your files'],
  generate_image: ['Image', 'Making an image'],
  generate_video: ['Video', 'Preparing a video'],
  task_status: ['Work status', 'Checking on the work'],
  stop_task: ['Stop', 'Stopping the work'],
  retry_task: ['Retry', 'Starting the work again'],
  read_report: ['Report', 'Reading the report'],
  recall: ['Memory', 'Searching memory'],
  answer_from_sources: ['Sources', "Reading the engagement's sources"],
  remember: ['Memory', 'Saving to memory'],
  forget: ['Memory', 'Removing from memory'],
  send_email: ['Email', 'Preparing an email'],
  list_engagements: ['Engagements', 'Looking through your engagements'],
  schedule_task: ['Schedule', 'Setting up a schedule'],
  use_skill: ['Skill', 'Loading a skill'],
};
function toolWords(tool) {
  return TOOL_WORDS[tool] || [cap1(words(tool).replace(/^start /, '')), `Using ${words(tool)}`];
}

// ---- the mark on a node ----------------------------------------------------------------------------
function ring() {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'orc__ring');
  s.setAttribute('aria-hidden', 'true');
  for (const cls of ['orc__ring-track', 'orc__ring-arc']) {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('class', cls);
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '10');
    s.append(c);
  }
  return s;
}

export function dot(state) {
  const { h, icon } = kit;
  const d = h('span', { class: 'orc__dot' }, ring());
  if (state === 'done') d.append(icon('check'));
  else if (state === 'failed') d.append(icon('close'));
  else d.append(h('i', { class: 'orc__core' }));
  return d;
}

function link() {
  const { h } = kit;
  return h('span', { class: 'orc__link', 'aria-hidden': 'true' }, h('i', { class: 'orc__packet' }));
}

// ---- a chat turn -----------------------------------------------------------------------------------
// Owner, 26 Nov: every loop engineering step is animated and transparent, so each one can be inspected while it
// happens. Each tool call and each step the harness takes (an argument repaired, a repeated call skipped, room made on
// the graphics card, a summing-up at the step limit, a request routed in code, earlier turns condensed) is a branch
// that appears as its event arrives; a branch opens to show what went in and what came back. The finished reply keeps
// the scene, still, under "Steps".
const HARNESS = new Set(['args_coerced', 'agent_repeat_noted', 'agent_repeat_stopped', 'agent_grace', 'models_released_for_load',
  'model_load_waiting', 'routed_in_code', 'conversation_compacted', 'agent_reply', 'model_window_grown', 'tool_result_fitted', 'hook_denied', 'hook_rewrite', 'hook_context', 'hook_continue', 'hook_replace', 'plan_autostarted', 'context_overflow_recovered', 'turn_plan', 'subagent_started', 'subagent_finished']);

function detailLines(detail) {
  const { h } = kit;
  const dl = h('dl', { class: 'orc__facts' });
  for (const [k, v] of Object.entries(detail || {})) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    let text = Array.isArray(v) ? v.join('\n') : typeof v === 'object' ? JSON.stringify(v, null, 1) : String(v);
    if (k === 'Arguments') { try { text = JSON.stringify(JSON.parse(text), null, 1); } catch { /* shown as sent */ } }
    dl.append(h('dt', { text: k }), h('dd', { text: text.slice(0, 1600) }));
  }
  return dl;
}

function branchEl(b, live) {
  const { h } = kit;
  const meta = h('span', { class: 'orc__meta mono', text: b.meta || '' });
  const row = h('li', { class: 'orc__branch', 'data-state': b.state, role: 'button', tabindex: '0', 'aria-expanded': 'false',
    title: 'Show this step' }, link(), dot(b.state), h('span', { class: 'orc__name', text: b.name }), meta);
  if (live) row.dataset.new = '';
  const more = h('li', { class: 'orc__more', hidden: true });
  const toggle = () => {
    const open = row.getAttribute('aria-expanded') !== 'true';
    row.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) more.replaceChildren(detailLines(b.detail));
    more.hidden = !open;
  };
  row.addEventListener('click', toggle);
  row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
  row._meta = meta;
  row._more = more;
  return row;
}

export function turnScene() {
  const { h, presenceEl } = kit;
  const mark = presenceEl({ state: 'thinking', live: true });
  const agentMeta = h('span', { class: 'orc__meta mono' });
  const you = h('li', { class: 'orc__node', 'data-state': 'done' }, h('span', { class: 'orc__dot orc__dot--you' }), h('span', { class: 'orc__name', text: 'You' }));
  const agent = h('li', { class: 'orc__node orc__node--agent', 'data-state': 'working' },
    link(), h('span', { class: 'orc__dot orc__dot--agent' }, mark), h('span', { class: 'orc__name', text: 'Agent' }), agentMeta);
  const branches = h('ul', { class: 'orc__branches' });
  const el = sync(h('div', { class: 'orc orc--turn', 'aria-label': 'Steps of this turn' },
    h('ol', { class: 'orc__trunk', 'aria-hidden': 'true' }, you, agent), branches));

  let caption = 'Reading your request';
  const t0 = Date.now();
  const calls = new Map();             // tool call id -> its branch
  const all = [];                      // every branch, in order: { b, row }

  function agentState(state) {
    agent.dataset.state = state;
    mark.dataset.state = state === 'working' ? 'thinking' : 'idle';
  }

  function add(b) {
    const row = branchEl(b, true);
    branches.append(row, row._more);
    all.push({ b, row });
    return { b, row };
  }

  function settle(item, state, meta, extra) {
    item.b.state = state;
    if (meta !== undefined) item.b.meta = meta;
    Object.assign(item.b.detail, extra || {});
    item.row.dataset.state = state;
    item.row.dataset.back = '';
    item.row.querySelector('.orc__dot').replaceWith(dot(state));
    item.row._meta.textContent = item.b.meta || '';
    if (item.row.getAttribute('aria-expanded') === 'true') item.row._more.replaceChildren(detailLines(item.b.detail));
  }

  function onEvent(e, conv) {
    const d = e.data || {};
    const mine = !conv || !('conversation' in d) || d.conversation === conv;
    if ((e.kind === 'agent_step' || e.kind === 'agent_tool' || HARNESS.has(e.kind)) && !mine) return;
    if (e.kind === 'models_released_for_load' && !d.conversation) return;     // another piece of work made room
    if (e.kind === 'agent_step') {
      const name = shortModel(d.model);
      agentMeta.textContent = name;
      agentState('working');
      el.dataset.waking = d.loaded === false ? '1' : '';
      caption = d.desk ? 'The studio is using the graphics card; reading its task list'
        : d.loaded === false ? `Loading ${name || 'the model'} into memory (about a minute and a half)` : d.step ? 'Reading what came back' : 'Deciding what to do';
    } else if (e.kind === 'agent_tool' && d.state === 'start') {
      const [name, doing] = toolWords(d.tool);
      const item = add({ name, state: 'working', meta: '', detail: { Tool: d.tool, Arguments: d.args } });
      calls.set(d.call || `${d.tool}:${calls.size}`, item);
      agentState('holding');
      el.dataset.waking = '';
      caption = doing;
    } else if (e.kind === 'agent_tool' && d.state === 'done') {
      const item = calls.get(d.call) || [...calls.values()].reverse().find((it) => it.b.state === 'working');
      if (item) {
        const state = d.approval === 'pending' ? 'ask' : d.ok === false || d.approval === 'denied' ? 'failed' : 'done';
        settle(item, state, d.approval === 'pending' ? 'needs your approval' : d.approval === 'denied' ? 'denied'
          : d.ok === false ? 'did not work' : d.plan ? 'plan ready' : d.task_id ? 'in the studio' : (d.seconds ? `${d.seconds} s` : ''),
        { Result: d.result, Seconds: d.seconds, Plan: d.plan, Task: d.task_id });
      }
      agentState('working');
      caption = d.approval === 'pending' ? 'Waiting for your approval' : 'Reading what came back';
    } else if (e.kind === 'args_coerced') {
      add({ name: 'Repaired arguments', state: 'fixed', meta: toolWords(d.tool)[0], detail: { Tool: d.tool, Repairs: d.fixes } });
    } else if (e.kind === 'agent_repeat_noted') {
      add({ name: 'Skipped a repeat', state: 'fixed', meta: toolWords(d.tool)[0],
        detail: { Tool: d.tool, Why: 'The same call with the same arguments was already made in this turn; its result was used.' } });
    } else if (e.kind === 'agent_repeat_stopped') {
      add({ name: 'Stopped a loop', state: 'fixed', meta: toolWords(d.tool)[0],
        detail: { Tool: d.tool, Why: 'The same call came a third time, so the turn moved to summing up.' } });
    } else if (e.kind === 'agent_grace') {
      const item = add({ name: 'Summing up', state: 'working', meta: d.why === 'step_limit' ? 'step limit reached' : 'after a repeated call',
        detail: { Why: d.why === 'step_limit' ? 'This turn used all its steps; one last call, with no tools, says what was done and what is left.'
          : 'A call repeated itself; one last call, with no tools, says what was done.' } });
      calls.set('grace', item);
      caption = 'Summing up what was done';
    } else if (e.kind === 'models_released_for_load') {
      add({ name: 'Made room on the card', state: 'fixed', meta: `for ${shortModel(d.loading)}`,
        detail: { Loading: d.loading, Released: d.released, Kept: d.kept, Why: 'The model server loads a model only when it fits; idle models make way first.' } });
      caption = `Loading ${shortModel(d.loading)}`;
    } else if (e.kind === 'hook_denied') {
      add({ name: 'Blocked by a rule', state: 'fixed', meta: toolWords(d.tool)[0],
        detail: { Tool: d.tool, Rule: d.rule, Reason: d.reason, Kind: d.floor ? 'a floor rule: it cannot be turned off' : 'one of your rules' } });
    } else if (e.kind === 'turn_plan') {
      add({ name: 'Wrote its plan', state: 'done', meta: `${(d.done || []).length} of ${(d.steps || []).length} done`,
        detail: { Steps: (d.steps || []).map((x, i) => `${i + 1}. ${x}${(d.done || []).includes(i + 1) ? ' (done)' : ''}`) } });
    } else if (e.kind === 'subagent_started') {
      add({ name: 'A worker is looking it up', state: 'done', meta: d.model, detail: { Question: d.task, Tools: d.tools, Model: d.model } });
    } else if (e.kind === 'subagent_finished') {
      add({ name: 'The worker reported back', state: 'done', meta: `${d.seconds} s`, detail: { Steps: d.steps, Summary: d.summary } });
    } else if (e.kind === 'context_overflow_recovered') {
      add({ name: 'Made room in the conversation', state: 'fixed', meta: `${d.results_pruned} results shortened`,
        detail: { 'Results shortened': d.results_pruned, 'Older turns summarized': d.compacted ? 'yes' : 'no', Why: d.why } });
    } else if (e.kind === 'plan_autostarted') {
      add({ name: 'Started without waiting', state: 'fixed', meta: d.mode, detail: { Tool: d.tool, Mode: d.mode, Plan: d.plan } });
    } else if (e.kind === 'hook_continue') {
      add({ name: 'Asked for another step', state: 'fixed', meta: d.rule, detail: { Rule: d.rule, Why: d.why } });
    } else if (e.kind === 'hook_replace') {
      add({ name: 'Replaced the reply', state: 'fixed', meta: d.rule, detail: { Rule: d.rule, Why: d.why, Ended: d.exit } });
    } else if (e.kind === 'hook_rewrite') {
      add({ name: 'Adjusted the call', state: 'fixed', meta: toolWords(d.tool)[0], detail: { Tool: d.tool, Rule: d.rule, Why: d.why } });
    } else if (e.kind === 'hook_context') {
      add({ name: 'Added a note', state: 'fixed', meta: toolWords(d.tool)[0], detail: { Tool: d.tool, Rule: d.rule, Note: d.text } });
    } else if (e.kind === 'model_window_grown') {
      add({ name: 'Gave the reply more room', state: 'fixed', meta: `${Math.round(d.from / 1024)}K to ${Math.round(d.to / 1024)}K`,
        detail: { Model: d.model, From: d.from, To: d.to, Why: d.why } });
    } else if (e.kind === 'tool_result_fitted') {
      add({ name: 'Fitted a result to the window', state: 'fixed', meta: toolWords(d.tool)[0],
        detail: { Tool: d.tool, Characters: d.chars, Kept: d.kept,
          Why: 'The result was longer than the room left in the model\'s window; the rest can be asked for by part.' } });
    } else if (e.kind === 'model_load_waiting') {
      add({ name: 'Waiting for the model server', state: 'fixed', meta: shortModel(d.model),
        detail: { Model: d.model, Resident: (d.resident || []).map((m) => `${m.name} (${m.gb} GB)`) } });
    } else if (e.kind === 'routed_in_code') {
      const tools = Array.isArray(d.tool) ? d.tool : [d.tool];
      add({ name: 'Routed in code', state: 'done', meta: tools.map((t) => toolWords(t)[0]).join(', '), detail: { Why: d.why, Tools: tools } });
    } else if (e.kind === 'conversation_compacted') {
      add({ name: 'Condensed earlier turns', state: 'done', meta: d.turns_summarized ? `${d.turns_summarized} turns` : '',
        detail: { Turns: d.turns_summarized, Why: 'The conversation grew long; earlier turns were summarized so the answer stays sharp.' } });
    } else if (e.kind === 'agent_reply') {
      const grace = calls.get('grace');
      if (grace && grace.b.state === 'working') settle(grace, 'done');
      for (const it of all) if (it.b.state === 'working') settle(it, 'done');
      agentState('done');
      caption = 'Answered';
    }
  }

  function snapshot() {
    return { seconds: Math.round((Date.now() - t0) / 1000), model: agentMeta.textContent,
      branches: all.map(({ b }) => ({ name: b.name, state: b.state === 'working' ? 'done' : b.state, meta: b.meta, detail: b.detail })) };
  }

  return { el, onEvent, caption: () => caption, snapshot };
}

// The scene of a finished turn, still: the reply's "Steps" (every branch still opens to its details).
export function turnSteps(snap) {
  const { h } = kit;
  const branches = h('ul', { class: 'orc__branches' });
  for (const b of (snap && snap.branches) || []) {
    const row = branchEl({ ...b, detail: b.detail || {} }, false);
    branches.append(row, row._more);
  }
  return h('div', { class: 'orc orc--turn orc--still', 'aria-label': 'Steps of this turn' }, branches);
}

// ---- a piece of studio work ------------------------------------------------------------------------
const seenSteps = new Map();           // task id -> names already drawn as started, so a step animates in once

function skillsFor(node, t) {
  if (!node || !node.started) return [];
  const end = node.finished || Infinity;
  const out = [];
  for (const s of t.skills || []) {
    if (s.ts >= node.started - 1 && s.ts <= end + 1) {
      const label = `${words(s.skill)}${s.version > 1 ? ` v${s.version}` : ''}`;
      if (!out.includes(label)) out.push(label);
    }
  }
  return out;
}

export function taskFlow(t) {
  const { h, P } = kit;
  const k = P.kindOfTask ? P.kindOfTask(t) : P.kindOf(t.kind);
  const names = [...k.steps];
  for (const n of t.nodes || []) if (!names.includes(n.specialist)) names.push(n.specialist);
  const seen = seenSteps.get(t.id);
  const now = new Set();
  const live = t.status === 'running' || t.status === 'queued';

  const items = [h('li', { class: 'orc__node orc__node--agent', 'data-state': 'done', title: 'Your agent handed this work to the studio' },
    dot('done'), h('span', { class: 'orc__name', text: 'Agent' }), h('span', { class: 'orc__meta mono', text: 'handed off' }))];

  names.forEach((name) => {
    const node = (t.nodes || []).filter((n) => n.specialist === name).pop();
    const ss = P.stepState(node, t.status);
    if (node) now.add(name);
    const bits = [];
    if (node && node.model) bits.push(shortModel(node.model));
    bits.push(...skillsFor(node, t));
    const meta = h('span', { class: 'orc__meta mono' });
    if (ss.key === 'working') {
      meta.append(bits.join(' · '), bits.length ? ' · ' : '', h('span', { 'data-since': String(node.started), text: P.duration(Date.now() / 1000 - node.started) }));
      // how long steps like this one have taken on this machine, measured, so a wait has an end in sight
      if (node.expected_s) meta.append(` of about ${P.duration(node.expected_s)}`);
    } else if (ss.key === 'done') {
      const took = node.finished && node.started ? P.duration(node.finished - node.started) : '';
      meta.textContent = [...bits, took].filter(Boolean).join(' · ');
    } else if (ss.key !== 'waiting') {
      meta.textContent = ss.word;
    }
    // what the running step has done so far ("03:12 of 08:38 transcribed"), as it changes (22 Nov)
    const said = ss.key === 'working' && node && node.summary ? h('span', { class: 'orc__said', text: node.summary }) : null;
    const li = h('li', { class: 'orc__node', 'data-state': ss.key, title: (P.STEP_INFO[name] || {}).does || name },
      link(), dot(ss.key), h('span', { class: 'orc__name', text: name }), meta, ...(said ? [said] : []));
    if (node && seen && !seen.has(name)) li.dataset.new = '';
    items.push(li);
  });
  seenSteps.set(t.id, now);

  return sync(h('ol', { class: `orc orc--task${live ? ' orc--live' : ''}`, style: `--n:${items.length}`, 'aria-label': 'Who is working on this, step by step' }, items));
}
