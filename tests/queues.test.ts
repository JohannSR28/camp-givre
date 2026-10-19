import { describe, expect, it, vi } from 'vitest';
import { COUNTERS, ITEMS, type CounterId, type ItemType } from '../src/game/config';
import { counterItem } from '../src/game/progression';
import { createOrder, switchQueue, type QueuedOrder } from '../src/game/rules';

const state = (levels: Record<string, number>) => ({ level: (id: string) => levels[id] ?? 0 });

describe('files de clients', () => {
  for (const id of Object.keys(COUNTERS) as CounterId[]) {
    for (const item of COUNTERS[id].items as ItemType[]) {
      it(`comptoir ${id} qui achète « ${ITEMS[item].name} » : 500 nouveaux clients demandent tous ce produit`, () => {
        const assert = vi.spyOn(console, 'assert');
        for (let i = 0; i < 500; i++) {
          const o = createOrder({ itemType: item }, Math.random, i === 0);
          expect(o.wantType).toBe(item);
          const [lo, hi] = ITEMS[item].order;
          if (!(i === 0 && item === 'wood')) { expect(o.want).toBeGreaterThanOrEqual(lo); expect(o.want).toBeLessThanOrEqual(hi); }
        }
        expect(assert.mock.calls.length).toBe(500);
        expect(assert.mock.calls.every(([ok]) => ok === true)).toBe(true);
        assert.mockRestore();
      });
    }
  }

  it('un comptoir de chaîne achète le brut, puis uniquement le produit une fois la machine construite', () => {
    expect(counterItem(COUNTERS.wood, state({}))).toBe('wood');
    expect(counterItem(COUNTERS.wood, state({ saw: 1 }))).toBe('plank');
    expect(counterItem(COUNTERS.meat, state({ hunt: 1 }))).toBe('meat');
    expect(counterItem(COUNTERS.meat, state({ hunt: 1, grill: 1 }))).toBe('steak');
    expect(counterItem(COUNTERS.gold, state({ mine: 1, forge: 1 }))).toBe('ingot');
    expect(counterItem(COUNTERS.tool, state({ workshop: 1 }))).toBe('tool');
  });

  it('chaque comptoir a un seul type à la fois et bascule au plus une fois', () => {
    for (const c of Object.values(COUNTERS)) expect(c.items.length).toBeLessThanOrEqual(2);
  });

  it('bascule : le client en cours termine, les autres redemandent le nouveau produit', () => {
    for (let run = 0; run < 100; run++) {
      const queue: QueuedOrder[] = [
        { wantType: 'wood', want: 3, got: 1 },
        ...Array.from({ length: 4 }, () => ({ ...createOrder({ itemType: 'wood' }), got: 0 })),
      ];
      const leaving = switchQueue(queue, 'plank');
      expect(leaving).toHaveLength(1);
      expect(leaving[0].wantType).toBe('wood');
      expect(queue).toHaveLength(4);
      expect(queue.every((c) => c.wantType === 'plank')).toBe(true);
    }
  });
});
