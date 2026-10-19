// Règles de progression : ce qui est produisible, l'état d'une case, et le validateur
// qui garantit que la partie est finissable sans blocage.
import { CONFIG, ITEMS, ITEM_TYPES, type CounterDef, type GameConfig, type ItemType, type PadDef, type PadId, type PadRef, type ZoneDef } from './config';

/** Nombre de niveaux achetés pour chaque case. */
export interface ProgressState { level(id: PadId): number }

export function parseRef(ref: PadRef): { id: PadId; level: number } {
  const [id, lv] = ref.split('#');
  return { id: id as PadId, level: lv ? Number(lv) : 1 };
}

export type Producer =
  | { always: true }
  | { always: false; pad: PadId; level: number; lockedText: string };

/** Qui rend un objet produisible : une zone ouverte dès le départ, ou la case qui débloque sa zone / sa machine. */
export function producerOf(item: ItemType, cfg: GameConfig = CONFIG): Producer | null {
  const zone = (cfg.zones as Partial<Record<ItemType, ZoneDef>>)[item];
  if (zone?.startUnlocked) return { always: true };
  for (const pad of cfg.pads) {
    for (let i = 0; i < pad.levels.length; i++) {
      const e = pad.levels[i].effect;
      if (e.kind === 'zone' && e.zone === item) return { always: false, pad: pad.id, level: i + 1, lockedText: zone?.lockedText ?? '' };
      if (e.kind === 'machine' && cfg.machines[e.machine].output === item) {
        return { always: false, pad: pad.id, level: i + 1, lockedText: cfg.machines[e.machine].lockedText };
      }
    }
  }
  return null;
}

/** Ressource brute : sa zone de récolte est débloquée. Produit : sa machine est construite. */
export function isProducible(item: ItemType, s: ProgressState, cfg: GameConfig = CONFIG): boolean {
  const p = producerOf(item, cfg);
  if (!p) return false;
  return p.always || s.level(p.pad) >= p.level;
}

/** Ce qu'un comptoir achète en ce moment : la ressource brute, puis le produit une fois sa machine construite. */
export function counterItem(counter: CounterDef, s: ProgressState, cfg: GameConfig = CONFIG): ItemType {
  if (counter.items.length === 2 && counter.upgrade && isProducible(cfg.machines[counter.upgrade].output, s, cfg)) return counter.items[1];
  return counter.items[0];
}

export type PadStatus =
  | { kind: 'hidden' }
  | { kind: 'done' }
  | { kind: 'locked'; level: number; lockedText: string }
  | { kind: 'open'; level: number };

export function refDone(ref: PadRef, s: ProgressState): boolean {
  const { id, level } = parseRef(ref);
  return s.level(id) >= level;
}

/**
 * hidden : condition `requires` pas remplie (niveau 1 seulement, les niveaux suivants
 * réapparaissent au même endroit). locked : un matériau n'est pas encore produisible,
 * la case s'affiche grisée avec le nom de la machine manquante. open : payable.
 */
export function padStatus(pad: PadDef, s: ProgressState, cfg: GameConfig = CONFIG): PadStatus {
  const lv = s.level(pad.id);
  if (lv >= pad.levels.length) return { kind: 'done' };
  if (lv === 0 && !pad.requires.every((r) => refDone(r, s))) return { kind: 'hidden' };
  const mats = pad.levels[lv].mats || {};
  for (const k of Object.keys(mats) as ItemType[]) {
    if (!isProducible(k, s, cfg)) {
      const p = producerOf(k, cfg);
      return { kind: 'locked', level: lv, lockedText: p && !p.always ? p.lockedText : 'Bloqué' };
    }
  }
  return { kind: 'open', level: lv };
}

// ---------------------------------------------------------------- Validateur
export class ProgressionError extends Error {
  constructor(public pad: string, message: string) {
    super(message);
    this.name = 'ProgressionError';
  }
}

interface Node { key: string; pad: PadDef; level: number; label: string; deps: string[]; matDeps: { item: ItemType; producer: string }[] }

const nodeKey = (id: string, level: number) => `${id}#${level}`;

/** Construit le graphe cases → matériaux → machines → cases qui les débloquent. */
export function buildGraph(cfg: GameConfig = CONFIG): Map<string, Node> {
  const nodes = new Map<string, Node>();
  const padById = new Map(cfg.pads.map((p) => [p.id, p]));
  const name = (item: ItemType) => ITEMS[item].name;
  for (const pad of cfg.pads) {
    pad.levels.forEach((lvl, i) => {
      const level = i + 1;
      const label = lvl.label;
      const deps: string[] = [];
      const matDeps: Node['matDeps'] = [];
      if (level > 1) deps.push(nodeKey(pad.id, level - 1));
      else {
        for (const r of pad.requires) {
          const { id, level: rl } = parseRef(r);
          const target = padById.get(id);
          if (!target) throw new ProgressionError(label, `Case « ${label} » : la condition « ${r} » vise une case inconnue.`);
          if (rl < 1 || rl > target.levels.length) throw new ProgressionError(label, `Case « ${label} » : la condition « ${r} » vise un niveau inexistant.`);
          deps.push(nodeKey(id, rl));
        }
      }
      const needs: ItemType[] = Object.keys(lvl.mats || {}) as ItemType[];
      // une machine doit pouvoir être alimentée dès qu'elle est construite
      if (lvl.effect.kind === 'machine') needs.push(...(Object.keys(cfg.machines[lvl.effect.machine].recipe) as ItemType[]));
      // un tapis n'a de sens qu'une fois la machine de sa chaîne construite
      if (lvl.effect.kind === 'belt') needs.push(cfg.machines[cfg.chains[lvl.effect.chain].machine].output);
      for (const item of needs) {
        const p = producerOf(item, cfg);
        if (!p) throw new ProgressionError(label, `Case « ${label} » : rien ne produit « ${name(item)} ».`);
        if (p.always) continue;
        const prod = nodeKey(p.pad, p.level);
        deps.push(prod);
        matDeps.push({ item, producer: prod });
      }
      nodes.set(nodeKey(pad.id, level), { key: nodeKey(pad.id, level), pad, level, label, deps, matDeps });
    });
  }
  return nodes;
}

/** Ensemble des nœuds débloquables en partant de rien, sans jamais acheter `excluded`. */
export function reachable(nodes: Map<string, Node>, excluded?: string): Set<string> {
  const done = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes.values()) {
      if (done.has(n.key) || n.key === excluded) continue;
      if (n.deps.every((d) => done.has(d))) { done.add(n.key); changed = true; }
    }
  }
  return done;
}

/** Lève une ProgressionError nommant la case fautive si la partie peut se bloquer. */
export function validateProgression(cfg: GameConfig = CONFIG): { nodes: number; order: string[] } {
  const nodes = buildGraph(cfg);
  const label = (k: string) => nodes.get(k)?.label ?? k;

  // 1. absence de cycle
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (k: string) => {
    if (state.get(k) === 2) return;
    if (state.get(k) === 1) {
      const cycle = stack.slice(stack.indexOf(k)).concat(k).map(label);
      throw new ProgressionError(label(k), `Cycle de progression autour de « ${label(k)} » : ${cycle.join(' → ')}.`);
    }
    state.set(k, 1); stack.push(k);
    for (const d of nodes.get(k)!.deps) visit(d);
    stack.pop(); state.set(k, 2);
  };
  for (const k of nodes.keys()) visit(k);

  // 2. chaque matériau exigé est produisible sans passer par la case qui l'exige
  for (const n of nodes.values()) {
    if (!n.matDeps.length) continue;
    const without = reachable(nodes, n.key);
    for (const m of n.matDeps) {
      if (!without.has(m.producer)) {
        throw new ProgressionError(n.label, `Case « ${n.label} » : « ${ITEMS[m.item].name} » est produit par « ${label(m.producer)} », qui n'est atteignable qu'en passant par « ${n.label} ».`);
      }
    }
  }

  // 3. le Grand fourneau (et tout le reste) est atteignable
  const all = reachable(nodes);
  const goal = cfg.pads.find((p) => p.id === cfg.goal);
  if (!goal) throw new ProgressionError(cfg.goal, `Objectif « ${cfg.goal} » introuvable.`);
  const goalKey = nodeKey(goal.id, goal.levels.length);
  if (!all.has(goalKey)) throw new ProgressionError(label(goalKey), `« ${label(goalKey)} » n'est pas atteignable.`);
  for (const n of nodes.values()) {
    if (!all.has(n.key)) throw new ProgressionError(n.label, `Case « ${n.label} » jamais atteignable.`);
  }

  // 4. tout objet a toujours un débouché : vendu à un comptoir, ou consommé par la machine
  //    qui remplace la ressource brute quand le comptoir de la chaîne bascule sur le produit
  for (const item of ITEM_TYPES) {
    const c = Object.values(cfg.counters).find((k) => (k.items as ItemType[]).includes(item));
    if (!c) throw new ProgressionError(ITEMS[item].name, `Aucun comptoir n'achète « ${ITEMS[item].name} ».`);
  }
  for (const c of Object.values(cfg.counters)) {
    if (c.items.length !== 2) continue;
    const m = c.upgrade && cfg.machines[c.upgrade];
    if (!m || m.output !== c.items[1] || !m.recipe[c.items[0]]) {
      throw new ProgressionError(`comptoir ${c.id}`, `Le comptoir « ${c.id} » bascule de « ${ITEMS[c.items[0]].name} » vers « ${ITEMS[c.items[1]].name} » sans machine qui transforme l'un en l'autre.`);
    }
  }

  // ordre topologique (utile pour le debug)
  const order: string[] = [];
  const seen = new Set<string>();
  const topo = (k: string) => { if (seen.has(k)) return; seen.add(k); nodes.get(k)!.deps.forEach(topo); order.push(label(k)); };
  for (const k of nodes.keys()) topo(k);
  return { nodes: nodes.size, order };
}
