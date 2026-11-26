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
export function turnScene() {
  const { h, presenceEl } = kit;
  const mark = presenceEl({ state: 'thinking', live: true });
  const agentMeta = h('span', { class: 'orc__meta mono' });
  const you = h('li', { class: 'orc__node', 'data-state': 'done' }, h('span', { class: 'orc__dot orc__dot--you' }), h('span', { class: 'orc__name', text: 'You' }));
  const agent = h('li', { class: 'orc__node orc__node--agent', 'data-state': 'working' },
    link(), h('span', { class: 'orc__dot orc__dot--agent' }, mark), h('span', { class: 'orc__name', text: 'Agent' }), agentMeta);
  const branches = h('ul', { class: 'orc__branches' });
  const el = sync(h('div', { class: 'orc orc--turn', 'aria-hidden': 'true' },
    h('ol', { class: 'orc__trunk' }, you, agent), branches));

  let caption = 'Reading your request';
  const calls = new Map();             // tool call id -> its row

  function agentState(state) {
    agent.dataset.state = state;
    mark.dataset.state = state === 'working' ? 'thinking' : 'idle';
  }

  function onEvent(e, conv) {
    const d = e.data || {};
    if ((e.kind === 'agent_step' || e.kind === 'agent_tool') && conv && d.conversation !== conv) return;
    if (e.kind === 'agent_step') {
      const name = shortModel(d.model);
      agentMeta.textContent = name;
      agentState('working');
      el.dataset.waking = d.loaded === false ? '1' : '';
      caption = d.desk ? 'The studio is using the graphics card; reading its task list'
        : d.loaded === false ? `Loading ${name || 'the model'} into memory (about a minute and a half)` : d.step ? 'Reading what came back' : 'Deciding what to do';
    } else if (e.kind === 'agent_tool' && d.state === 'start') {
      const [name, doing] = toolWords(d.tool);
      const meta = h('span', { class: 'orc__meta mono' });
      const row = h('li', { class: 'orc__branch', 'data-state': 'working', 'data-new': '' }, link(), dot('working'),
        h('span', { class: 'orc__name', text: name }), meta);
      row._meta = meta;
      calls.set(d.call || `${d.tool}:${calls.size}`, row);
      branches.append(row);
      agentState('holding');
      el.dataset.waking = '';
      caption = doing;
    } else if (e.kind === 'agent_tool' && d.state === 'done') {
      const row = calls.get(d.call) || [...calls.values()].reverse().find((r) => r.dataset.state === 'working');
      if (row) {
        const state = d.approval === 'pending' ? 'ask' : d.ok === false || d.approval === 'denied' ? 'failed' : 'done';
        row.dataset.state = state;
        row.dataset.back = '';            // the result travels back to the agent, once
        row.querySelector('.orc__dot').replaceWith(dot(state));
        row._meta.textContent = d.approval === 'pending' ? 'needs your approval' : d.approval === 'denied' ? 'denied'
          : d.ok === false ? 'did not work' : d.plan ? 'plan ready' : d.task_id ? 'in the studio' : '';
      }
      agentState('working');
      caption = d.approval === 'pending' ? 'Waiting for your approval' : 'Reading what came back';
    }
  }

  return { el, onEvent, caption: () => caption };
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
