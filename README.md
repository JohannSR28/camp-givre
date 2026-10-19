# Camp Givré

Jeu « idle arcade » d'hiver en 3D (three.js), dans une application Next.js.

Trois chaînes de production compactes (bois, viande, or), chacune sur un seul chemin : **récolte → machine → comptoir**. Le comptoir d'une chaîne achète la ressource brute, puis uniquement le produit transformé dès que la machine est construite. Le village (Atelier, Cantine, Maisons, Grand fourneau) est regroupé derrière le hub.

## Commandes

```bash
npm install
npm run dev          # jeu sur http://localhost:3000
npm test             # validateur de progression, files de clients, disposition, simulation d'économie
npm run sim          # simulation seule, avec la chronologie des déblocages (ajouter --silent=false)
npm run typecheck
npm run screenshots  # captures 390×844 (serveur dev lancé ; CAMP_URL pour changer l'adresse)
```

## Structure

- `src/game/config.ts` — **toute la configuration** : prix, coûts, cases, machines, comptoirs, ouvriers, maisons, grille de la carte. L'équilibrage se fait ici.
- `src/game/progression.ts` — `isProducible`, état des cases (cachée / grisée / payable) et validateur de progression.
- `src/game/rules.ts` — règles partagées : commandes des clients, stats des ouvriers, revenu des maisons, pile sur le dos.
- `src/game/layout.ts` — géométrie des bâtiments et boîtes englobantes (test de chevauchement).
- `src/game/engine.js` — moteur three.js (rendu, déplacements, animations).
- `src/game/sim.ts` — simulation d'économie sans rendu avec un bot glouton.
- `components/Game.js` — HUD React qui démarre le moteur.
- `tests/` — tests Vitest.

En développement, le validateur de progression s'exécute au démarrage et `window.__camp` expose quelques outils de debug (`teleport`, `money`, `unlockAll`, `fill`, `state`, `pads`, `hintVisible`).
