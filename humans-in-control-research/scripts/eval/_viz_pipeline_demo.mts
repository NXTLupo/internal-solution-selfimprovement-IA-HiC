// Real-pipeline demo: an authored viz block -> slideDataToStageHtml (GOLD #slides archetype) ->
// the SAME GOLD stage HTML used for BOTH preview and the PPTX export. Writes the stage HTML so we
// can screenshot the preview AND feed it to gold_pptx_export for the editable .pptx.
import { writeFileSync } from 'node:fs';
import { slideDataToStageHtml } from '../../services/slideToStageHtml.ts';

const slide = {
    template: 'slides:section-divider',
    brand: 'nxt' as const,
    industry: 'advancement',
    title: 'Advancement runs on one shared donor record',
    composerPayload: { kicker: 'OPERATING MODEL', title: 'Advancement runs on one shared donor record' },
    viz: {
        family: 'operatingNetwork', industry: 'advancement', ground: 'dark', hub: 'Shared donor record',
        labels: ['Shared donor record', 'Gift Officers', 'Annual Giving', 'Major Gifts', 'Planned Giving', 'Stewardship', 'Prospect Research'],
        links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [6, 3]], seed: 1,
    },
};
const stage = slideDataToStageHtml(slide as any);
writeFileSync('scripts/eval/_viz_stage.html', stage);
const hasImg = stage.includes('data:image/svg+xml');
console.log('wrote _viz_stage.html | bytes', stage.length, '| viz img present:', hasImg);
