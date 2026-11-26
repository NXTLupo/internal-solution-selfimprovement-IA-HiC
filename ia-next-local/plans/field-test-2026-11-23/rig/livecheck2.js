// With an engagement sheet open, opens its first work card and reads the running card and its live feed.
await page.goto('http://127.0.0.1:9460/', { waitUntil: 'load' });
await sleep(2500);
await page.click(`[data-eng="${process.env.ENG}"]`);
await sleep(2000);
await page.locator('#sheetBody button', { hasText: 'Open' }).first().click();
await sleep(6500);
await shot(process.env.SHOT || 'b7-live-card');
const feed = await page.locator('.livefeed').first().innerText().catch(() => '(no live feed on screen)');
const card = await page.locator('#sheetBody .task').first().innerText().catch(() => '');
return { title: await page.locator('#sheetTitle').innerText(), card: card.slice(0, 700), feed: feed.slice(0, 1800) };
