import { it } from 'vitest';
import { writeFileSync } from 'fs';
import { slideDataToStageHtml } from './slideToStageHtml';

// Throwaway: render the REAL journey matrix for the alumni-donor journey (the artifact the user
// flagged) and write the full stage HTML so it can be screenshotted. Not a permanent test.
it('emit journey matrix proof html', () => {
    const data: any = {
        template: 'journey-map',
        brand: 'nxt',
        theme: 'light',
        title: 'Engagement leaks at three stages advancement cannot see',
        kicker: 'JOURNEY MAP · CURRENT STATE · ALUMNI DONOR',
        takeaway: 'No model ties engagement signal to giving propensity, so leaks at enrollment, year-one, and post-gift stewardship stay invisible.',
        journeyMap: {
            stages: [
                { name: 'Graduating cold' },
                { name: 'Drifting year one' },
                { name: 'Getting one ask', critical: true },
                { name: 'Giving once' },
                { name: 'Coming back' },
            ],
            kpiTiles: [
                { label: 'ENTRY', value: 'Cold' },
                { label: 'FIRST ASK', value: 'Generic' },
                { label: 'RENEWAL', value: 'Lapse' },
            ],
            lanes: [
                { actor: 'Alumnus', role: 'gives', cells: ['Leaves with no welcome', 'Opens drop sharply', 'Receives one-size appeal', 'Gives once, hears nothing', 'No nudge to renew'] },
                { actor: 'Gift Officer', role: 'cultivates', cells: ['No early touch', 'No re-engage trigger', 'Manual segmentation', 'No thank-you flow', 'No win-back motion'] },
                { actor: 'Advancement CRM', role: 'tracks', cells: ['Email-only outreach', 'Generic newsletters', 'No giving-history use', 'Receipt-only contact', 'Lapse logged silently'] },
            ],
            painPoints: [
                ['No welcome series', 'Cold first 90 days', 'Email-only outreach'],
                ['Opens drop sharply', 'No re-engage trigger', 'Generic newsletters'],
                ['One-size appeal', 'No giving-history use', 'Manual segmentation'],
                ['No thank-you flow', 'No impact report', 'Receipt-only contact'],
                ['No recurring offer', 'No win-back', 'Lapsed silently'],
            ],
            opportunities: ['AI welcome journey', 'Behavior-triggered re-engage', 'Personalized ask engine', 'Automated stewardship', 'Recurring + win-back'],
            personas: [
                'I gave once at graduation, then never heard why it mattered.',
                'Generic appeals feel like spam, not stewardship.',
                'Show me my impact and I will give again.',
            ],
        },
        sources: ['Alumni Interviews', 'Advancement CRM Audit', 'Reddit r/AlumniGiving'],
    };
    const html = slideDataToStageHtml(data);
    const out = 'C:/Users/JonathanLupo/AppData/Local/Temp/claude/D--NXT-HUMANS-AI-CX-WORKBENCH/3fe97bdd-739c-419d-aa6b-d1b65eb1ba5b/scratchpad/journey-matrix-proof.html';
    writeFileSync(out, html, 'utf8');
});
