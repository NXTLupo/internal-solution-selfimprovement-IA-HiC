/**
 * TYPOGRAPHY / LAYOUT AUDIT HARNESS (2026-06-14, throwaway)
 *
 * Renders the REAL 1920x1080 export surface (slideDataToStageHtml = the exact
 * HTML the PPTX is captured from) for every hashtag artifact with realistic,
 * dense, expert-shaped content, and writes each to D:/tmp/slide-audit/ so it
 * can be screenshotted and expert-audited. NOT a real test - it asserts only
 * that each template renders non-empty. Delete after the redesign lands.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { slideDataToStageHtml } from '../slideToStageHtml';

const OUT = 'D:/tmp/slide-audit';

// Representative, dense, expert-shaped content per artifact. Numbers ride inside
// cited quotes only (Quantitative Claim Rule). Plain consultant voice.
const FIXTURES: Record<string, any> = {
  'stat-row': {
    title: 'Autonomy-first support deflects tickets while quietly eroding the resolution rate that protects renewals',
    statRow: {
      stats: [
        { value: 'Half', label: 'as likely as humans to move an issue toward true resolution', source: 'We analyzed 100,050 support interactions', meaning: 'Bots close fewer issues for real and push handled tickets away from resolution.', matters: 'Closure quality, not deflection, is what defends CSAT and the renewal behind it.' },
        { value: 'Modest', label: 'realistic enterprise efficiency lift from AI workflows', source: 'AI Product Management is a lie', meaning: 'AI helps, but not the wholesale change the hype cycle sells.', matters: 'Measured decision-support claims outsell inflated transformation narratives.' },
        { value: 'Week 6', label: 'when a bolted-on copilot becomes a maintenance liability', source: 'Your AI is handling more tickets', meaning: 'Appended chat bubbles demo well, then rack up token bills and invent answers.', matters: 'Augmentation built into the workflow is the durable alternative.' },
      ],
      convergentInsight: 'Market data and the practitioner record agree: autonomy-first deployments under-resolve, over-promise, and decay by week six.',
      patternSignal: 'The teams winning in 2026 remove friction in the background and keep a human on the consequential decision.',
    },
    sources: ['We analyzed 100,050 support interactions', 'AI Product Management is a lie', 'Your AI is handling more tickets'],
  },
  'theme-cluster': {
    title: 'Buyers have stopped buying chatbot wrappers and now demand depth, governance, and felt outcomes',
    themeCluster: {
      themes: [
        { name: 'Thin LLM wrappers are an instant disqualifier', insight: 'Enterprise purchasers openly reject pitches that wrap a chatbot or lean on prompt engineering. The bar moved from conversational novelty to product depth and real workflow integration.', evidence: 'pitch to me how you solve a business problem at enterprise scale in a way that isn’t wrapping a chatbot', source: 'r/saas', implication: 'Lead with depth and outcome or never clear the first buyer gate.' },
        { name: 'Governance is most of the buying battle', insight: 'Buyers gate on data plane, model provenance, and the ability to run AI inside their own environment. Governance is the deal, not a feature line.', evidence: 'we need the ability to run these things in our own environment to fully control the traffic', source: 'r/saas', implication: 'Answer data control up front or stall in procurement.' },
        { name: 'Value must be a measurable, felt outcome', insight: 'Sellers and buyers converge: the product is the result, not the code. Activity metrics no longer defend a renewal.', evidence: 'The product is not the code. The product is the result.', source: 'r/customersuccess', implication: 'Tie every claim to a customer-felt result.' },
      ],
      patternSignal: 'Three independent signals converge: the 2026 buyer pays for depth, control, and felt outcomes and treats everything else as table stakes.',
    },
    sources: ['r/saas', 'r/customersuccess'],
  },
  'theme-spotlight': {
    title: 'The clearest CX win is freeing agents to be human, not replacing them',
    themeCluster: {
      themes: [
        { name: 'AI scales empathy when it removes load', insight: 'A cited ecommerce team automated order tracking so agents could write concierge follow-ups, and satisfaction rose because humans finally had space to sound human again.', evidence: 'maybe AI isn’t replacing empathy, maybe it’s what lets us scale it', source: 'r/customerservice', implication: 'Augmentation that returns time to the agent is the durable CX bet.' },
        { name: 'AI feels bad when it blocks access', insight: 'Customers trapped in repetitive loops resent being asked to wait after every validation is complete.', evidence: 'it kept asking me to wait even after multiple validations were completed', source: 'Urban Company support', implication: 'Never let the bot become the wall.' },
        { name: 'Workload shifts, it does not shrink', insight: 'Agents report that bolt-on AI moves work around rather than removing it.', evidence: 'the workload just shifted', source: 'Why AI won’t replace the human element', implication: 'Measure load removed, not tickets touched.' },
      ],
      patternSignal: 'AI’s value is giving agents the one thing empathy needs most: time.',
    },
    sources: ['r/customerservice', 'Urban Company support', 'Why AI won’t replace the human element'],
  },
  'block-quote': {
    title: 'Intelligence augmentation, defined by the people doing the work',
    quote: {
      text: 'maybe AI isn’t replacing empathy, maybe it’s what lets us scale it.',
      attribution: 'Practitioner', role: 'Customer service operator', source: 'AI won’t kill customer experience',
      context: 'ON THE IA THESIS',
      contextParagraph: 'A cited ecommerce team automated order tracking so agents could write concierge follow-ups, and satisfaction rose, not because of AI’s tone, but because the humans finally had space to sound human again. The corollary failure mode is well documented: customers trapped in repetitive AI loops that keep asking them to wait even after every validation is complete.',
      corroboratingData: [
        { value: 'Blocks access', label: 'is when AI feels bad to customers', source: 'r/customerexperience' },
        { value: 'Shifts load', label: 'is what disappoints agents, work moves not shrinks', source: 'Why AI won’t replace the human element' },
        { value: 'Enhance', label: 'is the founding principle of the IA practice', source: 'NXT Humans research' },
      ],
      additionalQuotes: [
        { text: 'The product is not the code. The product is the result.', attribution: 'CS leader', role: 'VP Customer Success', source: 'r/customersuccess' },
        { text: 'we need to run these things in our own environment to control the traffic', attribution: 'Enterprise buyer', role: 'Platform lead', source: 'r/saas' },
      ],
      synthesis: 'Across operator, leader, and buyer, the convergent demand is augmentation that returns time and keeps control with the human.',
      implication: 'Remove cognitive load and carry context forward; keep the human on judgment and accountability.',
    },
    sources: ['AI won’t kill customer experience', 'r/customersuccess', 'r/saas'],
  },
  'recommendation': {
    title: 'Package the suite as outcome-priced sprints that minimize implementation friction, not feature checklists',
    recommendation: {
      actionTitle: 'Package the suite as outcome-priced growth sprints that minimize implementation friction',
      rationale: 'Enterprise buyers price total cost of change, not license, and the winning pitch is lower implementation friction. They buy outcomes and relationships and disqualify thin wrappers.',
      supportingActions: [
        { name: 'Sell the outcome', description: 'Open with the measurable, customer-felt result the suite delivers, never a feature list.' },
        { name: 'Co-Lab as the wedge', description: 'Co-create and prove value on the client’s own data, answering the data-control objection up front.' },
        { name: 'Simulate before launch', description: 'Run the synthetic-customer simulator early to de-risk and show stress-tested journeys.' },
        { name: 'Roll out internal-first', description: 'Default to internal-first and human-in-the-loop gates so risk owners control exposure.' },
      ],
      impactGrid: { baseline: 'Buyers reject wrappers; value defended as activity', target: 'Outcome-priced sprints, client-retained prototypes', timeframe: 'Per-engagement sprint', owner: 'Advisory + client sponsor' },
      evidence: [
        { text: 'The winning pitch isn’t cheaper software, it’s lower implementation friction.', source: 'This post cost me $350,000', attribution: 'B2B SaaS founder' },
        { text: 'enterprises don’t buy features they buy outcomes and relationships', source: 'We spent $180K building the wrong product', attribution: 'Enterprise post-mortem' },
      ],
      implication: 'The outcome-priced, governance-first posture is exactly the model the 2026 enterprise CX buyer asks for.',
    },
    sources: ['This post cost me $350,000', 'We spent $180K building the wrong product'],
  },
  'case-study': {
    title: 'A major bank optimized onboarding in simulation before a single real customer saw it',
    caseStudy: {
      subject: 'A major U.S. bank', subjectMeta: 'Financial services CX · digital onboarding', timeframe: 'Single engagement', investment: 'Outcome-priced sprint',
      variant: 'before-after',
      beforeAfter: {
        before: { headline: 'Optimize on live traffic', points: ['Friction discovered only after real customers hit it', 'Funnels tuned reactively on production journeys', 'Onboarding refined through costly live trial and error'] },
        after: { headline: 'Optimize in simulation first', points: ['Thousands of persona journeys built and queried in advance', 'Friction points mapped before launch', 'Funnels and onboarding optimized pre-deployment'] },
        result: 'The bank mapped friction and optimized onboarding by querying simulated cohorts rather than experimenting on live customers.',
      },
      pullQuote: { text: 'a multi-agent environment that generates thousands of persona-level journeys and what-if behaviors', attribution: 'Engagement research' },
      takeaway: 'Simulate the cohort, fix the friction, then ship to real customers.',
    },
    sources: ['Engagement research'],
  },
  'principles': {
    title: 'Five operating principles position the practice between slideware strategy and boardroom-illiterate software',
    principles: {
      items: [
        { name: 'Augment, never replace', description: 'Every deployment uses AI to enhance human capability, keeping a person on judgment and accountability.' },
        { name: 'Strategy plus execution', description: 'The bridge between strategy houses that stop at slideware and studios that lack boardroom fluency.' },
        { name: 'Co-create per engagement', description: 'A dedicated workspace is spun up for every client to draft, analyze, and prototype with stakeholders.' },
        { name: 'Outcomes over hours', description: 'Outcome-priced sprints; clients retain ownership of the prototypes built for them.' },
        { name: 'Human-centered by design', description: 'A design alliance keeps complex enterprise AI accessible and aligned to user-centered design.' },
      ],
    },
    sources: ['Engagement research', 'r/customersuccess'],
  },
  'timeline': {
    title: 'A phased rollout earns trust internally before any customer-facing exposure',
    timeline: {
      phases: [
        { name: 'Internal-first', duration: 'Weeks 1-6', items: ['Stand up the secured workspace', 'Tune on the client’s own CX data', 'Prove value with employees'] },
        { name: 'Assisted live', duration: 'Weeks 7-12', items: ['Human-in-the-loop on consequential decisions', 'Instrument the realized outcome', 'Expand to a pilot queue'] },
        { name: 'Scaled augmentation', duration: 'Quarter 2', items: ['Roll out to the full team', 'Automate background friction', 'Report outcomes, not activity'] },
      ],
    },
    sources: ['Engagement research'],
  },
  'competitive-matrix': {
    title: 'Every tool defaults to client-controlled data and a human-in-the-loop role',
    matrix: {
      subjectRow: 'GenAI Co-Lab',
      columns: ['Deployment', 'Data control', 'Human-in-loop', 'Proven vertical'],
      columnDefs: ['Where it runs', 'How data is contained', 'Where the human stays in control', 'Field-proven deployment'],
      rows: [
        { name: 'GenAI Co-Lab', scores: [5, 5, 4, 4], note: 'Per-engagement secured instance; client retains prototypes', source: 'Engagement research' },
        { name: 'Synthetic Simulator', scores: [4, 5, 5, 4], note: 'Multi-agent simulation queried before launch', source: 'Engagement research' },
        { name: 'Critical Care Copilot', scores: [5, 5, 5, 5], note: 'Embedded monitoring; clinician owns the decision', source: 'Engagement research' },
        { name: 'Agentic Knowledge Hub', scores: [5, 5, 3, 4], note: 'Internal-first repository; cuts admin burden', source: 'Engagement research' },
      ],
      scaleMax: 5, scaleLabels: ['Absent', 'Basic', 'Defined', 'Managed', 'Optimized'],
      insight: 'Client-controlled data and a human-in-the-loop role answer the buyer demand directly.',
    },
    sources: ['Engagement research', 'r/saas'],
  },
  'service-blueprint': {
    title: 'The support journey breaks where backstage data never reaches the frontstage agent',
    serviceBlueprint: {
      stages: [
        { phase: 'Discover', customerAction: 'Hits a problem, searches help', frontstage: 'Help center, chat entry', backstage: 'Intent routing', support: 'Knowledge base', emotion: 'Hopeful', painPoint: 'Generic answers miss the real issue' },
        { phase: 'Engage', customerAction: 'Opens a ticket', frontstage: 'Bot triage', backstage: 'Queue assignment', support: 'CRM', emotion: 'Wary', painPoint: 'Repeats context the bot already had' },
        { phase: 'Resolve', customerAction: 'Talks to an agent', frontstage: 'Live conversation', backstage: 'Manual lookup across systems', support: 'Billing, orders', emotion: 'Frustrated', painPoint: 'Agent context-switches across tools', failPoint: true },
        { phase: 'Follow up', customerAction: 'Waits for confirmation', frontstage: 'Email update', backstage: 'Case closure', support: 'Ticketing', emotion: 'Relieved', painPoint: 'No proactive status' },
      ],
      personas: [{ name: 'Returning buyer', role: 'SMB owner', characterization: 'Wants the fix, not a tour of the help center' }],
      overallPainPoints: [{ pattern: 'Context is re-collected at every handoff', sourceCitation: 'r/customerexperience' }],
      overallOpportunities: [{ opportunity: 'Surface backstage context automatically to the agent', sourceCitation: 'Why AI won’t replace the human element' }],
      keyInsight: 'The fix is carrying context forward, not adding another bot at the front door.',
    },
    sources: ['r/customerexperience', 'Why AI won’t replace the human element'],
  },
  'journey-map': {
    title: 'Customers lose the thread at handoffs the institution cannot see',
    journeyMap: {
      journeyType: 'CUSTOMER SUPPORT · CURRENT STATE',
      scope: 'Support', actors: 'Customer, Bot, Agent', phasesLabel: '4 phases',
      stages: [{ name: 'Discover' }, { name: 'Engage' }, { name: 'Resolve', critical: true }, { name: 'Follow up' }],
      lanes: [
        { actor: 'Customer', role: 'Buyer', cells: ['Searches help', 'Opens ticket', 'Explains again', 'Waits'] },
        { actor: 'Bot', role: 'Triage', cells: ['Suggests articles', 'Collects context', 'not engaged', 'Sends email'] },
        { actor: 'Agent', role: 'Resolver', cells: ['not engaged', 'not engaged', 'Looks up across tools', 'Closes case'] },
      ],
      painPoints: [['Generic answers miss intent'], ['Repeats context'], ['Agent context-switches', 'No single view'], ['No proactive status']],
      personas: ['Returning buyer wants the fix fast', 'New user wants reassurance'],
      opportunities: ['Carry context to the agent', 'Proactive status updates'],
      kpiTiles: [{ label: 'Resolution', value: 'Fragmented', sub: 'across tools' }, { label: 'Effort', value: 'Repeated', sub: 'context re-collected' }],
      keyInsight: 'Fix the handoffs, not the front door.',
    },
    sources: ['r/customerexperience'],
  },
  'gap-matrix': {
    title: 'The support operation is strong on tooling and weak where the customer actually feels it',
    gapMatrix: {
      gaps: [
        { capability: 'Context continuity across handoffs', currentMaturity: 1, targetMaturity: 4, severity: 'critical', impact: 'Customers repeat themselves at every step' },
        { capability: 'Proactive status communication', currentMaturity: 2, targetMaturity: 4, severity: 'high', impact: 'Silence after the ticket erodes trust' },
        { capability: 'Agent decision support', currentMaturity: 2, targetMaturity: 5, severity: 'high', impact: 'Agents context-switch across tools live' },
        { capability: 'Outcome instrumentation', currentMaturity: 1, targetMaturity: 4, severity: 'critical', impact: 'Activity is measured, resolution is not' },
        { capability: 'Self-service deflection', currentMaturity: 3, targetMaturity: 4, severity: 'medium', impact: 'Help center answers miss real intent' },
      ],
      scaleMax: 5,
      insight: 'The gaps cluster on continuity and outcome, not on tooling.',
    },
    sources: ['r/customerexperience', 'Engagement research'],
  },
  'prd-feature': {
    title: 'The Co-Lab spins up a secured, per-engagement workspace on the client’s own data',
    prdFeature: {
      features: [
        { name: 'Fine-tuned models on proprietary CX data, per-client instance', priority: 'must', userStory: 'As a client product team, I want a dedicated secured workspace with models tuned on our own CX data so we run analysis and prototype builds without our data entering a shared environment.', acceptanceCriteria: ['Secured workspace provisioned per client engagement', 'Houses tuned models, CX datasets, reusable prompt libraries', 'Supports real-time analysis and prototype builds with stakeholders', 'Grounding restricts the model to approved live sources'], problemSolved: 'Buyers gate on data control and run-in-our-environment.', stakeholders: 'Client product, security, risk', evidence: [{ text: 'we need to run these things in our own environment', source: 'r/saas', attribution: 'Enterprise buyer' }] },
      ],
    },
    sources: ['r/saas', 'Engagement research'],
  },
  'systems-inventory': {
    title: 'The stack is modern at the edges and brittle where customer context must flow',
    systemsInventory: {
      systems: [
        { name: 'Help center', category: 'Self-service', status: 'current', risk: 'medium', description: 'Search misses real intent' },
        { name: 'Bot triage', category: 'Routing', status: 'current', risk: 'high', description: 'Collects context it does not pass on' },
        { name: 'CRM', category: 'System of record', status: 'legacy', risk: 'high', description: 'Agent must look up across tools' },
        { name: 'Billing', category: 'Transactions', status: 'legacy', risk: 'critical', description: 'No live view for the agent' },
        { name: 'Ticketing', category: 'Case mgmt', status: 'current', risk: 'medium', description: 'No proactive status to the customer' },
      ],
      insight: 'The brittleness is in the seams between systems, not the systems themselves.',
    },
    sources: ['Engagement research'],
  },
  'persona-card': {
    title: 'The returning buyer wants the fix, not a tour of the help center',
    persona: {
      name: 'The Returning Buyer', role: 'SMB owner', descriptors: 'DIGITAL-FIRST · HIGH EXPECTATION',
      quote: 'I just want the problem solved without explaining it three times.',
      jtbd: 'When something breaks, get it resolved fast without re-explaining context.',
      painPoints: [
        { label: 'Repeats context', quote: 'I had to explain the same thing to the bot and then the agent', source: 'r/customerexperience' },
        { label: 'No status', quote: 'after the ticket it just went quiet', source: 'r/customerexperience' },
        { label: 'Generic answers', quote: 'the help center never matches my actual issue', source: 'r/customerexperience' },
      ],
      behaviors: ['Searches help first', 'Abandons the bot quickly', 'Expects proactive updates'],
      winConditions: ['Acknowledge first, then act', 'One owner for the issue', 'Proactive status'],
      stakes: 'Loses trust fast; churns quietly.',
    },
    sources: ['r/customerexperience'],
  },
  'executive-brief': {
    title: 'Augmentation, not automation, is the CX thesis that survives the agent era',
    executiveBrief: {
      variant: 'report', subject: 'AI-AUGMENTED CX · 2026',
      hero: { stat: 'Augment', label: 'the human, instrument the outcome' },
      sections: [
        { heading: 'The market turned on autonomy-first', body: 'Buyers disqualify thin wrappers and gate on governance and felt outcomes.', evidence: { quote: 'pitch me something that isn’t wrapping a chatbot', source: 'r/saas' } },
        { heading: 'Closure quality, not deflection', body: 'Autonomy-only deployments under-resolve and decay; the human stays on the consequential decision.', evidence: { quote: 'the product is the result', source: 'r/customersuccess' } },
        { heading: 'The durable bet', body: 'Augmentation built into the workflow returns time to the agent and scales empathy.', evidence: { quote: 'maybe it’s what lets us scale it', source: 'r/customerservice' } },
      ],
      keyInsight: 'The winning posture is governed, human-in-the-loop augmentation tied to a felt outcome.',
    },
    sources: ['r/saas', 'r/customersuccess', 'r/customerservice'],
  },
  'org-chart': {
    title: 'Support authority is split so no one owns the customer’s end-to-end resolution',
    orgChart: {
      subject: 'SUPPORT OPERATION · AS-IS',
      tiers: [
        { label: 'TIER 1 · DECIDES', nodes: [{ title: 'VP Customer Operations', role: 'Owns the support P&L and staffing plan', source: 'Org announcement', emphasis: true }] },
        { label: 'TIER 2 · DIRECTS', nodes: [{ title: 'Support Manager', role: 'Runs the queue and SLAs', source: 'Stakeholder interview' }, { title: 'CX Insights Lead', role: 'Owns reporting and CSAT', source: 'Stakeholder interview' }] },
        { label: 'TIER 3 · DELIVERS', nodes: [{ title: 'Frontline Agents', role: 'Resolve tickets live across tools', source: 'Stakeholder interview' }, { title: 'Bot Ops', role: 'Maintains triage flows', source: 'Stakeholder interview' }, { title: 'Knowledge Team', role: 'Writes help content', source: 'Stakeholder interview' }] },
      ],
      keyInsight: 'No single role owns end-to-end resolution, so context falls through the seams.',
    },
    sources: ['Stakeholder interview', 'Org announcement'],
  },
  'architecture-map': {
    title: 'Customer context has to cross four layers and loses fidelity at every boundary',
    architectureMap: {
      layers: [
        { name: 'Client', nodes: [{ name: 'Help center', type: 'web' }, { name: 'Chat widget', type: 'web' }] },
        { name: 'Orchestration', nodes: [{ name: 'Bot triage', type: 'service' }, { name: 'Routing', type: 'service' }] },
        { name: 'Systems', nodes: [{ name: 'CRM', type: 'system' }, { name: 'Billing', type: 'system' }, { name: 'Orders', type: 'system' }] },
        { name: 'Data', nodes: [{ name: 'Ticketing store', type: 'db' }, { name: 'Knowledge base', type: 'db' }] },
      ],
      flowSummary: 'Context degrades at each boundary because no layer carries it forward to the agent.',
    },
    sources: ['Engagement research'],
  },
  'section-divider': {
    title: 'The 2026 State of AI-Augmented CX',
    sectionDivider: { number: '01', title: 'The 2026 State of AI-Augmented CX', subtitle: 'Why augmentation, not automation, is the enterprise CX thesis that survives the agent era.' },
    sources: [],
  },
};

const BOTH_BRANDS = new Set(['block-quote', 'journey-map', 'competitive-matrix', 'case-study', 'stat-row', 'recommendation', 'persona-card', 'executive-brief']);

describe('stage-html audit harness', () => {
  it('renders the real export surface for every artifact', () => {
    fs.mkdirSync(OUT, { recursive: true });
    const index: string[] = [];
    for (const [template, fixture] of Object.entries(FIXTURES)) {
      // 2026-10-01 - third brand mode: the dual-brand set renders DECIEM too (template art + lockup).
      const brands = BOTH_BRANDS.has(template) ? ['nxt', 'nu', 'deciem'] : ['nxt'];
      for (const brand of brands) {
        const slide = { ...fixture, template, brand };
        const html = slideDataToStageHtml(slide as any);
        expect(html.length).toBeGreaterThan(500);
        const file = `${template}__${brand}.html`;
        fs.writeFileSync(path.join(OUT, file), html, 'utf8');
        index.push(file);
      }
    }
    fs.writeFileSync(path.join(OUT, '_index.json'), JSON.stringify(index, null, 2), 'utf8');
    console.log(`[audit] wrote ${index.length} stage HTML files to ${OUT}`);
  });
});
