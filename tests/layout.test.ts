import { describe, expect, it } from 'vitest';
import { CHAINS, CHAIN_IDS, COUNTERS, GRID, MACHINES, PADS, PLAYER, WORLD, ZONES, cellPos } from '../src/game/config';
import { NODE_VISUAL_R, chainBox, counterDrop, findOverlaps, layoutBoxes, machineIO, project, viewSize, MACHINE_LAYOUT, COUNTER_LAYOUT } from '../src/game/layout';
import { stackColumns, stackLayout } from '../src/game/rules';

const spawn = cellPos(PLAYER.spawn);
const nearest = (b: { x0: number; x1: number; z0: number; z1: number }, p: { x: number; z: number }) =>
  Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.z0 - p.z, 0, p.z - b.z1));

describe('disposition de la carte', () => {
  it('aucun élément ne se chevauche', () => {
    expect(findOverlaps()).toEqual([]);
  });

  it('tout tient dans les limites du monde', () => {
    for (const b of layoutBoxes()) {
      expect(b.x0, b.name).toBeGreaterThanOrEqual(WORLD.minX);
      expect(b.x1, b.name).toBeLessThanOrEqual(WORLD.maxX);
      expect(b.z0, b.name).toBeGreaterThanOrEqual(WORLD.minZ);
      expect(b.z1, b.name).toBeLessThanOrEqual(WORLD.maxZ);
    }
  });

  it('les chaînes sont parallèles, à 8 unités, dans le même ordre : récolte → machine → comptoir', () => {
    expect(GRID.colSpacing).toBe(8);
    CHAIN_IDS.forEach((id, i) => {
      const ch = CHAINS[id], x = (i - 1) * 8;
      const zone = cellPos(ZONES[ch.raw].cell), m = cellPos(MACHINES[ch.machine].cell), c = cellPos(COUNTERS[id].cell);
      expect([zone.x, m.x, c.x]).toEqual([x, x, x]);
      expect(zone.z).toBeLessThan(m.z);
      expect(m.z).toBeLessThan(c.z);
    });
  });

  it("l'entrée de la machine touche la zone de récolte, sa sortie est à 2 unités max du dépôt", () => {
    for (const id of CHAIN_IDS) {
      const ch = CHAINS[id], zone = ZONES[ch.raw], z = cellPos(zone.cell);
      const zoneBottom = z.z + ((zone.grid[1] - 1) * zone.spacing[1]) / 2 + NODE_VISUAL_R[zone.node];
      const io = machineIO(ch.machine), inTop = io.in.z - MACHINE_LAYOUT.io.d / 2;
      expect(inTop - zoneBottom, id).toBeGreaterThanOrEqual(0);
      expect(inTop - zoneBottom, id).toBeLessThanOrEqual(0.6);
      const drop = counterDrop(id);
      expect(Math.hypot(drop.x - io.out.x, drop.z - io.out.z), id).toBeLessThanOrEqual(2);
      // espacement entre étapes : 2 à 3 unités max de bord à bord
      expect(drop.z - COUNTER_LAYOUT.drop.d / 2 - (io.out.z + MACHINE_LAYOUT.io.d / 2)).toBeLessThanOrEqual(3);
    }
  });

  it('le hub est à 6 unités max de chaque chaîne', () => {
    for (const id of CHAIN_IDS) expect(nearest(chainBox(id), spawn), id).toBeLessThanOrEqual(6);
  });

  it('depuis le hub, tout bâtiment est à 6 s de marche max (vitesse de base)', () => {
    for (const b of layoutBoxes()) {
      const c = { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 };
      expect(Math.hypot(c.x - spawn.x, c.z - spawn.z) / PLAYER.speed, b.name).toBeLessThanOrEqual(6);
    }
  });

  it("une chaîne complète tient dans un écran de téléphone 390×844 sans bouger la caméra", () => {
    const view = viewSize(390, 844);
    const hudTop = view.height * 0.14; // logo + compteurs
    for (const id of CHAIN_IDS) {
      const b = chainBox(id), target = { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 };
      const pts = [];
      for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [0, 3]) pts.push(project({ x, y, z }, target));
      const sx = pts.map((p) => p.sx), sy = pts.map((p) => p.sy);
      const height = Math.max(...sy) - Math.min(...sy), width = Math.max(...sx) - Math.min(...sx);
      expect(width, id).toBeLessThanOrEqual(view.width);
      expect(height, id).toBeLessThanOrEqual(view.height - hudTop);
    }
  });

  it('chaque case de chaîne est dans sa colonne, Sac et Hache dans le hub', () => {
    for (const p of PADS) {
      const { x } = cellPos(p.cell);
      if (p.id === 'bag' || p.id === 'axe') expect(p.cell.z).toBe(PLAYER.spawn.z);
      else if (p.theme !== 'village') expect(Math.abs(x - CHAINS[p.theme as keyof typeof CHAINS].col * 8), p.id).toBeLessThan(4);
      else expect(p.cell.z).toBeGreaterThan(PLAYER.spawn.z);
    }
  });
});

describe('pile sur le dos', () => {
  it('une tour jusqu’à 25, puis 2 puis 3 colonnes', () => {
    expect(stackColumns(25)).toBe(1);
    expect(stackColumns(26)).toBe(2);
    expect(stackColumns(51)).toBe(3);
  });
  it('100 objets restent en 3 colonnes d’au plus 34 étages', () => {
    const slots = stackLayout(new Array(100).fill(0.15));
    expect(new Set(slots.map((s) => s.x)).size).toBe(3);
    expect(Math.max(...slots.map((s) => s.level))).toBe(33);
  });
});
