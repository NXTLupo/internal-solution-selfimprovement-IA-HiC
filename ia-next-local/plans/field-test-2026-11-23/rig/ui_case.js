// A case run through the page, as a person would: new conversation, (optionally) a new engagement by name, data packs
// picked in the composer, the message typed and sent, every plan card started, then the wait for each card to finish.
// env: MSG (required), ENGNAME (new engagement name), ENG (existing engagement id), PACKS (comma-separated pack names as
// shown, for example "Higher Ed,AI Trends"), SHOT (screenshot prefix), MAXS (seconds to wait for the work, default 1800),
// NOSTART=1 to stop at the plan cards.
// run: node d.mjs "@ui_case.js"   (d.mjs connects to the private Chromium on port 9333)
const msg = process.env.MSG, name = process.env.SHOT || 'ui', maxS = Number(process.env.MAXS || 1800);
const log = [];
const t00 = Date.now();
const stamp = (s) => log.push(`[${((Date.now() - t00) / 1000).toFixed(0)} s] ${s}`);
await page.goto('http://127.0.0.1:9460/', { waitUntil: 'load' });
await sleep(2500);
await page.click('#newConv');
await sleep(600);
if (process.env.ENGNAME || process.env.ENG) {
  await page.click('#engBtn');
  await sleep(700);
  if (process.env.ENGNAME) {
    await page.fill('.enpick__name', process.env.ENGNAME);
    await page.locator('.enpick__create button', { hasText: 'Create' }).click();
  } else {
    await page.locator('.enpick__row', { hasText: process.env.ENGTITLE || '' }).first().click();
  }
  await sleep(1500);
  await page.keyboard.press('Escape').catch(() => {});
  stamp(`engagement: ${await page.locator('#engBtnLabel').innerText()}`);
}
if (process.env.PACKS) {
  await page.click('#packBtn');
  await sleep(1200);
  for (const p of process.env.PACKS.split(',').map((s) => s.trim()).filter(Boolean)) {
    await page.locator('.packrow', { has: page.locator('.packrow__name', { hasText: p }) }).first().click();
    await sleep(250);
  }
  await page.keyboard.press('Escape');
  await sleep(500);
  stamp(`packs: ${await page.locator('#packBtnLabel').innerText()}`);
}
await page.fill('#input', msg);
const before = await page.locator('#thread > *').count();
const t0 = Date.now();
await page.press('#input', 'Enter');
await sleep(800);
while ((Date.now() - t0) / 1000 < 180) {
  const w = await page.locator('#statusWord').innerText();
  if (w !== 'Thinking' && (Date.now() - t0) > 2500) break;
  await sleep(400);
}
const replySecs = (Date.now() - t0) / 1000;
await sleep(1500);
const reply = (await page.locator('#thread > *').allInnerTexts()).slice(before).join('\n').slice(0, 1800);
stamp(`reply in ${replySecs.toFixed(1)} s`);
await shot(`${name}-reply`);
const plans = page.locator('#thread .plan');
const nPlans = await plans.count();
stamp(`${nPlans} plan card(s)`);
if (!nPlans || process.env.NOSTART) return { log, reply, plans: nPlans };
for (let i = 0; i < nPlans; i++) {
  const btn = plans.nth(i).locator('button', { hasText: 'Start' });
  if (await btn.count()) { await btn.first().click(); await sleep(900); }
}
stamp('started every plan');
await shot(`${name}-started`);
let firstFeed = null, lastStates = '';
while ((Date.now() - t0) / 1000 < maxS) {
  const states = await plans.evaluateAll((els) => els.map((e) => e.getAttribute('data-status')));
  if (!firstFeed && await page.locator('#thread .livefeed__row').count()) {
    firstFeed = (Date.now() - t0) / 1000;
    stamp(`first live row on screen: ${(await page.locator('#thread .livefeed__row').first().innerText()).slice(0, 120).replace(/\n/g, ' | ')}`);
    await shot(`${name}-live`);
  }
  const s = states.join(',');
  if (s !== lastStates) { lastStates = s; stamp(`plans: ${s}`); }
  if (states.every((x) => ['done', 'failed', 'dismissed'].includes(x))) break;
  await sleep(4000);
}
await sleep(2500);
await shot(`${name}-done`);
const cards = await page.locator('#thread .task').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-task'),
  text: e.innerText.replace(/\s+/g, ' ').slice(0, 420) })));
return { log, reply: reply.slice(0, 600), plans: nPlans, firstLiveRowSeconds: firstFeed, totalSeconds: (Date.now() - t0) / 1000, cards };
