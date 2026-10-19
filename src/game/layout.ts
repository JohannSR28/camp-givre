// Géométrie locale des bâtiments, boîtes englobantes de la carte (test de chevauchement),
// projection à l'écran et distances (tests de compacité).
import {
  CAMERA, CANTEEN, CHAINS, CHAIN_IDS, CHAIN_Z, COUNTERS, COUNTER_RULES, FURNACE_CELL, HOUSE_SPOTS, MACHINES, PADS, PLAYER, ZONES, cellPos,
  type ChainId, type CounterId,
} from './config';

/** Comptoir : table au centre, dépôt derrière (côté machine), caisse à gauche, file vers le bas. */
export const COUNTER_LAYOUT = {
  table: { w: 2.7, d: 1.1 },
  drop: { dx: 0, dz: -1.65, w: 2.3, d: 1.62 },
  cash: { dx: -2.6, dz: 0.45, w: 1.5, d: 1.3 },
  crate: { dx: 2.1, dz: -0.15, w: 0.7, d: 0.7 },
  /** Panneau « icône + prix » au-dessus de la table. */
  sign: { dx: -1.9, dz: -0.2, y: 1.45 },
  /** Les clients arrivent et repartent par ce point (côté droit). */
  entry: { dx: 3, dz: 3.2 },
  customerRadius: 0.4,
};
export function queueSlot(i: number): { dx: number; dz: number } {
  return { dx: 0, dz: 1.35 + i * 0.95 };
}

/** Machine : entrée verte en haut (côté récolte), sortie orange en bas (côté comptoir). */
export const MACHINE_LAYOUT = { body: { w: 2, d: 1.6 }, io: { dz: 1.55, w: 1.75, d: 1.25 }, recipeY: 2.7 };
/** Tapis roulant : bande à droite de la chaîne, du bas de la machine jusqu'au dos de la table. */
export const BELT_LAYOUT = { dx: 1.55, w: 0.6, startDz: 0.9, endGap: 0.05 };
export const CANTEEN_LAYOUT = { body: { w: 2.6, d: 2 }, roofHalf: 1.48, input: { dx: 2.45, w: 1.75, d: 1.25 } };
export const HOUSE_LAYOUT = { half: { x: 1.24, z: 1.11 } };
export const FURNACE_RADIUS = 2.6;
export const PAD_SIZE = 2.5;
export const PAD_HALF = PAD_SIZE / 2;
export const NODE_VISUAL_R = { tree: 1.05, deer: 0.6, rock: 0.9 };
export const SIGN_HALF = { x: 1.05, z: 0.15 };

export interface Box { name: string; x0: number; x1: number; z0: number; z1: number; group?: string; chain?: ChainId }

const box = (name: string, x: number, z: number, hx: number, hz: number, extra: Partial<Box> = {}): Box =>
  ({ name, x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz, ...extra });

export function machineIO(id: keyof typeof MACHINES) {
  const { x, z } = cellPos(MACHINES[id].cell), io = MACHINE_LAYOUT.io;
  return { in: { x, z: z - io.dz }, out: { x, z: z + io.dz } };
}
export function counterDrop(id: CounterId) {
  const { x, z } = cellPos(COUNTERS[id].cell);
  return { x: x + COUNTER_LAYOUT.drop.dx, z: z + COUNTER_LAYOUT.drop.dz };
}
/** Début et fin du tapis roulant d'une chaîne (monde). */
export function beltPath(chain: ChainId) {
  const m = cellPos(MACHINES[CHAINS[chain].machine].cell), c = cellPos(COUNTERS[chain].cell);
  const x = m.x + BELT_LAYOUT.dx;
  return { from: { x, z: m.z + BELT_LAYOUT.startDz }, to: { x, z: c.z - COUNTER_LAYOUT.table.d / 2 - BELT_LAYOUT.endGap } };
}

export function counterBox(id: CounterId, chain?: ChainId): Box {
  const { x, z } = cellPos(COUNTERS[id].cell);
  const L = COUNTER_LAYOUT, last = queueSlot(4);
  return {
    name: `Comptoir ${id}`, chain,
    x0: x + L.cash.dx - L.cash.w / 2,
    x1: x + Math.max(L.entry.dx, L.crate.dx + L.crate.w / 2) + L.customerRadius,
    z0: z + L.drop.dz - L.drop.d / 2,
    z1: z + Math.max(L.entry.dz, last.dz) + L.customerRadius,
  };
}
/** Le comptoir décomposé en éléments réels (pour le test de chevauchement). */
export function counterParts(id: CounterId, chain?: ChainId): Box[] {
  const { x, z } = cellPos(COUNTERS[id].cell), L = COUNTER_LAYOUT, r = L.customerRadius;
  const first = queueSlot(0), last = queueSlot(COUNTER_RULES.queueLength - 1);
  return [
    box(`Comptoir ${id} : dépôt`, x + L.drop.dx, z + L.drop.dz, L.drop.w / 2, L.drop.d / 2, { chain }),
    { name: `Comptoir ${id} : table`, x0: x - L.table.w / 2, x1: x + L.crate.dx + L.crate.w / 2, z0: z - L.table.d / 2, z1: z + L.table.d / 2, chain },
    box(`Comptoir ${id} : caisse`, x + L.cash.dx, z + L.cash.dz, L.cash.w / 2, L.cash.d / 2, { chain }),
    { name: `Comptoir ${id} : file`, x0: x - r, x1: x + r, z0: z + first.dz - r, z1: z + last.dz + r, chain },
    box(`Comptoir ${id} : entrée`, x + L.entry.dx, z + L.entry.dz, r, r, { chain }),
  ];
}
function machineBox(id: keyof typeof MACHINES, chain?: ChainId): Box {
  const { x, z } = cellPos(MACHINES[id].cell), M = MACHINE_LAYOUT;
  return box(`Machine ${MACHINES[id].name}`, x, z, Math.max(M.body.w, M.io.w) / 2 + 0.05, M.io.dz + M.io.d / 2, { group: `build:${id}`, chain });
}
function zoneBox(item: keyof typeof ZONES, chain?: ChainId): Box {
  const zone = ZONES[item], { x, z } = cellPos(zone.cell), r = NODE_VISUAL_R[zone.node];
  return box(`Zone ${item}`, x, z, ((zone.grid[0] - 1) * zone.spacing[0]) / 2 + r, ((zone.grid[1] - 1) * zone.spacing[1]) / 2 + r, { group: `build:zone:${item}`, chain });
}
function beltBox(chain: ChainId): Box {
  const p = beltPath(chain);
  return { name: `Tapis ${chain}`, x0: p.from.x - BELT_LAYOUT.w / 2, x1: p.from.x + BELT_LAYOUT.w / 2, z0: p.from.z, z1: p.to.z, group: `build:belt:${chain}`, chain };
}

/** Toutes les boîtes des éléments de la carte, une fois tout construit. */
export function layoutBoxes(): Box[] {
  const boxes: Box[] = [];
  for (const id of CHAIN_IDS) {
    const ch = CHAINS[id];
    boxes.push(...counterParts(id, id), machineBox(ch.machine, id), zoneBox(ch.raw, id), beltBox(id));
    const { x } = cellPos({ col: ch.col, z: 0 });
    boxes.push(box(`Panneau ${id}`, x, CHAIN_Z.sign, SIGN_HALF.x, SIGN_HALF.z, { chain: id }));
  }
  boxes.push(...counterParts('tool'), machineBox('workshop'));
  for (const pad of PADS) {
    const { x, z } = cellPos(pad.cell);
    const e = pad.levels[0].effect;
    const group = e.kind === 'machine' ? `build:${e.machine}` : e.kind === 'zone' ? `build:zone:${e.zone}` : e.kind === 'belt' ? `build:belt:${e.chain}`
      : e.kind === 'canteen' ? 'build:canteen' : e.kind === 'furnace' ? 'build:furnace' : undefined;
    const chain = CHAIN_IDS.find((c) => CHAINS[c].theme === pad.theme);
    boxes.push(box(`Case ${pad.id}`, x, z, PAD_HALF, PAD_HALF, { group, chain }));
  }
  {
    const { x, z } = cellPos(CANTEEN.cell), C = CANTEEN_LAYOUT;
    boxes.push({ name: 'Cantine', x0: x - C.roofHalf, x1: x + C.input.dx + C.input.w / 2, z0: z - C.roofHalf * 0.8, z1: z + C.roofHalf * 0.8, group: 'build:canteen' });
  }
  HOUSE_SPOTS.forEach((c, i) => { const { x, z } = cellPos(c); boxes.push(box(`Maison ${i + 1}`, x, z, HOUSE_LAYOUT.half.x, HOUSE_LAYOUT.half.z)); });
  { const { x, z } = cellPos(FURNACE_CELL); boxes.push(box('Grand fourneau', x, z, FURNACE_RADIUS, FURNACE_RADIUS, { group: 'build:furnace' })); }
  { const { x, z } = cellPos(PLAYER.spawn); boxes.push(box('Départ', x, z, 0.5, 0.5)); }
  return boxes;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

/** Paires d'éléments qui se recouvrent (une case et ce qu'elle construit sur place sont autorisés). */
export function findOverlaps(boxes: Box[] = layoutBoxes()): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.group && a.group === b.group) continue;
      if (overlaps(a, b)) out.push([a.name, b.name]);
    }
  }
  return out;
}

/** Boîte englobant tous les éléments d'une chaîne. */
export function chainBox(chain: ChainId): Box {
  const bs = layoutBoxes().filter((b) => b.chain === chain);
  return { name: `Chaîne ${chain}`, x0: Math.min(...bs.map((b) => b.x0)), x1: Math.max(...bs.map((b) => b.x1)), z0: Math.min(...bs.map((b) => b.z0)), z1: Math.max(...bs.map((b) => b.z1)) };
}

// ---------------------------------------------------------------- Écran
/** Taille de la vue orthographique (unités monde) pour un écran w×h. */
export function viewSize(w: number, h: number): { width: number; height: number } {
  const a = w / h;
  const height = a < 1 ? Math.min(CAMERA.portraitWidth / a, CAMERA.portraitMax) : CAMERA.landscapeHeight;
  return { width: height * a, height };
}
/** Projette un point monde sur l'écran (unités monde, origine = point visé par la caméra). */
export function project(p: { x: number; y: number; z: number }, target: { x: number; z: number }) {
  const o = CAMERA.offset, len = Math.hypot(o.x, o.y, o.z);
  const d = { x: -o.x / len, y: -o.y / len, z: -o.z / len }; // direction de visée
  let r = { x: -d.z, y: 0, z: d.x }; const rl = Math.hypot(r.x, r.z); r = { x: r.x / rl, y: 0, z: r.z / rl }; // droite = d × haut
  const u = { x: r.y * d.z - r.z * d.y, y: r.z * d.x - r.x * d.z, z: r.x * d.y - r.y * d.x }; // haut = droite × d
  const q = { x: p.x - target.x, y: p.y, z: p.z - target.z };
  return { sx: q.x * r.x + q.y * r.y + q.z * r.z, sy: q.x * u.x + q.y * u.y + q.z * u.z };
}
