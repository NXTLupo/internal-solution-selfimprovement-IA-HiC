/**
 * Full-roster stage-twin harness (2026-06-11).
 * Renders ONE representative slide per chat-reachable template through
 * slideDataToStageHtml (the exact engine the analyst-chat PPTX export uses),
 * writes each stage to D:/tmp/all-stages/, plus an index page (scaled iframes)
 * for one-shot visual audit. Representative copy, industry-neutral, numbers
 * only inside attributed verbatim quotes.
 */
import { slideDataToStageHtml } from '../../services/slideToStageHtml';
import { writeFileSync, mkdirSync } from 'fs';

const Q = (text: string, source: string, attribution?: string) => ({ text, source, attribution });

export const SLIDES: any[] = [
    { template: 'persona-card', brand: 'nu', title: 'The self-serve seeker wants the answer without ever opening a ticket',
      sources: ['Customer Interviews', 'Support Ticket Analysis'],
      persona: { name: 'Self-serve seeker', role: 'End user, mid-market account', quote: 'If I have to contact support, the product has already failed me once.',
        jtbd: 'Resolve the problem inside the working session without breaking flow',
        goals: { lifeGoal: 'Be the person who unblocks the team', experienceGoal: 'Never repeat the same explanation twice', functionalGoal: 'Find the documented fix before the contact form' },
        painPoints: [
          { label: 'Stale help center', quote: 'The article describes a screen that has not existed for a year.', source: 'Customer Interviews' },
          { label: 'Queue-ordered routing', quote: 'I sat in a queue for a question the search box should have answered.', source: 'Support Ticket Analysis' },
        ],
        motivations: [ { label: 'Momentum', quote: 'I just want to keep moving.', source: 'Customer Interviews' } ] } },
    { template: 'recommendation', brand: 'nxt', title: 'Route support contacts by intent instead of queue order',
      sources: ['Support Ticket Analysis', 'Agent Listening Session'],
      recommendation: { actionTitle: 'Route by intent, not by queue order',
        rationale: 'The answer usually exists before the contact begins; the routing model is what keeps the customer from it.',
        supportingActions: [
          { name: 'Intent classification at intake', description: 'Classify the contact from the first message and surface the documented fix before the form submits.' },
          { name: 'Deflection with dignity', description: 'Offer the article inline with a one-click path to a human, so self-serve never feels like a wall.' },
          { name: 'Close the defect loop', description: 'Pipe recurring-contact signal into the product backlog so the top contact reason becomes a fix.' },
        ],
        evidence: [ Q('That limbo list comes on a demand request from me, not a prompt into my inbox.', 'Agent Listening Session') ],
        implication: 'Routing is the lever that converts the existing knowledge base into resolved moments.' } },
    { template: 'theme-cluster', brand: 'nu', title: 'Customers punish the silence after a failure more than the failure itself',
      sources: ['Customer Interviews', 'Review Mining', 'Operations Review'],
      themeCluster: { themes: [
        { name: 'Silence after failure', insight: 'Recovery visibility matters more than recovery speed.', evidence: 'Nobody told me anything for a week. I would have stayed if someone had just called.', source: 'Customer Interviews' },
        { name: 'The workaround economy', insight: 'Frontline teams hide systemic defects inside private workarounds.', evidence: 'We keep a spreadsheet the system does not know about. Everyone does.', source: 'Agent Listening Session' },
        { name: 'Ownership evaporates at handoff', insight: 'Journeys break where two departments both believe the other owns the customer.', evidence: 'By the time it reached us, the customer had already explained it three times.', source: 'Stakeholder Interviews' },
      ], patternSignal: 'Each theme is a handoff problem wearing a different uniform.' } },
    { template: 'theme-spotlight', brand: 'nxt', title: 'The workaround economy hides the defects the budget exists to fix',
      sources: ['Agent Listening Session', 'Operations Review'],
      themeCluster: { themes: [
        { name: 'The workaround economy', insight: 'Private spreadsheets absorb the failures the system should surface.', evidence: 'We keep a spreadsheet the system does not know about. Everyone does.', source: 'Agent Listening Session' },
        { name: 'Invisible volume', insight: 'Deflected contacts never reach the dashboard that funds the fix.', evidence: 'Our dashboard is green. The complaints are about things the dashboard does not track.', source: 'Operations Review' },
        { name: 'Tool fatigue', insight: 'Agents work around the tooling faster than the tooling team can patch it.', evidence: 'The macro is older than the product screen it describes.', source: 'Agent Listening Session' },
      ] } },
    { template: 'theme-arc', brand: 'nu', title: 'The failure signal decays at every handoff between hearing and fixing',
      sources: ['Customer Interviews', 'Stakeholder Interviews', 'Product Retro Notes'],
      themeCluster: { themes: [
        { name: 'Heard off-channel', insight: 'Problems surface in conversations the system never sees.', evidence: 'I mentioned it to the rep at renewal, not in a ticket.', source: 'Customer Interviews' },
        { name: 'Filtered in triage', insight: 'Triage compresses the story into a category that loses the cause.', evidence: 'The category list has nothing for what actually happened.', source: 'Stakeholder Interviews' },
        { name: 'Lost before backlog', insight: 'The defect behind the top contact reason never reaches the product team.', evidence: 'We learned about the recurring issue in a quarterly review, not from the queue.', source: 'Product Retro Notes' },
      ] } },
    { template: 'theme-mosaic', brand: 'nxt', title: 'Four forces shape whether a loyal customer stays after a failure',
      sources: ['Customer Interviews', 'Review Mining', 'Finance Partner Data', 'Stakeholder Interviews'],
      themeCluster: { themes: [
        { name: 'Acknowledgement speed', insight: 'The clock starts at the failure, not at the ticket.', evidence: 'They knew before I did, and still nobody reached out.', source: 'Customer Interviews' },
        { name: 'Visible ownership', insight: 'Every transfer restarts the trust calculation.', evidence: 'Each new person asked me to start from the beginning.', source: 'Review Mining' },
        { name: 'Resolution depth', insight: 'A patched symptom returns as churn.', evidence: 'The same thing broke again the next month.', source: 'Customer Interviews' },
        { name: 'The follow-up', insight: 'Loyalty is written after resolution, not during it.', evidence: 'The call afterward is the reason I renewed.', source: 'Customer Interviews' },
      ] } },
    { template: 'competitive-matrix', brand: 'nu', title: 'Named peers separate on recovery design, not on product features',
      sources: ['Industry Filings', 'Analyst Briefings', 'Review Mining'],
      matrix: { columns: ['Intent routing', 'Recovery playbook', 'Defect loop', 'Voice of customer'],
        columnDefs: ['Contacts routed by need', 'Defined post-failure sequence', 'Contacts feed the backlog', 'Verbatims reach decision makers'],
        scaleMax: 5, scaleLabels: ['Absent', 'Ad-hoc', 'Defined', 'Managed', 'Optimized'], subjectRow: 'Subject Co',
        rows: [
          { name: 'Subject Co', scores: [2, 2, 1, 3], note: 'Queue-ordered routing; recovery is improvised per agent', source: 'Operations Review' },
          { name: 'Zappos', scores: [4, 5, 3, 5], note: 'Recovery sequence is a trained playbook, not a memo', source: 'Analyst Briefings' },
          { name: 'Amazon', scores: [5, 4, 5, 4], note: 'Contact reasons drive the product backlog directly', source: 'Industry Filings' },
          { name: 'Stripe', scores: [4, 3, 5, 4], note: 'Documentation-first deflection with named owners', source: 'Analyst Briefings' },
        ], insight: 'The leaders treat recovery as a designed service; the subject treats it as agent improvisation.' } },
    { template: 'block-quote', brand: 'nxt', title: 'The customer names the moment loyalty was decided',
      sources: ['Customer Interviews'],
      quote: { text: 'Nobody told me anything for a week. I would have stayed if someone had just called.',
        attribution: 'Long-tenured customer', role: 'Mid-market account, post-churn interview', source: 'Customer Interviews',
        contextParagraph: 'Said in a post-churn interview after a fulfillment failure on a launch-week order. The failure itself was resolved; the silence between failure and resolution is what ended the relationship.',
        corroboratingData: [
          { value: 'Recurring', label: 'silence named as the churn reason across exit interviews', source: 'Review Mining' },
          { value: 'First week', label: 'the window where recovery contact changes the outcome', source: 'Customer Interviews' },
        ], implication: 'Recovery visibility, not recovery speed, is the retention lever.' } },
    { template: 'case-study', brand: 'nu', title: 'Zappos turned the recovery moment into its primary loyalty engine',
      sources: ['Analyst Briefings', 'Published Case Material'],
      caseStudy: { subject: 'Zappos', subjectMeta: 'Footwear e-commerce · US · service-led brand', timeframe: 'Multi-year program', investment: 'Service culture program, dedicated recovery authority',
        variant: 'four-block',
        challenge: 'Commodity product set with thin differentiation; loyalty depended entirely on the experience around the purchase.',
        approach: 'Gave frontline agents the authority to resolve completely on first contact, with recovery treated as a designed sequence rather than a cost center.',
        outcome: 'Recovery moments became the brand story customers retold; service became the acquisition channel.',
        lesson: 'Authority at the point of failure converts the worst moment into the strongest memory.',
        keyMetric: { value: 'Recovery-led', label: 'loyalty model anchored on the post-failure moment' },
        supportingMetrics: [ { value: 'First contact', label: 'resolution authority at the frontline' }, { value: 'Designed', label: 'recovery sequence, not improvisation' } ],
        pullQuote: { text: 'The telephone is one of the best branding devices out there.', attribution: 'Tony Hsieh', role: 'CEO, published interview' },
        implication: 'The recovery sequence is a brand asset when it is designed, staffed, and trusted.' } },
    { template: 'principles', brand: 'nxt', title: 'Five principles govern the service the organization builds next',
      sources: ['Stakeholder Interviews', 'Customer Interviews'],
      principles: { items: [
        { name: 'Acknowledge before asked', description: 'The customer learns the organization knows before they have to report it.' },
        { name: 'One owner per case', description: 'A named person carries the case to resolution; transfers are the exception.' },
        { name: 'Doc-first deflection', description: 'The documented fix surfaces before the contact form, never instead of it.' },
        { name: 'Close the loop visibly', description: 'The follow-up after resolution is part of the service, not a courtesy.' },
        { name: 'Feed the backlog', description: 'Recurring contact reasons become product fixes, not macro updates.' },
      ] } },
    { template: 'stat-row', brand: 'nu', title: 'The evidence converges on the gap between hearing and fixing',
      sources: ['Customer Interviews', 'Operations Review', 'Product Retro Notes'],
      statRow: { stats: [
        { value: 'Off-channel', label: 'where problems first surface', source: 'Customer Interviews', meaning: 'The system never sees the first report.', matters: 'The recovery clock starts before the ticket exists.' },
        { value: 'Green', label: 'what the dashboard says during the complaints', source: 'Operations Review', meaning: 'Measurement follows budget lines, not the journey.', matters: 'The funded view and the lived experience diverge.' },
        { value: 'Quarterly', label: 'when the product team hears the top contact reason', source: 'Product Retro Notes', meaning: 'The defect loop closes on review cadence, not signal cadence.', matters: 'The same failure recurs across the gap.' },
      ], convergentInsight: 'Three independent vantage points describe one structure: the signal exists, and the structure routes it away from the people funded to act on it.' } },
    { template: 'timeline', brand: 'nxt', title: 'The build sequences trust before automation',
      sources: ['Stakeholder Interviews'],
      timeline: { phases: [
        { name: 'Stabilize', duration: 'Now', items: ['Name a recovery owner per segment', 'Stand up the acknowledge-first contact sequence', 'Audit the stale help-center tier'] },
        { name: 'Instrument', duration: 'Next', items: ['Intent classification at intake', 'Recurring-contact signal into the backlog', 'Voice-of-customer verbatims to decision makers'] },
        { name: 'Compound', duration: 'Later', items: ['Recovery playbook trained across tiers', 'Doc-first deflection with one-click human path', 'Service metrics follow the journey, not the budget line'] },
      ] } },
    { template: 'section-divider', brand: 'nu', title: 'The strategic choice',
      sources: [], sectionDivider: { number: '03', title: 'The strategic choice', subtitle: 'What the evidence forces, and what it forgives' } },
    { template: 'service-blueprint', brand: 'nu', title: 'The recovery journey breaks where ownership changes hands',
      sources: ['Customer Interviews', 'Process Observation'],
      serviceBlueprint: { journeyType: 'recovery',
        stages: [
          { phase: 'Failure', duration: 'Hour zero', emotion: 'Frustrated', customerAction: 'Hits the failure mid-task and looks for acknowledgement.', frontstage: 'Status page silent; no proactive contact.', backstage: 'Alert fires internally; no customer-facing trigger.', support: 'Monitoring stack, status tooling', painPoint: 'The organization knows before the customer, and says nothing.', failPoint: true },
          { phase: 'Contact', duration: 'Day one', emotion: 'Hopeful', customerAction: 'Opens a ticket and guesses the category.', frontstage: 'Form routes by queue order.', backstage: 'Triage compresses the story into a category.', support: 'Ticketing system', painPoint: 'Routing by queue, not by need.', failPoint: false },
          { phase: 'Resolution', duration: 'Within the week', emotion: 'Relieved', customerAction: 'Receives the fix and retries the task.', frontstage: 'Agent resolves and closes.', backstage: 'Disposition notes logged.', support: 'Knowledge base', painPoint: 'Fix loop is slow when the case crossed teams.', failPoint: false },
          { phase: 'Aftermath', duration: 'The next month', emotion: 'Neutral', customerAction: 'Decides quietly whether to stay.', frontstage: 'No follow-up contact.', backstage: 'Case closed; signal archived.', support: 'CRM', painPoint: 'The loyalty-deciding window passes unattended.', failPoint: true },
        ], keyInsight: 'The service is designed up to resolution and absent after it; the loyalty decision happens in the unstaffed week.' } },
    { template: 'journey-map', brand: 'nxt', title: 'The answer is reachable from the first minute, yet the journey routes around it',
      sources: ['Support Ticket Analysis', 'Agent Listening Session'],
      journeyMap: { journeyType: 'customer support · current state',
        scope: 'One support issue', actors: 'Customer · Agent · Product', phasesLabel: 'Five, notice to follow-up',
        stages: [ { name: 'Notice' }, { name: 'Search' }, { name: 'Contact', critical: true }, { name: 'Resolve' }, { name: 'Follow-up' } ],
        lanes: [
          { actor: 'Customer', role: 'end user', cells: ['Notices a problem mid-task', 'Searches help center, hits a stale article', 'Opens a ticket, guesses the category', 'Reads the fix, retries the task', 'Rates the experience, may churn'] },
          { actor: 'Support agent', role: 'tier-1 / tier-2', cells: ['not engaged', 'Deflects with FAQ macros', 'Receives a misrouted ticket', 'Resolves and closes the case', 'Logs disposition notes'] },
          { actor: 'Product team', role: 'owns the fix', cells: ['not engaged', 'Owns the stale documentation', 'not engaged', 'Ships no fix this cycle', 'Misses the recurring signal'] },
        ],
        painPoints: ['Problem surfaces off-channel', 'Self-serve content is stale', 'Routing by queue, not by need', 'Fix loop is slow', 'Signal lost after closure'],
        kpiTiles: [
          { label: 'Key finding', value: 'Routed', sub: 'Through every queue before resolution', isHeadline: true },
          { label: 'Stage count', value: 'Five', sub: 'Notice to follow-up' },
          { label: 'The fix pattern', value: 'Doc-first', sub: 'Answer before the contact form' },
        ],
        keyInsight: 'The answer is reachable from the first minute, but a queue-ordered model routes the customer around it. Route by intent and surface the documented fix first.' } },
    { template: 'gap-matrix', brand: 'nu', title: 'The deepest gaps sit in the loops, not in the tools',
      sources: ['Operations Review', 'Stakeholder Interviews'],
      gapMatrix: { scaleMax: 5, gaps: [
        { capability: 'Intent-based routing', currentMaturity: 2, targetMaturity: 4, severity: 'critical', impact: 'Contacts reach the wrong queue first, restarting the clock the customer keeps.' },
        { capability: 'Recovery playbook', currentMaturity: 1, targetMaturity: 4, severity: 'critical', impact: 'Recovery quality depends on which agent answers.' },
        { capability: 'Defect feedback loop', currentMaturity: 1, targetMaturity: 3, severity: 'high', impact: 'The top contact reason never becomes a product fix.' },
        { capability: 'Knowledge freshness', currentMaturity: 2, targetMaturity: 4, severity: 'high', impact: 'Stale articles convert self-serve attempts into tickets.' },
        { capability: 'Voice of customer', currentMaturity: 3, targetMaturity: 4, severity: 'medium', impact: 'Verbatims exist but stop below the decision makers.' },
      ], insight: 'Tooling maturity is adequate; loop maturity is the gap.' } },
    { template: 'architecture-map', brand: 'nxt', title: 'The support stack has every component except the connection between them',
      sources: ['Tech Stack Review'],
      architectureMap: { layers: [
        { name: 'Client', nodes: [ { name: 'Help center', type: 'web', description: 'Self-serve articles, search' }, { name: 'Contact form', type: 'web', description: 'Queue-ordered intake' }, { name: 'In-app help', type: 'embed', description: 'Links out to the help center' } ] },
        { name: 'Services', nodes: [ { name: 'Ticketing', type: 'SaaS', description: 'Routing, SLAs, macros' }, { name: 'Knowledge base', type: 'SaaS', description: 'Article authoring + serving' }, { name: 'Telephony', type: 'SaaS', description: 'Voice queue, callbacks' } ] },
        { name: 'Data', nodes: [ { name: 'CRM', type: 'system of record', description: 'Accounts, history' }, { name: 'Warehouse', type: 'analytics', description: 'Contact + resolution reporting' } ] },
      ], flowSummary: 'Every component is healthy in isolation; the defect signal has no path from ticketing to the product backlog.' } },
    { template: 'prd-feature', brand: 'nu', title: 'Intent-first intake is the must-have that unlocks the rest',
      sources: ['Support Ticket Analysis', 'Customer Interviews'],
      prdFeature: { features: [
        { name: 'Intent classification at intake', priority: 'must', userStory: 'As a customer describing a problem, I want the system to understand my need from my own words, so the right help reaches me without category guessing.',
          acceptanceCriteria: ['Classifies from the first free-text message', 'Surfaces the documented fix inline before submit', 'One-click escalation to a human preserved'],
          problemSolved: 'Queue-ordered routing forces customers to guess categories and restarts the clock at every misroute.' },
        { name: 'Recurring-contact signal to backlog', priority: 'must', userStory: 'As a product owner, I want recurring contact reasons delivered into my backlog with verbatims, so the defect behind the volume gets fixed.',
          acceptanceCriteria: ['Weekly recurring-reason digest with verbatim quotes', 'Linked from contact reason to backlog item', 'Closure visible back to support'],
          problemSolved: 'The top contact reason reaches the product team on review cadence, not signal cadence.' },
      ] } },
    { template: 'systems-inventory', brand: 'nxt', title: 'Two systems carry the journey; five carry the risk',
      sources: ['Tech Stack Review'],
      systemsInventory: { systems: [
        { name: 'Ticketing platform', category: 'Support', status: 'current', risk: 'medium', description: 'Healthy, but routing model is queue-ordered.' },
        { name: 'Knowledge base', category: 'Content', status: 'current', risk: 'high', description: 'Serving stack fine; freshness process absent.' },
        { name: 'Legacy macro library', category: 'Support', status: 'legacy', risk: 'high', description: 'Predates the current product surface.' },
        { name: 'Contact reporting', category: 'Analytics', status: 'current', risk: 'medium', description: 'Counts contacts; loses reasons.' },
        { name: 'Feedback widget', category: 'VoC', status: 'deprecated', risk: 'critical', description: 'Still collecting; nobody reading.' },
        { name: 'CRM', category: 'Record', status: 'current', risk: 'low', description: 'Reliable system of record.' },
      ], insight: 'Risk concentrates in the systems nobody owns end to end.' } },

    // LONG-CONTENT STRESS (2026-06-11): mirrors the live generation that
    // corrupted the user's journey export - verbose items with full inline
    // attributions. Stage twins must bound these server-side; the overflow
    // audit fails if any element hides text.
    { template: 'journey-map', brand: 'nu', _stress: true,
      title: 'Fragmented parent and student records restrict the ability to scale the annual fundraising run rate across the donor lifecycle',
      sources: ['NU Advancement Engagement', 'NXT Stakeholder Interviews', 'Northeastern CRM Assessment'],
      journeyMap: { journeyType: 'northeastern advancement and alumni engagement view',
        scope: 'End-to-end constituent lifecycle from enrollment to lifetime planned giving across every advancement function',
        actors: 'Alumni · Parents · Frontline gift officers · Advancement operations · IT sponsors',
        phasesLabel: 'Four key phases of the donor lifecycle',
        stages: [ { name: 'Enrolling as learner' }, { name: 'Experiencing co-op', critical: true }, { name: 'Graduating to alum' }, { name: 'Maturing to donor' } ],
        lanes: [
          { actor: 'Alumni and parent donors', role: 'Constituents navigating the institutional relationship across decades of engagement', cells: [
            'Parents enter the pipeline as high-capacity prospects. "We welcome incoming students and their parents through the next gen who are like global family enterprises" (Source: Casey Morrow - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Students engage in campus events with embedded giving. "If it is ten dollars come to the event, one dollar of that will be a gift to the university" (Source: University Events - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Young alumni participate in high-volume Giving Day campaigns with annual giving teams focused on donor acquisition metrics across one calendar day of coordinated outreach (Source: University Events - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Mature donors transition to planned giving vehicles. "If they give through a donor advised fund, that is also a good indicator for planned giving" (Source: Riley Quinn - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ] },
          { actor: 'Frontline gift officers', role: 'Fundraisers managing portfolios and donor relationships across every college and region', cells: [
            'Officers attempt to map household wealth capacity. "To really fully understand the household wealth capacity, you need to understand both individuals" (Source: Jordan Hale - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Officers source global employment and philanthropic partnerships globally while registrations flow through external event platforms that never reconcile (Source: Jack McCorkle - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Annual giving teams focus on donor acquisition metrics. "Annual giving focuses on participation, so the number of donors, as opposed to the number of dollars" (Source: University Events - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Officers are distracted by non-fundraising administrative tasks. "Some of the development team would be doing, you know, slides, a PowerPoint for a faculty presentation" (Source: Riley Quinn - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ] },
          { actor: 'Advancement operations', role: 'Data stewards managing CRM systems and reporting infrastructure end to end', cells: [
            'Operations struggles to link parent and student records legally and accurately across the legacy and Ascend systems without governance support (Source: Jordan Hale - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Operations uploads event registration data from external platforms. "Registrations would go in, you know, we use Cvent as our platform" (Source: Jack McCorkle - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Analysts face mid-semester email engagement lulls. "Open rates are highest at the start and end of a semester" (Source: Communications - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
            'Operations cleans up legacy CRM migration gaps where deceased spouse records were omitted from the transition entirely (Source: Taylor Brooks - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ] },
        ],
        painPoints: [
          'Disparate databases prevent legal and accurate parent-student record linkage (Source: Jordan Hale - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Indirect event-based giving mechanics obscure direct donor intent tracking (Source: Jack McCorkle - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Alumni communications suffer from mid-semester engagement lulls and generic content (Source: Communications - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Omitted deceased spouse records blind frontline officers to active planned giving prospects (Source: Riley Quinn - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ],
        personas: [
          'The Data-Frustrated Advancement Officer seeking unified donor views (Source: Avery Stone - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'The Disconnected Young Alum looking for professional value (Source: Morgan Ellis - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'The High-Capacity Parent Donor expecting personalized engagement (Source: Casey Morrow - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ],
        overallPainPoints: [
          'Data fragmentation across legacy and Ascend systems blocks predictive modeling (Northeastern CRM Assessment) (Source: Jordan Hale - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Severe staffing deficits force reactive data cleanup over strategic outreach (Source: Jordan Hale - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Siloed academic deans distract gift officers with non-fundraising tasks (Source: Taylor Brooks - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ],
        opportunities: [
          'Automate parent-student identity resolution in Salesforce Ascend (Source: Riley Quinn - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Deploy AI-driven prompt libraries to personalize event-based stewardship (Source: Jamie Reyes - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)',
          'Integrate event registration data directly with Snowflake analytics (Source: Jack McCorkle - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt)' ],
        kpiTiles: [
          { label: 'Primary metric', value: 'Participation', sub: 'Focus on donor count over dollars', isHeadline: true },
          { label: 'Operational bottleneck', value: 'Data linkage', sub: 'Struggle to connect parent-student records' },
          { label: 'CRM transition risk', value: 'Context loss', sub: 'Deceased records omitted in Ascend migration' },
        ],
        keyInsight: 'The structural disconnect between student life, event registration, and the central CRM forces advancement teams into reactive data cleanup, stalling predictive modeling and major-gift pipeline development.' } },

    // COMPRESSION STRESS (2026-06-11): the user's live fintech deck payloads
    // that exposed flex-compression overlap (stats grid bleeding over the
    // CONVERGENT INSIGHT panel; recommendation columns over PROJECTED IMPACT).
    { template: 'stat-row', brand: 'nxt', _stress: true,
      title: 'Retail consumers face a compounding liquidity squeeze as savings rates decline and credit obligations rise',
      sources: ['r/investing Analysis of FRED Data', 'Federal Reserve Economic Data'],
      statRow: { stats: [
        { value: '3.6%', label: 'personal saving rate as of March 2026', meaning: 'Consumers have exhausted pandemic-era savings and are running on thin buffers.', matters: 'A sudden labor shock would cascade quickly into defaults across the financial system.', source: 'r/investing Analysis of FRED Data' },
        { value: '$5.14T', label: 'outstanding consumer credit in early 2026', meaning: 'Household balance sheets are heavily leveraged, leaving very little room for economic disruption.', matters: 'The high debt burden increases systemic vulnerability even as headline unemployment remains low.', source: 'r/investing Analysis of FRED Data' },
        { value: '8.2%', label: 'U-6 underemployment rate in April 2026', meaning: 'The gap between headline U-3 and U-6 has widened, signaling late-cycle labor market softening.', matters: 'Employers are cutting hours and shifting workers to part-time before cutting headcount outright.', source: 'r/investing Analysis of FRED Data' },
      ], convergentInsight: 'While headline indicators suggest a strong labor market, underlying metrics reveal a highly leveraged consumer operating with historically thin cash buffers.', patternSignal: 'The combination of declining savings and elevated consumer credit suggests retail investors are increasingly vulnerable to sudden macroeconomic shifts.' } },
    { template: 'recommendation', brand: 'nxt', _stress: true,
      title: 'Fintech platforms must simplify interfaces and eliminate hidden fees to capture the next wave of wealth accumulation',
      sources: ['r/personalfinance', 'r/investing', 'The Atlantic'],
      recommendation: { actionTitle: 'Build fee-free, highly visual, and automated investment platforms tailored for self-directed retail investors',
        rationale: 'Retail investors are increasingly hostile toward traditional advisory fees and legacy platforms with poor data visualization. By offering zero-fee structures, intuitive performance tracking, and automated index portfolios, modern fintechs can capture the massive influx of new capital.',
        supportingActions: [
          { name: 'Eliminate Account Fees', description: 'Remove all maintenance, transfer, and advisory fees, matching the zero-minimum, zero-fee model to eliminate entry barriers.' },
          { name: 'Enhance Visual Analytics', description: 'Develop robust, real-time performance graphs and tax-loss harvesting visualizations to satisfy the demand for transparent growth tracking.' },
          { name: 'Automate Index Allocations', description: 'Provide simple, automated recurring deposit pipelines into broad-market funds, catering to the passive autopilot investor.' },
        ],
        impactGrid: { baseline: 'Retail investors stuck in high-fee, legacy employer plans with poor visibility', target: 'Frictionless, visual, and fee-free self-directed wealth accumulation', timeframe: 'Two platform release cycles', owner: 'Chief Product Officer + Head of Retail Wealth Management' },
        impactMetric: { value: 'A third', label: 'of portfolio value preserved over a career by avoiding the advisory fee drag, per the cited investor math' },
        evidence: [
          { text: 'When you compound 1% over 40 years, it is literally 1/3 of your portfolio lost holding all factors constant.', source: 'r/investing', attribution: 'Self-Directed Investor' },
          { text: 'I am not the type to research specific funds or anything, I am very much a set it and forget it person. But having a better interface alone could be worth it.', source: 'r/personalfinance', attribution: 'HSA Investor' },
        ],
        implication: 'The future of retail wealth management belongs to platforms that treat user experience as a core product and eliminate the advisory tax that historically eroded long-term compounding.' } },

    // DENSE-ROUTE STRESS (2026-06-11, W2): the four remaining failure shapes,
    // each engineered to trip its dense routing predicate so the GOLD dense
    // twins (not the deleted shrink heuristics) carry the payload.
    { template: 'recommendation', brand: 'nu', _stress: true, _id: 'dense4',
      title: 'Recovery must become a designed service with a named owner at every step',
      sources: ['Customer Interviews', 'Agent Listening Session', 'Operations Review'],
      recommendation: { actionTitle: 'Stand up an acknowledgement-first recovery sequence owned end to end by one team',
        rationale: 'Every research seat located the same gap: the organization detects failures before customers report them, yet no function owns telling the customer. Four reinforcing actions close that gap without new tooling.',
        supportingActions: [
          { name: 'Trigger customer-facing notices from detection', description: 'Wire the operations alert bus to a customer notice template so acknowledgement precedes the first inbound contact.' },
          { name: 'Route repeat contacts to the open case', description: 'A second contact inside fourteen days resumes the prior conversation instead of restarting it in the general queue.' },
          { name: 'Assign one named recovery owner per incident', description: 'The owner carries the relationship from acknowledgement through confirmation that the customer is whole.' },
          { name: 'Close the loop into the product backlog', description: 'Top contact reasons feed the defect queue on signal cadence, not quarterly review cadence.' },
        ],
        impactGrid: { baseline: 'Recovery improvised per agent with no customer-facing trigger', target: 'Designed acknowledgement-first sequence with one named owner', timeframe: 'Two quarters', owner: 'VP Customer Operations' },
        evidence: [
          { text: 'I told the chat, then the phone agent, then the survey. Three tellings, zero acknowledgements.', source: 'Customer Interviews', attribution: 'Retail Customer' },
          { text: 'We measure time-to-restore. There is no metric for time-to-tell-the-customer, so it never gets staffed.', source: 'Operations Review', attribution: 'Operations Lead' },
        ] } },
    { template: 'block-quote', brand: 'nu', _stress: true,
      title: 'Three different seats in the journey describe the same silence',
      sources: ['Customer Interviews', 'Agent Listening Session', 'Process Observation'],
      quote: { text: 'I told the chat, then the phone agent, then the survey. Three tellings, zero acknowledgements, and the follow-up email asked me to describe the issue again.',
        attribution: 'Retail Customer', role: 'Speaking from the customer seat', source: 'Customer interview, week 2',
        synthesis: 'Each seat can see its own half of the failure; no seat owns telling the customer. Acknowledgement is the missing function, and every voice locates it in the same gap.',
        additionalQuotes: [
          { text: 'I can see the failure on my screen before the customer finishes the sentence. What I cannot do is promise anyone will call them back, because no queue owns that promise.', attribution: 'Tier 1 Agent', role: 'Speaking from the frontline seat', source: 'Agent listening session' },
          { text: 'Our alert fired forty minutes before the first contact. We fixed the system and moved on; nobody asked whether the customers who hit it ever heard from us.', attribution: 'Operations Lead', role: 'Speaking from the operations seat', source: 'Process observation debrief' },
        ] } },
    { template: 'prd-feature', brand: 'nxt', _stress: true,
      title: 'Acknowledgement and routing carry the release; everything else follows them',
      sources: ['Customer Interviews', 'Operations Review'],
      prdFeature: { features: [
        { name: 'Proactive acknowledgement', priority: 'must',
          userStory: 'As a customer affected by a detected failure, I want the organization to tell me it knows before I have to report it, so that I do not spend my own time proving something they already saw.',
          acceptanceCriteria: [
            'Outage detection triggers a customer-facing notice within the recovery window',
            'Notice names the failure, the expected resolution path, and the owner',
            'Suppression rules prevent duplicate notices across channels',
            'Every notice writes back to the case record the agent sees'],
          technicalDetails: 'Depends on: event bus from operations monitoring', stakeholders: 'Operations, Support, Product' },
        { name: 'Need-based contact routing', priority: 'must',
          userStory: 'As a customer with an unresolved problem, I want my second contact to land with someone who can see my first one, so that the conversation resumes instead of restarting.',
          acceptanceCriteria: [
            'Repeat contact within 14 days routes to the prior case, not the general queue',
            'Routing decision visible to the agent with the reason attached',
            'Override path exists and is logged when routing is wrong',
            'No customer re-states identity or history already on file'],
          technicalDetails: 'Depends on: unified case record', stakeholders: 'Support, Data Platform' },
      ] } },
    { template: 'persona-card', brand: 'nu', _stress: true,
      title: 'The self-reliant adopter forgives failure and punishes silence',
      sources: ['Customer Interviews', 'Renewal Call Notes'],
      persona: { name: 'The Self-Reliant Adopter', role: 'Digital-first household decision maker',
        descriptors: 'DIGITAL-FIRST · HIGH EXPECTATION · LOW PATIENCE FOR REPETITION',
        quote: 'I will fix it myself if you let me. What I will not do is explain it three times to three different people.',
        stakes: 'Carries the household decision on renewal and tells the peer network either way.',
        goals: { functionalGoal: 'Resolve the problem inside the channel where it appeared', experienceGoal: 'Keep one running record of the relationship', lifeGoal: 'Spend attention on the task, not on the vendor' },
        painPoints: [
          { label: 'Re-stating history at every handoff', quote: 'Every transfer started the story over from zero.', source: 'Customer Interviews' },
          { label: 'Silence after a detected failure', quote: 'They knew before I did and said nothing.', source: 'Customer Interviews' },
          { label: 'Surveys that arrive instead of fixes', quote: 'I got the questionnaire before the resolution.', source: 'Renewal Call Notes' },
        ],
        behaviors: ['Exhausts self-service before contacting anyone', 'Keeps personal records of past cases', 'Escalates publicly only after private channels fail'],
        winConditions: ['Acknowledgement before they report', 'A second contact that resumes the first', 'One named owner through the recovery'] } },

    // SLIDE-SYSTEM VARIANT FIXTURES (2026-06-11, NU_Giving uplift wiring)
    { template: 'section-divider', brand: 'nu', _stress: true, _id: 'thesis',
      title: 'These challenges are familiar and persistent.',
      sectionDivider: { number: '', variant: 'thesis', title: 'These challenges are familiar and persistent.' } },
    { template: 'principles', brand: 'nu', _stress: true, _id: 'diptych',
      title: 'Two fundamental challenges stand in the way of the campaign vision',
      sources: ['NXT Stakeholder Interview'],
      principles: { variant: 'diptych', items: [
        { name: 'Becoming Value Focused', description: 'Aligning teams to value based outcomes reflects the practices of leading organizations, enabling each to uniquely apply technology to hone and optimize results.' },
        { name: 'Stopping The Leak', description: 'The only thing harder than retention is acquisition; the lifecycle stages from student to co-op to alumni to donor are disconnected. Intelligent interaction across this journey shifts the work to retention, not re-acquisition.' },
      ] } },
    { template: 'competitive-matrix', brand: 'nu', _stress: true, _id: 'prose',
      title: 'Peers are measuring more than dollars raised',
      sources: ['CASE Alumni Engagement framework', 'Duke MADE FOR THIS campaign'],
      matrix: { columns: [], rows: [],
        patternLine: 'Higher-ed peers use Salesforce. The differentiator is shared engagement measures, donor intelligence, campaign dashboards, and operating cadence.',
        rowsProse: [
          { name: 'Stanford', prove: 'Engagement scoring turns interaction data into action.', implication: 'Build an engagement score spanning philanthropic, volunteer, experiential, and stewardship signals.', evidenceTag: 'Official / CASE', tier: 'top' },
          { name: 'Duke', prove: 'Major campaigns now carry engagement goals, not only dollar goals.', implication: 'Track engagement health and relationship depth alongside dollars in the campaign control tower.', evidenceTag: 'Official', tier: 'top' },
          { name: 'Vanderbilt', prove: 'Advancement growth is an operating-model build; data, dashboards, alignment.', implication: 'Frame campaign readiness as scaled operating capacity, not just a pipeline exercise.', evidenceTag: 'Conference', tier: 'second' },
          { name: 'U. Michigan', prove: 'Engagement scoring and journeys improve retention and acquisition efficiency.', implication: 'High relevance for annual giving and retention-journey strategy.', evidenceTag: 'Vendor case study', tier: 'second' },
          { name: 'UC Irvine', prove: 'Transformation centered on a unified constituent view and faster gift processing.', implication: 'Relevant to constituent 360 and coordinated communications.', evidenceTag: 'Vendor webinar', tier: 'second' },
        ] } },
    { template: 'recommendation', brand: 'nu', _stress: true, _id: 'roleblock',
      title: 'Deploy AI-powered tools that enable intelligent relationship insights',
      sources: ['NXT Stakeholder Interview'],
      recommendation: { actionTitle: 'Deploy AI-powered tools that enable intelligent relationship insights.',
        rationale: 'Build a set of self service tooling that supports fundraising leaders to independently manage prospects, support important constituents, and grow relationships.',
        supportingActions: [
          { name: 'Synthetic pool construction', description: 'Enrich constituent records with third-party data to build behavioral profiles for each major donor segment.' },
          { name: 'Campaign simulation', description: 'Run proposed appeals against the synthetic pool before launch; test framing, ask amounts, and channel mix.' },
          { name: 'Prompt library for frontline staff', description: 'Curate advancement-specific AI prompts for contact reports, portfolio development, and stewardship.' },
        ],
        impactCards: [
          { label: 'REVENUE', headline: 'Lower acquisition cost', body: 'Self service tools enable research and proactive monitoring of prospects, so relationship time goes to relationships.' },
          { label: 'C-SAT', headline: 'Greater touch at key moments', body: 'Proactive intelligence surfaces the constituents who matter most, when contact matters most.' },
          { label: 'SERVICE NEEDS', headline: 'Two service families', body: 'Relationship services: research and screening. Operational services: reporting and one trusted constituent view.' },
        ] } },
    { template: 'timeline', brand: 'nu', _stress: true, _id: 'rolegrid',
      title: 'One roadmap, three roles; data trust is fixed first',
      sources: ['NXT Stakeholder Interview'],
      timeline: { phases: [ { name: 'Foundation', items: [] }, { name: 'Engage', items: [] }, { name: 'Optimize', items: [] }, { name: 'Launch', items: [] } ],
        rows: [
          { role: 'Gardeners', cells: ['Curated prompt library for frontline fundraisers', 'Prospect research AI; wealth screening with depth', 'Gift officer dashboards; frontline analytics', 'Personalized outreach at portfolio scale'] },
          { role: 'Farmers', cells: ['Interest-based appeal segmentation', 'Alumni service AI; network activation', 'Cross-team content; engage-to-give ROI', 'Channel preference routing across every cohort'] },
          { role: 'Operators', cells: ['CRM data integrity; parent-student linkage', 'Reporting and analytics layer', 'Unified data governance', 'Single source of truth behind every team'] },
        ] } },
];

mkdirSync('D:/tmp/all-stages', { recursive: true });
const files: string[] = [];
const fails: string[] = [];
// ABSOLUTE DUAL-BRAND PARITY (2026-06-11): every fixture renders in BOTH
// brands; the overflow audit + export assertions cover the full matrix.
for (const s of SLIDES) {
    for (const brand of ['nxt', 'nu'] as const) {
        try {
            const html = slideDataToStageHtml({ ...s, brand });
            const fname = `${s.template}-${brand}${(s as any)._stress ? '-stress' : ''}${(s as any)._id ? '-' + (s as any)._id : ''}.html`;
            writeFileSync(`D:/tmp/all-stages/${fname}`, html);
            files.push(fname);
        } catch (e: any) {
            fails.push(`${s.template}/${brand}: ${e?.message || e}`);
        }
    }
}
const index = `<!DOCTYPE html><html><head><style>
body{margin:0;background:#222;font-family:monospace}
.tile{display:inline-block;margin:8px;vertical-align:top}
.tile div{color:#ddd;font-size:11px;padding:2px}
iframe{width:480px;height:270px;border:1px solid #555;transform-origin:top left}
</style></head><body>
${files.map(f => `<span class="tile"><div>${f}</div><iframe src="${f}" scrolling="no" style="width:1920px;height:1080px;transform:scale(0.25);margin-bottom:-810px;margin-right:-1440px"></iframe></span>`).join('\n')}
</body></html>`;
writeFileSync('D:/tmp/all-stages/index.html', index);
// OVERFLOW AUDIT (2026-06-11): any element whose scroll box exceeds its
// client box is hiding text the PPTX export will paint at full length
// (the journey-map corruption class). Loads every stage; reports violations.
const auditJs = [
    "const frames=[...document.querySelectorAll('iframe')];const out=[];",
    "function check(fr){try{const d=fr.contentDocument;const bad=[];",
    // 1. ANY element hiding content (leaf text OR compressed container).
    "d.querySelectorAll('#stage, #stage *').forEach(el=>{",
    "const sh=el.scrollHeight-el.clientHeight, sw=el.scrollWidth-el.clientWidth;",
    "if((sh>6||sw>6)&&el.clientHeight>0){",
    "const isLeaf=el.children.length===0&&el.textContent.trim().length>0;",
    "const tag=el.id==='stage'?'STAGE-OVERFLOW':(isLeaf?'LEAF':'CONTAINER-COMPRESSED');",
    "bad.push(tag+' '+el.tagName+'.'+(el.className||'?')+' +'+sh+'v/'+sw+'h :: '+el.textContent.trim().slice(0,60));}});",
    // 2. Pairwise text-leaf collision (the user-visible symptom itself).
    "const leaves=[...d.querySelectorAll('#stage *')].filter(el=>el.children.length===0&&el.textContent.trim().length>1&&el.getClientRects().length);",
    "const tr=(el)=>{const r=d.createRange();r.selectNodeContents(el);return r.getBoundingClientRect();};",
    "const rects=leaves.map(tr);",
    "for(let i=0;i<leaves.length;i++){const a=rects[i];",
    "for(let j=i+1;j<leaves.length;j++){const el2=leaves[j];",
    "if(leaves[i].contains(el2)||el2.contains(leaves[i]))continue;",
    "const b=rects[j];",
    "const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left);",
    "const oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);",
    "if(ox>8&&oy>8&&ox*oy>400){bad.push('TEXT-COLLISION ['+leaves[i].textContent.trim().slice(0,28)+'] x ['+el2.textContent.trim().slice(0,28)+'] '+Math.round(ox)+'x'+Math.round(oy));}}}",
    "if(bad.length)out.push(fr.dataset.f+'\\n  '+bad.slice(0,12).join('\\n  '));}catch(e){out.push(fr.dataset.f+' ERR '+e.message)}}",
    "window.addEventListener('load',()=>{setTimeout(()=>{frames.forEach(check);",
    "document.getElementById('report').textContent=out.length?('OVERFLOW VIOLATIONS\\n\\n'+out.join('\\n\\n')):'CLEAN: no hidden overflow, no compression, no text collisions across '+frames.length+' stages';},2500);});",
].join('');
const auditHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#111;color:#0f0;font:12px monospace;padding:10px}iframe{position:absolute;left:-3000px;top:0}</style></head><body><pre id="report">auditing...</pre>'
    + files.map(f => '<iframe src="' + f + '" data-f="' + f + '" width="1920" height="1080"></iframe>').join('')
    + '<script>' + auditJs + '</scr' + 'ipt></body></html>';
writeFileSync('D:/tmp/all-stages/overflow-audit.html', auditHtml);

console.log(`rendered ${files.length}/${SLIDES.length * 2}`, fails.length ? `FAILURES: ${fails.join(' | ')}` : 'all ok');
