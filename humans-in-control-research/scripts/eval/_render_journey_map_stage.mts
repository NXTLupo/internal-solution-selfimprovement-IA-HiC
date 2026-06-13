import { slideDataToStageHtml } from '../../services/slideToStageHtml';
import { writeFileSync } from 'fs';

// The 2026-06-11 failing #journey request, rendered as the CORRECT artifact:
// a journey map (actor lanes x stages), not a Bitner blueprint.
const slide = {
  template: 'journey-map', brand: 'nu',
  title: 'Donor intent forms at matriculation but advancement does not see the student until graduation',
  sources: ['NXT Stakeholder Interviews', 'Northeastern CRM Assessment', 'Northeastern Alumni Research (Smarty Pants)'],
  journeyMap: {
    journeyType: 'ADVANCEMENT STAFF VIEW',
    scope: 'One donor pipeline, matriculation to giving',
    actors: 'Advancement staff · Gift officers · Data team',
    phasesLabel: 'Five, matriculation to alumni giving',
    stages: [
      { name: 'Matriculation' },
      { name: 'Co-op placement', critical: true },
      { name: 'Graduation' },
      { name: 'Early alumni' },
      { name: 'Alumni giving' },
    ],
    lanes: [
      { actor: 'Advancement staff', role: 'owns the pipeline', cells: [
        'Blind to incoming high-capacity families; admissions data stays siloed',
        'Manually pulls limbo lists of student co-op demand and texts alumni contacts',
        'Relies on memory to personalize the transition into the alumni network',
        'Leans on college-level engagement it does not always hear about',
        'Builds the case for giving from a fragmented view of the relationship',
      ]},
      { actor: 'Gift officers', role: 'carries the ask', cells: [
        'not engaged',
        'Asked to fundraise for co-op markets after demand is already visible',
        'not engaged',
        'Solicits annual gifts from alumni whose experience data was lost in transition',
        'Cultivates major gifts without relationship context dropped in the CRM migration',
      ]},
      { actor: 'Data team', role: 'owns the records', cells: [
        'Captures parent employer and wealth indicators inside admissions only',
        'Maintains co-op records in NUsource and manual spreadsheets',
        'Attempts to link student records to parent accounts; legacy quality blocks matching',
        'Tracks engagement in Snowflake queries that miss college-level activity',
        'Reconciles event fees by hand; deceased records absent since the migration',
      ]},
    ],
    painPoints: [
      'Signal arrives post-matriculation',
      'Limbo lists move on demand, not prompts',
      'Relationship context severed in migration',
      'College engagement invisible centrally',
      'Unified donor view never assembled',
    ],
    personas: [
      'Advancement officer who hears about high-capacity families last',
      'Gift officer who rebuilds context the CRM lost',
      'Data steward who reconciles records by hand',
    ],
    overallPainPoints: [
      'The signal reaches advancement only after the moment to act has passed (NXT Stakeholder Interviews)',
      'Manual demand requests replace automated prompts at every handoff (NXT Stakeholder Interviews)',
      'The Ascend migration dropped the context officers depend on (Northeastern CRM Assessment)',
    ],
    opportunities: [
      'Trigger advancement alerts the moment strategic-market students enroll (NXT Stakeholder Interviews)',
      'Map student co-op demand against alumni density and prompt the right officer (NXT Stakeholder Interviews)',
      'Carry one learner record across the student-to-alumni handoff (Northeastern Alumni Research)',
    ],
    kpiTiles: [
      { label: 'KEY FINDING', value: 'Siloed', sub: 'ADMISSIONS SIGNAL NEVER REACHES ADVANCEMENT', isHeadline: true },
      { label: 'STAGE COUNT', value: 'Five', sub: 'MATRICULATION TO GIVING' },
      { label: 'THE FIX PATTERN', value: 'One record', sub: 'THE DATA FOLLOWS THE RELATIONSHIP' },
    ],
    keyInsight: 'Donor intent leaks at the two structural handoffs, matriculation and graduation, where ownership of the relationship changes hands without the data following it.',
  },
};
writeFileSync('D:/tmp/journey-map-stage-nu.html', slideDataToStageHtml(slide as any));
console.log('journey-map stage html written');
