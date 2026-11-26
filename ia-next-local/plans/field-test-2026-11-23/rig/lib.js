// Reloads the page, opens the Library, types a query, opens the first result, screenshots each state.
await page.goto('http://127.0.0.1:9460/', { waitUntil: 'load' });
await sleep(2500);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
await page.click('button[data-panel="library"]');
await sleep(1200);
await shot('b6-library-open');
const t0 = Date.now();
await page.fill('.lib__q', 'students AI trust');
await page.waitForFunction(() => /ms$/.test(document.querySelector('.lib__meta')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
await sleep(500);
const meta = await page.locator('.lib__top .lib__meta').innerText();
const rows = await page.locator('.lib__row').count();
if (rows) { await page.locator('.lib__row').first().click(); await sleep(900); }
await shot('b6-library-search');
const facets = await page.locator('.lib__facet').allInnerTexts();
return { meta, rows, typedToShownMs: Date.now() - t0, facets: facets.map((f) => f.replace(/\n/g, ' | ').slice(0, 260)), errors,
  viewTitle: await page.locator('.lib__title').innerText().catch(() => '') };
