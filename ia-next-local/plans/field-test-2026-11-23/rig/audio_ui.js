// After an audio overview's script is ready in the page (run ui_case.js with an #audio message first, same conversation
// left open), this presses "Make the audio", approves it if an approval card appears, waits for the voices and checks
// that the card shows a player with a real duration (field test U2: the card stayed on "Script ready" and a panel
// showed an empty video player). env: MAXS (default 900), SHOT.
const name = process.env.SHOT || 'audio', maxS = Number(process.env.MAXS || 900);
const log = [];
const t0 = Date.now();
const stamp = (s) => log.push(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${s}`);
if (process.env.RELOAD) { await page.goto('http://127.0.0.1:9460/', { waitUntil: 'load' }); await sleep(3500); }
const make = page.locator('button', { hasText: 'Make the audio' }).last();
if (!(await make.count())) return { log, error: 'no "Make the audio" button on screen' };
await make.click();
stamp('pressed Make the audio');
await sleep(2500);
const approve = page.locator('button', { hasText: /^Approve/ }).last();
if (await approve.count()) { await approve.click(); stamp('approved on the card'); }
let seen = false;
while ((Date.now() - t0) / 1000 < maxS) {
  if (await page.locator('#thread audio.player').count()) { seen = true; break; }
  const pend = page.locator('button', { hasText: /^Approve/ }).last();
  if (await pend.count()) { await pend.click().catch(() => {}); stamp('approved'); }
  await sleep(4000);
}
stamp(seen ? 'an audio player is on the card without a reload' : 'no audio player appeared');
await sleep(1500);
await shot(`${name}-player`);
let duration = null;
if (seen) {
  duration = await page.locator('#thread audio.player').last().evaluate(async (a) => {
    a.preload = 'metadata'; a.load();
    await new Promise((r) => { a.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 8000); });
    return isFinite(a.duration) ? Math.round(a.duration) : null;
  });
  stamp(`player duration: ${duration} s`);
}
const videos = await page.locator('#thread video').count();
const card = await page.locator('#thread .task').last().innerText().catch(() => '');
return { log, playerOnCard: seen, durationSeconds: duration, videoElementsInThread: videos, card: card.replace(/\s+/g, ' ').slice(0, 500) };
