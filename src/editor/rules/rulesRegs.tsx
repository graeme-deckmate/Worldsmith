import type { Condition } from '../../model/index.ts';
import type { EntityReg } from '../form/EntityListPanel.tsx';
import { ConditionBuilder } from './ConditionBuilder.tsx';

/** Registration for area gates: scalar fields + the recursive condition builder. */
export const RULES_REGS: EntityReg[] = [
  {
    key: 'gates',
    label: 'Area gates',
    idPrefix: 'gate',
    spec: [
      { key: 'to', label: 'Locks entry to map', kind: 'idref', ref: 'maps' },
      { key: 'barred', label: 'Barred dialogue', kind: 'idref', ref: 'dialogue' },
    ],
    factory: (id, w) => ({
      id,
      to: w.maps[0]?.id ?? 'map',
      barred: w.dialogue[0]?.id ?? 'dialogue',
      when: { type: 'flagSet', flag: 'flag' },
    }),
    extra: (def, patch) => (
      <div>
        <div className="text-sm font-semibold text-zinc-300 mb-2">Unlock when…</div>
        <ConditionBuilder
          value={(def.when as Condition) ?? { type: 'flagSet', flag: 'flag' }}
          onChange={(when) => patch({ when })}
        />
        <p className="text-xs text-zinc-500 mt-2">
          The map stays locked (showing the barred dialogue) until this condition is true at runtime.
        </p>
      </div>
    ),
  },
];
