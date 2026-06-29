import type { BossSpecial } from '../../model/index.ts';

/** Per-kind default BossSpecial, used when creating a boss or switching mechanic. */
export const SPECIAL_DEFAULTS: Record<BossSpecial['kind'], BossSpecial> = {
  bars: { kind: 'bars', barHp: 140, barKeys: ['choir', 'wheel', 'author'], offKeyMult: 0.25, summonSpecies: 'enemy', summonLv: 10, unwriteEvery: 4, unwriteMult: 2, unwriteName: 'Unwriting' },
  submerge: { kind: 'submerge', every: 3, voltMult: 2, breachName: 'Breach', breachMult: 1.5 },
  summonAndVeil: { kind: 'summonAndVeil', summonAtHpFrac: 0.6, summonSpecies: 'enemy', summonCount: 2, summonLv: 6, veilName: 'Veil', veilEvery: 4, veilShield: 28 },
  enrage: { kind: 'enrage', belowHpFrac: 0.35, dmgMult: 1.4, weightedMove: '', enragedWeightMult: 2 },
  attune: { kind: 'attune', attunedMult: 1.8, otherMult: 0.85, shiftEveryPhase1: 2, shiftEveryPhase2: 1, phase2AtHpFrac: 0.5, phase3AtHpFrac: 0.2, summonSpecies: 'enemy', summonCount: 2, summonLv: 8, doomName: 'Doom', doomMult: 2.6 },
};
