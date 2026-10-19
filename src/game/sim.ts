// Simulation d'économie sans rendu : même config, mêmes règles partagées (commandes clients et bascule
// des comptoirs, état des cases, stats des ouvriers, revenu des maisons) et mêmes cadences que le moteur 3D
// (coupe, dépôt 0,06 s/objet, service 0,16 s/objet, paiement des cases, temps machine, tapis roulants),
// avec un bot glouton à la place du joueur. Les déplacements sont en ligne droite (pas de collisions).
import {
  BELT, CANTEEN, CHAINS, CHAIN_IDS, COUNTERS, COUNTER_IDS, COUNTER_RULES, COURIER, INCOME, ITEMS, ITEM_TYPES, MACHINES, MACHINE_LIMITS, PADS, PLAYER, ZONES, cellPos,
  type ChainId, type CounterId, type CrewId, type ItemType, type MachineId, type PadDef, type PadId, type RawItem,
} from './config';
import { CANTEEN_LAYOUT, COUNTER_LAYOUT, beltPath, machineIO } from './layout';
import { counterItem, isProducible, padStatus, type ProgressState } from './progression';
import { createOrder, crewSize, crewStats, houseIncome, incomeTicks, salePrice, switchQueue, type QueuedOrder } from './rules';

type P = { x: number; z: number };
interface CounterS { id: CounterId; item: ItemType; drop: P; cashPos: P; stock: number; cash: number; head: QueuedOrder | null; nextAt: number; serveCD: number; first: boolean }
interface MachineS { id: MachineId; out: ItemType; recipe: Partial<Record<ItemType, number>>; time: number; inPos: P; outPos: P; inp: Partial<Record<ItemType, number>>; outN: number; busy: number }
interface BeltS { chain: ChainId; cd: number; transit: number[]; travel: number }
interface NodeS { type: RawItem; x: number; z: number; r: number; hp: number; maxHp: number; alive: boolean; respawn: number; respawnTime: number }
interface Job { from: MachineId; item: ItemType; to: 'canteen' | 'workshop' | CounterId; want: number }
type Task =
  | { kind: 'harvest'; item: RawItem }
  | { kind: 'deliver' }
  | { kind: 'collect'; counter: CounterId }
  | { kind: 'pay'; pad: PadId; idle: number }
  | { kind: 'fetch'; machine: MachineId; wait: number };
interface Agent {
  role: 'player' | 'harvester' | 'courier'; crew?: CrewId; filter?: RawItem;
  x: number; z: number; speed: number; cap: number; chopRate: number; chopCD: number;
  carry: ItemType[]; depCD: number; pickCD: number; fedT: number; slot: number;
  state: 'gather' | 'deliver'; target: NodeS | null; stuckT: number; fallback: boolean;
  job: Job | null; task: Task | null; zone: string | null;
}

export interface SimResult {
  finished: boolean;
  finishTime: number | null;
  timeline: { t: number; label: string; money: number }[];
  moneyAt: Record<number, number>;
  maxGap: number;
  maxGapBefore: string;
  accumulations: { item: ItemType; peak: number; sold: number; consumed: number }[];
  warnings: string[];
}

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.z - b.z);
const inBox = (a: P, c: P, hx: number, hz: number) => Math.abs(a.x - c.x) < hx && Math.abs(a.z - c.z) < hz;

export class EconomySim {
  t = 0;
  money = 0;
  readonly dt: number;
  private rng: () => number;
  lv: Partial<Record<PadId, number>> = {};
  paid: Partial<Record<PadId, number>> = {};
  got: Partial<Record<PadId, Partial<Record<ItemType, number>>>> = {};
  payCD: Partial<Record<PadId, number>> = {};
  counters: Partial<Record<CounterId, CounterS>> = {};
  machines: Partial<Record<MachineId, MachineS>> = {};
  belts: Partial<Record<ChainId, BeltS>> = {};
  nodes: NodeS[] = [];
  agents: Agent[] = [];
  crews: Partial<Record<CrewId, number>> = {};
  canteen: { inPos: P; stock: number; eatT: number } | null = null;
  houses = 0;
  incomeAcc = 0;
  open: Record<RawItem, boolean> = { wood: false, meat: false, gold: false };
  sold: Record<string, number> = {};
  consumed: Record<string, number> = {};
  peak: Record<string, number> = {};
  timeline: SimResult['timeline'] = [];
  warnings: string[] = [];
  player: Agent;
  progress: ProgressState = { level: (id) => this.lv[id] ?? 0 };
  finished = false;

  constructor(seed = 1, dt = 0.05) {
    this.dt = dt;
    this.rng = mulberry32(seed);
    for (const k of ITEM_TYPES) { this.sold[k] = 0; this.consumed[k] = 0; this.peak[k] = 0; }
    for (const z of Object.values(ZONES)) if (z.startUnlocked) this.openZone(z.item);
    this.syncCounters();
    this.counters.wood!.cash = COUNTER_RULES.startCash.bills * COUNTER_RULES.startCash.value;
    this.player = this.makeAgent('player', cellPos(PLAYER.spawn), PLAYER.cap, PLAYER.speed, PLAYER.chopRate);
  }

  // ------------------------------------------------------------ monde
  private makeAgent(role: Agent['role'], p: P, cap: number, speed: number, chopRate: number): Agent {
    const a: Agent = { role, x: p.x, z: p.z, speed, cap, chopRate, chopCD: 0, carry: [], depCD: 0, pickCD: 0, fedT: 0, slot: 0, state: 'gather', target: null, stuckT: 0, fallback: false, job: null, task: null, zone: null };
    this.agents.push(a);
    return a;
  }
  private openZone(item: RawItem) {
    const Z = ZONES[item], c = cellPos(Z.cell), hx = ((Z.grid[0] - 1) * Z.spacing[0]) / 2, hz = ((Z.grid[1] - 1) * Z.spacing[1]) / 2;
    this.open[item] = true;
    for (let gx = 0; gx < Z.grid[0]; gx++) for (let gz = 0; gz < Z.grid[1]; gz++) {
      const roam = Z.node === 'deer';
      const x = roam ? c.x - hx + this.rng() * 2 * hx : c.x - hx + gx * Z.spacing[0];
      const z = roam ? c.z - hz + this.rng() * 2 * hz : c.z - hz + gz * Z.spacing[1];
      this.nodes.push({ type: item, x, z, r: Z.radius, hp: Z.hp, maxHp: Z.hp, alive: true, respawn: 0, respawnTime: Z.respawn });
    }
  }
  /** Apparition des comptoirs, puis bascule brut → produit quand la machine de la chaîne est construite. */
  private syncCounters() {
    for (const id of COUNTER_IDS) {
      const C = COUNTERS[id];
      const c = this.counters[id];
      if (!c) {
        if (!isProducible(C.items[0], this.progress)) continue;
        const p = cellPos(C.cell), L = COUNTER_LAYOUT;
        this.counters[id] = { id, item: counterItem(C, this.progress), drop: { x: p.x + L.drop.dx, z: p.z + L.drop.dz }, cashPos: { x: p.x + L.cash.dx, z: p.z + L.cash.dz }, stock: 0, cash: 0, head: null, nextAt: 0, serveCD: 0, first: true };
        continue;
      }
      const t = counterItem(C, this.progress);
      if (t === c.item) continue;
      const old = c.item;
      c.item = t;
      for (const gone of switchQueue(c.head ? [c.head] : [], t, this.rng)) { c.cash += salePrice(old) * gone.got; this.sold[old] += gone.got; c.head = null; }
      // le stock brut restant part dans la machine de la chaîne
      const m = this.machineFor(old);
      if (m) m.inp[old] = (m.inp[old] ?? 0) + c.stock;
      c.stock = 0;
    }
  }
  private buildMachine(id: MachineId) {
    const d = MACHINES[id], io = machineIO(id);
    this.machines[id] = { id, out: d.output, recipe: d.recipe, time: d.time, inPos: io.in, outPos: io.out, inp: {}, outN: 0, busy: 0 };
  }
  private machineFor(item: ItemType): MachineS | null {
    for (const m of Object.values(this.machines)) { const ks = Object.keys(m!.recipe); if (ks.length === 1 && ks[0] === item) return m!; }
    return null;
  }
  private machineByOutput(item: ItemType): MachineS | null { return Object.values(this.machines).find((m) => m!.out === item) ?? null; }
  private counterFor(item: ItemType): CounterS | null { return Object.values(this.counters).find((c) => c!.item === item) ?? null; }
  private inpTotal(m: MachineS) { return Object.values(m.inp).reduce((s, n) => s + (n ?? 0), 0); }

  // ------------------------------------------------------------ cases
  padDef(id: PadId): PadDef { return PADS.find((p) => p.id === id)!; }
  private level(p: PadDef) { return p.levels[Math.min(this.lv[p.id] ?? 0, p.levels.length - 1)]; }
  remCash(p: PadDef) { return Math.max(0, this.level(p).cost - (this.paid[p.id] ?? 0)); }
  remMats(p: PadDef): Partial<Record<ItemType, number>> {
    const r: Partial<Record<ItemType, number>> = {}, mats = this.level(p).mats || {};
    for (const k of Object.keys(mats) as ItemType[]) { const n = mats[k]! - (this.got[p.id]?.[k] ?? 0); if (n > 0) r[k] = n; }
    return r;
  }
  private padPos(p: PadDef): P { return cellPos(p.cell); }
  private unlock(p: PadDef) {
    const L = this.level(p);
    this.lv[p.id] = (this.lv[p.id] ?? 0) + 1; this.paid[p.id] = 0; this.got[p.id] = {};
    this.timeline.push({ t: this.t, label: L.label, money: this.money });
    const e = L.effect, pos = this.padPos(p);
    if (e.kind === 'bag') this.player.cap = e.cap;
    else if (e.kind === 'axe') { this.player.chopRate *= e.chopMul; this.player.speed *= e.speedMul; }
    else if (e.kind === 'crew') {
      const lvl = (this.crews[e.crew] = (this.crews[e.crew] ?? 0) + 1), st = crewStats(lvl);
      const members = this.agents.filter((a) => a.crew === e.crew);
      for (let i = members.length; i < crewSize(lvl); i++) {
        const w = this.makeAgent(e.crew === 'courier' ? 'courier' : 'harvester', pos, st.cap, st.speed, st.chopRate);
        w.crew = e.crew; w.filter = e.crew === 'courier' ? undefined : e.crew; w.slot = ((i % 3) - 1) * 0.55;
      }
      for (const w of this.agents) if (w.crew === e.crew) { w.cap = st.cap; w.speed = st.speed; w.chopRate = st.chopRate; }
    } else if (e.kind === 'zone') this.openZone(e.zone);
    else if (e.kind === 'machine') this.buildMachine(e.machine);
    else if (e.kind === 'belt') { const b = beltPath(e.chain); this.belts[e.chain] = { chain: e.chain, cd: 0, transit: [], travel: 0.2 + (b.to.z - b.from.z) / BELT.speed }; }
    else if (e.kind === 'canteen') { const c = cellPos(CANTEEN.cell); this.canteen = { inPos: { x: c.x + CANTEEN_LAYOUT.input.dx, z: c.z }, stock: 0, eatT: 2 }; }
    else if (e.kind === 'house') this.houses++;
    else if (e.kind === 'furnace') this.finished = true;
    this.syncCounters();
  }
  private updPads() {
    const a = this.player;
    for (const p of PADS) {
      if (padStatus(p, this.progress).kind !== 'open') continue;
      if (dist(a, this.padPos(p)) >= 1.15) { this.payCD[p.id] = 0; continue; }
      if (a.task?.kind !== 'pay' || a.task.pad !== p.id) continue; // le bot évite les cases qu'il ne vise pas
      let cd = (this.payCD[p.id] ?? 0) - this.dt;
      const L = this.level(p);
      while (cd <= 0) {
        cd += 0.035; let any = false;
        const paid = this.paid[p.id] ?? 0;
        if (this.money > 0 && paid < L.cost) { const amt = Math.min(this.money, L.cost - paid, Math.max(1, Math.ceil(L.cost / 32))); this.money -= amt; this.paid[p.id] = paid + amt; any = true; }
        for (const k of Object.keys(L.mats || {}) as ItemType[]) {
          const g = (this.got[p.id] ||= {});
          if ((g[k] ?? 0) < L.mats![k]! && this.take(a, k)) { g[k] = (g[k] ?? 0) + 1; this.consumed[k]++; any = true; break; }
        }
        if (!any) { cd = 0; break; }
        if (this.remCash(p) === 0 && Object.keys(this.remMats(p)).length === 0) { this.unlock(p); a.task = null; cd = 0; break; }
      }
      this.payCD[p.id] = cd;
    }
  }

  // ------------------------------------------------------------ agents
  private take(a: Agent, k: ItemType): boolean { const i = a.carry.lastIndexOf(k); if (i < 0) return false; a.carry.splice(i, 1); return true; }
  private count(a: Agent, k: ItemType) { let n = 0; for (const c of a.carry) if (c === k) n++; return n; }
  private moveTo(a: Agent, t: P): boolean {
    const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
    if (d < 0.08) return true;
    const st = Math.min(d, a.speed * (a.fedT > 0 ? CANTEEN.fedSpeedMul : 1) * this.dt);
    a.x += (dx / d) * st; a.z += (dz / d) * st;
    return false;
  }
  private nearestNode(a: P, filter: RawItem | undefined, maxD = 1e9): NodeS | null {
    let best: NodeS | null = null, bd = maxD;
    for (const n of this.nodes) { if (!n.alive || !this.open[n.type] || (filter && n.type !== filter)) continue; const d = dist(a, n) - n.r; if (d < bd) { bd = d; best = n; } }
    return best;
  }
  private harvest(a: Agent, filter: RawItem | undefined) {
    a.chopCD -= this.dt;
    if (a.role === 'courier' || a.carry.length >= a.cap) return;
    const n = this.nearestNode(a, filter, 1.25); if (!n) return;
    if (a.chopCD <= 0) {
      a.chopCD = a.chopRate * (a.fedT > 0 ? CANTEEN.fedChopMul : 1);
      n.hp--; a.carry.push(n.type);
      if (n.hp <= 0) { n.alive = false; n.respawn = n.respawnTime; }
    }
  }
  private approach(a: Agent, n: NodeS) {
    const d = dist(a, n);
    if (d > n.r + 0.85) { const k = n.r + 0.6; this.moveTo(a, { x: n.x - ((n.x - a.x) / d) * k, z: n.z - ((n.z - a.z) / d) * k }); }
  }
  private updWorker(w: Agent) {
    if (w.role === 'courier') return this.updCourier(w);
    const item = w.filter!, mc = this.machineFor(item);
    if (w.state === 'gather') {
      if (w.carry.length >= w.cap) w.state = 'deliver';
      else { if (!w.target || !w.target.alive) w.target = this.nearestNode(w, item); if (w.target) this.approach(w, w.target); }
    }
    if (w.state === 'deliver') {
      if (!w.carry.includes(item)) { w.state = 'gather'; w.target = null; }
      else if (mc) { w.zone = 'in:' + mc.id; this.moveTo(w, { x: mc.inPos.x + w.slot * 0.6, z: mc.inPos.z - 0.1 }); }
      else { const s = this.counters[CHAIN_IDS.find((c) => CHAINS[c].raw === item)!]!; w.zone = 'drop:' + s.id; this.moveTo(w, { x: s.drop.x + w.slot, z: s.drop.z - 0.1 }); }
    }
  }
  // Livreur : 1. steaks → Cantine ; 2. planches/lingots → Atelier ; 3. comptoir d'une chaîne sans tapis.
  private outAvail(m: MachineS) { return m.outN - COURIER.leaveAtOutput; }
  private courierJob(): Job | null {
    const g = this.machines.grill;
    if (this.canteen && g && this.canteen.stock < CANTEEN.courierFillBelow && this.outAvail(g) > 0) return { from: 'grill', item: 'steak', to: 'canteen', want: CANTEEN.courierFillBelow - this.canteen.stock };
    const ws = this.machines.workshop;
    if (ws) for (const k of ['plank', 'ingot'] as ItemType[]) {
      const src = this.machineByOutput(k), have = ws.inp[k] ?? 0;
      if (src && have < COURIER.workshopFill && this.outAvail(src) > 0) return { from: src.id, item: k, to: 'workshop', want: COURIER.workshopFill - have };
    }
    for (const id of COUNTER_IDS) {
      const s = this.counters[id], m = s && this.machineByOutput(s.item);
      if (!s || !m || (id !== 'tool' && this.belts[id as ChainId]) || this.outAvail(m) <= 0 || s.stock >= COUNTER_RULES.stockCap) continue;
      return { from: m.id, item: s.item, to: id, want: 99 };
    }
    return null;
  }
  private courierDest(w: Agent): { zone: string; pos: P } | null {
    const ws = this.machines.workshop, cant = this.canteen;
    const canteen = () => (cant && cant.stock < CANTEEN.capacity ? { zone: 'canteen', pos: cant.inPos } : null);
    const workshop = (k: ItemType) => (ws && ws.recipe[k] && (ws.inp[k] ?? 0) < MACHINE_LIMITS.inputPerType ? { zone: 'in:workshop', pos: ws.inPos } : null);
    const counter = (s: CounterS | null | undefined) => (s && s.stock < COUNTER_RULES.stockCap ? { zone: 'drop:' + s.id, pos: s.drop } : null);
    const j = w.job;
    if (j && w.carry.includes(j.item)) { const d = j.to === 'canteen' ? canteen() : j.to === 'workshop' ? workshop(j.item) : counter(this.counters[j.to]); if (d) return d; }
    for (let i = w.carry.length - 1; i >= 0; i--) { const t = w.carry[i]; const d = (t === 'steak' && canteen()) || workshop(t) || counter(this.counterFor(t)); if (d) return d; }
    return null;
  }
  private updCourier(w: Agent) {
    if (w.state === 'gather') {
      if (!w.job) w.job = this.courierJob();
      const j = w.job;
      if (!j) { w.zone = null; if (w.carry.length) { w.state = 'deliver'; w.stuckT = 0; } return; }
      const m = this.machines[j.from]!;
      w.zone = 'out:' + m.id;
      this.moveTo(w, { x: m.outPos.x + w.slot * 0.5, z: m.outPos.z + 0.1 });
      const there = inBox(w, m.outPos, 0.9, 0.75);
      if (w.carry.length >= w.cap || this.count(w, j.item) >= j.want || (there && this.outAvail(m) <= 0)) { if (w.carry.length) { w.state = 'deliver'; w.stuckT = 0; } else w.job = null; }
      return;
    }
    if (!w.carry.length) { w.state = 'gather'; w.job = null; w.fallback = false; w.stuckT = 0; w.zone = null; return; }
    const d = w.fallback ? null : this.courierDest(w);
    if (d) { w.stuckT = 0; w.zone = d.zone; this.moveTo(w, d.pos); return; }
    if (!w.fallback) { w.stuckT += this.dt; if (w.stuckT > COURIER.stuckTimeout) { w.fallback = true; this.warnings.push(`livreur en repli à ${(this.t / 60).toFixed(1)} min`); } return; }
    const s = this.counterFor(w.carry[w.carry.length - 1]);
    if (s) { w.zone = 'drop:' + s.id; this.moveTo(w, s.drop); }
  }

  // ------------------------------------------------------------ bot glouton
  private openPads(): PadDef[] { return PADS.filter((p) => padStatus(p, this.progress).kind === 'open'); }
  private cashOnCounters() { let s = 0; for (const c of Object.values(this.counters)) s += c!.cash; return s; }
  private goal(): PadDef | null {
    let best: PadDef | null = null, bv = Infinity;
    for (const p of this.openPads()) {
      const rm = this.remMats(p);
      const v = this.remCash(p) + (Object.keys(rm) as ItemType[]).reduce((s, k) => s + rm[k]! * ITEMS[k].price, 0);
      if (v < bv) { bv = v; best = p; }
    }
    return best;
  }
  /** Objets portés réservés pour la case visée (ne pas les vendre). */
  private reserved(goal: PadDef | null, k: ItemType) { return goal ? Math.min(this.count(this.player, k), this.remMats(goal)[k] ?? 0) : 0; }
  /** Étape suivante de la chaîne pour ce que porte le bot : brut → machine (ou comptoir avant la machine), produit → comptoir. */
  private deliverTarget(goal: PadDef | null): { zone: string; pos: P } | null {
    const a = this.player;
    const needsTools = !!goal && (this.remMats(goal).tool ?? 0) > this.count(a, 'tool');
    for (let i = a.carry.length - 1; i >= 0; i--) {
      const k = a.carry[i];
      if (this.count(a, k) <= this.reserved(goal, k)) continue;
      const ws = this.machines.workshop;
      if (needsTools && ws && ws.recipe[k] && (ws.inp[k] ?? 0) < MACHINE_LIMITS.inputPerType) return { zone: 'in:workshop', pos: ws.inPos };
      const m = this.machineFor(k);
      if (m) return { zone: 'in:' + m.id, pos: m.inPos };
      const c = this.counterFor(k);
      if (c && c.stock < COUNTER_RULES.stockCap) return { zone: 'drop:' + c.id, pos: c.drop };
    }
    return null;
  }
  private decide(): Task {
    const a = this.player, goal = this.goal();
    // 1. case abordable la plus proche (argent + matériaux déjà portés)
    let best: PadDef | null = null, bd = Infinity;
    for (const p of this.openPads()) {
      const rm = this.remMats(p);
      if (this.money < this.remCash(p) || (Object.keys(rm) as ItemType[]).some((k) => this.count(a, k) < rm[k]!)) continue;
      const d = dist(a, this.padPos(p)); if (d < bd) { bd = d; best = p; }
    }
    if (best) return { kind: 'pay', pad: best.id, idle: 0 };
    if (goal) {
      // 2. livrer un plein sac de matériaux à la case visée
      const rm = this.remMats(goal), ks = Object.keys(rm) as ItemType[];
      const total = ks.reduce((s, k) => s + rm[k]!, 0), carried = ks.reduce((s, k) => s + Math.min(this.count(a, k), rm[k]!), 0);
      if (carried > 0 && (carried >= total || carried >= Math.min(total, a.cap - 1) || !this.fetchFor(goal))) return { kind: 'pay', pad: goal.id, idle: 0 };
    }
    const deliver = this.deliverTarget(goal);
    if (a.carry.length >= a.cap && deliver) return { kind: 'deliver' };
    // 3. ramasser l'argent des comptoirs
    const need = goal ? this.remCash(goal) - this.money : 0, cash = this.cashOnCounters();
    if (cash > 0 && need > 0 && (cash >= Math.max(5, need * 0.25) || this.money + cash >= this.remCash(goal!))) {
      let c: CounterS | null = null; for (const s of Object.values(this.counters)) if (!c || s!.cash > c.cash) c = s!;
      return { kind: 'collect', counter: c!.id };
    }
    // 4. récupérer à la sortie des machines les matériaux de la case visée (et attendre qu'ils sortent)
    const fetch = goal && a.carry.length < a.cap ? this.fetchFor(goal) : null;
    if (fetch) return { kind: 'fetch', machine: fetch, wait: 0 };
    if (deliver && a.carry.length > 0) return { kind: 'deliver' };
    // 5. vendre les produits qui s'accumulent à la sortie des machines
    for (const m of Object.values(this.machines)) if (m!.outN >= 8 && a.carry.length === 0) return { kind: 'fetch', machine: m!.id, wait: 0 };
    // 6. récolter
    return { kind: 'harvest', item: this.chooseRaw(goal) };
  }
  /** Machine où aller chercher (ou attendre) un matériau manquant de la case visée. */
  private fetchFor(goal: PadDef): MachineId | null {
    const a = this.player, rm = this.remMats(goal);
    const canRun = (m: MachineS) => (Object.keys(m.recipe) as ItemType[]).every((k) => (m.inp[k] ?? 0) > 0);
    const working = (m: MachineS) => m.outN > 0 || m.busy > 0 || canRun(m);
    for (const k of Object.keys(rm) as ItemType[]) {
      if (this.count(a, k) >= rm[k]!) continue;
      const m = this.machineByOutput(k);
      if (m && working(m)) return m.id;
      if (k === 'tool' && this.machines.workshop) {
        const ws = this.machines.workshop;
        const srcs = (['saw', 'forge'] as MachineId[]).filter((id) => this.machines[id]).sort((p, q) => (ws.inp[this.machines[p]!.out] ?? 0) - (ws.inp[this.machines[q]!.out] ?? 0));
        for (const src of srcs) {
          const sm = this.machines[src]!;
          if (sm.outN > 0 && (ws.inp[sm.out] ?? 0) < 6 && this.count(a, sm.out) === 0) return src;
        }
      }
    }
    return null;
  }
  private chooseRaw(goal: PadDef | null): RawItem {
    const need = goal ? this.remMats(goal) : {};
    for (const k of Object.keys(need) as ItemType[]) { const ch = CHAIN_IDS.find((c) => CHAINS[c].product === k); if (ch && this.open[CHAINS[ch].raw]) return CHAINS[ch].raw; }
    if (need.tool) {
      const ws = this.machines.workshop;
      const r: RawItem = (ws?.inp.plank ?? 0) <= (ws?.inp.ingot ?? 0) ? 'wood' : 'gold';
      if (this.open[r]) return r;
    }
    const opened = (['gold', 'meat', 'wood'] as RawItem[]).filter((r) => this.open[r]);
    return opened[0];
  }
  private updBot() {
    const a = this.player;
    if (!a.task) a.task = this.decide();
    const t = a.task;
    a.zone = null;
    if (t.kind === 'harvest') {
      if (a.carry.length >= a.cap) { a.task = null; return; }
      const n = this.nearestNode(a, t.item);
      if (!n) { a.task = null; this.harvest(a, undefined); return; }
      this.approach(a, n); this.harvest(a, t.item);
      if (a.carry.length >= a.cap) a.task = null;
    } else if (t.kind === 'deliver') {
      const d = this.deliverTarget(this.goal());
      if (!d) { a.task = null; return; }
      a.zone = d.zone;
      this.moveTo(a, d.pos);
    } else if (t.kind === 'collect') {
      const c = this.counters[t.counter]!;
      if (this.moveTo(a, c.cashPos) || dist(a, c.cashPos) < 1.35) { this.money += c.cash; c.cash = 0; a.task = null; }
    } else if (t.kind === 'pay') {
      const p = this.padDef(t.pad);
      if (padStatus(p, this.progress).kind !== 'open') { a.task = null; return; }
      if (dist(a, this.padPos(p)) >= 1.15) this.moveTo(a, this.padPos(p));
      else if ((t.idle += this.dt) > 0.4) a.task = null; // plus rien à payer pour l'instant
    } else if (t.kind === 'fetch') {
      const m = this.machines[t.machine]!;
      a.zone = 'out:' + m.id;
      const arrived = this.moveTo(a, m.outPos) || inBox(a, m.outPos, 0.9, 0.75);
      if (arrived && (a.carry.length >= a.cap || (m.outN === 0 && (t.wait += this.dt) > 4))) a.task = null;
    }
  }

  // ------------------------------------------------------------ transferts automatiques dans les zones
  /** Le bot et les livreurs ne déposent/ramassent que dans la zone qu'ils visent. */
  private zoneOk(a: Agent, zone: string) { return a.role === 'harvester' || a.zone === zone; }
  private updCounters() {
    for (const c of Object.values(this.counters) as CounterS[]) {
      for (const a of this.agents) {
        if (!inBox(a, c.drop, 1.2, 0.85) || !this.zoneOk(a, 'drop:' + c.id)) continue;
        a.depCD -= this.dt; if (a.depCD > 0) continue;
        const cap = a.fallback ? COUNTER_RULES.hardCap : COUNTER_RULES.stockCap;
        if (c.stock < cap) { if (this.take(a, c.item)) { a.depCD = 0.06; c.stock++; } }
        else if (a.fallback && this.take(a, c.item)) { a.depCD = 0.06; c.cash += Math.max(1, Math.round(salePrice(c.item) * COURIER.wholesaleRatio)); this.sold[c.item]++; }
      }
      // file de clients : un nouveau client demande ce que le comptoir achète en ce moment
      if (!c.head && this.t >= c.nextAt) {
        const o = createOrder({ itemType: c.item }, this.rng, c.first); c.first = false;
        if (o.wantType !== c.item) throw new Error('client hors file');
        c.head = { ...o, got: 0 };
      }
      c.serveCD -= this.dt;
      const h = c.head;
      if (h && h.got < h.want && c.stock > 0 && c.serveCD <= 0) { c.stock--; h.got++; c.serveCD = COUNTER_RULES.serveInterval; }
      if (h && h.got >= h.want) { c.cash += salePrice(c.item) * h.want; this.sold[c.item] += h.want; c.head = null; c.nextAt = this.t + 0.45; }
      if (dist(this.player, c.cashPos) < 1.35) { this.money += c.cash; c.cash = 0; }
      this.peak[c.item] = Math.max(this.peak[c.item], c.stock);
    }
  }
  private updMachines() {
    for (const m of Object.values(this.machines) as MachineS[]) {
      const ins = Object.keys(m.recipe) as ItemType[];
      for (const a of this.agents) {
        if (!inBox(a, m.inPos, 0.9, 0.75) || !this.zoneOk(a, 'in:' + m.id)) continue;
        a.depCD -= this.dt;
        if (a.depCD > 0) continue;
        // l'entrée ne refuse jamais le joueur (réserve au-delà de la pile visible)
        for (const k of ins) {
          const full = this.inpTotal(m) >= MACHINE_LIMITS.input || (ins.length > 1 && (m.inp[k] ?? 0) >= MACHINE_LIMITS.inputPerType);
          if (full && a.role !== 'player') continue;
          if (this.take(a, k)) { a.depCD = 0.06; m.inp[k] = (m.inp[k] ?? 0) + 1; break; }
        }
      }
      if (m.busy > 0) {
        m.busy -= this.dt;
        if (m.busy <= 0) { if (m.outN < MACHINE_LIMITS.output) m.outN++; else m.busy = 0.05; }
      } else if (ins.every((k) => (m.inp[k] ?? 0) > 0)) {
        for (const k of ins) { m.inp[k]!--; this.consumed[k]++; }
        m.busy = m.time;
      }
      this.peak[m.out] = Math.max(this.peak[m.out], m.outN);
      for (const a of this.agents) {
        if (a.role === 'harvester' || !inBox(a, m.outPos, 0.9, 0.75) || a.carry.length >= a.cap || !this.zoneOk(a, 'out:' + m.id)) continue;
        if (a.role === 'courier' && (!a.job || a.job.from !== m.id || this.outAvail(m) <= 0 || this.count(a, a.job.item) >= a.job.want)) continue;
        a.pickCD -= this.dt;
        if (a.pickCD <= 0 && m.outN > 0) { a.pickCD = 0.07; m.outN--; a.carry.push(m.out); }
      }
    }
  }
  private updBelts() {
    for (const b of Object.values(this.belts) as BeltS[]) {
      const m = this.machines[CHAINS[b.chain].machine]!, c = this.counters[b.chain]!;
      b.cd -= this.dt;
      if (b.cd <= 0 && c.item === m.out && m.outN > BELT.leaveAtOutput && c.stock + b.transit.length < BELT.stopAt) { m.outN--; b.transit.push(this.t + b.travel); b.cd = BELT.interval; }
      while (b.transit.length && b.transit[0] <= this.t) { b.transit.shift(); c.stock++; }
    }
  }
  private updCanteen() {
    const c = this.canteen; if (!c) return;
    for (const a of this.agents) {
      if (!inBox(a, c.inPos, 0.9, 0.75) || !this.zoneOk(a, 'canteen')) continue;
      a.depCD -= this.dt;
      if (a.depCD <= 0 && c.stock < CANTEEN.capacity && this.take(a, 'steak')) { a.depCD = 0.06; c.stock++; }
    }
    c.eatT -= this.dt;
    if (c.eatT <= 0) {
      c.eatT = CANTEEN.eatInterval;
      let w: Agent | null = null;
      for (const a of this.agents) if (a.role !== 'player' && a.fedT <= 3 && (!w || a.fedT < w.fedT)) w = a;
      if (w && c.stock > 0) { c.stock--; this.consumed.steak++; w.fedT = CANTEEN.fedDuration; }
    }
  }

  step() {
    const dt = this.dt;
    this.t += dt;
    this.updCanteen();
    for (const a of this.agents) {
      if (a.fedT > 0) a.fedT -= dt;
      if (a.role === 'player') this.updBot(); else { this.updWorker(a); this.harvest(a, a.filter); }
    }
    this.updCounters();
    this.updMachines();
    this.updBelts();
    this.updPads();
    for (const n of this.nodes) if (!n.alive && (n.respawn -= dt) <= 0) { n.alive = true; n.hp = n.maxHp; }
    if (this.houses) { const r = incomeTicks(this.incomeAcc, dt, INCOME.tick, INCOME.maxCatchup); this.incomeAcc = r.acc; this.money += houseIncome(this.houses) * r.ticks; }
    for (const a of this.agents) for (const k of ITEM_TYPES) { const n = this.count(a, k); if (n > this.peak[k]) this.peak[k] = n; }
  }

  run(maxMinutes = 60, stallMinutes = 3): SimResult {
    const moneyAt: Record<number, number> = {};
    const marks = [5, 10, 15, 20, 25, 30];
    let lastProgress = 0, maxGap = 0, maxGapBefore = '', events = 0;
    while (!this.finished && this.t < maxMinutes * 60) {
      this.step();
      for (const m of marks) if (moneyAt[m] === undefined && this.t >= m * 60) moneyAt[m] = Math.round(this.money);
      if (this.timeline.length !== events) {
        const gap = this.t - lastProgress;
        if (gap > maxGap) { maxGap = gap; maxGapBefore = this.timeline[this.timeline.length - 1].label; }
        lastProgress = this.t; events = this.timeline.length;
      } else if (this.t - lastProgress > stallMinutes * 60) {
        const g = this.goal();
        this.warnings.push(`aucun progrès pendant ${stallMinutes} min à ${(this.t / 60).toFixed(1)} min (objectif : ${g ? g.levels[this.lv[g.id] ?? 0].label : '—'})`);
        break;
      }
    }
    const accumulations = ITEM_TYPES.map((item) => ({ item, peak: this.peak[item], sold: this.sold[item], consumed: this.consumed[item] }));
    return {
      finished: this.finished, finishTime: this.finished ? this.t : null, timeline: this.timeline, moneyAt,
      maxGap, maxGapBefore, accumulations, warnings: [...new Set(this.warnings)].slice(0, 20),
    };
  }
}
