// Engagements managed as projects, through the page: open the manager, create two engagements, edit one's settings,
// tag and pin by multi-select, merge the two, separate, archive. Returns what the page showed at each step.
const log = [];
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:9460/', { waitUntil: 'load' });
await sleep(3000);
await page.locator('#menuBtn').click().catch(() => {});
await sleep(400);
await page.locator('#engManage').click();
await sleep(1500);
log.push('manager title: ' + await page.locator('#sheetTitle').innerText());
log.push('rows: ' + await page.locator('.engm__row').count());
await shot('eng-1-manager');
const stamp = Date.now().toString().slice(-5);
const A = `Project test A ${stamp}`, B = `Project test B ${stamp}`;
for (const name of [A, B]) {
  await page.locator('.engm__new input').fill(name);
  await page.locator('.engm__new button').click();
  await sleep(1500);
  log.push('after create, sheet: ' + await page.locator('#sheetTitle').innerText());
  if (name === A) {
    await page.locator('.engm__field input').nth(1).fill('Northeastern University');
    await page.locator('.engm__desc').fill('How undergraduates use AI assistants in advising.');
    await page.locator('.engm__field input').nth(2).fill('higher ed, advising');
    await page.locator('.engm__field select').nth(0).selectOption('90');
    await page.locator('.engm__field select').nth(1).selectOption('deep');
    await page.locator('.engm__field select').nth(2).selectOption('nu');
    await page.locator('.engm__field input').nth(3).fill('The provost and the advising directors');
    await page.locator('.engm__more summary').click();
    await sleep(300);
    const packRow = page.locator('.engm__packs .packrow', { hasText: 'Higher Ed' }).first();
    if (await packRow.count()) await packRow.locator('input').check();
    await shot('eng-2-settings');
  }
  await page.locator('#sheetActions button', { hasText: 'Save' }).click();
  await sleep(1800);
  log.push('after save, sheet: ' + await page.locator('#sheetTitle').innerText());
}
const rowA = page.locator('.engm__row', { hasText: A }), rowB = page.locator('.engm__row', { hasText: B });
log.push('row A: ' + (await rowA.innerText()).replace(/\s+/g, ' '));
// multi-select: tag and pin both
await rowA.locator('input[type=checkbox]').check();
await rowB.locator('input[type=checkbox]').check();
await sleep(300);
log.push('bar: ' + (await page.locator('.engm__bar').innerText()).replace(/\s+/g, ' '));
await page.locator('.engm__tagin').fill('pilot');
await page.locator('.engm__bar button', { hasText: 'Add tag' }).click();
await sleep(1500);
log.push('row B after tag: ' + (await page.locator('.engm__row', { hasText: B }).innerText()).replace(/\s+/g, ' '));
await page.locator('.engm__tag', { hasText: 'pilot' }).click();
await sleep(400);
log.push('rows with tag pilot: ' + await page.locator('.engm__row').count());
await shot('eng-3-tagged');
// merge the two
await page.locator('.engm__row', { hasText: A }).locator('input[type=checkbox]').check();
await page.locator('.engm__row', { hasText: B }).locator('input[type=checkbox]').check();
await page.locator('.engm__bar button', { hasText: 'Merge' }).click();
await sleep(800);
log.push('merge sheet: ' + await page.locator('#sheetTitle').innerText());
await shot('eng-4-merge');
await page.locator('#sheetActions button', { hasText: 'Merge' }).click();
await sleep(2500);
log.push('after merge, rows with tag: ' + await page.locator('.engm__row').count() + ' | ' + (await page.locator('.engm__row').first().innerText()).replace(/\s+/g, ' '));
// settings of A: merged list, separate
await page.locator('.engm__row', { hasText: A }).locator('button', { hasText: 'Settings' }).click();
await sleep(1500);
log.push('merged block: ' + (await page.locator('.engm__merged').innerText().catch(() => 'NONE')).replace(/\s+/g, ' '));
const vals = await page.locator('.engm__field select').evaluateAll((els) => els.map((e) => e.value));
log.push('saved defaults (period, depth, brand): ' + vals.join(', '));
await shot('eng-5-settings-merged');
await page.locator('.engm__mergedrow button', { hasText: 'Separate' }).click();
await sleep(1800);
log.push('after separate, merged block: ' + (await page.locator('.engm__merged').count()));
await page.locator('.engm__foot button', { hasText: 'Back to all' }).click();
await sleep(1500);
// archive both
for (const n of [A, B]) await page.locator('.engm__row', { hasText: n }).locator('input[type=checkbox]').check();
await page.locator('.engm__bar button', { hasText: 'Archive' }).click();
await sleep(1800);
log.push('after archive, test rows left: ' + await page.locator('.engm__row', { hasText: 'Project test' }).count());
log.push('archived link: ' + await page.locator('.engm > .linkbtn').innerText().catch(() => ''));
await shot('eng-6-after');
return { log, errors };
