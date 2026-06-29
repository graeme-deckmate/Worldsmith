import type { BossSpecial, EnemyMove, Formation } from '../../model/index.ts';
import type { EntityReg } from './EntityListPanel.tsx';
import { MovesEditor, BossSpecialEditor, FormationsEditor } from './subeditors.tsx';
import { SPECIAL_DEFAULTS } from './bossDefaults.ts';

/**
 * Registrations for the combat collections (E3) whose array/union fields need a
 * bespoke sub-editor (`extra`): enemies + moves, bosses + moves + BossSpecial,
 * zones + formations, plus the trivial elite affixes.
 */

type Def = { id: string } & Record<string, unknown>;

export const COMBAT_REGS: EntityReg[] = [
  {
    key: 'enemies',
    label: 'Enemies',
    idPrefix: 'enemy',
    spec: [
      { key: 'name', label: 'Name', kind: 'text' },
      { key: 'h0', label: 'HP base', kind: 'number' },
      { key: 'hpl', label: 'HP / level', kind: 'number' },
      { key: 'a0', label: 'ATK base', kind: 'number' },
      { key: 'al', label: 'ATK / level', kind: 'number' },
      { key: 'xpBase', label: 'XP base', kind: 'number' },
      { key: 'xpPerLv', label: 'XP / level', kind: 'number' },
      { key: 'weak', label: 'Weak to', kind: 'idrefMulti', ref: 'elements' },
      { key: 'resist', label: 'Resists', kind: 'idrefMulti', ref: 'elements' },
      { key: 'sprite', label: 'Sprite', kind: 'idref', ref: 'sprites' },
    ],
    factory: (id): Def => ({
      id, name: id, h0: 14, hpl: 4, a0: 4, al: 1, xpBase: 4, xpPerLv: 2,
      weak: [], resist: [], moves: [{ name: 'attack', mult: 1 }],
    }),
    extra: (def, patch) => (
      <MovesEditor moves={(def.moves as EnemyMove[]) ?? []} onChange={(moves) => patch({ moves })} />
    ),
  },
  {
    key: 'bosses',
    label: 'Bosses',
    idPrefix: 'boss',
    spec: [
      { key: 'name', label: 'Name', kind: 'text' },
      { key: 'lv', label: 'Level', kind: 'number' },
      { key: 'hp', label: 'HP', kind: 'number' },
      { key: 'a0', label: 'ATK base', kind: 'number' },
      { key: 'al', label: 'ATK / level', kind: 'number' },
      { key: 'xp', label: 'XP', kind: 'number' },
      { key: 'weak', label: 'Weak to', kind: 'idrefMulti', ref: 'elements' },
      { key: 'resist', label: 'Resists', kind: 'idrefMulti', ref: 'elements' },
      { key: 'intro', label: 'Intro line', kind: 'textarea' },
      { key: 'sigilToast', label: 'Victory toast', kind: 'text' },
      { key: 'sprite', label: 'Sprite', kind: 'idref', ref: 'sprites' },
    ],
    factory: (id): Def => ({
      id, name: id, lv: 5, hp: 120, a0: 7, al: 1.3, xp: 40, weak: [], resist: [],
      moves: [{ name: 'attack', mult: 1 }], intro: '', sigilToast: '', special: SPECIAL_DEFAULTS.enrage,
    }),
    extra: (def, patch) => (
      <div className="space-y-5">
        <MovesEditor moves={(def.moves as EnemyMove[]) ?? []} onChange={(moves) => patch({ moves })} />
        <BossSpecialEditor
          special={(def.special as BossSpecial) ?? SPECIAL_DEFAULTS.enrage}
          onChange={(special) => patch({ special })}
        />
      </div>
    ),
  },
  {
    key: 'zones',
    label: 'Zones',
    idPrefix: 'zone',
    spec: [
      { key: 'levelMin', label: 'Level min', kind: 'number' },
      { key: 'levelMax', label: 'Level max', kind: 'number' },
      { key: 'eliteChance', label: 'Elite chance', kind: 'number', step: 0.05, optional: true },
    ],
    factory: (id): Def => ({ id, levelMin: 1, levelMax: 3, formations: [] }),
    extra: (def, patch) => (
      <FormationsEditor formations={(def.formations as Formation[]) ?? []} onChange={(formations) => patch({ formations })} />
    ),
  },
  {
    key: 'eliteAffixes',
    label: 'Elite affixes',
    idPrefix: 'affix',
    spec: [{ key: 'prefix', label: 'Name prefix', kind: 'text' }],
    factory: (id): Def => ({ id, prefix: id }),
  },
];
