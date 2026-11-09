// iconLibrary.ts - 2026-06-26
//
// The ICONOGRAPHIC branch of the visual router (third branch beside diagram + emotive).
// A deterministic, token-pure set of small reduced GLYPHS for slots where a data chart is overkill
// and a conceptual illustration is too much: per-card emblems, per-action/per-peer markers, section
// marks, glyph-kind registry slots.
//
// ARCHITECTURE (mirrors vizEngine, the proven pattern): this CODE engine is the runtime authority
// (deterministic, $0, anti-slop). The Figma icon page is the design CANON / few-shot exemplar set;
// it is mirrored here + into the icon catalog, NEVER called live (UNIFIED_VISION: SPA never calls
// Figma at runtime). Each glyph is a single-concept geometric mark on a 24x24 grid.
//
// NEVER-HARDCODE: a glyph carries NO colour of its own. Colour is resolved from the brand token
// mirror at render time (renderIconForBrand -> vizBrandColors(getBrand) -> /api/design-tokens). The
// raw renderIcon takes an explicit colour the caller already resolved from a token. The icon id is
// the TOKENIZED reference the model emits in a hashtag prompt; the resolver maps id -> SVG here.

import { getBrand, type BrandId } from '../components/slideTemplates/brands';
import { GENERATED_ICONS } from './iconBaseGenerated';
// NOTE: this module is dependency-free of vizSlot/vizEngine ON PURPOSE so vizEngine can import the
// glyph table to embed icons INSIDE diagrams (journey markers, node domain icons, arch shapes)
// without a circular import. Brand colours are read straight from the token mirror (getBrand).

export interface IconDef {
    /** Inner SVG for a 24x24 viewBox. `c` is the resolved stroke/fill colour (a token hex). Stroke
     *  attrs (width/caps/joins) are set by the wrapper; filled bits set fill=${c} stroke="none". */
    draw: (c: string) => string;
    /** Synonyms / concepts this glyph can represent (drives keyword selection + manifest matching). */
    tags: string[];
    /** Industry signature glyphs carry their industry key; universal content glyphs omit it. */
    industry?: string;
    /** Manifest CONTEXT: one line on WHEN to reach for this glyph (so the model/curator picks well). */
    usage?: string;
    /** Manifest CONTEXT: artifact + diagram surfaces this glyph suits (e.g. 'journey', 'competitive',
     *  'operatingNetwork', 'funnelFlow'). Helps route a glyph to the right slot / node. */
    suits?: string[];
}

// ---- UNIVERSAL CONTENT GLYPHS (recur across every deliverable) ------------------------------
const CONTENT: Record<string, IconDef> = {
    risk: { tags: ['risk', 'threat', 'exposure', 'vulnerability', 'hazard', 'warning'], draw: (c) => `<path d="M12 4 L21 19 L3 19 Z"/><path d="M12 10 V13.6"/><circle cx="12" cy="16.4" r="0.5" fill="${c}" stroke="none"/>` },
    opportunity: { tags: ['opportunity', 'unlock', 'potential', 'access', 'key'], draw: () => `<circle cx="8" cy="9" r="3.4"/><path d="M10.5 11.5 L19 20"/><path d="M16 17 L18 15"/><path d="M18.6 19.6 L20.2 18"/>` },
    growth: { tags: ['growth', 'expand', 'increase', 'momentum', 'scale-up'], draw: () => `<path d="M12 20 V11"/><path d="M12 13 C12 9 9 7.2 6 7.2 C6 11 9 13 12 13 Z"/><path d="M12 11 C12 8 15 6.2 18 6.2 C18 9.6 15 11 12 11 Z"/>` },
    governance: { tags: ['governance', 'oversight', 'balance', 'fairness', 'control'], draw: () => `<path d="M12 4 V19"/><path d="M8 19 H16"/><path d="M5 8 H19 M12 5.5 L5 8 M12 5.5 L19 8"/><path d="M3 12.5 L5 8 L7 12.5 Z"/><path d="M17 12.5 L19 8 L21 12.5 Z"/>` },
    compliance: { tags: ['compliance', 'regulation', 'standard', 'policy', 'checklist', 'audit'], draw: () => `<rect x="6" y="5" width="12" height="16" rx="1.4"/><path d="M9 5 V3.6 H15 V5"/><path d="M9 13 l2.2 2.2 L15 11"/>` },
    data: { tags: ['data', 'dataset', 'database', 'records', 'storage'], draw: () => `<ellipse cx="12" cy="6.5" rx="6" ry="2.5"/><path d="M6 6.5 V17.5 C6 18.9 8.7 20 12 20 C15.3 20 18 18.9 18 17.5 V6.5"/><path d="M6 12 C6 13.4 8.7 14.5 12 14.5 C15.3 14.5 18 13.4 18 12"/>` },
    insight: { tags: ['insight', 'finding', 'signal', 'discovery', 'spark', 'pattern'], draw: () => `<path d="M12 3 L13.6 10.4 L21 12 L13.6 13.6 L12 21 L10.4 13.6 L3 12 L10.4 10.4 Z"/>` },
    workflow: { tags: ['workflow', 'process', 'flow', 'sequence', 'orchestration'], draw: () => `<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="16" y="4" width="5" height="6" rx="1"/><rect x="16" y="14" width="5" height="6" rx="1"/><path d="M8 12 H12 V7 H16 M12 12 V17 H16"/>` },
    automation: { tags: ['automation', 'automate', 'agentic', 'engine', 'gear'], draw: () => `<circle cx="12" cy="12" r="3.2"/><path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.5 5.5 L7.6 7.6 M16.4 16.4 L18.5 18.5 M18.5 5.5 L16.4 7.6 M7.6 16.4 L5.5 18.5"/>` },
    integration: { tags: ['integration', 'connect', 'interoperate', 'api', 'link'], draw: () => `<path d="M9.5 9 H7.5 a3 3 0 0 0 0 6 H9.5"/><path d="M14.5 9 H16.5 a3 3 0 0 1 0 6 H14.5"/><path d="M8.5 12 H15.5"/>` },
    people: { tags: ['people', 'stakeholders', 'users', 'audience', 'population'], draw: () => `<circle cx="9" cy="8" r="3"/><path d="M3.6 19 C3.6 14.6 14.4 14.6 14.4 19"/><circle cx="17" cy="9" r="2.4"/><path d="M14.6 16.6 C16 14.7 20.6 14.9 20.4 19"/>` },
    team: { tags: ['team', 'squad', 'group', 'collaboration', 'pod'], draw: () => `<circle cx="12" cy="6" r="2.2"/><circle cx="6.5" cy="15" r="2.2"/><circle cx="17.5" cy="15" r="2.2"/><path d="M10.2 7.6 L8 12.9 M13.8 7.6 L16 12.9 M8.7 15 H15.3"/>` },
    customer: { tags: ['customer', 'client', 'member', 'patient', 'persona', 'service'], draw: () => `<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="10" r="2.6"/><path d="M7.5 17 C7.5 13.4 16.5 13.4 16.5 17"/>` },
    time: { tags: ['time', 'duration', 'speed', 'latency', 'clock', 'when'], draw: () => `<circle cx="12" cy="12" r="8.5"/><path d="M12 7 V12 L15.5 14"/>` },
    roadmap: { tags: ['roadmap', 'horizon', 'journey', 'path', 'plan'], draw: () => `<path d="M5 20 C8 16 8 12 11 9"/><path d="M11 4 V12"/><path d="M11 4 H18 L16 6.5 L18 9 H11"/>` },
    milestone: { tags: ['milestone', 'deliverable', 'launch', 'release', 'flag'], draw: () => `<path d="M7 21 V4"/><path d="M7 4 H18 L15.5 8 L18 12 H7"/>` },
    target: { tags: ['target', 'goal', 'objective', 'kpi', 'metric', 'aim'], draw: () => `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1 V5 M12 19 V23 M1 12 H5 M19 12 H23"/>` },
    decision: { tags: ['decision', 'choice', 'gate', 'branch', 'evaluate'], draw: () => `<path d="M12 3 L21 12 L12 21 L3 12 Z"/><path d="M9 12 l2 2 4-4"/>` },
    alert: { tags: ['alert', 'warning', 'incident', 'escalation', 'notify', 'bell'], draw: () => `<path d="M6 17 C6 17 7 15.5 7 12 C7 8 9 6 12 6 C15 6 17 8 17 12 C17 15.5 18 17 18 17 Z"/><path d="M10.3 20 a1.8 1.8 0 0 0 3.4 0"/><path d="M12 4 V6"/>` },
    cost: { tags: ['cost', 'spend', 'budget', 'price', 'revenue', 'money', 'coin'], draw: () => `<circle cx="12" cy="12" r="8.5"/><path d="M12 7 V17 M9.5 9.2 C9.5 7.8 14.5 7.8 14.5 9.8 C14.5 12 9.5 12 9.5 14.2 C9.5 16.2 14.5 16.2 14.5 14.8"/>` },
    value: { tags: ['value', 'benefit', 'worth', 'premium', 'gem'], draw: () => `<path d="M6 4 H18 L21 9 L12 21 L3 9 Z"/><path d="M3 9 H21 M9 4 L7.5 9 M15 4 L16.5 9 M12 21 L7.5 9 M12 21 L16.5 9"/>` },
    security: { tags: ['security', 'protect', 'safeguard', 'privacy', 'trust', 'shield'], draw: () => `<path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z"/>` },
    channel: { tags: ['channel', 'broadcast', 'reach', 'distribution', 'signal-out'], draw: () => `<circle cx="12" cy="14" r="2"/><path d="M12 16 V21"/><path d="M8.5 10.5 a5 5 0 0 1 7 0 M6 8 a8.5 8.5 0 0 1 12 0"/>` },
    network: { tags: ['network', 'ecosystem', 'graph', 'mesh', 'connections'], draw: () => `<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="12" cy="11" r="2"/><path d="M6.5 7.2 L10.6 9.9 M17.5 7.2 L13.4 9.9 M12 13 V16"/>` },
    document: { tags: ['document', 'report', 'brief', 'paper', 'file'], draw: () => `<path d="M7 3 H14 L18 7 V21 H7 Z"/><path d="M14 3 V7 H18"/><path d="M9.5 12 H15 M9.5 15 H15 M9.5 18 H13"/>` },
    search: { tags: ['search', 'discover', 'find', 'explore', 'research'], draw: () => `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15 L21 21"/>` },
    ai: { tags: ['ai', 'model', 'ml', 'llm', 'intelligence', 'chip'], draw: () => `<rect x="7" y="7" width="10" height="10" rx="1.5"/><circle cx="12" cy="12" r="2"/><path d="M10 3 V5 M14 3 V5 M10 19 V21 M14 19 V21 M3 10 H5 M3 14 H5 M19 10 H21 M19 14 H21"/>` },
    feedback: { tags: ['feedback', 'loop', 'iterate', 'retrospective', 'cycle'], draw: () => `<path d="M5 12 a7 7 0 0 1 11.5 -5.3"/><path d="M19 12 a7 7 0 0 1 -11.5 5.3"/><path d="M16.5 3.5 V7 H13 M7.5 20.5 V17 H11"/>` },
    scale: { tags: ['scale', 'tier', 'layers', 'stack', 'foundation'], draw: () => `<path d="M12 3 L21 8 L12 13 L3 8 Z"/><path d="M3 12 L12 17 L21 12 M3 16 L12 21 L21 16"/>` },

    // ---- WAVE 1 content expansion (2026-06-26): CX / strategy / AI-product vocabulary -----------
    churn: { tags: ['churn', 'attrition', 'leaving', 'drop-off', 'lost'], usage: 'a customer/segment leaving or attriting', suits: ['journey', 'funnelFlow', 'gap', 'recommendations'], draw: () => `<circle cx="8" cy="8" r="3"/><path d="M3 19 C3 14.5 13 14.5 13 19"/><path d="M16 12 H22 M19 9 L22 12 L19 15"/>` },
    retention: { tags: ['retention', 'keep', 'hold', 'anchor', 'stickiness'], usage: 'holding/keeping customers over time', suits: ['journey', 'roadmap', 'strategy'], draw: () => `<circle cx="12" cy="5" r="2"/><path d="M12 7 V20 M7 11 H17 M5 14 C5 18 8.5 20 12 20 C15.5 20 19 18 19 14"/>` },
    acquisition: { tags: ['acquisition', 'attract', 'inbound', 'magnet', 'capture'], usage: 'attracting/acquiring new customers or leads', suits: ['funnelFlow', 'strategy', 'competitive'], draw: () => `<path d="M6 4 V11 a6 6 0 0 0 12 0 V4 H14 V11 a2 2 0 0 1 -4 0 V4 Z"/><path d="M6 4 H10 M14 4 H18"/>` },
    conversion: { tags: ['conversion', 'convert', 'merge', 'funnel-out'], usage: 'turning prospects into outcomes (two-into-one)', suits: ['funnelFlow', 'journey'], draw: () => `<path d="M4 5 L11 11 M20 5 L13 11 M12 11 V19 M9 16 L12 19 L15 16"/>` },
    funnel: { tags: ['funnel', 'pipeline', 'narrowing', 'stages'], usage: 'a narrowing pipeline / stage progression', suits: ['funnelFlow', 'journey', 'recommendations'], draw: () => `<path d="M3 5 H21 L14 13 V20 L10 20 V13 Z"/>` },
    segmentation: { tags: ['segmentation', 'segments', 'cohorts', 'grid', 'split'], usage: 'dividing an audience/market into segments', suits: ['personas', 'competitive', 'comparisonMatrix'], draw: () => `<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>` },
    personalization: { tags: ['personalization', 'tailored', 'individual', 'bespoke'], usage: 'individually tailored experience', suits: ['personas', 'journey', 'recommendations'], draw: (c) => `<circle cx="9" cy="8" r="3"/><path d="M3.5 19 C3.5 14.5 14.5 14.5 14.5 19"/><path d="M18 4.5 l0.9 2 2 0.9 -2 0.9 -0.9 2 -0.9-2 -2-0.9 2-0.9 Z"/>` },
    loyalty: { tags: ['loyalty', 'reward', 'medal', 'advocacy', 'devotion'], usage: 'loyal/advocate customers; rewards', suits: ['journey', 'personas', 'strategy'], draw: () => `<circle cx="12" cy="9" r="5"/><circle cx="12" cy="9" r="1.6"/><path d="M9 13.5 L7.5 21 L12 18.5 L16.5 21 L15 13.5"/>` },
    satisfaction: { tags: ['satisfaction', 'csat', 'happy', 'delight', 'smile'], usage: 'customer satisfaction / positive sentiment', suits: ['journey', 'gap', 'recommendations'], draw: (c) => `<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10" r="0.6" fill="${c}" stroke="none"/><circle cx="15" cy="10" r="0.6" fill="${c}" stroke="none"/><path d="M8.5 14 C9.5 16 14.5 16 15.5 14"/>` },
    sentiment: { tags: ['sentiment', 'voice', 'opinion', 'feedback-voice', 'tone'], usage: 'voice-of-customer / expressed sentiment', suits: ['themes', 'personas', 'journey'], draw: (c) => `<path d="M4 5 H20 V16 H13 L9 20 V16 H4 Z"/><circle cx="9.5" cy="10.5" r="0.5" fill="${c}" stroke="none"/><circle cx="14.5" cy="10.5" r="0.5" fill="${c}" stroke="none"/><path d="M9.5 13 C10.5 14.2 13.5 14.2 14.5 13"/>` },
    adoption: { tags: ['adoption', 'uptake', 'usage-curve', 'rollout'], usage: 'adoption / uptake over time (S-curve)', suits: ['roadmap', 'strategy', 'journeyLine'], draw: () => `<path d="M4 5 V19 H20"/><path d="M5 18 C9 18 9 8 12 7 C16 5.5 17 7 19 6"/>` },
    engagement: { tags: ['engagement', 'interaction', 'tap', 'active'], usage: 'active engagement / interaction', suits: ['journey', 'recommendations'], draw: () => `<path d="M6 6 L11 20 L13.5 13.5 L20 11 Z"/>` },
    onboarding: { tags: ['onboarding', 'enter', 'welcome', 'setup', 'first-run'], usage: 'onboarding / entry into a product', suits: ['journey', 'prd', 'roadmap'], draw: () => `<path d="M14 3 H20 V21 H14"/><path d="M3 12 H14 M10 8 L14 12 L10 16"/>` },
    resolution: { tags: ['resolution', 'resolved', 'solved', 'closed'], usage: 'an issue resolved / closed', suits: ['journey', 'tech-audit', 'gap'], draw: () => `<circle cx="12" cy="12" r="8.5"/><path d="M8 12 l2.5 2.5 L16 9"/>` },
    backlog: { tags: ['backlog', 'queue', 'todo', 'workload'], usage: 'a backlog / queue of work', suits: ['prd', 'roadmap', 'tech-audit'], draw: () => `<rect x="4" y="5" width="16" height="3" rx="1"/><rect x="4" y="10.5" width="16" height="3" rx="1"/><rect x="4" y="16" width="11" height="3" rx="1"/>` },
    throughput: { tags: ['throughput', 'flow-rate', 'volume', 'processed'], usage: 'volume flowing through a system', suits: ['operatingNetwork', 'flowSchematic', 'tech-arch'], draw: () => `<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 12 H17 M14 9 L17 12 L14 15"/>` },
    capacity: { tags: ['capacity', 'utilization', 'load', 'fill'], usage: 'capacity / utilization level', suits: ['tech-audit', 'tech-arch', 'instrumentDial'], draw: (c) => `<rect x="3" y="8" width="16" height="8" rx="1.5"/><path d="M19 11 V13 H21"/><rect x="5" y="10" width="3" height="4" fill="${c}" stroke="none"/><rect x="9" y="10" width="3" height="4" fill="${c}" stroke="none"/>` },
    efficiency: { tags: ['efficiency', 'speed', 'fast', 'performance', 'energy'], usage: 'efficiency / performance gain', suits: ['recommendations', 'tech-audit', 'strategy'], draw: () => `<path d="M13 3 L5 14 H11 L10 21 L19 9 H13 Z"/>` },
    benchmark: { tags: ['benchmark', 'comparison', 'standard', 'bar-mark'], usage: 'measuring against a benchmark/standard', suits: ['competitive', 'gap', 'comparisonMatrix'], draw: () => `<path d="M4 20 V13 M9 20 V8 M14 20 V11 M19 20 V6"/><path d="M3 15 H21" stroke-dasharray="2.5 2.5"/>` },
    forecast: { tags: ['forecast', 'projection', 'outlook', 'predict-ahead'], usage: 'projecting a future trajectory', suits: ['roadmap', 'strategy', 'timelineGantt'], draw: () => `<path d="M3 17 L8 12 L12 14"/><path d="M12 14 L17 8 L21 5" stroke-dasharray="2.5 2.5"/>` },
    trend: { tags: ['trend', 'growth-line', 'trajectory', 'rising'], usage: 'a rising trend / trajectory', suits: ['themes', 'strategy', 'dataField'], draw: () => `<path d="M3 17 L9 11 L13 14 L21 5"/><path d="M16 5 H21 V10"/>` },
    experiment: { tags: ['experiment', 'test', 'ab-test', 'trial', 'lab'], usage: 'an experiment / A-B test', suits: ['prd', 'roadmap', 'recommendations'], draw: () => `<path d="M9 3 V9 L4.5 18.5 a1 1 0 0 0 1 1.5 H18.5 a1 1 0 0 0 1-1.5 L15 9 V3"/><path d="M8 3 H16 M7 14 H17"/>` },
    hypothesis: { tags: ['hypothesis', 'question', 'assumption', 'unknown'], usage: 'an open question / assumption to test', suits: ['gap', 'recommendations', 'themes'], draw: (c) => `<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5 C9.5 7.5 14.5 7.5 14.5 10 C14.5 12 12 12 12 14"/><circle cx="12" cy="17" r="0.5" fill="${c}" stroke="none"/>` },
    prototype: { tags: ['prototype', 'wireframe', 'mockup', 'draft-ui'], usage: 'a prototype / wireframe', suits: ['prd', 'proto', 'roadmap'], draw: () => `<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9 H21 M8 9 V20 M8 13 H21"/>` },
    priority: { tags: ['priority', 'rank', 'top', 'escalate-up', 'important'], usage: 'high priority / ranking up', suits: ['recommendations', 'roadmap', 'gap'], draw: () => `<path d="M6 14 L12 9 L18 14 M6 19 L12 14 L18 19"/>` },
    dependency: { tags: ['dependency', 'depends-on', 'prerequisite', 'linked'], usage: 'one item depending on another', suits: ['roadmap', 'tech-arch', 'flowSchematic'], draw: () => `<rect x="3" y="5" width="7" height="6" rx="1"/><rect x="14" y="13" width="7" height="6" rx="1"/><path d="M10 8 H14 V13"/>` },
    blocker: { tags: ['blocker', 'blocked', 'stop', 'impediment'], usage: 'a blocker / impediment', suits: ['roadmap', 'tech-audit', 'gap'], draw: () => `<circle cx="12" cy="12" r="8.5"/><path d="M6 6 L18 18"/>` },
    handoff: { tags: ['handoff', 'transfer', 'pass', 'relay'], usage: 'a handoff between people/teams', suits: ['journey', 'service-blueprint', 'operatingNetwork'], draw: () => `<circle cx="6" cy="8" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M8.5 14 H15.5 M13 11.5 L15.5 14 L13 16.5"/>` },
    consent: { tags: ['consent', 'opt-in', 'permission', 'agree'], usage: 'consent / opt-in / permission', suits: ['journey', 'prd', 'tech-audit'], draw: () => `<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12 l2.5 2.5 L16 9"/>` },
    privacy: { tags: ['privacy', 'hidden', 'confidential', 'masked'], usage: 'privacy / data hidden from view', suits: ['tech-audit', 'tech-arch', 'gap'], draw: () => `<path d="M3 12 C5 8 9 6 12 6 C15 6 19 8 21 12 C19 16 15 18 12 18 C9 18 5 16 3 12 Z"/><circle cx="12" cy="12" r="2.5"/><path d="M4 4 L20 20"/>` },
    transparency: { tags: ['transparency', 'visibility', 'open', 'observe', 'eye'], usage: 'transparency / visibility', suits: ['governance', 'tech-audit', 'strategy'], draw: () => `<path d="M3 12 C5 8 9 6 12 6 C15 6 19 8 21 12 C19 16 15 18 12 18 C9 18 5 16 3 12 Z"/><circle cx="12" cy="12" r="3"/>` },
    accountability: { tags: ['accountability', 'ownership', 'responsible', 'raci'], usage: 'clear ownership / accountability', suits: ['operatingNetwork', 'org', 'service-blueprint'], draw: () => `<rect x="6" y="5" width="12" height="16" rx="1.4"/><path d="M9 5 V3.6 H15 V5"/><circle cx="12" cy="11" r="2"/><path d="M9 17 C9 14.5 15 14.5 15 17"/>` },
    sustainability: { tags: ['sustainability', 'green', 'leaf', 'long-term', 'renewable'], usage: 'sustainable / long-term / green', suits: ['strategy', 'roadmap'], draw: () => `<path d="M12 4 C7 7 5 11 7 16 C10 12 14 11 18 11 C18 7 16 5 12 4 Z"/><path d="M7 16 C7 16 9 19 13 19"/>` },
    partnership: { tags: ['partnership', 'alliance', 'overlap', 'joint'], usage: 'a partnership / alliance / overlap', suits: ['competitive', 'strategy', 'operatingNetwork'], draw: () => `<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>` },
    contract: { tags: ['contract', 'agreement', 'signed', 'terms'], usage: 'a contract / signed agreement', suits: ['journey', 'prd', 'recommendations'], draw: () => `<path d="M7 3 H14 L18 7 V21 H7 Z"/><path d="M14 3 V7 H18"/><path d="M9.5 17 C11 15.5 12 18 13.5 16.5 M9.5 12 H15 M9.5 14.5 H13"/>` },
    sla: { tags: ['sla', 'guarantee', 'uptime', 'commitment'], usage: 'an SLA / time commitment guarantee', suits: ['tech-audit', 'service-blueprint', 'recommendations'], draw: () => `<path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z"/><circle cx="12" cy="11" r="3.2"/><path d="M12 9 V11 L13.6 12"/>` },
    incident: { tags: ['incident', 'outage', 'failure', 'event'], usage: 'an incident / outage event', suits: ['tech-audit', 'tech-arch', 'gap'], draw: () => `<path d="M12 4 L21 19 H3 Z"/><path d="M12.6 9 L10 14 H12.5 L11.4 17.5"/>` },
    monitoring: { tags: ['monitoring', 'observability', 'radar', 'watch', 'scan'], usage: 'monitoring / observability', suits: ['tech-audit', 'tech-arch', 'operatingNetwork'], draw: (c) => `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 L18 7"/><circle cx="12" cy="12" r="0.6" fill="${c}" stroke="none"/>` },
    migration: { tags: ['migration', 'move', 'transfer-system', 'replatform'], usage: 'migrating between systems', suits: ['tech-arch', 'tech-audit', 'roadmap'], draw: () => `<rect x="3" y="9" width="6" height="6" rx="1"/><rect x="15" y="9" width="6" height="6" rx="1"/><path d="M9 12 H15 M13 10 L15 12 L13 14"/>` },
    campaign: { tags: ['campaign', 'announce', 'megaphone', 'promote', 'reach'], usage: 'a marketing campaign / announcement', suits: ['strategy', 'recommendations', 'journey'], draw: () => `<path d="M4 10 V14 H8 L16 19 V5 L8 10 Z"/><path d="M16 9 a3 3 0 0 1 0 6"/><path d="M8 14 V18.5 H10 V14"/>` },
    touchpoint: { tags: ['touchpoint', 'moment', 'contact-point', 'interaction-node'], usage: 'a touchpoint / moment on a journey', suits: ['journey', 'service-blueprint', 'journeyLine'], draw: (c) => `<path d="M3 14 H21"/><circle cx="8" cy="14" r="1.5" fill="${c}" stroke="none"/><circle cx="16" cy="14" r="1.5" fill="${c}" stroke="none"/><circle cx="12" cy="14" r="3.2"/><path d="M12 14 V6"/>` },
};

// ---- INDUSTRY SIGNATURE GLYPHS (>=3 per industry) -------------------------------------------
const INDUSTRY: Record<string, IconDef> = {
    'healthcare:heartbeat': { industry: 'healthcare', tags: ['vitals', 'monitoring', 'patient-health', 'pulse'], draw: () => `<path d="M3 12 H8 L10 7 L13 17 L15 12 H21"/>` },
    'healthcare:pill': { industry: 'healthcare', tags: ['medication', 'pharma', 'treatment', 'dose'], draw: () => `<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9 V15"/>` },
    'healthcare:care': { industry: 'healthcare', tags: ['care', 'clinic', 'medical', 'cross'], draw: () => `<circle cx="12" cy="12" r="8.5"/><path d="M12 8 V16 M8 12 H16"/>` },

    'fintech:ledger': { industry: 'fintech', tags: ['ledger', 'accounts', 'bookkeeping', 'statement'], draw: () => `<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M9 4 V20 M12 8 H16 M12 11 H16 M12 14 H15"/>` },
    'fintech:coin': { industry: 'fintech', tags: ['coin', 'token', 'currency', 'asset'], draw: () => `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/>` },
    'fintech:card': { industry: 'fintech', tags: ['card', 'payment', 'rails', 'checkout'], draw: () => `<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10 H21 M6.5 14.5 H10"/>` },
    'fintech:fraud': { industry: 'fintech', tags: ['fraud', 'risk-shield', 'block', 'protection'], draw: () => `<path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z"/><path d="M9.5 9.5 L14.5 14.5 M14.5 9.5 L9.5 14.5"/>` },

    'financial-services:bank': { industry: 'financial-services', tags: ['bank', 'institution', 'branch'], draw: () => `<path d="M4 9 L12 4 L20 9 H4 Z"/><path d="M6 9 V17 M10 9 V17 M14 9 V17 M18 9 V17 M4 20 H20"/>` },
    'financial-services:vault': { industry: 'financial-services', tags: ['vault', 'reserves', 'safe', 'custody'], draw: () => `<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 7.5 V9 M12 15 V16.5 M7.5 12 H9 M15 12 H16.5"/>` },
    'financial-services:portfolio': { industry: 'financial-services', tags: ['portfolio', 'advisory', 'wealth', 'briefcase'], draw: () => `<rect x="3" y="8" width="18" height="11" rx="1.5"/><path d="M9 8 V6 H15 V8 M3 13 H21"/>` },

    'retail:cart': { industry: 'retail', tags: ['cart', 'basket', 'purchase', 'checkout'], draw: (c) => `<circle cx="9" cy="20" r="1.4" fill="${c}" stroke="none"/><circle cx="17" cy="20" r="1.4" fill="${c}" stroke="none"/><path d="M3 4 H5.5 L7.5 15 H18 L20 7 H6.5"/>` },
    'retail:tag': { industry: 'retail', tags: ['tag', 'price', 'sku', 'promotion'], draw: (c) => `<path d="M4 12 L12 4 H20 V12 L12 20 Z"/><circle cx="16" cy="8" r="1.3" fill="${c}" stroke="none"/>` },
    'retail:store': { industry: 'retail', tags: ['store', 'storefront', 'shop', 'outlet'], draw: () => `<path d="M4 10 V20 H20 V10"/><path d="M3 6 H21 L20 10 H4 Z"/><path d="M10 20 V14 H14 V20"/>` },

    'ai-industry:robot': { industry: 'ai-industry', tags: ['agent', 'assistant', 'bot', 'autonomous'], draw: (c) => `<rect x="5" y="8" width="14" height="11" rx="2"/><circle cx="9.5" cy="13" r="1.2" fill="${c}" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="${c}" stroke="none"/><path d="M12 4 V8 M9 19 V21 M15 19 V21"/><circle cx="12" cy="4" r="0.9" fill="${c}" stroke="none"/>` },
    'ai-industry:pipeline': { industry: 'ai-industry', tags: ['pipeline', 'inference', 'chain', 'stages'], draw: () => `<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12 H10 M14 12 H17"/>` },
    'ai-industry:model': { industry: 'ai-industry', tags: ['model', 'weights', 'architecture', 'foundation-model'], draw: () => `<path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/><path d="M12 12 L20 7.5 M12 12 V21 M12 12 L4 7.5"/>` },

    'insurance:umbrella': { industry: 'insurance', tags: ['coverage', 'protection', 'umbrella', 'cover'], draw: () => `<path d="M3 12 a9 9 0 0 1 18 0 Z"/><path d="M12 3 V12 M12 19 a2.4 2.4 0 0 0 4 0 V18"/>` },
    'insurance:policy': { industry: 'insurance', tags: ['policy', 'contract', 'terms', 'claim-doc'], draw: () => `<path d="M6 3 H14 L18 7 V21 H6 Z"/><path d="M14 3 V7 H18"/><path d="M9 11 l1.6 1.6 L14 9.5 M9.5 15 H14"/>` },
    'insurance:claim': { industry: 'insurance', tags: ['claim', 'approved', 'shield-check', 'settlement'], draw: () => `<path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z"/><path d="M9 11.5 l2 2 4-4"/>` },

    'higher-ed:cap': { industry: 'higher-ed', tags: ['graduation', 'degree', 'academic', 'mortarboard'], draw: () => `<path d="M2 9 L12 5 L22 9 L12 13 Z"/><path d="M6 11 V16 C6 16 8.5 18 12 18 C15.5 18 18 16 18 16 V11"/><path d="M22 9 V14"/>` },
    'higher-ed:book': { industry: 'higher-ed', tags: ['book', 'curriculum', 'learning', 'study'], draw: () => `<path d="M4 5 C7 4 10 4 12 5.5 C14 4 17 4 20 5 V19 C17 18 14 18 12 19.5 C10 18 7 18 4 19 Z"/><path d="M12 5.5 V19.5"/>` },
    'higher-ed:campus': { industry: 'higher-ed', tags: ['campus', 'university', 'institution', 'building'], draw: () => `<path d="M4 10 L12 5 L20 10"/><path d="M6 10 V19 H18 V10"/><path d="M10 19 V14 H14 V19"/><path d="M12 5 V3"/>` },

    'advancement:gift': { industry: 'advancement', tags: ['gift', 'donation', 'giving', 'present'], draw: () => `<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9 H21 V13 H3 Z M12 9 V20"/><path d="M12 9 C12 9 9 4 7 6 C5 8 12 9 12 9 C12 9 15 4 17 6 C19 8 12 9 12 9"/>` },
    'advancement:heart': { industry: 'advancement', tags: ['philanthropy', 'donor-love', 'support', 'heart'], draw: () => `<path d="M12 20 C12 20 4 15 4 9.5 C4 6.5 6.5 5 9 6 C10.5 6.6 12 8 12 8 C12 8 13.5 6.6 15 6 C17.5 5 20 6.5 20 9.5 C20 15 12 20 12 20 Z"/>` },
    'advancement:pledge': { industry: 'advancement', tags: ['pledge', 'award', 'recognition', 'ribbon'], draw: () => `<circle cx="12" cy="9" r="5"/><path d="M9.5 13 L7 21 L12 18 L17 21 L14.5 13"/>` },

    'workforce:org': { industry: 'workforce', tags: ['org', 'hierarchy', 'structure', 'reporting'], draw: () => `<rect x="9.5" y="3" width="5" height="4" rx="0.6"/><rect x="3" y="16" width="5" height="4" rx="0.6"/><rect x="9.5" y="16" width="5" height="4" rx="0.6"/><rect x="16" y="16" width="5" height="4" rx="0.6"/><path d="M12 7 V11 M5.5 16 V13 H18.5 V16 M12 11 V16"/>` },
    'workforce:badge': { industry: 'workforce', tags: ['badge', 'employee', 'identity', 'role'], draw: () => `<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="9" r="2.4"/><path d="M8 16 C8 13 16 13 16 16 M10 4.5 H14"/>` },
    'workforce:skill': { industry: 'workforce', tags: ['skill', 'capability', 'competency', 'rating'], draw: () => `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5 L13.2 10.3 L16.2 10.6 L14 12.6 L14.7 15.5 L12 14 L9.3 15.5 L10 12.6 L7.8 10.6 L10.8 10.3 Z"/>` },

    'government:institution': { industry: 'government', tags: ['government', 'public-sector', 'agency', 'capitol'], draw: () => `<path d="M3 9 L12 4 L21 9 H3 Z"/><path d="M5 9 V18 M9 9 V18 M15 9 V18 M19 9 V18 M3 21 H21 M3 18 H21"/>` },
    'government:citizen': { industry: 'government', tags: ['citizen', 'constituent', 'resident', 'public'], draw: () => `<path d="M12 3 L19 5.5 V11 C19 16 12 21 12 21 C12 21 5 16 5 11 V5.5 Z"/><circle cx="12" cy="10" r="2.2"/><path d="M8.5 15.5 C8.5 12.5 15.5 12.5 15.5 15.5"/>` },
    'government:service': { industry: 'government', tags: ['public-service', 'form', 'application', 'process'], draw: () => `<path d="M6 3 H14 L18 7 V21 H6 Z"/><path d="M14 3 V7 H18"/><path d="M9 11 H15 M9 14 H15 M9 17 l1.2 1.2 L13 16.4"/>` },

    'creative-ai:brush': { industry: 'creative-ai', tags: ['design', 'creative', 'brush', 'craft'], draw: () => `<path d="M16 3 L21 8 L10 19 H5 V14 Z"/><path d="M14 5 L19 10"/>` },
    'creative-ai:render': { industry: 'creative-ai', tags: ['render', 'image', 'generation', 'output'], draw: (c) => `<rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6" fill="${c}" stroke="none"/><path d="M3 17 L9 12 L13 15 L17 11 L21 15"/>` },
    'creative-ai:asset': { industry: 'creative-ai', tags: ['asset', 'layers', 'library', 'composition'], draw: () => `<path d="M12 3 L21 8 L12 13 L3 8 Z"/><path d="M5 11 L12 15 L19 11 M5 14.5 L12 18.5 L19 14.5"/>` },
};

// Generated universal base glyphs (tech/web/AI/data/arch/cloud/security/governance/mobile/chatbot).
// `inner` carries the literal 'currentColor'; draw() swaps it for the resolved token colour.
const GEN: Record<string, IconDef> = {};
for (const id of Object.keys(GENERATED_ICONS)) {
    const g = GENERATED_ICONS[id];
    GEN[id] = { tags: g.tags || [], usage: g.usage, draw: (c: string) => g.inner.split('currentColor').join(c) };
}

export const ICONS: Record<string, IconDef> = { ...CONTENT, ...INDUSTRY, ...GEN };
// Universal selection pool (content + generated tech glyphs) for keyword/concept matching.
const CONTENT_POOL: Record<string, IconDef> = { ...CONTENT, ...GEN };

/** Canonical industry-key aliases (match the run-industry strings used across the app). */
const INDUSTRY_ALIAS: Record<string, string> = {
    health: 'healthcare', healthcare: 'healthcare', 'life-sciences': 'healthcare',
    fintech: 'fintech', 'financial-services': 'financial-services', finance: 'financial-services', banking: 'financial-services',
    retail: 'retail', ecommerce: 'retail', cpg: 'retail',
    'ai-industry': 'ai-industry', ai: 'ai-industry', 'artificial-intelligence': 'ai-industry',
    insurance: 'insurance', insurtech: 'insurance',
    'higher-ed': 'higher-ed', 'higher-education': 'higher-ed', education: 'higher-ed',
    advancement: 'advancement', fundraising: 'advancement', philanthropy: 'advancement',
    workforce: 'workforce', hr: 'workforce', 'human-resources': 'workforce', talent: 'workforce',
    government: 'government', 'public-sector': 'government', gov: 'government',
    'creative-ai': 'creative-ai', creative: 'creative-ai', design: 'creative-ai',
};
function normIndustry(i?: string): string | undefined {
    if (!i) return undefined;
    const k = i.toLowerCase().trim().replace(/[\s_]+/g, '-');
    return INDUSTRY_ALIAS[k] || (ICONS[`${k}:`] ? k : INDUSTRY_ALIAS[k]);
}
function industrySignatures(i?: string): string[] {
    const norm = normIndustry(i);
    if (!norm) return [];
    return Object.keys(INDUSTRY).filter((id) => INDUSTRY[id].industry === norm);
}

// deterministic seed (no Math.random) so selection is stable per heading.
function seedFrom(s: string): number { let h = 2166136261; const t = s || 'icon'; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }

export interface IconSelectOpts {
    industry?: string;
    concept?: string;   // an explicit concept word (from payload)
    heading?: string;   // slide/card heading -> keyword match
    explicitId?: string; // a tokenized icon id the model emitted (icon:<id>)
}

/** Pick a content-true icon id for a slot. Priority: explicit id > content-keyword match on the
 *  concept/heading > industry signature (seeded) > a safe content default. Deterministic. */
export function selectIcon(o: IconSelectOpts): string | null {
    if (o.explicitId) {
        const id = o.explicitId.replace(/^icon:/, '');
        if (ICONS[id]) return id;
    }
    const text = `${o.concept || ''} ${o.heading || ''}`.toLowerCase();
    // word-boundary match so a short tag ('hold') does not false-hit a longer word ('holdings').
    const hit = (t: string) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    if (text.trim()) {
        // content keyword match first (most content-relevant); pool = content + generated tech glyphs
        for (const id of Object.keys(CONTENT_POOL)) {
            if (CONTENT_POOL[id].tags.some(hit)) return id;
        }
        // industry signature whose tag matches the text
        for (const id of industrySignatures(o.industry)) {
            if (INDUSTRY[id].tags.some(hit)) return id;
        }
    }
    const sigs = industrySignatures(o.industry);
    if (sigs.length) return sigs[seedFrom(o.heading || o.concept || '') % sigs.length];
    if (text.trim()) return 'insight';
    return null;
}

/** Raw render: colour is explicit (the caller already resolved it from a token). NEVER hardcoded
 *  here. size in px, stroke width scales with size. Returns a standalone <svg> string. */
export function renderIcon(id: string, opts: { color: string; size?: number; stroke?: number } = { color: 'currentColor' }): string {
    const def = ICONS[id];
    const size = opts.size || 64;
    const sw = opts.stroke || Math.max(1.3, size / 32);
    const c = opts.color || 'currentColor';
    if (!def) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-hidden="true"><g fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${def.draw(c)}</g></svg>`;
}

/** Resolve a brand-token colour for a role/ground straight from the token mirror (getBrand reflects
 *  /api/design-tokens). The '#' guard mirrors vizSlot.vizBrandColors; no hex is hardcoded here. */
export function iconTokenColor(brand: BrandId | string | null | undefined, role: 'accent' | 'ink' | 'cool', ground: 'dark' | 'light'): string {
    const b = getBrand(brand) as any;
    const H = (v: string) => (v && v[0] === '#') ? v : `#${v}`;
    if (role === 'cool') return H(b.CYAN);
    if (role === 'ink') return H(ground === 'dark' ? b.WHITE : b.INK);
    return H(b.CHARTREUSE); // accent (brand accent: chartreuse NXT / red NU)
}

/** Token-pure render: colour ALWAYS comes from the brand token mirror. role picks the token; ground
 *  flips ink<->paper for contrast. */
export function renderIconForBrand(id: string, o: { brand?: BrandId | string | null; ground?: 'dark' | 'light'; role?: 'accent' | 'ink' | 'cool'; size?: number; stroke?: number } = {}): string {
    const color = iconTokenColor(o.brand, o.role || 'accent', o.ground || 'dark');
    return renderIcon(id, { color, size: o.size, stroke: o.stroke });
}

export function iconToDataUri(svg: string): string {
    const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg, 'utf8').toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
}

// ============================================================================================
// COMPOSITION ENGINE (2026-06-26): the composable layer that turns the ~2,741-concept taxonomy
// into addressable icons WITHOUT 2,741 separate drawings. A concept (+ its baseGlyph hint + run
// industry) resolves to a BASE glyph (the ~100+ primitives above) and an optional INDUSTRY MODIFIER
// badge. Matches the viz architecture (compact engine + large catalog). Token-pure + deterministic.
// ============================================================================================

/** Object-noun baseGlyph keyword (from the taxonomy) -> base glyph id. Semantic clustering so the
 *  2,211 distinct baseGlyph nouns collapse onto the curated primitive set. Expand as the base grows
 *  (P2). Keys are lowercase nouns; values MUST be ids present in ICONS. */
const BASE_ALIAS: Record<string, string> = {
    // measurement / status
    gauge: 'monitoring', speedometer: 'monitoring', meter: 'monitoring', dial: 'monitoring', radar: 'monitoring', odometer: 'monitoring', tachometer: 'monitoring', barometer: 'monitoring',
    // documents / records
    scroll: 'document', certificate: 'document', rulebook: 'document', form: 'document', paper: 'document', file: 'document', report: 'document', receipt: 'document', invoice: 'document', statement: 'document', transcript: 'document', diploma: 'document', deed: 'document', manuscript: 'document',
    clipboard: 'accountability', checklist: 'compliance', stamp: 'compliance', seal: 'compliance', notary: 'compliance', audit: 'compliance', ledger: 'fintech:ledger',
    blueprint: 'prototype', wireframe: 'prototype', ruler: 'prototype', sketch: 'prototype', pencil: 'prototype', pen: 'prototype', draft: 'prototype',
    // find / signal
    magnifier: 'search', magnifyingglass: 'search', scanner: 'search', telescope: 'search', binoculars: 'search', microscope: 'experiment', beaker: 'experiment', flask: 'experiment', testtube: 'experiment', petri: 'experiment',
    magnet: 'acquisition', anchor: 'retention', funnel: 'funnel', hourglass: 'time', stopwatch: 'time', clock: 'time', timer: 'time', calendar: 'time', watch: 'time',
    // security / access
    key: 'opportunity', lock: 'security', padlock: 'security', shield: 'security', fingerprint: 'security', biometric: 'security', vault: 'financial-services:vault', safe: 'financial-services:vault', mask: 'privacy', eye: 'transparency', 'eye-off': 'privacy',
    // money
    coin: 'cost', 'coin-stack': 'cost', coins: 'cost', banknote: 'cost', cash: 'cost', wallet: 'cost', piggybank: 'cost', calculator: 'cost', money: 'cost', dollar: 'cost', card: 'fintech:card', 'credit-card': 'fintech:card', atm: 'financial-services:bank', qr: 'fintech:card', 'qr-code': 'fintech:card',
    // reward / identity
    trophy: 'loyalty', medal: 'loyalty', award: 'loyalty', ribbon: 'advancement:pledge', rosette: 'advancement:pledge', badge: 'workforce:badge', 'id-card': 'workforce:badge', lanyard: 'workforce:badge', star: 'insight', spark: 'insight',
    // relationships / network
    handshake: 'partnership', rings: 'partnership', 'hub-spokes': 'network', graph: 'network', node: 'network', mesh: 'network', web: 'network', constellation: 'network', org: 'workforce:org', hierarchy: 'workforce:org', tree: 'sustainability',
    // comms
    megaphone: 'campaign', bullhorn: 'campaign', broadcast: 'channel', antenna: 'channel', signal: 'channel', bell: 'alert', 'speech-bubble': 'sentiment', chat: 'sentiment', comment: 'sentiment', smiley: 'satisfaction', emoji: 'satisfaction', headset: 'customer', microphone: 'channel', envelope: 'channel', mail: 'channel',
    // direction / goals
    flag: 'milestone', target: 'target', bullseye: 'target', compass: 'roadmap', map: 'roadmap', 'map-pin': 'touchpoint', pin: 'touchpoint', signpost: 'roadmap', crosshair: 'target',
    // ops / systems
    gear: 'automation', cog: 'automation', gears: 'automation', cogs: 'automation', switch: 'automation', robot: 'ai-industry:robot', bot: 'ai-industry:robot', chip: 'ai', cpu: 'ai', brain: 'ai', neuron: 'ai', 'neural-net': 'ai', server: 'data', database: 'data', cloud: 'data', 'data-store': 'data', layers: 'scale', stack: 'scale', cube: 'scale', blocks: 'scale', conveyor: 'throughput', pipeline: 'ai-industry:pipeline', plug: 'integration', link: 'integration', api: 'integration',
    lightning: 'efficiency', bolt: 'efficiency', flash: 'efficiency', battery: 'capacity', fuel: 'capacity', tank: 'capacity', thermometer: 'capacity',
    // people
    person: 'people', people: 'people', user: 'people', users: 'people', group: 'team', crowd: 'team', heart: 'advancement:heart', leaf: 'sustainability', recycle: 'sustainability', seedling: 'growth', sprout: 'growth', plant: 'growth', rocket: 'growth', ladder: 'priority',
    // charts
    'chart-up': 'trend', 'line-chart': 'trend', 'bar-chart': 'benchmark', bars: 'benchmark', pie: 'segmentation', 'pie-chart': 'segmentation', grid: 'segmentation', matrix: 'segmentation',
    // governance / legal
    gavel: 'governance', 'balance-scale': 'governance', scale: 'governance', scales: 'governance', justice: 'governance', law: 'governance', bridge: 'integration', pillar: 'government:institution', column: 'government:institution',
    // domain objects
    dna: 'healthcare:care', pill: 'healthcare:pill', capsule: 'healthcare:pill', stethoscope: 'healthcare:care', syringe: 'healthcare:pill', cross: 'healthcare:care', 'medical-cross': 'healthcare:care', hospital: 'healthcare:care', bed: 'healthcare:care', heartbeat: 'healthcare:heartbeat', pulse: 'healthcare:heartbeat', ecg: 'healthcare:heartbeat', ambulance: 'healthcare:care', kidney: 'healthcare:care', lungs: 'healthcare:care', tooth: 'healthcare:care', bandage: 'healthcare:care', vial: 'experiment',
    cart: 'retail:cart', basket: 'retail:cart', bag: 'retail:cart', 'shopping-bag': 'retail:cart', tag: 'retail:tag', barcode: 'retail:tag', label: 'retail:tag', box: 'retail:store', package: 'retail:store', parcel: 'retail:store', truck: 'migration', warehouse: 'retail:store', store: 'retail:store', storefront: 'retail:store', shelf: 'retail:store', hanger: 'retail:tag', pos: 'retail:cart', 'pos-terminal': 'retail:cart',
    bank: 'financial-services:bank', building: 'government:institution', 'building-gov': 'government:institution', briefcase: 'financial-services:portfolio', portfolio: 'financial-services:portfolio', 'coins-stack': 'cost',
    umbrella: 'insurance:umbrella', policy: 'insurance:policy', 'hard-hat': 'insurance:claim', fire: 'incident', flood: 'incident', 'flood-wave': 'incident', car: 'insurance:claim', house: 'insurance:umbrella', home: 'insurance:umbrella',
    cap: 'higher-ed:cap', 'graduation-cap': 'higher-ed:cap', mortarboard: 'higher-ed:cap', book: 'higher-ed:book', books: 'higher-ed:book', library: 'higher-ed:book', campus: 'higher-ed:campus', podium: 'higher-ed:campus', backpack: 'higher-ed:book', dorm: 'higher-ed:campus',
    gift: 'advancement:gift', present: 'advancement:gift', 'hand-coin': 'advancement:heart', donation: 'advancement:heart',
    ballot: 'government:service', 'vote-box': 'government:service', 'public-records': 'document', passport: 'workforce:badge', 'id-badge': 'workforce:badge',
    brush: 'creative-ai:brush', paintbrush: 'creative-ai:brush', palette: 'creative-ai:brush', canvas: 'creative-ai:render', camera: 'creative-ai:render', film: 'creative-ai:render', 'image-frame': 'creative-ai:render', image: 'creative-ai:render', video: 'creative-ai:render', waveform: 'monitoring', 'magic-wand': 'insight', wand: 'insight', sparkles: 'insight', scissors: 'creative-ai:asset',
    // P2-lite: high-frequency unmapped nouns -> nearest existing base (cuts industry-fallback)
    globe: 'network', world: 'network', sliders: 'automation', knobs: 'automation', boomerang: 'feedback', telephone: 'channel', phone: 'channel', call: 'channel', 'raised-hand': 'consent', hand: 'consent', wrench: 'automation', spanner: 'automation', toolbox: 'automation', hammer: 'automation', screwdriver: 'automation', ghost: 'risk', 'percent-dial': 'monitoring', percent: 'monitoring', 'overlapping-circles': 'partnership', 'venn': 'partnership', clamp: 'security', vise: 'security', 'crosshair-grid': 'target', 'target-arrow': 'target', 'odd-one-out': 'segmentation', 'overflow-cup': 'capacity', cup: 'capacity', 'yin-yang': 'governance', metronome: 'time', 'coin-up-arrow': 'trend', 'envelope-coin': 'cost', 'card-refresh': 'fintech:card', 'checklist-clipboard': 'compliance', 'ballot-box': 'government:service', 'hands-heart': 'advancement:heart', 'person-headset': 'customer', 'compass-person': 'roadmap', dumbbell: 'workforce:skill', whistle: 'alert', siren: 'alert', 'grid-calendar': 'time', satellite: 'channel', dish: 'channel', drone: 'monitoring', ship: 'migration', boat: 'migration', airplane: 'migration', plane: 'migration', train: 'migration', 'rail-track': 'migration', wheat: 'sustainability', crop: 'sustainability', paw: 'insight', hardhat: 'insurance:claim', lighthouse: 'roadmap', beacon: 'channel', puzzle: 'integration', 'puzzle-piece': 'integration', 'shopping-cart': 'retail:cart', 'graph-up': 'trend', 'arrow-up': 'growth', 'arrow-down': 'churn', fork: 'decision', 'fork-road': 'decision', crossroads: 'decision', lightbulb: 'insight', bulb: 'insight', idea: 'insight', 'stacked-bars': 'benchmark', histogram: 'benchmark', 'flow-arrows': 'workflow', flowchart: 'workflow', 'gift-box': 'advancement:gift', balloon: 'advancement:gift', 'heartbeat-line': 'healthcare:heartbeat', monitor: 'monitoring', screen: 'monitoring', dashboard: 'monitoring', infinity: 'feedback', loop: 'feedback', water: 'sustainability', droplet: 'sustainability', sun: 'sustainability', 'signal-bars': 'channel', wifi: 'channel', bluetooth: 'integration', cable: 'integration', router: 'network', 'data-flow': 'workflow', spreadsheet: 'data', table: 'data', folder: 'document', archive: 'document', graduation: 'higher-ed:cap', stethoscope2: 'healthcare:care', heartrate: 'healthcare:heartbeat', wallet2: 'cost', 'price-tag': 'retail:tag', warehouse2: 'retail:store',
};

function norm(s: string): string { return String(s || '').toLowerCase().trim().replace(/[\s_]+/g, '-'); }

export interface ResolveResult { id: string; by: 'exact' | 'alias' | 'tag' | 'concept' | 'industry-fallback' | 'default'; }
/** Resolve a taxonomy concept to a base glyph id. Chain: exact id > baseGlyph alias > baseGlyph
 *  tag-match > concept/synonym match > industry signature > 'insight'. Deterministic. */
/**
 * 2026-10-26 (live: org-model drew 0 of 3 icons for "Students / Advisors / Employers": no base carried the everyday
 * role nouns, so every audience fell to the generic default mark the content-true gate refuses). A short concept that
 * names a role or audience resolves to the glyph for that role. Order is priority.
 */
const ROLE_ICONS: Array<[RegExp, string]> = [
    [/\b(students?|learners?|first[- ]?years?|freshm[ae]n|undergraduates?|alumni)\b/, 'higher-ed:cap'],
    // "agents" is left out: in software decks it means AI agents (run 42: "Agents build on isolated branches" got an ID badge)
    [/\b(advisors?|advisers?|counsell?ors?|coach(?:es)?|mentors?|faculty|staff|employees?|caseworkers?)\b/, 'workforce:badge'],
    [/\b(employers?|compan(?:y|ies)|hiring managers?|recruiters?|businesses|organi[sz]ations?)\b/, 'workforce:org'],
    [/\b(partners?|vendors?|suppliers?)\b/, 'partnership'],
    [/\b(clients?|customers?|patients?|members?|buyers?|shoppers?)\b/, 'customer'],
    [/\b(teams?|squads?|pods?)\b/, 'team'],
    [/\b(users?|audiences?|stakeholders?|people|population)\b/, 'people'],
];
/** Tags that are homonyms in client language and never count as a concept match (2026-10-26 live: "Experiential
 *  Learning staff" and "one guided hub" resolved to the machine-learning "supervised" glyph). */
const CONCEPT_TAG_DENY: Record<string, string[]> = { supervised: ['learning', 'guided'] };

/**
 * 2026-10-27 (run 43: no card row in a 25-slide deck carried icons; "Diagnose", "Outcome pricing" and "Agents build in
 * isolated branches" fell to the default mark): the business acts and objects the content tags miss, each to the glyph
 * for that act. Stems match the inflections a card title uses (branches, ships, prioritize).
 */
const ACTION_ICONS: Array<[RegExp, string]> = [
    [/\b(diagnos\w*|assess\w*|audit\w*|baselin\w*|discover\w*|investigat\w*|research\w*)\b/, 'search'],
    [/\b(pric\w*|fees?|billing|bill(?:s|ed)?|invoic\w*|revenue|margins?|budget\w*|payroll)\b/, 'cost'],
    [/\b(weeks?|weekly|months?|monthly|quarters?|days?|faster|speed|deadlines?)\b/, 'time'],
    [/\b(ship(?:s|ped|ping)?|launch\w*|releas\w*|deliver\w*|go[- ]live)\b/, 'milestone'],
    // "senior" describes the actor, not the act (run 45: "Senior leads set rules" took the skill badge over governance)
    [/\b(expert\w*|know[- ]how|knowledge|judg(?:e)?ments?|skills?|craft)\b/, 'workforce:skill'],
    [/\b(build\w*|implement\w*|develop\w*|construct\w*|embed\w*)\b/, 'scale'],
    [/\b(review\w*|approv\w*|sign[- ]offs?|validat\w*|verif\w*|checks?|gat(?:e|es|ed|ing))\b/, 'compliance'],
    [/\b(outcomes?|results?)\b/, 'target'],
    [/\b(prioriti\w*|rank\w*)\b/, 'priority'],
    [/\b(expand\w*|grow\w*)\b/, 'growth'],
    [/\b(rules?|standards?|constraints?|guardrails?)\b/, 'governance'],
    [/\b(software|code|apps?|tools?|accelerators?)\b/, 'automation'],
    [/\b(branch\w*|isolat\w*|sandbox\w*)\b/, 'decision'],
    [/\b(design\w*|architect\w*|blueprints?|wireframes?)\b/, 'prototype'],
    [/\b(agenc(?:y|ies)|firms?|consultanc(?:y|ies))\b/, 'workforce:org'],
    [/\b(contracts?|sows?|agreements?|renewals?)\b/, 'contract'],
    [/\b(pipelines?|proposals?)\b/, 'funnel'],
];

/**
 * Every content-true base id a short card concept names, earliest mention first: role nouns, business acts, then the
 * content tags (plural and verb endings included). Never the default mark or an industry fallback, so an empty list
 * means the text names nothing a glyph can stand for. A row of sibling cards picks distinct ids from these lists.
 */
export function candidateBaseIds(concept: string, industry?: string): string[] {
    // the house brand's own name is the deck's subject on every card, never a glyph concept (run 45: "NXT Humans prices
    // and ships the outcome" took the human-handoff glyph)
    const words = norm(concept || '').replace(/-/g, ' ').replace(/\bnxt\s+humans\b|\bnxt\b/g, ' ');
    if (!words.trim()) return [];
    const found: Array<{ id: string; at: number; i: number }> = [];
    const add = (id: string, at: number) => { if (at >= 0 && ICONS[id]) found.push({ id, at, i: found.length }); };
    const first = (re: RegExp) => { const m = re.exec(words); return m ? m.index : -1; };
    // 2026-10-27 (run 44: "Clients get working software in weeks" took the customer glyph, "Agency methods ship as
    // software tools" the org chart): a card title's subject is usually an actor, its meaning the act or object, so role
    // nouns rank after every act and tag (a bare role name like "Students" still resolves to its role).
    const roles: Array<{ id: string; at: number }> = [];
    const roleIds = new Set(ROLE_ICONS.map(([, id]) => id));
    if (words.trim().split(/\s+/).length <= 7) for (const [re, id] of ROLE_ICONS) { const at = first(re); if (at >= 0 && ICONS[id]) roles.push({ id, at }); }
    for (const [re, id] of ACTION_ICONS) { const at = first(re); if (at >= 0 && roleIds.has(id)) { if (ICONS[id]) roles.push({ id, at }); } else add(id, at); }
    const tagAt = (t: string) => first(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es|d|ed|ing)?\\b`));
    // a tag under four letters ("get", "new") matches filler words; only known acronyms count at that length
    const SHORT_TAGS = new Set(['ai', 'ml', 'api', 'kpi', 'sla', 'etl', 'llm', 'crm', 'erp', 'roi', 'faq', 'sso', 'pii']);
    const byTags = (id: string, tags: string[]) => {
        const hits = tags.filter(t => !(CONCEPT_TAG_DENY[id] || []).includes(t) && (t.length >= 4 || SHORT_TAGS.has(t))).map(tagAt).filter(x => x >= 0);
        if (!hits.length) return;
        // an actor glyph matched through a content tag ("client") ranks with the roles
        if (roleIds.has(id)) roles.push({ id, at: Math.min(...hits) }); else add(id, Math.min(...hits));
    };
    for (const id of Object.keys(CONTENT_POOL)) byTags(id, CONTENT_POOL[id].tags);
    for (const id of industrySignatures(industry)) byTags(id, INDUSTRY[id].tags);
    const out: string[] = [];
    for (const f of found.sort((a, b) => a.at - b.at || a.i - b.i)) if (!out.includes(f.id)) out.push(f.id);
    for (const r of roles.sort((a, b) => a.at - b.at)) if (!out.includes(r.id)) out.push(r.id);
    return out;
}

export function resolveBaseId(o: { concept?: string; baseGlyph?: string; synonyms?: string[]; industry?: string }): ResolveResult {
    const bg = norm(o.baseGlyph || '');
    if (bg && ICONS[bg]) return { id: bg, by: 'exact' };
    if (bg && BASE_ALIAS[bg] && ICONS[BASE_ALIAS[bg]]) return { id: BASE_ALIAS[bg], by: 'alias' };
    // tag-match the baseGlyph noun against base tags
    if (bg) { for (const id of Object.keys(ICONS)) if (ICONS[id].tags.some((t) => t === bg)) return { id, by: 'tag' }; }
    // concept / synonyms keyword match
    const words = [norm(o.concept || '').replace(/-/g, ' '), ...(o.synonyms || []).map(norm)].join(' ');
    if (words.trim()) {
        // a name up to seven words ("Co-op advisors and Experiential Learning staff") is still a role name, not a sentence
        if (words.trim().split(/\s+/).length <= 7) {
            for (const [re, id] of ROLE_ICONS) if (re.test(words) && ICONS[id]) return { id, by: 'concept' };
        }
        const hit = (t: string) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(words);
        for (const id of Object.keys(CONTENT_POOL)) if (CONTENT_POOL[id].tags.filter(t => !(CONCEPT_TAG_DENY[id] || []).includes(t)).some(hit)) return { id, by: 'concept' };
        for (const id of industrySignatures(o.industry)) if (INDUSTRY[id].tags.some(hit)) return { id, by: 'concept' };
    }
    const sigs = industrySignatures(o.industry);
    if (sigs.length) return { id: sigs[0], by: 'industry-fallback' };
    return { id: 'insight', by: 'default' };
}

export interface CompositeOpts {
    concept?: string; baseGlyph?: string; synonyms?: string[]; industry?: string;
    brand?: BrandId | string | null; ground?: 'dark' | 'light'; role?: 'accent' | 'ink' | 'cool';
    size?: number; modifier?: boolean; // modifier=false suppresses the industry badge
}
export interface CompositeResult { svg: string; dataUri: string; baseId: string; resolvedBy: string; modifierId: string | null; }
/** Render a composed icon for a (concept, industry): base glyph + optional small industry badge in
 *  the lower-right. Token-pure (colours from the brand mirror). The modifier badge differentiates the
 *  same base across industries; suppressed for universal concepts (no industry). */
export function compositeIcon(o: CompositeOpts): CompositeResult {
    const size = o.size || 96;
    const { id, by } = resolveBaseId(o);
    const color = iconTokenColor(o.brand, o.role || 'accent', o.ground || 'dark');
    const sw = Math.max(1.3, 24 / 24 * 1.5);
    let body = `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[id].draw(color)}</g>`;
    // industry modifier badge (lower-right), in the cool token so it reads as a secondary mark
    let modifierId: string | null = null;
    const wantMod = o.modifier !== false && !!o.industry;
    if (wantMod) {
        const sig = industrySignatures(o.industry)[0];
        if (sig && sig !== id) {
            modifierId = sig;
            const badge = iconTokenColor(o.brand, 'cool', o.ground || 'dark');
            // disc background = the slide ground, token-sourced (paper on light / rail on dark), never hardcoded
            const gb = getBrand(o.brand) as any;
            const H = (v: string) => (v && v[0] === '#') ? v : `#${v}`;
            const discBg = (o.ground === 'light') ? H(gb.WHITE) : H(gb.RAIL);
            // badge sits in a small disc at (18,18) within the 24 grid; scale the sig to ~0.34
            body += `<circle cx="18.5" cy="18.5" r="6" fill="${discBg}" stroke="${badge}" stroke-width="0.8"/>`;
            body += `<g transform="translate(13.3 13.3) scale(0.43)"><g fill="none" stroke="${badge}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[sig].draw(badge)}</g></g>`;
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-hidden="true">${body}</svg>`;
    return { svg, dataUri: iconToDataUri(svg), baseId: id, resolvedBy: by, modifierId };
}

/** A composed glyph is CONTENT-TRUE (worth painting) only when the concept resolved to a real base
 *  via exact / alias / tag / concept. 'industry-fallback' and 'default' produce a generic or
 *  REPEATED mark (e.g. the same 'insight' star on every row) that reads as meaningless decoration -
 *  never paint those. Callers gate every per-element / hub glyph on this: content-true or nothing. */
export function isContentTrueIcon(resolvedBy: string): boolean {
    return resolvedBy === 'exact' || resolvedBy === 'alias' || resolvedBy === 'tag' || resolvedBy === 'concept';
}

export interface IconCatalogEntry { id: string; tags: string[]; industry?: string; }
/** The full catalog (for the manifest + the runtime prompt: the model references an id, never a hex
 *  or raw SVG). Optionally filtered to universal content + one industry's signatures. */
export function iconCatalog(industry?: string): IconCatalogEntry[] {
    const norm = normIndustry(industry);
    const out: IconCatalogEntry[] = [];
    for (const id of Object.keys(CONTENT_POOL)) out.push({ id, tags: CONTENT_POOL[id].tags });
    for (const id of Object.keys(INDUSTRY)) {
        if (!norm || INDUSTRY[id].industry === norm) out.push({ id, tags: INDUSTRY[id].tags, industry: INDUSTRY[id].industry });
    }
    return out;
}

/** Compact text block the runtime prompt injects so the model picks an icon by TOKENIZED id
 *  (icon:<id>), never by emitting a hex or SVG. */
export function iconsForPrompt(industry?: string): string {
    const cat = iconCatalog(industry);
    const content = cat.filter((e) => !e.industry).map((e) => e.id).join(', ');
    const ind = cat.filter((e) => e.industry).map((e) => e.id).join(', ');
    const lines = [
        'AVAILABLE ICONS (reference by id as icon:<id> in an image slot; colour is resolved from brand tokens at render, never specify a colour):',
        `  universal: ${content}`,
    ];
    if (ind) lines.push(`  ${normIndustry(industry)}: ${ind}`);
    return lines.join('\n');
}
