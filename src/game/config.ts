// Camp Givré — configuration centrale.
// Tout l'équilibrage (prix, coûts, vitesses) et toute la disposition de la carte se règlent ici.
//
// Carte : trois chaînes de production compactes côte à côte (bois, viande, or). Chaque chaîne suit
// UN chemin, de haut en bas de l'écran : récolte → machine → comptoir. Le hub (spawn, Sac, Hache) est
// juste sous les chaînes, le village regroupé derrière lui. Une position = { col, z, dx } :
// `col` = colonne (espacement GRID.colSpacing), `z` = profondeur (négatif = vers le haut de l'écran),
// `dx` = décalage latéral dans la colonne.

export type RawItem = 'wood' | 'meat' | 'gold';
export type ProductItem = 'plank' | 'steak' | 'ingot' | 'tool';
export type ItemType = RawItem | ProductItem;
export type IconName = ItemType | 'cash' | 'bag' | 'axe' | 'worker' | 'house' | 'fire' | 'belt';
export type Theme = 'wood' | 'meat' | 'gold' | 'village';
export type ChainId = 'wood' | 'meat' | 'gold';
export type CounterId = ChainId | 'tool';
export type MachineId = 'saw' | 'grill' | 'forge' | 'workshop';
export type CrewId = 'wood' | 'meat' | 'gold' | 'courier';
export type PadId =
  | 'bag' | 'axe'
  | 'lumber' | 'saw' | 'beltWood'
  | 'hunt' | 'hunter' | 'grill' | 'beltMeat'
  | 'mine' | 'miner' | 'forge' | 'beltGold'
  | 'workshop' | 'courier' | 'canteen' | 'house' | 'furnace';
/** Référence à un niveau de case : 'id' (niveau 1 acheté) ou 'id#n' (niveau n acheté). */
export type PadRef = PadId | `${PadId}#${number}`;
export type Mats = Partial<Record<ItemType, number>>;

export interface Cell { col: number; z: number; dx?: number }

export const GRID = {
  /** Écart entre deux chaînes. */
  colSpacing: 8,
};
export const COLS = { wood: -1, meat: 0, gold: 1, village: 0 } as const;

/** Profondeur des étapes d'une chaîne (toutes les chaînes sont alignées sur ces lignes). */
export const CHAIN_Z = {
  sign: -22,
  harvest: -17.5,
  machine: -12,
  counter: -7,
} as const;
export const HUB_Z = 1;

export function cellPos(c: Cell): { x: number; z: number } {
  return { x: c.col * GRID.colSpacing + (c.dx ?? 0), z: c.z };
}

/** Limites de déplacement (la forêt décorative reste en dehors). */
export const WORLD = { minX: -13, maxX: 13, minZ: -23, maxZ: 19 };

/**
 * Caméra orthographique : décalage par rapport au joueur et hauteur de vue (unités monde).
 * Face aux chaînes (azimut 0) pour qu'une chaîne entière tienne en hauteur sur un téléphone.
 */
export const CAMERA = {
  offset: { x: 0, y: 24, z: 25.46 },
  landscapeHeight: 15,
  /** En portrait : hauteur = min(portraitWidth / ratio, portraitMax). */
  portraitWidth: 11.5,
  portraitMax: 28,
};

export const RAW_ITEMS: readonly RawItem[] = ['wood', 'meat', 'gold'];
export const ITEM_TYPES: readonly ItemType[] = ['wood', 'meat', 'gold', 'plank', 'steak', 'ingot', 'tool'];

export interface ItemDef {
  name: string;
  /** Prix de vente unitaire. */
  price: number;
  /** Quantité demandée par un client [min, max]. */
  order: [number, number];
  /** Hauteur d'un objet dans une pile. */
  stackH: number;
}
export const ITEMS: Record<ItemType, ItemDef> = {
  wood: { name: 'Bûches', price: 2, order: [2, 4], stackH: 0.26 },
  meat: { name: 'Viande', price: 3, order: [1, 3], stackH: 0.2 },
  gold: { name: 'Or brut', price: 7, order: [1, 2], stackH: 0.17 },
  plank: { name: 'Planches', price: 6, order: [1, 3], stackH: 0.11 },
  steak: { name: 'Steaks', price: 11, order: [1, 3], stackH: 0.12 },
  ingot: { name: 'Lingots', price: 24, order: [1, 2], stackH: 0.2 },
  tool: { name: 'Outils', price: 95, order: [1, 2], stackH: 0.16 },
};

export const PLAYER = { spawn: { col: 0, z: HUB_Z } as Cell, cap: 5, speed: 5.6, chopRate: 0.42 };

/** Pile sur le dos : une tour jusqu'à `single` objets, puis 2 colonnes jusqu'à `double`, puis 3. */
export const STACK = { single: 25, double: 50, colSpacing: 0.62 };

// ---------------------------------------------------------------- Chaînes
export interface ChainDef {
  id: ChainId;
  theme: Theme;
  col: number;
  raw: RawItem;
  machine: MachineId;
  product: ProductItem;
  /** Case « Tapis roulant » de la chaîne. */
  belt: PadId;
}
export const CHAINS: Record<ChainId, ChainDef> = {
  wood: { id: 'wood', theme: 'wood', col: COLS.wood, raw: 'wood', machine: 'saw', product: 'plank', belt: 'beltWood' },
  meat: { id: 'meat', theme: 'meat', col: COLS.meat, raw: 'meat', machine: 'grill', product: 'steak', belt: 'beltMeat' },
  gold: { id: 'gold', theme: 'gold', col: COLS.gold, raw: 'gold', machine: 'forge', product: 'ingot', belt: 'beltGold' },
};
export const CHAIN_IDS: readonly ChainId[] = ['wood', 'meat', 'gold'];

// ---------------------------------------------------------------- Zones de récolte
export interface ZoneDef {
  item: RawItem;
  theme: Theme;
  cell: Cell;
  node: 'tree' | 'deer' | 'rock';
  /** Nombre de nœuds par axe (x, z) et espacement. Les cerfs errent dans le même rectangle. */
  grid: [number, number];
  spacing: [number, number];
  hp: number;
  respawn: number;
  radius: number;
  solid: boolean;
  /** Ouverte dès le départ ; sinon débloquée par la case dont l'effet est { kind: 'zone' }. */
  startUnlocked: boolean;
  lockedText: string;
}
const zoneCell = (col: number): Cell => ({ col, z: CHAIN_Z.harvest });
export const ZONES: Record<RawItem, ZoneDef> = {
  wood: { item: 'wood', theme: 'wood', cell: zoneCell(COLS.wood), node: 'tree', grid: [3, 3], spacing: [2.2, 2.2], hp: 3, respawn: 5, radius: 0.45, solid: true, startUnlocked: true, lockedText: '' },
  meat: { item: 'meat', theme: 'meat', cell: zoneCell(COLS.meat), node: 'deer', grid: [3, 2], spacing: [2.2, 4.4], hp: 3, respawn: 4, radius: 0.5, solid: false, startUnlocked: false, lockedText: 'Chasse requise' },
  gold: { item: 'gold', theme: 'gold', cell: zoneCell(COLS.gold), node: 'rock', grid: [3, 3], spacing: [2.2, 2.2], hp: 4, respawn: 7, radius: 0.7, solid: true, startUnlocked: false, lockedText: 'Mine requise' },
};

// ---------------------------------------------------------------- Machines
export interface MachineDef {
  name: string;
  output: ProductItem;
  recipe: Mats;
  /** Secondes par objet produit. */
  time: number;
  cell: Cell;
  theme: Theme;
  color: number;
  lockedText: string;
  /** Bulle affichée quand le joueur apporte la ressource brute au comptoir au lieu de la machine. */
  hint: string;
}
const machineCell = (col: number): Cell => ({ col, z: CHAIN_Z.machine });
export const VILLAGE = {
  workshop: { col: COLS.village, z: 5.5 } as Cell,
  toolCounter: { col: COLS.village, z: 10.5 } as Cell,
  canteen: { col: COLS.village, z: 5.5, dx: -8 } as Cell,
  courier: { col: COLS.village, z: 10, dx: -8 } as Cell,
  housePad: { col: COLS.village, z: 13.2, dx: 7.7 } as Cell,
  furnace: { col: COLS.village, z: 15, dx: -7 } as Cell,
};
export const MACHINES: Record<MachineId, MachineDef> = {
  saw: { name: 'Scierie', output: 'plank', recipe: { wood: 1 }, time: 0.8, cell: machineCell(COLS.wood), theme: 'wood', color: 0xb57a48, lockedText: 'Scierie requise', hint: 'Passe par la scierie !' },
  grill: { name: 'Grill', output: 'steak', recipe: { meat: 1 }, time: 1.1, cell: machineCell(COLS.meat), theme: 'meat', color: 0x6b7480, lockedText: 'Grill requis', hint: 'Passe par le grill !' },
  forge: { name: 'Fonderie', output: 'ingot', recipe: { gold: 1 }, time: 1.5, cell: machineCell(COLS.gold), theme: 'gold', color: 0x7d8794, lockedText: 'Fonderie requise', hint: 'Passe par la fonderie !' },
  workshop: { name: 'Atelier', output: 'tool', recipe: { plank: 1, ingot: 1 }, time: 2.2, cell: VILLAGE.workshop, theme: 'village', color: 0x8a6a4a, lockedText: 'Atelier requis', hint: "Passe par l'atelier !" },
};
/** Les machines acceptent jusqu'à ce nombre d'objets en entrée / en sortie. */
export const MACHINE_LIMITS = { input: 24, inputPerType: 12, output: 32 };

// ---------------------------------------------------------------- Comptoirs
// Un comptoir par chaîne. Il achète la ressource brute, puis, dès que la machine de la chaîne
// est construite, UNIQUEMENT le produit transformé (`items[0]` → `items[1]`, une seule fois).
export interface CounterDef {
  id: CounterId;
  cell: Cell;
  theme: Theme;
  items: [ItemType] | [RawItem, ProductItem];
  /** Machine qui fait basculer le comptoir vers items[1]. */
  upgrade?: MachineId;
}
const counterCell = (col: number): Cell => ({ col, z: CHAIN_Z.counter });
export const COUNTERS: Record<CounterId, CounterDef> = {
  wood: { id: 'wood', cell: counterCell(COLS.wood), theme: 'wood', items: ['wood', 'plank'], upgrade: 'saw' },
  meat: { id: 'meat', cell: counterCell(COLS.meat), theme: 'meat', items: ['meat', 'steak'], upgrade: 'grill' },
  gold: { id: 'gold', cell: counterCell(COLS.gold), theme: 'gold', items: ['gold', 'ingot'], upgrade: 'forge' },
  tool: { id: 'tool', cell: VILLAGE.toolCounter, theme: 'village', items: ['tool'] },
};
export const COUNTER_IDS: readonly CounterId[] = ['wood', 'meat', 'gold', 'tool'];
export const COUNTER_RULES = {
  queueLength: 5,
  /** Stock max posé sur le comptoir (dépôt normal) et plafond absolu (repli des livreurs). */
  stockCap: 42,
  hardCap: 60,
  serveInterval: 0.16,
  cashCap: 48,
  customerSpeed: 3.4,
  /** Le tout premier client du comptoir à bûches demande ce nombre (tutoriel). */
  firstWoodOrder: 4,
  startCash: { bills: 6, value: 2 },
};

/** Tapis roulant : la sortie de la machine alimente le comptoir de la chaîne. */
export const BELT = {
  /** Secondes entre deux objets posés sur le tapis. */
  interval: 0.35,
  /** Vitesse des objets sur le tapis (unités/s). */
  speed: 1.8,
  /** Le tapis s'arrête quand le stock du comptoir atteint cette valeur. */
  stopAt: 20,
  /** Il laisse toujours ce nombre d'objets à la sortie (plus que les livreurs : ils passent avant lui). */
  leaveAtOutput: 8,
};

// ---------------------------------------------------------------- Ouvriers
export const CREWS = {
  /** Un ouvrier de plus à ces niveaux. */
  extraWorkerAt: [3, 5],
  capBase: 3, capPerLevel: 1.2,
  speedBase: 3.3, speedPerLevel: 0.4,
  chopBase: 0.85, chopMulPerLevel: 0.85,
};
export const COURIER = {
  /** Un livreur laisse toujours au moins ce nombre d'objets à la sortie d'une machine (pour le joueur). */
  leaveAtOutput: 5,
  /** Il remplit l'entrée de l'Atelier jusqu'à ce nombre de planches et de lingots. */
  workshopFill: 6,
  /** Secondes max sans destination avant la livraison de repli. */
  stuckTimeout: 6,
  /** En repli, si le comptoir est au plafond absolu, les objets sont vendus en gros à ce ratio. */
  wholesaleRatio: 0.5,
};
export const CANTEEN = {
  cell: VILLAGE.canteen,
  /** Les livreurs y apportent des steaks en priorité tant qu'elle en a moins que ça. */
  courierFillBelow: 10,
  capacity: 20,
  eatInterval: 2.5,
  fedDuration: 45,
  fedSpeedMul: 1.4,
  fedChopMul: 0.65,
};

// ---------------------------------------------------------------- Maisons / revenu passif
export const HOUSE_SPOTS: Cell[] = [
  { col: COLS.village, z: 5.5, dx: 5.9 },
  { col: COLS.village, z: 5.5, dx: 9.5 },
  { col: COLS.village, z: 9.5, dx: 5.9 },
  { col: COLS.village, z: 9.5, dx: 9.5 },
];
export const INCOME = { tick: 1, maxCatchup: 10 };
export const FURNACE_CELL: Cell = VILLAGE.furnace;

// ---------------------------------------------------------------- Cases de déblocage
export type PadEffect =
  | { kind: 'bag'; cap: number }
  | { kind: 'axe'; chopMul: number; speedMul: number }
  | { kind: 'crew'; crew: CrewId }
  | { kind: 'zone'; zone: RawItem }
  | { kind: 'machine'; machine: MachineId }
  | { kind: 'belt'; chain: ChainId }
  | { kind: 'canteen' }
  | { kind: 'house'; income: number }
  | { kind: 'furnace' };

export interface PadLevel { label: string; cost: number; mats?: Mats; effect: PadEffect }
export interface PadDef {
  id: PadId;
  icon: IconName;
  theme: Theme;
  cell: Cell;
  /** Toutes ces cases doivent être achetées pour que le niveau 1 apparaisse. */
  requires: PadRef[];
  levels: PadLevel[];
}

function crewLevels(name: string, crew: CrewId, costs: number[], toolsAt4: number, toolsAt5: number): PadLevel[] {
  return costs.map((cost, i) => ({
    label: i === 0 ? name : `${name} niv.${i + 1}`,
    cost,
    mats: i === 3 ? { tool: toolsAt4 } : i === 4 ? { tool: toolsAt5 } : undefined,
    effect: { kind: 'crew', crew },
  }));
}
const bag = (cap: number, cost: number, mats?: Mats): PadLevel => ({ label: `Sac ${cap}`, cost, mats, effect: { kind: 'bag', cap } });
const house = (n: number, cost: number, mats: Mats, income: number): PadLevel => ({ label: n === 1 ? 'Maison' : `Maison ${n}`, cost, mats, effect: { kind: 'house', income } });
const belt = (chain: ChainId, cost: number): PadLevel => ({ label: 'Tapis roulant', cost, effect: { kind: 'belt', chain } });
/** Emplacements des cases dans une chaîne : ouvriers à gauche de la machine, tapis à droite du dépôt. */
const crewCell = (col: number): Cell => ({ col, z: CHAIN_Z.machine, dx: -2.65 });
const beltCell = (col: number): Cell => ({ col, z: CHAIN_Z.counter - 2.35, dx: 2.45 });

export const PADS: PadDef[] = [
  // Hub central : améliorations du joueur
  { id: 'bag', icon: 'bag', theme: 'village', cell: { col: 0, z: HUB_Z, dx: -3 }, requires: [], levels: [
    bag(10, 10), bag(15, 60), bag(25, 250, { plank: 10 }), bag(40, 800, { ingot: 10 }), bag(60, 2000, { tool: 4 }), bag(100, 5000, { tool: 10 }),
  ] },
  { id: 'axe', icon: 'axe', theme: 'village', cell: { col: 0, z: HUB_Z, dx: 3 }, requires: ['bag'], levels: [
    { label: 'Hache rapide', cost: 24, effect: { kind: 'axe', chopMul: 0.6, speedMul: 1 } },
    { label: 'Hache dorée', cost: 1000, mats: { tool: 3 }, effect: { kind: 'axe', chopMul: 0.6, speedMul: 1.15 } },
  ] },
  // Chaîne bois
  { id: 'lumber', icon: 'worker', theme: 'wood', cell: crewCell(COLS.wood), requires: ['axe'], levels: crewLevels('Bûcheron', 'wood', [60, 220, 600, 1200, 2200], 3, 5) },
  { id: 'saw', icon: 'plank', theme: 'wood', cell: MACHINES.saw.cell, requires: ['lumber'], levels: [{ label: 'Scierie', cost: 50, effect: { kind: 'machine', machine: 'saw' } }] },
  { id: 'beltWood', icon: 'belt', theme: 'wood', cell: beltCell(COLS.wood), requires: ['saw'], levels: [belt('wood', 300)] },
  // Chaîne viande
  { id: 'hunt', icon: 'meat', theme: 'meat', cell: ZONES.meat.cell, requires: ['saw'], levels: [{ label: 'Zone de chasse', cost: 120, effect: { kind: 'zone', zone: 'meat' } }] },
  { id: 'hunter', icon: 'worker', theme: 'meat', cell: crewCell(COLS.meat), requires: ['hunt'], levels: crewLevels('Chasseur', 'meat', [200, 500, 1000, 1800, 3000], 3, 5) },
  { id: 'grill', icon: 'steak', theme: 'meat', cell: MACHINES.grill.cell, requires: ['hunt'], levels: [{ label: 'Grill', cost: 350, mats: { plank: 8 }, effect: { kind: 'machine', machine: 'grill' } }] },
  { id: 'beltMeat', icon: 'belt', theme: 'meat', cell: beltCell(COLS.meat), requires: ['grill'], levels: [belt('meat', 500)] },
  // Chaîne or
  { id: 'mine', icon: 'gold', theme: 'gold', cell: ZONES.gold.cell, requires: ['grill'], levels: [{ label: "Mine d'or", cost: 600, mats: { plank: 12 }, effect: { kind: 'zone', zone: 'gold' } }] },
  { id: 'miner', icon: 'worker', theme: 'gold', cell: crewCell(COLS.gold), requires: ['mine'], levels: crewLevels('Mineur', 'gold', [500, 1000, 1600, 2500, 3800], 3, 5) },
  { id: 'forge', icon: 'ingot', theme: 'gold', cell: MACHINES.forge.cell, requires: ['mine'], levels: [{ label: 'Fonderie', cost: 900, mats: { plank: 15 }, effect: { kind: 'machine', machine: 'forge' } }] },
  { id: 'beltGold', icon: 'belt', theme: 'gold', cell: beltCell(COLS.gold), requires: ['forge'], levels: [belt('gold', 800)] },
  // Village
  { id: 'workshop', icon: 'tool', theme: 'village', cell: VILLAGE.workshop, requires: ['forge'], levels: [{ label: 'Atelier', cost: 1400, mats: { plank: 25, ingot: 10 }, effect: { kind: 'machine', machine: 'workshop' } }] },
  { id: 'courier', icon: 'worker', theme: 'village', cell: VILLAGE.courier, requires: ['saw'], levels: crewLevels('Livreur', 'courier', [150, 400, 800, 1500, 2500], 3, 5) },
  { id: 'canteen', icon: 'steak', theme: 'village', cell: CANTEEN.cell, requires: ['grill'], levels: [{ label: 'Cantine', cost: 500, mats: { plank: 15 }, effect: { kind: 'canteen' } }] },
  { id: 'house', icon: 'house', theme: 'village', cell: VILLAGE.housePad, requires: ['workshop'], levels: [
    house(1, 200, { plank: 10 }, 2), house(2, 600, { plank: 20, steak: 5 }, 4), house(3, 1500, { plank: 30, ingot: 6 }, 7), house(4, 3000, { plank: 40, tool: 3 }, 12),
  ] },
  { id: 'furnace', icon: 'fire', theme: 'village', cell: FURNACE_CELL, requires: ['workshop', 'house'], levels: [
    { label: 'Grand fourneau', cost: 5000, mats: { plank: 50, ingot: 20, tool: 6 }, effect: { kind: 'furnace' } },
  ] },
];

export const GOAL_PAD: PadId = 'furnace';

/** Tout ce dont le validateur et le moteur ont besoin, regroupé pour pouvoir tester des variantes. */
export interface GameConfig {
  pads: PadDef[];
  zones: Record<RawItem, ZoneDef>;
  machines: Record<MachineId, MachineDef>;
  counters: Record<CounterId, CounterDef>;
  chains: Record<ChainId, ChainDef>;
  goal: PadId;
}
export const CONFIG: GameConfig = { pads: PADS, zones: ZONES, machines: MACHINES, counters: COUNTERS, chains: CHAINS, goal: GOAL_PAD };

export const THEME_COLORS: Record<Theme, number> = {
  wood: 0x9fb582, // brun-vert
  meat: 0xf2b8b0, // rouge doux
  gold: 0xf7d76a, // jaune
  village: 0xbccadb, // bleu-gris
};
/** Couleur des pointillés qui relient les étapes d'une chaîne. */
export const THEME_LINES: Record<Theme, string> = {
  wood: '#5f7a43',
  meat: '#c4605a',
  gold: '#c79a1c',
  village: '#6f86a3',
};
