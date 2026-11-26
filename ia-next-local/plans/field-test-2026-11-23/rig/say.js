// Types process.env.MSG into the composer, sends, waits for the turn to end (status word leaves "Thinking").
const msg = process.env.MSG, name = process.env.SHOT || 'say', maxS = Number(process.env.MAXS || 240);
await page.fill('#input', msg);
const before = await page.locator('#thread > *').count();
const t0 = Date.now();
await page.press('#input', 'Enter');
await sleep(700);
let firstText = null, lastLen = -1;
while ((Date.now() - t0) / 1000 < maxS) {
  const w = await page.locator('#statusWord').innerText();
  const th = await page.locator('#thread').innerText().catch(() => '');
  if (firstText === null && th.length > lastLen && lastLen >= 0 && th.length - lastLen > 20) firstText = (Date.now() - t0) / 1000;
  if (lastLen < 0) lastLen = th.length;
  if (w !== 'Thinking' && (Date.now() - t0) > 2500) break;
  await sleep(500);
}
const secs = (Date.now() - t0) / 1000;
await sleep(1200);
await shot(name);
const kids = await page.locator('#thread > *').allInnerTexts();
return { secs, firstChangeAt: firstText, status: await page.locator('#statusWord').innerText(),
  focus: await page.locator('#focusBox').innerText().catch(() => ''), eng: await page.locator('#engBtnLabel').innerText(),
  packs: await page.locator('#packBtnLabel').innerText(), newTurns: kids.slice(before).map(t => t.slice(0, 2500)) };
