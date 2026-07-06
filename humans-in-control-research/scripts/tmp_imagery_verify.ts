// @ts-nocheck
// 2026-07-03 slides-imagery uplift e2e: fills the four photographic slots through the REAL
// resolver path (visualRouter -> artifactIllustrator -> /api/ai/illustration photo styles),
// renders stage HTML for each archetype, and writes them for the PPTX export step.
// Slide set: agri (the live engagement's subject) + ONE healthcare cover proving the pipeline
// generalizes to whatever content comes back - nothing below is hardcoded into the system.
import { slideDataToStageHtml } from '../services/slideToStageHtml';
import { resolveRoutedSlotImages } from '../services/visualRouter';
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2];
const log = (m) => console.log('[fill]', m);

const cover = { id: 'c', template: 'slides:cover', brand: 'nxt', title: 'Farm Risk Ready becomes a proactive planning companion', composerPayload: {
    title: 'Farm Risk Ready becomes a proactive planning companion',
    subtitle: 'Turning a static farm-planning worksheet into an ongoing, AI-guided readiness aid' } };

const coverGeneral = { id: 'cg', template: 'slides:cover', brand: 'nxt', title: 'AI triage reshapes the 2026 emergency department', composerPayload: {
    title: 'AI triage reshapes the 2026 emergency department',
    subtitle: 'Hospital systems move intake decisions from the waiting room to the algorithm' } };

const agenda = { id: 'a', template: 'slides:agenda', brand: 'nxt', title: 'What we cover', composerPayload: {
    title: 'What we cover', groups: [
        { label: 'THE STRUGGLE', items: ['01: Market conditions and risk factors in 2026', '02: Different concerns across grower segments', '03: Barriers to adopting new planning tools'] },
        { label: 'THE RESPONSE', items: ['04: An AI-powered planning companion', '05: AI features and farmer benefits', '06: A phased roadmap'] }] } };

const themes = { id: 't', template: 'slides:numbered-themes', brand: 'nxt', title: 'Four grower segments need different readiness support', composerPayload: {
    kicker: '2026 FARMER PERSONAS', title: 'Four grower segments need different readiness support',
    items: [
        { number: '01', name: 'The Capitalized Scaler', body: 'Large operator who pre-secures inputs across seasons and adopts technology early.', quote: '"We are putting it in the fields now."' },
        { number: '02', name: 'The Squeezed Survivor', body: 'Credit-constrained grower merely surviving the season who cannot justify new investment.', quote: '"Cannot justify additional investment."' },
        { number: '03', name: 'The Part-Time Operator', body: 'Off-farm-employed farmer for whom time, not capital, is the binding constraint.', quote: '"Time pressure is the key challenge."' },
        { number: '04', name: 'The Next-Gen Successor', body: 'Younger farmer, digitally fluent but skeptical of tools that do not prove field value.', quote: '"Show me the field value first."' }] } };

const role = { id: 'r', template: 'slides:role-needs', brand: 'nxt', title: 'Field advisors need one live risk picture per operation', composerPayload: {
    eyebrow: 'ADVISORY · FIELD ADVISORS', title: 'Field advisors need one live risk picture per operation',
    challenges: [
        { numeral: '01', heading: 'Plans go stale between annual reviews', body: 'The worksheet is completed once and never reopened until renewal.' },
        { numeral: '02', heading: 'No shared view with the grower', body: 'Advisor notes and grower priorities live in separate systems.' },
        { numeral: '03', heading: 'Weather shifts outpace the paperwork', body: 'A single storm re-orders every priority the plan encoded.' }],
    persona: { needsLabel: 'PERSONA NEEDS', name: 'The Field Advisor', needs: [
        { kind: 'EXPERIENCE', body: 'Walk in with the operation risk picture already current' },
        { kind: 'FUNCTIONAL', body: 'Alerts when a scored hazard changes before the visit' },
        { kind: 'PERSONAL', body: 'Be the person who caught it early, not the one who missed it' }] } } };

const slides = [cover, coverGeneral, agenda, themes, role];
for (const s of [cover, coverGeneral, themes, role]) {
    const r = await resolveRoutedSlotImages(s.template, s.composerPayload, 'nxt', 'dark', { onLog: log });
    console.log(s.id, '->', r.branch, 'count:', r.count);
}
// agenda continues the cover scene (the seam rule)
agenda.composerPayload.backgroundImage = cover.composerPayload.backgroundImage || '';
console.log('agenda background inherited:', !!agenda.composerPayload.backgroundImage);

slides.forEach((s, i) => writeFileSync(`${OUT}/img_stage${i + 1}.html`, slideDataToStageHtml(s), 'utf-8'));
console.log('WROTE', slides.length, 'stages; img tags:', slides.map(s => (slideDataToStageHtml(s).match(/<img/g) || []).length).join(','));
