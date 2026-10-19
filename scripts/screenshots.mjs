// Captures téléphone (390×844) de chaque colonne et du village, via le navigateur local (Edge/Chrome).
// Usage : `npm run dev` dans un terminal, puis `npm run screenshots` (URL : CAMP_URL, défaut localhost:3000).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.env.CAMP_URL || 'http://localhost:3000';
const out = 'screenshots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: process.env.CAMP_BROWSER || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'assert') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__camp, null, { timeout: 30000 });
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name, x, z) => {
  if (x !== undefined) await page.evaluate(([x, z]) => window.__camp.teleport(x, z), [x, z]);
  await wait(1200);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('capture', name);
};

// le rendu headless démarre à ~1 fps : on attend que la case Sac ait fini d'apparaître
const padReady = (id) => page.waitForFunction((id) => { const p = window.__camp.pads().find((q) => q.id === id); return p.visible && p.scale === 1 && !p.busy; }, id, { timeout: 120000 });
await padReady('bag');
await shot('01-depart', 0, 1.5);
// Sac niv.1 et 2 achetés : le niv.3 (planches) doit apparaître grisé « Scierie requise »
await page.evaluate(() => { const c = window.__camp, p = c.pads().find((q) => q.id === 'bag'); c.money(70); c.teleport(p.x, p.z); });
await page.waitForFunction(() => window.__camp.state().pads.bag >= 2, null, { timeout: 120000 });
await page.evaluate(() => window.__camp.teleport(0, 1.5));
await padReady('bag');
await shot('02-sac-verrouille');

await page.evaluate(() => { window.__camp.money(1e6); window.__camp.unlockAll(); });
await wait(3500);
await page.evaluate(() => { document.getElementById('win').hidden = true; });
const state = await page.evaluate(() => window.__camp.state());
console.log('état après unlockAll :', JSON.stringify(state));

// une chaîne complète par écran (caméra centrée sur la chaîne)
const chains = { bois: -8, viande: 0, or: 8 };
for (const [name, x] of Object.entries(chains)) await shot(`chaine-${name}`, x, -11);
await shot('village-ouest', -4.5, 10);
await shot('village-est', 5, 10);
// bûches apportées au comptoir planches : bulle « Passe par la scierie ! »
await page.evaluate(() => { window.__camp.teleport(-8, 0); window.__camp.fill(6, 'wood'); });
await page.waitForTimeout(3000);
await page.evaluate(() => window.__camp.teleport(-8, -8.65));
await page.waitForFunction(() => window.__camp.hintVisible('wood'), null, { timeout: 60000 });
await shot('bulle-scierie');
// pile de 100 objets sur le dos (3 colonnes)
await page.evaluate(() => { window.__camp.teleport(0, 1.5); window.__camp.fill(100); });
await page.waitForTimeout(6000);
await shot('pile-100');

console.log(errors.length ? 'ERREURS CONSOLE :\n' + errors.join('\n') : 'Aucune erreur console.');
await browser.close();
