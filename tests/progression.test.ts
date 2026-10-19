import { describe, expect, it } from 'vitest';
import { CONFIG, type GameConfig, type PadDef } from '../src/game/config';
import { ProgressionError, isProducible, padStatus, validateProgression } from '../src/game/progression';

const clone = (cfg: GameConfig): GameConfig => ({ ...cfg, pads: cfg.pads.map((p) => ({ ...p, requires: [...p.requires], levels: p.levels.map((l) => ({ ...l, mats: l.mats && { ...l.mats } })) })) });
const state = (levels: Record<string, number>) => ({ level: (id: string) => levels[id] ?? 0 });

describe('validateur de progression', () => {
  it('passe avec la config actuelle', () => {
    const r = validateProgression(CONFIG);
    expect(r.nodes).toBeGreaterThan(20);
    expect(r.order.at(-1)).toBe('Grand fourneau');
  });

  it("échoue si un bûcheron niv.4 demande des outils alors que l'Atelier dépend de ce niveau", () => {
    const cfg = clone(CONFIG);
    const workshop = cfg.pads.find((p) => p.id === 'workshop') as PadDef;
    workshop.requires = ['forge', 'lumber#4'];
    expect(() => validateProgression(cfg)).toThrow(ProgressionError);
    expect(() => validateProgression(cfg)).toThrow(/Bûcheron niv\.4/);
  });

  it("échoue si une case demande un produit qu'aucune machine ne fabrique", () => {
    const cfg = clone(CONFIG);
    cfg.pads = cfg.pads.filter((p) => p.id !== 'forge');
    cfg.pads.find((p) => p.id === 'workshop')!.requires = ['mine'];
    expect(() => validateProgression(cfg)).toThrow(/Lingots/);
  });

  it('échoue si le Grand fourneau dépend d’une case inconnue', () => {
    const cfg = clone(CONFIG);
    cfg.pads.find((p) => p.id === 'furnace')!.requires = ['workshop', 'house#9' as never];
    expect(() => validateProgression(cfg)).toThrow(/Grand fourneau/);
  });
});

describe('cases verrouillées (bug C)', () => {
  const lumber = CONFIG.pads.find((p) => p.id === 'lumber')!;
  it('le niveau 4 du bûcheron est grisé « Atelier requis » tant que l’Atelier n’existe pas', () => {
    expect(padStatus(lumber, state({ bag: 1, axe: 1, lumber: 3, saw: 1 }))).toEqual({ kind: 'locked', level: 3, lockedText: 'Atelier requis' });
  });
  it('le niveau 4 devient payable une fois l’Atelier construit', () => {
    expect(padStatus(lumber, state({ bag: 1, axe: 1, lumber: 3, workshop: 1 }))).toEqual({ kind: 'open', level: 3 });
  });
  it('isProducible : brut = zone débloquée, produit = machine construite', () => {
    expect(isProducible('wood', state({}))).toBe(true);
    expect(isProducible('meat', state({}))).toBe(false);
    expect(isProducible('meat', state({ hunt: 1 }))).toBe(true);
    expect(isProducible('tool', state({ forge: 1 }))).toBe(false);
    expect(isProducible('tool', state({ workshop: 1 }))).toBe(true);
  });
  it('le Sac niv.3 (planches) est grisé « Scierie requise » avant la scierie', () => {
    const bag = CONFIG.pads.find((p) => p.id === 'bag')!;
    expect(padStatus(bag, state({ bag: 2 }))).toEqual({ kind: 'locked', level: 2, lockedText: 'Scierie requise' });
  });
});
