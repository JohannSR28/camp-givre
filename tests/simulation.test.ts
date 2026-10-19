import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/game/config';
import { EconomySim, type SimResult } from '../src/game/sim';

const fmt = (t: number) => `${Math.floor(t / 60)} min ${String(Math.round(t % 60)).padStart(2, '0')} s`;

function report(seed: number, r: SimResult) {
  const lines = [`— Simulation (graine ${seed}) : ${r.finished ? 'Grand fourneau en ' + fmt(r.finishTime!) : 'NON TERMINÉE'}`];
  for (const e of r.timeline) lines.push(`  ${fmt(e.t).padStart(11)}  ${e.label}`);
  lines.push('  Argent : ' + Object.entries(r.moneyAt).map(([m, v]) => `${m} min = ${v} $`).join(' · '));
  lines.push(`  Plus longue attente sans déblocage : ${fmt(r.maxGap)} (avant « ${r.maxGapBefore} »)`);
  lines.push('  Flux : ' + r.accumulations.map((a) => `${ITEMS[a.item].name} pic ${a.peak} / vendus ${a.sold} / consommés ${a.consumed}`).join(' · '));
  if (r.warnings.length) lines.push('  Alertes : ' + r.warnings.join(' | '));
  console.log(lines.join('\n'));
}

describe("simulation d'économie (bot glouton, sans rendu)", () => {
  for (const seed of [1, 2, 3]) {
    it(`graine ${seed} : atteint le Grand fourneau sans blocage de plus de 3 min`, () => {
      const r = new EconomySim(seed).run(60, 3);
      report(seed, r);
      expect(r.finished).toBe(true);
      expect(r.maxGap).toBeLessThan(180);
      const hoarded = r.accumulations.filter((a) => a.peak > 30 && a.sold === 0 && a.consumed === 0);
      expect(hoarded, 'produits accumulés sans débouché').toEqual([]);
    });
  }
});
