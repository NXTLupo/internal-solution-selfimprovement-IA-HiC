// Opens process.env.URL in a new tab at 1600 wide, screenshots the top and (FULL=1) the whole page, returns its text start.
const p = await ctx.newPage();
await p.setViewportSize({ width: 1600, height: 1000 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await sleep(1500);
const name = process.env.SHOT || 'view';
const SH = 'C:/Users/JonathanLupo/AppData/Local/Temp/claude/b9ee033047dc9221/c468b219-c717-4229-83ff-783ba86fa37a/scratchpad/shots/';
await p.screenshot({ path: SH + name + '.png' });
if (process.env.FULL) await p.screenshot({ path: SH + name + '-full.png', fullPage: true });
if (process.env.CLICK) { await p.locator(process.env.CLICK).first().click(); await sleep(500); await p.screenshot({ path: SH + name + '-click.png' }); }
const txt = (await p.locator('body').innerText()).slice(0, Number(process.env.CHARS || 2500));
await p.close();
return txt;
