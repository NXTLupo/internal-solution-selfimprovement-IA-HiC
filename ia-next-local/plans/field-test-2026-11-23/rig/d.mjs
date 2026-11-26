// Driver: connects to the running Chromium over CDP and runs a snippet against the IA Next Local page.
// usage: node d.mjs "<js body using page, shot(name), text(sel)>"
import { chromium } from 'playwright-core';
import fs from 'fs';
const SHOTS = new URL('../shots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('9460')) || ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1600, height: 1000 });
const shot = async (name, full = false) => { const f = SHOTS + name + '.png'; await page.screenshot({ path: f, fullPage: full }); return f; };
const text = async (sel) => (await page.locator(sel).allInnerTexts()).join('\n---\n');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const body = process.argv[2].startsWith('@') ? fs.readFileSync(process.argv[2].slice(1), 'utf8') : process.argv[2];
try {
  const fn = new Function('page', 'shot', 'text', 'sleep', 'ctx', `return (async () => { ${body} })()`);
  const out = await fn(page, shot, text, sleep, ctx);
  if (out !== undefined) console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
} catch (e) { console.log('ERR', e.message.slice(0, 1500)); }
await browser.close();   // disconnects only (CDP); the browser keeps running
