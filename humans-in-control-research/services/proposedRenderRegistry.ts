/**
 * proposedRenderRegistry.ts (2026-07-08 critique-rigor P0-c2)
 *
 * The runtime MIRROR of the PROPOSED-RENDER REGISTRY: the design-time Figma MCP
 * harvest of the proto/* component pages (403:2..465:x in iSQhAVM7SI4QHAWB7y9C2z),
 * one entry per renderable pattern, with the node id, the content-slot contract, and
 * a use-when line. The proxy twin is proxy/proto_partials.py::REGISTRY (the actual
 * token-bound partial renderers); the wiki twin is the "PROPOSED-RENDER REGISTRY"
 * section of wiki/brand/figma-node-map.md (manifest-chunked, the model's grounding
 * path). Lifecycle identical to figma-tokens.json: re-harvest on library change;
 * the SPA NEVER calls Figma at runtime.
 *
 * MANIFEST-DRIVEN COMPONENT IDENTIFICATION (owner instruction 2026-07-08): the
 * model does not pick from a static prompt dump. shortlistForInventory() derives a
 * deterministic shape-based shortlist from the screen's contentInventory (stat
 * values -> kpi-row; source attributions -> cite; form fields -> form; ...) and only
 * the matched entries are injected - mirroring #proto Stage 3.5 catalog injection.
 */

import type { ScreenInventoryItem } from '../types';

export interface RegistryEntry {
    pattern: string;
    node: string;
    use: string;
    /** Content-slot contract the model binds real inventory into. */
    slots: string;
}

export const PROPOSED_RENDER_REGISTRY: RegistryEntry[] = [
    { pattern: 'nav-bar',    node: '440:2',  use: 'top navigation: brand + links + primary action', slots: 'label=brand, items=link labels, cta=primary action label' },
    { pattern: 'breadcrumb', node: '441:2',  use: 'location trail on deep pages', slots: 'items=trail segments (last = current page)' },
    { pattern: 'tabs',       node: '441:8',  use: 'peer-view switching within a page', slots: 'items=tab labels (first active)' },
    { pattern: 'bottom-nav', node: '442:19', use: 'mobile primary navigation', slots: 'items=destination labels' },
    { pattern: 'footer',     node: '444:2',  use: 'site footer: link columns + legal', slots: 'label=legal line, items=column headings' },
    { pattern: 'mega-menu',  node: '444:26', use: 'large catalog navigation', slots: 'items=category headings' },
    { pattern: 'hero',       node: '465:57', use: 'page opener: headline + sub + CTAs', slots: 'label=headline, items=[subline, primary CTA, secondary CTA]' },
    { pattern: 'kpi-row',    node: '454:39', use: 'metric tiles; BINDS real stat values', slots: 'items=metric captions, values=THE REAL NUMBERS, subs=context lines' },
    { pattern: 'card-grid',  node: '454:27', use: 'browsable item cards', slots: 'label=section heading, items=card titles' },
    { pattern: 'list',       node: '454:2',  use: 'stacked records with meta', slots: 'label=section heading, items=row texts' },
    { pattern: 'table',      node: '454:2',  use: 'columnar data; BINDS real cell values', slots: 'label=heading, items=row labels, values=row values' },
    { pattern: 'form',       node: '448:25', use: 'signup/intake with labeled fields + submit', slots: 'label=form heading, items=field labels, cta=submit label' },
    { pattern: 'field',      node: '448:2',  use: 'standalone labeled inputs', slots: 'items=field labels' },
    { pattern: 'stepper',    node: '441:36', use: 'multi-step progress', slots: 'items=step labels' },
    { pattern: 'cta-row',    node: '462:21', use: 'primary + secondary actions with real labels', slots: 'items=[primary label, secondary label]' },
    { pattern: 'alert',      node: '450:6',  use: 'inline status/notice band', slots: 'label=notice text' },
    { pattern: 'cite',       node: '408:2',  use: 'claims with numbered verifiable sources; BINDS attributions', slots: 'items=source names, values=work titles' },
    { pattern: 'accordion',  node: '455:2',  use: 'FAQ / disclosure list', slots: 'items=question texts' },
    { pattern: 'chart-bar',  node: '460:2',  use: 'categorical comparison chart', slots: 'label=chart title, items=category labels' },
    { pattern: 'chart-line', node: '460:11', use: 'trend over time chart', slots: 'label=chart title' },
    { pattern: 'search',     node: '462:34', use: 'search / command entry', slots: 'label=placeholder text' },
    { pattern: 'pricing',    node: '465:20', use: 'plan comparison with real prices', slots: 'items=plan names, values=THE REAL PRICES' },
    // 2026-07-08 harvest extension (full #proto library coverage)
    { pattern: 'sidebar',      node: '442:2',  use: 'left vertical primary navigation rail (app/dashboard screens; counts as navigation)', slots: 'label=product name, items=destination labels (first active)' },
    { pattern: 'feature-grid', node: '465:65', use: 'feature/benefit cells with accent glyphs', slots: 'label=heading, items=feature names, subs=one-line descriptions' },
    { pattern: 'testimonial',  node: '467:16', use: 'customer quote with attributed speaker', slots: 'label=the verbatim quote, items=[speaker name, role]' },
    { pattern: 'bento',        node: '467:2',  use: 'mixed-size highlight tile grid', slots: 'label=heading, items=tile titles (max 5), subs=tile support lines' },
    { pattern: 'timeline',     node: '455:34', use: 'ordered events/milestones', slots: 'label=heading, items=event titles, values=dates/times' },
    { pattern: 'kanban',       node: '456:2',  use: 'workflow board columns', slots: 'items=column titles, subs=pipe-separated card titles per column' },
    { pattern: 'logo-cloud',   node: '467:24', use: 'partner/customer wordmark band', slots: 'label=caption, items=partner names' },
    { pattern: 'tree',         node: '455:17', use: 'hierarchy/folder tree', slots: 'items=node labels (prefix > per depth level)' },
    { pattern: 'empty',        node: '450:44', use: 'empty state with guidance and action', slots: 'label=title, items=[guidance line], cta=action label' },
    { pattern: 'product',      node: '465:2',  use: 'product card; BINDS real price', slots: 'label=product name, items=[,category], values=[THE REAL PRICE], cta=action' },
    { pattern: 'profile',      node: '466:78', use: 'member/profile header; BINDS real stats', slots: 'label=name, items=[handle/role], values=stat numbers, subs=stat captions, cta=action' },
    { pattern: 'toast',        node: '450:2',  use: 'transient confirmation pill', slots: 'label=confirmation message' },
    { pattern: 'notif-list',   node: '450:51', use: 'notification rows with unread dots', slots: 'label=heading, items=notification titles, values=relative times' },
];

export const KNOWN_PATTERN_NAMES: Set<string> = new Set(PROPOSED_RENDER_REGISTRY.map(e => e.pattern));

const byName = new Map(PROPOSED_RENDER_REGISTRY.map(e => [e.pattern, e]));

/**
 * Deterministic shape-based shortlist: inventory kinds -> matching registry entries.
 * The model confirms and binds second; it never sees unmatched entries. Nav + footer
 * + hero + cta-row ride along for any page-type screen (P0-d: page proposals MUST
 * carry a nav pattern; every screen needs a stated-state primary action).
 */
export function shortlistForInventory(
    inventory: ScreenInventoryItem[] | undefined,
    opts?: { multiScreen?: boolean; appShell?: boolean },
): RegistryEntry[] {
    const picked = new Set<string>(['nav-bar', 'hero', 'cta-row', 'footer']);
    if (opts?.multiScreen) picked.add('tabs');
    if (opts?.appShell) { picked.add('sidebar'); picked.add('notif-list'); picked.add('timeline'); }
    const items = inventory || [];
    const values = items.filter(i => i.kind === 'value');
    const headings = items.filter(i => i.kind === 'heading');
    const actions = items.filter(i => i.kind === 'action');
    const texts = items.filter(i => i.kind === 'text');
    if (values.length) { picked.add('kpi-row'); picked.add('cite'); }
    if (values.length >= 4) { picked.add('table'); picked.add('chart-bar'); }
    if (values.some(v => /\$|price|\/mo|per month|plan/i.test(v.text))) picked.add('pricing');
    if (headings.length >= 4) { picked.add('card-grid'); picked.add('list'); }
    if (texts.length >= 3) { picked.add('list'); picked.add('accordion'); }
    if (texts.some(t => /\?$/.test(t.text.trim()))) picked.add('accordion');
    if (actions.some(a => /search|find|look up/i.test(a.text))) picked.add('search');
    if (actions.some(a => /submit|sign up|register|subscribe|email|contact/i.test(a.text)) ||
        texts.some(t => /email|name|phone|address/i.test(t.text))) { picked.add('form'); }
    if (actions.length >= 6) picked.add('mega-menu');
    if (!items.length) {
        // No inventory (upload before the vision pass): the full registry is the
        // shortlist - still mirror-derived, never a hand-typed prompt list.
        return [...PROPOSED_RENDER_REGISTRY];
    }
    return [...picked].map(p => byName.get(p)!).filter(Boolean);
}

/** Render registry entries as the catalog block injected into the analysis prompt. */
export function registryPromptBlock(entries: RegistryEntry[]): string {
    return entries.map(e => `- ${e.pattern} (Figma ${e.node}): ${e.use}. Slots: ${e.slots}`).join('\n');
}
