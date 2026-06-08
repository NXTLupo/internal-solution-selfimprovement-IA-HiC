// services/researchPlanRenderer.ts
// Renders a ResearchPlan (from researchPlanner.buildResearchPlan) into a
// brand-styled, read-only 1920×1080 HTML artifact for the FreeformViewer.
// Edits happen at the chat layer - user iterates by typing "remove Q3, raise
// budget to 10" and the planner regenerates. A first-class form editor with
// drag/edit semantics lands in a follow-up that lives outside the iframe.
//
// 2026-05-24 - Phase 5 of plans/hic-notebooklm-uplift-plan-2026-05-24.md

import type { ResearchPlan } from './researchPlanner';

type Brand = 'nxt' | 'nu';

function escapeHtml(s: string): string {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const ANGLE_COLORS: Record<string, string> = {
    definition: '#00B7C3',
    mechanism: '#B8B800',
    evidence: '#0CCE6B',
    counter_evidence: '#CC6644',
    second_order: '#9B59B6',
    named_entities: '#F39C12',
};

const NXT_RP_STYLE = `
  html, body { width: 1920px; min-height: 1080px; background: #0D0D0D; color: #E8E8E8; }
  body { font-family: 'Archivo', sans-serif; }
  .rp-frame { width: 1920px; padding: 56px 80px; }
  .rp-kicker { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .rp-title { font-family: 'Bebas Neue', sans-serif; font-size: 44px; line-height: 1; color: #FFFFFF; margin-bottom: 6px; }
  .rp-goal { font-size: 16px; color: #B8B800; max-width: 1500px; margin-bottom: 24px; line-height: 1.45; }
  .rp-rail { width: 56px; height: 4px; background: #B8B800; margin-bottom: 24px; }
  .rp-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 36px; }
  .rp-section-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 12px; }
  .rp-sq { margin-bottom: 14px; padding: 12px 16px; background: #141414; border-left: 3px solid #00B7C3; }
  .rp-sq.priority-high { border-left-color: #B8B800; }
  .rp-sq.priority-low { border-left-color: #444; }
  .rp-sq-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
  .rp-sq-id { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; color: #888; }
  .rp-sq-prio { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; padding: 2px 6px; border-radius: 1px; }
  .rp-sq-prio.high { background: #B8B800; color: #0D0D0D; }
  .rp-sq-prio.medium { background: #333; color: #B8B800; }
  .rp-sq-prio.low { background: #1A1A1A; color: #666; }
  .rp-sq-q { font-size: 14px; line-height: 1.45; color: #E8E8E8; margin-bottom: 6px; }
  .rp-sq-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .rp-tag { display: inline-block; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.8px; background: #1F1F1F; color: #00B7C3; border-radius: 1px; }
  .rp-tag.angle { color: #B8B800; }
  .rp-tag.entity { color: #CC6644; }
  .rp-budget-card { padding: 22px; background: #141414; border: 1px solid #222; margin-bottom: 20px; }
  .rp-budget-stat { margin-bottom: 14px; }
  .rp-budget-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .rp-budget-value { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #B8B800; line-height: 1; }
  .rp-source-list { font-family: 'JetBrains Mono', monospace; font-size: 10px; line-height: 1.7; color: #C8C8C8; }
  .rp-source-list li { margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #222; }
  .rp-source-list b { color: #00B7C3; }
  .rp-help { margin-top: 28px; padding: 16px 20px; background: rgba(184, 184, 0, 0.07); border-left: 3px solid #B8B800; font-size: 12px; line-height: 1.55; color: #C8C8C8; }
  .rp-help b { color: #B8B800; }
`;

const NU_RP_STYLE = `
  html, body { width: 1920px; min-height: 1080px; background: #FFFFFF; color: #1A1A1A; }
  body { font-family: 'Open Sans', sans-serif; }
  .rp-frame { width: 1920px; padding: 56px 80px; }
  .rp-kicker { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .rp-title { font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 44px; line-height: 1; color: #0D0D0D; margin-bottom: 6px; }
  .rp-goal { font-size: 16px; color: #C8102E; max-width: 1500px; margin-bottom: 24px; line-height: 1.45; }
  .rp-rail { width: 56px; height: 4px; background: #C8102E; margin-bottom: 24px; }
  .rp-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 36px; }
  .rp-section-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 12px; }
  .rp-sq { margin-bottom: 14px; padding: 12px 16px; background: #F8F8F4; border-left: 3px solid #0091B6; }
  .rp-sq.priority-high { border-left-color: #C8102E; }
  .rp-sq.priority-low { border-left-color: #DDD; }
  .rp-sq-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
  .rp-sq-id { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; color: #888; }
  .rp-sq-prio { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; padding: 2px 6px; border-radius: 1px; }
  .rp-sq-prio.high { background: #C8102E; color: #FFFFFF; }
  .rp-sq-prio.medium { background: #FFFFFF; color: #C8102E; border: 1px solid #C8102E; }
  .rp-sq-prio.low { background: #EFEFEF; color: #888; }
  .rp-sq-q { font-size: 14px; line-height: 1.45; color: #1A1A1A; margin-bottom: 6px; }
  .rp-sq-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .rp-tag { display: inline-block; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.8px; background: #FFFFFF; color: #0091B6; border: 1px solid #E0E0E0; border-radius: 1px; }
  .rp-tag.angle { color: #C8102E; }
  .rp-tag.entity { color: #555; }
  .rp-budget-card { padding: 22px; background: #F8F8F4; border: 1px solid #E0E0E0; margin-bottom: 20px; }
  .rp-budget-stat { margin-bottom: 14px; }
  .rp-budget-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .rp-budget-value { font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 28px; color: #C8102E; line-height: 1; }
  .rp-source-list { font-family: 'JetBrains Mono', monospace; font-size: 10px; line-height: 1.7; color: #333; }
  .rp-source-list li { margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #E0E0E0; }
  .rp-source-list b { color: #0091B6; }
  .rp-help { margin-top: 28px; padding: 16px 20px; background: rgba(200, 16, 46, 0.06); border-left: 3px solid #C8102E; font-size: 12px; line-height: 1.55; color: #333; }
  .rp-help b { color: #C8102E; }
`;

export interface ResearchPlanRenderInput {
    plan: ResearchPlan;
    brand: Brand;
}

export function renderResearchPlanHtml(input: ResearchPlanRenderInput): string {
    const css = input.brand === 'nu' ? NU_RP_STYLE : NXT_RP_STYLE;

    const sqHtml = input.plan.sub_questions.map(sq => {
        const angleColor = ANGLE_COLORS[sq.angle] || '#888';
        const entityTags = sq.expected_named_entities.slice(0, 4).map(e =>
            `<span class="rp-tag entity">${escapeHtml(e)}</span>`
        ).join('');
        const typeTags = sq.expected_evidence_types.slice(0, 4).map(t =>
            `<span class="rp-tag">${escapeHtml(t)}</span>`
        ).join('');
        return `
        <div class="rp-sq priority-${escapeHtml(sq.priority)}">
          <div class="rp-sq-head">
            <span class="rp-sq-id">${escapeHtml(sq.id)} · <span style="color:${angleColor}">${escapeHtml(sq.angle)}</span></span>
            <span class="rp-sq-prio ${escapeHtml(sq.priority)}">${escapeHtml(sq.priority)}</span>
          </div>
          <div class="rp-sq-q">${escapeHtml(sq.question)}</div>
          <div class="rp-sq-tags">
            <span class="rp-tag angle">${escapeHtml(sq.angle)}</span>
            ${typeTags}
            ${entityTags}
          </div>
        </div>`;
    }).join('');

    const sourceHtml = input.plan.source_strategy.slice(0, 14).map(s => `
        <li><b>${escapeHtml(s.source_id)}</b> → ${escapeHtml(s.sub_question_ids.join(', '))} · ~${s.expected_yield} items<br/><span style="color:#888">${escapeHtml(s.rationale)}</span></li>
    `).join('');

    const institutionsHtml = input.plan.named_institutions.length > 0
        ? input.plan.named_institutions.slice(0, 8).map(i => `<span class="rp-tag entity" style="margin-right:6px;">${escapeHtml(i)}</span>`).join('')
        : '<span style="color:#666;">(none specified)</span>';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Research Plan · ${escapeHtml(input.plan.goal)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ${css}
</style>
</head>
<body>
<div class="rp-frame">
  <div class="rp-kicker">HiC Deep Research · Plan v${input.plan.plan_version} · ${escapeHtml(input.brand.toUpperCase())}</div>
  <h1 class="rp-title">Research Plan</h1>
  <div class="rp-goal">${escapeHtml(input.plan.goal)}</div>
  <div class="rp-rail"></div>
  <div class="rp-grid">
    <div>
      <div class="rp-section-label">Sub-Questions (${input.plan.sub_questions.length})</div>
      ${sqHtml}
    </div>
    <div>
      <div class="rp-budget-card">
        <div class="rp-budget-stat">
          <div class="rp-budget-label">Budget cap</div>
          <div class="rp-budget-value">$${input.plan.budget_usd.toFixed(2)}</div>
        </div>
        <div class="rp-budget-stat">
          <div class="rp-budget-label">Target theme count</div>
          <div class="rp-budget-value">${input.plan.expected_themes_count}</div>
        </div>
        <div class="rp-budget-stat">
          <div class="rp-budget-label">Reflection threshold</div>
          <div class="rp-budget-value">${Math.round(input.plan.reflection_threshold * 100)}%</div>
        </div>
        <div class="rp-budget-stat">
          <div class="rp-budget-label">Max iterations</div>
          <div class="rp-budget-value">${input.plan.max_iterations}</div>
        </div>
      </div>
      <div class="rp-section-label">Named institutions</div>
      <div style="margin-bottom: 20px;">${institutionsHtml}</div>
      <div class="rp-section-label">Source strategy</div>
      <ul class="rp-source-list">${sourceHtml}</ul>
    </div>
  </div>
  <div class="rp-help">
    <b>You are in control.</b> This plan steers the next collection run. To edit: reply in chat with what to change - "remove Q3", "raise budget to 10", "add MIT to named institutions". The planner will emit a new plan. When you're satisfied, say <b>"approve plan"</b> and the reflector loop runs against the approved version.
  </div>
</div>
</body>
</html>`;
}
