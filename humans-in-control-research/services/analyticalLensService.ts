/**
 * Analytical Lens Framework Service
 * Provides industry-agnostic configurable frameworks that shape
 * persona schemas, journey stages, and prompt segments per engagement type.
 */

import { AnalyticalLens, LensConfig } from '../types';

export const LENS_CONFIGS: Record<AnalyticalLens, LensConfig> = {
    general_cx: {
        lens: 'general_cx',
        personaExtensions: [],
        journeyStages: ['Awareness', 'Consideration', 'Decision', 'Onboarding', 'Usage', 'Advocacy'],
        specializedPromptSegment: '',
    },
    fundraising_advancement: {
        lens: 'fundraising_advancement',
        personaExtensions: [
            { key: 'givingCapacity', label: 'Giving Capacity', type: 'select', options: ['Annual (<$1K)', 'Leadership ($1K-$25K)', 'Major ($25K-$100K)', 'Principal ($100K+)'] },
            { key: 'engagementTier', label: 'Engagement Tier', type: 'select', options: ['Prospect', 'Annual Donor', 'Leadership Donor', 'Major Gift Prospect', 'Principal Gift Prospect'] },
            { key: 'affinityAreas', label: 'Affinity Areas', type: 'text' },
            { key: 'lifecycleStage', label: 'Lifecycle Stage', type: 'select', options: ['Acquisition', 'Cultivation', 'Solicitation', 'Stewardship', 'Renewal', 'Lapsed'] },
            { key: 'preferredChannels', label: 'Preferred Channels', type: 'text' },
        ],
        journeyStages: ['Awareness', 'Engagement', 'Cultivation', 'Solicitation', 'Stewardship', 'Renewal'],
        specializedPromptSegment: `DOMAIN CONTEXT: Fundraising and donor advancement. Extract all mentions of giving amounts, donor segments, campaigns, alumni engagement, CRM/Salesforce references, wealth indicators, gift officers, stewardship activities. Themes must map to: Donor Acquisition, Donor Retention, Stewardship Quality, Data Infrastructure, Channel Strategy, Personalization, Pipeline Progression. Personas must include giving capacity tier, engagement tier, affinity areas, lifecycle stage, and preferred channels as extension fields.`,
    },
    student_learner: {
        lens: 'student_learner',
        personaExtensions: [
            { key: 'academicProgram', label: 'Academic Program', type: 'text' },
            { key: 'readinessLevel', label: 'Readiness Level', type: 'select', options: ['Exploring', 'Developing', 'Prepared', 'Experienced'] },
            { key: 'skillProfile', label: 'Key Skills', type: 'text' },
            { key: 'experientialLearning', label: 'Experiential Learning', type: 'text' },
        ],
        journeyStages: ['Application', 'Orientation', 'Coursework', 'Experiential Prep', 'Experiential Learning', 'Career Transition', 'Alumni'],
        specializedPromptSegment: `DOMAIN CONTEXT: Student and learner experience. Extract all mentions of academic programs, co-op/internships, skill development, career readiness, advising, student organizations, learning outcomes, competency frameworks. Themes must relate to: Academic Experience, Career Readiness, Skills Development, Experiential Learning, Student Support, Technology in Learning. Personas must include academic program, readiness level, skill profile, and experiential learning as extension fields.`,
    },
    digital_product: {
        lens: 'digital_product',
        personaExtensions: [
            { key: 'techProficiency', label: 'Tech Proficiency', type: 'select', options: ['Novice', 'Intermediate', 'Advanced', 'Expert'] },
            { key: 'deviceMix', label: 'Primary Devices', type: 'text' },
            { key: 'usageFrequency', label: 'Usage Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Occasional'] },
            { key: 'accessibilityNeeds', label: 'Accessibility Needs', type: 'text' },
        ],
        journeyStages: ['Discovery', 'Onboarding', 'Core Usage', 'Advanced Usage', 'Integration', 'Advocacy/Churn'],
        specializedPromptSegment: `DOMAIN CONTEXT: Digital product and mobile experience. Extract all mentions of app usage patterns, feature adoption, onboarding friction, mobile vs desktop, performance, accessibility, integration with other tools. Themes must relate to: Discovery, Onboarding, Core Value, Feature Adoption, Mobile Experience, Accessibility, Performance, Integration. Personas must include tech proficiency, device mix, usage frequency, and accessibility needs as extension fields.`,
    },
    enterprise_technology: {
        lens: 'enterprise_technology',
        personaExtensions: [
            { key: 'department', label: 'Department', type: 'text' },
            { key: 'systemRole', label: 'System Role', type: 'select', options: ['End User', 'Power User', 'Admin', 'Decision Maker'] },
            { key: 'systemAccess', label: 'Systems Used', type: 'text' },
            { key: 'painTolerance', label: 'Change Tolerance', type: 'select', options: ['Low', 'Medium', 'High'] },
        ],
        journeyStages: ['Evaluate', 'Procure', 'Implement', 'Adopt', 'Optimize', 'Sunset/Migrate'],
        specializedPromptSegment: `DOMAIN CONTEXT: Enterprise technology ecosystem. Extract all mentions of systems, platforms, vendors, integrations, data flows, governance, security, compliance, change management, adoption rates, training needs. Themes must relate to: Data Infrastructure, System Integration, User Adoption, Governance, Security, Vendor Management, Change Management, Scalability. Personas must include department, system role, systems used, and change tolerance as extension fields.`,
    },
    custom: {
        lens: 'custom',
        personaExtensions: [],
        journeyStages: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5'],
        specializedPromptSegment: '',
    },
};

/**
 * Build the lens-specific prompt segment to inject into the system instruction.
 */
export function getLensPromptSegment(lens: AnalyticalLens): string {
    const config = LENS_CONFIGS[lens];
    if (!config.specializedPromptSegment) return '';
    return `\n\n${config.specializedPromptSegment}`;
}

/**
 * Get the persona extension field definitions for a lens.
 */
export function getLensPersonaExtensions(lens: AnalyticalLens) {
    return LENS_CONFIGS[lens].personaExtensions;
}

/**
 * Get the default journey stages for a lens.
 */
export function getLensJourneyStages(lens: AnalyticalLens) {
    return LENS_CONFIGS[lens].journeyStages;
}
