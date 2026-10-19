// Règles pures partagées par le moteur 3D et la simulation sans rendu.
import { COUNTER_RULES, CREWS, ITEMS, PADS, STACK, type ItemType, type PadId } from './config';

// ---------------------------------------------------------------- Clients
export interface CustomerOrder { wantType: ItemType; want: number }

/** Ce dont une commande a besoin : ce que le comptoir achète en ce moment (progression.counterItem). */
export interface CounterNow { itemType: ItemType }

/** Un nouveau client demande TOUJOURS ce que son comptoir achète en ce moment. */
export function createOrder(counter: CounterNow, rng: () => number = Math.random, first = false): CustomerOrder {
  const [lo, hi] = ITEMS[counter.itemType].order;
  const want = first && counter.itemType === 'wood' ? COUNTER_RULES.firstWoodOrder : lo + Math.floor(rng() * (hi - lo + 1));
  const order: CustomerOrder = { wantType: counter.itemType, want };
  if (process.env.NODE_ENV !== 'production') {
    console.assert(order.wantType === counter.itemType, `client « ${order.wantType} » dans la file « ${counter.itemType} »`);
  }
  return order;
}

export interface QueuedOrder { wantType: ItemType; want: number; got: number }

/**
 * Bascule d'un comptoir vers un nouveau produit (machine construite) : le client en cours de service
 * (déjà servi au moins une fois) termine et part avec ce qu'il a reçu ; les autres passent une
 * nouvelle commande du nouveau produit. Modifie `queue` et renvoie les clients qui partent.
 */
export function switchQueue<T extends QueuedOrder>(queue: T[], item: ItemType, rng: () => number = Math.random): T[] {
  const leaving: T[] = [];
  for (let i = queue.length - 1; i >= 0; i--) {
    const c = queue[i];
    if (c.wantType === item) continue;
    if (c.got > 0) { leaving.unshift(c); queue.splice(i, 1); continue; }
    const o = createOrder({ itemType: item }, rng);
    c.wantType = o.wantType; c.want = o.want;
  }
  return leaving;
}

export function salePrice(item: ItemType): number { return ITEMS[item].price; }

// ---------------------------------------------------------------- Ouvriers
export interface CrewStats { cap: number; speed: number; chopRate: number }
export function crewStats(level: number): CrewStats {
  return {
    cap: CREWS.capBase + Math.round(level * CREWS.capPerLevel),
    speed: CREWS.speedBase + level * CREWS.speedPerLevel,
    chopRate: CREWS.chopBase * Math.pow(CREWS.chopMulPerLevel, level - 1),
  };
}
/** Nombre d'ouvriers d'une équipe à un niveau donné (1 au départ, +1 à chaque palier). */
export function crewSize(level: number): number {
  return level <= 0 ? 0 : 1 + CREWS.extraWorkerAt.filter((l) => level >= l).length;
}

// ---------------------------------------------------------------- Sac & maisons
const padDef = (id: PadId) => PADS.find((p) => p.id === id)!;

export function bagCapacity(base: number, bagLevel: number): number {
  let cap = base;
  padDef('bag').levels.slice(0, bagLevel).forEach((l) => { if (l.effect.kind === 'bag') cap = l.effect.cap; });
  return cap;
}

/** Revenu passif total ($/s) pour `houses` maisons construites. */
export function houseIncome(houses: number): number {
  return padDef('house').levels.slice(0, houses).reduce((s, l) => s + (l.effect.kind === 'house' ? l.effect.income : 0), 0);
}

/**
 * Revenu passif basé sur le temps réel écoulé (plafonné à `maxCatchup` secondes par frame).
 * Renvoie le nombre de ticks entiers à créditer et le reste à reporter.
 */
export function incomeTicks(acc: number, elapsed: number, tick: number, maxCatchup: number): { ticks: number; acc: number } {
  const a = acc + Math.min(Math.max(0, elapsed), maxCatchup);
  const ticks = Math.floor(a / tick);
  return { ticks, acc: a - ticks * tick };
}

// ---------------------------------------------------------------- Pile sur le dos
export interface StackSlot { x: number; y: number; level: number }

export function stackColumns(n: number): number {
  return n <= STACK.single ? 1 : n <= STACK.double ? 2 : 3;
}

const colY = [0, 0, 0];
/** Positions des objets portés : une tour, puis 2 ou 3 colonnes côte à côte. Réutilise `out`. */
export function stackLayout(heights: readonly number[], out: StackSlot[] = []): StackSlot[] {
  const n = heights.length;
  const cols = stackColumns(n);
  colY[0] = colY[1] = colY[2] = 0;
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const s = out[i] || (out[i] = { x: 0, y: 0, level: 0 });
    s.x = (c - (cols - 1) / 2) * STACK.colSpacing;
    s.y = colY[c];
    s.level = Math.floor(i / cols);
    colY[c] += heights[i];
  }
  out.length = n;
  return out;
}
