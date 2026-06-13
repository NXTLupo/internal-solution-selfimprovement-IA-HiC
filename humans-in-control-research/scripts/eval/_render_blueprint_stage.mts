import { slideDataToStageHtml } from '../../services/slideToStageHtml';
import { writeFileSync } from 'fs';
const slide = {
  template: 'service-blueprint', brand: 'nu',
  title: "Northeastern's fragmented data layer leaks donor intent across four critical student-to-alumni transition stages",
  sources: ['NXT Stakeholder Interviews', 'Northeastern CRM Assessment', 'Northeastern Alumni Research (Smarty Pants)'],
  serviceBlueprint: {
    stages: [
      { phase: 'Matriculation', duration: 'Month 1', emotion: 'Curious', customerAction: 'Incoming student and parents enroll; parents seek immediate connection to regional networks.', frontstage: 'Admissions welcomes families; parent portal offers generic resources.', backstage: 'Admissions captures parent data (employer, wealth indicators) but siloes it from Advancement.', support: 'Banner SIS, Slate Admissions CRM', painPoint: 'Advancement is blind to high-capacity families until post-matriculation (Source: NXT Stakeholder Interviews).', failPoint: true },
      { phase: 'Co-op Placement', duration: 'Years 2-4', emotion: 'Frustrated', customerAction: 'Student applies for global co-ops; parents look to leverage alumni networks for placement.', frontstage: 'Co-op advisors manually search for placements; alumni relations hosts generic regional events.', backstage: "Staff manually pull 'limbo lists' of student demand and text alumni contacts for leads.", support: 'NUsource, manual spreadsheets, Salesforce Ascend', painPoint: 'Limbo lists are compiled on manual demand rather than automated system prompts (Source: NXT Stakeholder Interviews).', failPoint: false },
      { phase: 'Graduation', duration: 'Month 48', emotion: 'Confused', customerAction: 'Senior graduates; expects personalized transition into the global alumni network.', frontstage: 'Alumni relations sends generic email blasts; local chapters host standard welcome events.', backstage: 'Data team attempts to link student records to parent accounts; legacy data quality issues block automated matching.', support: 'Salesforce Ascend, Cvent', painPoint: 'Data migration to Ascend severed critical relationship context and dropped deceased records (Source: Northeastern CRM Assessment).', failPoint: true },
      { phase: 'Alumni Giving', duration: 'Ongoing', emotion: 'Neutral', customerAction: 'Alum receives solicitation; attends local event or makes a micro-donation.', frontstage: 'Annual Giving sends segmented direct mail; events charge registration fees with embedded gifts.', backstage: 'Gift processing manually reconciles event fees; Snowflake queries attempt to track engagement.', support: 'Salesforce Ascend, Snowflake, Tableau', painPoint: 'Central Advancement is blind to college-level alumni engagement activities (Source: NXT Stakeholder Interviews).', failPoint: false },
    ],
    keyInsight: 'Donor intent leaks at the two structural handoffs, matriculation and graduation, where ownership of the relationship changes hands without the data following it.',
  },
};
writeFileSync('D:/tmp/blueprint-stage-nu.html', slideDataToStageHtml(slide as any));
console.log('stage html written');
