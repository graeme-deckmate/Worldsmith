# Worldsmith — Guide

Worldsmith is a web editor for building **worlds** for a Sigilbound-style RPG, plus a
built-in player to **playtest** them. Everything runs in your browser; a world is one JSON
document you can export, import, and share.

## The World document

A world is a single versioned JSON object (validated by [Zod](https://zod.dev)) holding
ordered collections of content, each with an open string `id`:

| Area | Collections |
|------|-------------|
| Spellcraft | `elements`, `forms`, `runes`, `enemyStatuses`, `playerStatuses`, `wheel` |
| Combat | `enemies`, `bosses`, `zones`, `eliteAffixes` |
| Items | `gearBases`, `gearAffixes`, `rarities`, `equipSlots`, `classes`, `difficulties`, `charms` |
| World | `maps`, `dungeons`, `dialogue`, `music` |
| Rules | `unlocks`, `gates`, `sigilBosses` |
| Art | `sprites`, `palettes` |
| Meta | `meta`, `start`, `tuning` |

Because ids are open, you define your *own* set of elements/forms/runes/etc., rather than
being limited to a fixed five. The shapes mirror the source game's data tables.

## Editors

- **Overview** — world name/author/description, the start map + level, content counts, and a
  validation summary.
- **Pixel editor** (Sprites / Palettes) — a sprite is a character grid + a palette
  (`char → colour`; `.` is transparent). Paint with the selected colour, recolour live, add
  or remove colours, resize, and zoom. Sprites are assigned to enemies/bosses.
- **Stat editors** — elements, forms, runes, statuses, classes, difficulties, gear, rarities,
  charms. Cross-reference fields (e.g. an element's inflicted status) are dropdowns of ids
  that exist in the world.
- **Enemies / Bosses / Zones** — enemy stats + moves (each with an optional rider), bosses
  with one of five mechanic archetypes (`bars`, `submerge`, `summonAndVeil`, `enrage`,
  `attune`) and editable parameters, and zone encounter formations.
- **Map editor** — paint terrain (`.`,`,`,`*`,`-`,`~`,`=` walkable; `#`,`o`,`^`,`~`,`x`
  solid), place any of 19 entity kinds (NPCs, signs, bosses, portals, levers, doors, chests,
  objectives, waystones…), drag zone rectangles, place exits, set spawn, and pick a theme.
  The map is **validated live**: reachability from spawn, exit bidirectionality, entity
  placement, and zones containing reachable tall grass.
- **Dialogue** — speaker + ordered pages, referenced by map NPCs/signs/lore.
- **Unlock schedule** — when each element/form/rune becomes available (start / level /
  shrine / starter / flag).
- **Area gates** — the headline rule type: bar entry to a map until a **condition** is true.
  Conditions are a serializable tree of `bossDefeated`, `flagSet`, `sigilCount`, `level`,
  `itemHeld`, `mapVisited`, composed with `all` / `any` / `not`. The player evaluates the
  same tree at runtime.
- **Problems** — every validation issue across the whole world (cross-references + each map),
  with click-to-navigate. Errors block playtest/export.

## Playtest

Press **▶ playtest** (enabled once there are no errors). Move with arrows / WASD; *bump into*
NPCs and signs to talk, into bosses to fight. Tall grass triggers encounters from the zone's
table; gated exits show their barred dialogue until the condition is met. Winning grants XP
(and levels you up); losing returns you to the start. The battle resolves element weak/resist,
form and rune power, status DoTs, and enemy moves/riders — all read from your world's data.

> **Scope boundary:** game *data* (numbers, rosters, maps, palettes, unlock rules) is fully
> editable. Game *mechanics* — the five boss archetypes, form behaviours, rune effects — are
> interpreted by the runtime, so the editor exposes them as **parameterizable archetypes**.
> A brand-new mechanic is a code change to `src/runtime`, not an editor feature.

## Saving, exporting, sharing

Worlds autosave to your browser (IndexedDB). Use **export** to download a `.world.json`,
**import** to load one, **duplicate** to fork the open world, and **share** to copy a link
that encodes a small world in the URL (large worlds should use file export).

## Project layout

```
src/model/     World schema (Zod) + validation + samples
src/store/     Zustand store, IndexedDB persistence, share links
src/editor/    React editor UI (panels, pixel/, map/, form/, rules/)
src/runtime/   data-driven engine (rng, conditions, battle, overworld)
src/player/    the playtest UI (overworld + battle)
src/render/    shared canvas drawing (sprites + tiles)
```
