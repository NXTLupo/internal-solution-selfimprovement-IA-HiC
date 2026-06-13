/** W0 proof: a 10-phase journey (the user's canonical unbounded-density case)
 *  through paginateSlides -> slideDataToStageHtml. Pages land in all-stages/
 *  so the overflow audit + export assertions cover them. */
import { paginateSlides } from '../../services/slidePaginator';
import { slideDataToStageHtml } from '../../services/slideToStageHtml';
import { writeFileSync } from 'fs';

const P = (i: number) => `Phase ${i}`;
const slide: any = {
    id: 'jm10', template: 'journey-map', brand: 'nu', density: 'dense',
    title: 'Ten journey phases expose where the relationship changes hands without the data following it',
    sources: ['Customer Interviews', 'Process Observation', 'Operations Review'],
    journeyMap: {
        journeyType: 'full lifecycle · current state',
        scope: 'End-to-end relationship', actors: 'Customer · Frontline · Operations', phasesLabel: 'Ten, awareness to advocacy',
        stages: [
            { name: 'Awareness' }, { name: 'Evaluation' }, { name: 'Purchase', critical: true }, { name: 'Onboarding' }, { name: 'First use' },
            { name: 'Routine use' }, { name: 'First failure', critical: true }, { name: 'Recovery' }, { name: 'Renewal' }, { name: 'Advocacy' },
        ],
        lanes: [
            { actor: 'Customer', role: 'end user', cells: [
                'Hears about the service from a peer', 'Compares options against the incumbent', 'Signs after a references call', 'Works through guided setup', 'Completes the first real task',
                'Builds the service into the weekly routine', 'Hits the failure mid-task and looks for acknowledgement', 'Receives the fix and retries', 'Weighs the relationship at renewal', 'Refers a peer or quietly does not',
            ]},
            { actor: 'Frontline team', role: 'owns the moments', cells: [
                'not engaged', 'Answers evaluation questions', 'Hands off to onboarding', 'Runs the setup sessions', 'Monitors first-task completion',
                'not engaged', 'Receives the misrouted ticket', 'Resolves and closes the case', 'Runs the renewal conversation', 'Asks for the reference',
            ]},
            { actor: 'Operations', role: 'owns the record', cells: [
                'Logs the lead source', 'Tracks the evaluation in CRM', 'Books the contract', 'Provisions access', 'Records adoption signals',
                'Reports usage monthly', 'Alert fires internally, no customer-facing trigger', 'Logs disposition notes', 'Prepares the renewal record', 'Misses the advocacy signal entirely',
            ]},
        ],
        painPoints: [
            'Peer referral never credited', 'Evaluation notes stay personal', 'Contract context lost at handoff', 'Setup repeats questions already answered', 'First-task struggles invisible',
            'Routine use untracked', 'Organization knows before the customer and says nothing', 'Fix loop slow across teams', 'Renewal record incomplete', 'Advocacy signal lost',
        ],
        personas: ['The self-serve adopter', 'The frontline owner', 'The record steward'],
        overallPainPoints: ['Ownership changes hands without the data following (Process Observation)', 'Recovery visibility decides loyalty, not recovery speed (Customer Interviews)'],
        opportunities: ['One record across every handoff (Operations Review)', 'Acknowledge-first recovery sequence (Customer Interviews)'],
        kpiTiles: [
            { label: 'Key finding', value: 'Handoffs', sub: 'Where the journey actually breaks', isHeadline: true },
            { label: 'Stage count', value: 'Ten', sub: 'Awareness to advocacy' },
            { label: 'The fix pattern', value: 'One record', sub: 'The data follows the relationship' },
        ],
        keyInsight: 'The journey breaks at the two structural handoffs where ownership changes hands without the data following it; the other eight phases inherit the damage.',
    },
};

const pages = paginateSlides([slide]);
console.log(`paginated 1 -> ${pages.length} page(s)`);
pages.forEach((p, i) => {
    writeFileSync(`D:/tmp/all-stages/journey-map-nu-decomposed-p${i + 1}.html`, slideDataToStageHtml(p as any));
    console.log(`  p${i + 1}: ${(p as any).journeyMap.stages.length} stages :: ${p.title.slice(0, 70)}`);
});
