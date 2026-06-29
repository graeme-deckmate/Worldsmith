# Worldsmith ⚒

A standalone, web-accessible **world editor** for Sigilbound-style games. Author your own
elements, forms, runes, statuses, enemies, bosses, items, maps, sprites, dialogue and
**area-unlock rules** into a single `.world.json`, then (from E6) playtest it in a bundled
engine — all in the browser, no server.

- **Stack:** React + Vite + TypeScript, Tailwind, Zustand, Zod. Client-only; worlds live in
  IndexedDB and export/import as JSON. Deploys to GitHub Pages.
- **Design note:** game *data* (numbers, rosters, maps, palettes, unlock rules) is fully
  user-definable. Game *mechanics* (the boss/form/rune behaviours) are runtime archetypes the
  editor parameterizes — new behaviours are a runtime code change, not an editor feature.

## Develop

```bash
npm install
npm run dev        # vite dev server
npm run test       # vitest
npm run typecheck  # tsc -b
npm run lint       # oxlint
npm run build      # production build (dist/)
```

## Build phases

- **E0** — scaffold, World schema (Zod) + migrate, IndexedDB persistence, import/export, sample world. ✅
- **E1** — pixel colour editor (sprite + palette).
- **E2** — stat content editors (elements, forms, runes, statuses, items, classes…).
- **E3** — enemies + bosses editor.
- **E4** — map editor (terrain painter, entities, world-graph, live validation).
- **E5** — area-unlock rules + dialogue + problems panel.
- **E6** — data-driven runtime + Playtest player.
- **E7** — polish, docs, sample worlds, sharing.

The content model mirrors the [Sigilbound II](https://github.com/graeme-deckmate/Sigilbound2)
game's data shapes, with open string ids so any world can be authored from scratch.
