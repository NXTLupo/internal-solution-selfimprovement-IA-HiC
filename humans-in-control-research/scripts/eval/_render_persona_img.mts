// Render a persona-card dense stage with REAL generated behavior thumbnails, for visual verification.
// Usage: npx tsx scripts/eval/_render_persona_img.mts
import { writeFileSync } from 'node:fs';
import { slideDataToStageHtml } from '../../services/slideToStageHtml';

const PROXY = 'http://127.0.0.1:5012';
const behaviors = [
    'Calls during the lunch rush from the shop floor',
    'Keeps a private workaround doc instead of trusting support',
    'Escalates immediately after one missed callback',
];

async function gen(concept: string): Promise<string> {
    const r = await fetch(`${PROXY}/api/ai/illustration`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, brand: 'nxt', canvas: 'light', slot: 'thumbnail' }),
    });
    const j: any = await r.json();
    return j?.url ? `${PROXY}${j.url}` : '';
}

const behaviorImages = await Promise.all(behaviors.map(gen));
console.log('behaviorImages:', behaviorImages);

const html = slideDataToStageHtml({
    template: 'persona-card', brand: 'nxt',
    title: 'The repeat caller re-explains the same issue at every handoff',
    persona: {
        name: 'Sam Ortiz', role: 'SMB owner, 2-person team', descriptors: 'TIME-POOR · LOW-PATIENCE',
        quote: 'I keep re-explaining the same issue to a new person every single time.',
        quoteSource: 'Reddit r/smallbusiness',
        goals: { functionalGoal: 'Resolve in one contact', experienceGoal: 'Feel heard, not re-queued', lifeGoal: 'Keep the shop running' },
        painPoints: [{ label: 'Re-explaining', quote: 'every handoff resets the context', source: 'Interview' }],
        behaviors, behaviorImages,
        winConditions: ['One named owner end to end', 'A proactive callback before they ask'],
        stakes: 'One more reset and they switch providers at renewal.',
    },
} as any);

writeFileSync('D:/tmp/persona_stage.html', html, 'utf-8');
console.log('wrote D:/tmp/persona_stage.html');
