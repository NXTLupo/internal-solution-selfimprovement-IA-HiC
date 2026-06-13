/** In-transcript end-to-end verification of the SLIDE-SYSTEM VARIANTS wiring
 *  (goal: #slide/#slides can use the new slides-page patterns).
 *
 *  Exercises the REAL pipeline the analyst desk uses after the model replies:
 *  variant slide payloads (exactly the shapes the corpusChatService contract
 *  at line ~1371 instructs the model to emit) -> paginateSlides (the parse-
 *  time decomposition step) -> slideDataToStageHtml (the export stage twin).
 *  Stages land in D:/tmp/variant-stages for the live proxy export + audit.
 */
import { paginateSlides } from '../../services/slidePaginator';
import { slideDataToStageHtml } from '../../services/slideToStageHtml';
import { writeFileSync, mkdirSync } from 'fs';

const VARIANT_SLIDES: any[] = [
    // 1. section-divider variant:"thesis" (Figma: thesis-interstitial NU/NXT)
    { template: 'section-divider', brand: 'nu',
      title: 'These challenges are familiar and persistent.',
      sectionDivider: { variant: 'thesis', title: 'These challenges are familiar and persistent.' } },
    // 2. principles variant:"diptych" (Figma: problem-diptych)
    { template: 'principles', brand: 'nu',
      title: 'Two fundamental challenges stand in the way of the 2028 campaign vision',
      principles: { variant: 'diptych', items: [
        { name: 'Becoming Value Focused', description: 'Aligning teams to value based outcomes reflects the practices of leading organizations, enabling each to uniquely apply technology to hone and optimize results.' },
        { name: 'Stopping The Leak', description: 'The disconnect between lifecycle stages from student to co-op to alumni to donor forces re-acquisition; intelligent interaction across the journey shifts the work to retention.' },
      ] } },
    // 3. competitive-matrix rowsProse two-tier evidence table (Figma: evidence-table)
    { template: 'competitive-matrix', brand: 'nu',
      title: 'Peers are measuring more than dollars raised',
      sources: ['CASE Alumni Engagement framework', 'Duke MADE FOR THIS campaign'],
      matrix: { columns: [], rows: [], patternLine: 'The differentiator is shared engagement measures, donor intelligence, campaign dashboards, and operating cadence.',
        rowsProse: [
          { name: 'Stanford', prove: 'Engagement scoring turns interaction data into action.', implication: 'Build an engagement score spanning philanthropic, volunteer, experiential, communications, career, and stewardship signals.', evidenceTag: 'OFFICIAL / CASE', tier: 'top' },
          { name: 'Duke', prove: 'Major campaigns now carry engagement goals, not only dollar goals.', implication: 'Track engagement health, volunteer activation, and relationship depth alongside dollars in the campaign control tower.', evidenceTag: 'OFFICIAL', tier: 'top' },
          { name: 'Vanderbilt', prove: 'Advancement growth is an operating-model build; data, dashboards, alignment.', implication: 'Frame campaign readiness as scaled operating capacity, not just a pipeline exercise.', evidenceTag: 'CONFERENCE', tier: 'second' },
          { name: 'U. Michigan (AAUM)', prove: 'Engagement scoring and journeys improve retention and acquisition efficiency.', implication: 'High relevance for annual giving, young-alumni, and retention-journey strategy.', evidenceTag: 'VENDOR CASE', tier: 'second' },
        ] } },
    // 4. recommendation impactCards (Figma: role-recommendation G2)
    { template: 'recommendation', brand: 'nu',
      title: 'Deploy AI-powered tools that enable intelligent relationship insights',
      sources: ['NXT Stakeholder Interview'],
      recommendation: {
        actionTitle: 'Deploy AI-powered tools that enable intelligent relationship insights.',
        rationale: 'Build self service tooling that supports fundraising leaders to independently manage prospects, support important constituents, and grow relationships.',
        supportingActions: [
          { name: 'Synthetic pool construction', description: 'Enrich constituent records with third-party data to build behavioral profiles for each major donor segment.' },
          { name: 'Campaign simulation', description: 'Run proposed appeals against the synthetic pool before launch; test message framing, ask amounts, and channel mix.' },
          { name: 'Prompt library for frontline staff', description: 'Curate advancement-specific AI prompts for contact report drafting, portfolio development, and stewardship communications.' },
        ],
        impactCards: [
          { label: 'REVENUE', headline: 'Lower acquisition cost', body: 'Self service tools enable research and proactive monitoring of prospects.' },
          { label: 'C-SAT', headline: 'Greater touch at key moments', body: 'Proactive intelligence reaches those who matter at the moments that matter.' },
          { label: 'SERVICE NEEDS', headline: 'Two service families', body: 'Relationship services: VIP support, research. Operational services: reporting, one constituent view.' },
        ] } },
    // 5. timeline role-grid aggregate roadmap (Figma: aggregate-roadmap)
    { template: 'timeline', brand: 'nu',
      title: 'One roadmap, three roles; data trust is fixed first',
      sources: ['NXT Stakeholder Interview'],
      timeline: {
        phases: [{ name: 'Foundation' }, { name: 'Engage' }, { name: 'Optimize' }, { name: 'Launch' }],
        rows: [
          { role: 'Gardeners', cells: ['Prospect research AI', 'Wealth screening with depth', 'Gift officer dashboards', 'Personalized outreach'] },
          { role: 'Farmers', cells: ['Interest-based segmentation', 'Alumni service AI', 'Network activation', 'Engage-to-give ROI'] },
          { role: 'Operators', cells: ['CRM data integrity', 'Parent-student linkage', 'Frontline analytics', 'Unified data governance'] },
        ] } },
];

mkdirSync('D:/tmp/variant-stages', { recursive: true });
// The REAL parse-time step the chat panel runs on every #slides reply:
const paged = paginateSlides(VARIANT_SLIDES as any);
console.log(`paginateSlides: ${VARIANT_SLIDES.length} -> ${paged.length} slides`);

// Assert each variant routes to its variant DOM, not the base layout.
// Variant DOM anatomies as actually emitted by slideToStageHtml.ts:
// thesis interstitial .thesis / diptych .dpname+.dpbody / evidence-table
// .etband+.etbar / role-block impact cards .rbc / aggregate grid .aggrid+.agrole
const MARKERS: Array<[string, RegExp]> = [
    ['thesis', /class="thesis"/],
    ['diptych', /class="dpname"/],
    ['rowsProse', /class="etband"/],
    ['impactCards', /class="rbc"/],
    ['role-grid', /class="aggrid"/],
];
let pass = 0;
const fails: string[] = [];
paged.forEach((s: any, i: number) => {
    const html = slideDataToStageHtml(s);
    const fname = `variant-${i + 1}-${s.template}.html`;
    writeFileSync(`D:/tmp/variant-stages/${fname}`, html);
    const [label, marker] = MARKERS[i] || ['?', /x^/];
    const hit = marker.test(html);
    console.log(`  slide ${i + 1} ${s.template.padEnd(20)} variant=${label.padEnd(12)} marker ${hit ? 'FOUND' : 'MISSING'}`);
    if (hit) pass++; else fails.push(`${s.template}/${label}`);
});
console.log(fails.length === 0
    ? `ALL ${pass}/${paged.length} VARIANTS ROUTED to their slide-system layouts`
    : `FAILURES: ${fails.join(', ')}`);
