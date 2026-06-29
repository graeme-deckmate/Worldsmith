import type { Boss, Enemy } from '../model/index.ts';
import type { Rng } from './rng.ts';
import { chance, pickWeighted, randInt } from './rng.ts';
import type { WorldIndex } from './worldIndex.ts';

/**
 * A clean, deterministic, data-driven battle. Faithful to Sigilbound's shape
 * (element weak/resist, form power, rune power, status DoTs, enemy moves +
 * riders) but a fresh implementation over the World's data — not a byte-port of
 * the game's reducer. All randomness flows through the injected seeded Rng.
 */

export interface Fighter {
  hp: number;
  maxhp: number;
  statuses: Record<string, number>; // statusId -> turns remaining
}

export interface BattleEnemy extends Fighter {
  name: string;
  lv: number;
  atk: number;
  weak: string[];
  resist: string[];
  moves: Enemy['moves'];
  xp: number;
  isBoss: boolean;
  bossId?: string;
}

export interface BattlePlayer extends Fighter {
  mp: number;
  maxmp: number;
  level: number;
}

export interface BattleState {
  enemy: BattleEnemy;
  player: BattlePlayer;
  log: string[];
  over: null | 'win' | 'lose';
}

export interface Spell {
  element: string;
  form: string;
  rune: string;
}

const TUNING = (idx: WorldIndex, group: string, key: string, fallback: number): number =>
  idx.world.tuning[group]?.[key] ?? fallback;

export function playerMaxHp(idx: WorldIndex, level: number): number {
  return Math.round(TUNING(idx, 'progression', 'BASE_HP', 46) + TUNING(idx, 'progression', 'HP_PER_LEVEL', 8) * (level - 1));
}
export function playerMaxMp(idx: WorldIndex, level: number): number {
  return Math.round(TUNING(idx, 'progression', 'BASE_MP', 26) + TUNING(idx, 'progression', 'MP_PER_LEVEL', 4) * (level - 1));
}

export function initBattle(_idx: WorldIndex, enemyDef: Enemy, lv: number, player: BattlePlayer): BattleState {
  const maxhp = Math.round(enemyDef.h0 + enemyDef.hpl * lv);
  return {
    enemy: {
      name: enemyDef.name, lv, atk: enemyDef.a0 + enemyDef.al * lv,
      hp: maxhp, maxhp, statuses: {}, weak: [...enemyDef.weak], resist: [...enemyDef.resist],
      moves: enemyDef.moves, xp: Math.round(enemyDef.xpBase + enemyDef.xpPerLv * lv), isBoss: false,
    },
    player: { ...player },
    log: [`A wild ${enemyDef.name} appears!`],
    over: null,
  };
}

export function initBossBattle(_idx: WorldIndex, boss: Boss, player: BattlePlayer): BattleState {
  return {
    enemy: {
      name: boss.name, lv: boss.lv, atk: boss.a0 + boss.al * boss.lv,
      hp: boss.hp, maxhp: boss.hp, statuses: {}, weak: [...boss.weak], resist: [...boss.resist],
      moves: boss.moves, xp: boss.xp, isBoss: true, bossId: boss.id,
    },
    player: { ...player },
    log: [boss.intro || `${boss.name} blocks your path!`],
    over: null,
  };
}

function elementMult(idx: WorldIndex, element: string, enemy: BattleEnemy): number {
  if (enemy.weak.includes(element)) return TUNING(idx, 'combat', 'weakMult', 1.6);
  if (enemy.resist.includes(element)) return TUNING(idx, 'combat', 'resistMult', 0.5);
  return 1;
}

export function spellCost(idx: WorldIndex, spell: Spell): number {
  const form = idx.forms.get(spell.form);
  const rune = idx.runes.get(spell.rune);
  return Math.max(1, Math.ceil((form?.mp ?? 1) * (rune?.mp ?? 1) * TUNING(idx, 'combat', 'costBase', 3)));
}

/** Player casts a spell, then the enemy acts and statuses tick. Returns new state. */
export function castSpell(idx: WorldIndex, state: BattleState, spell: Spell, rng: Rng): BattleState {
  if (state.over) return state;
  const s = clone(state);
  const element = idx.elements.get(spell.element);
  const form = idx.forms.get(spell.form);
  const rune = idx.runes.get(spell.rune);
  const cost = spellCost(idx, spell);

  if (s.player.mp < cost) {
    s.log.push('Not enough focus — you steady yourself instead.');
    s.player.mp = Math.min(s.player.maxmp, s.player.mp + Math.ceil(s.player.maxmp * 0.35));
  } else {
    s.player.mp -= cost;
    const base = TUNING(idx, 'combat', 'basePower', 8) + s.player.level * TUNING(idx, 'combat', 'levelScaling', 2);
    const mult = (form?.pw ?? 1) * (rune?.pw ?? 1) * elementMult(idx, spell.element, s.enemy);
    const variance = 0.9 + rng() * 0.2;
    const dmg = Math.max(1, Math.round(base * mult * variance));
    s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
    s.log.push(`You cast ${element?.label ?? spell.element} ${form?.label ?? spell.form} for ${String(dmg)}.`);
    // status proc
    if (element && chance(rng, element.proc + (rune?.procBonus ?? 0))) {
      const st = idx.enemyStatuses.get(element.status);
      if (st) {
        s.enemy.statuses[st.id] = st.duration;
        s.log.push(`${s.enemy.name} is ${st.label}!`);
      }
    }
  }

  if (s.enemy.hp <= 0) return finish(idx, s, 'win');
  enemyTurn(idx, s, rng);
  tickStatuses(idx, s);
  if (s.player.hp <= 0) return finish(idx, s, 'lose');
  if (s.enemy.hp <= 0) return finish(idx, s, 'win');
  return s;
}

/** Defend: regain focus, take a turn. */
export function defend(idx: WorldIndex, state: BattleState, rng: Rng): BattleState {
  if (state.over) return state;
  const s = clone(state);
  s.player.mp = Math.min(s.player.maxmp, s.player.mp + Math.ceil(s.player.maxmp * 0.35));
  s.log.push('You focus and recover some essence.');
  enemyTurn(idx, s, rng);
  tickStatuses(idx, s);
  if (s.player.hp <= 0) return finish(idx, s, 'lose');
  return s;
}

function enemyTurn(idx: WorldIndex, s: BattleState, rng: Rng): void {
  if (s.enemy.statuses['stunned'] !== undefined) {
    s.log.push(`${s.enemy.name} is stunned and cannot act.`);
    return;
  }
  const move = pickWeighted(rng, s.enemy.moves.map((m) => ({ item: m, weight: m.weight ?? 1 }))) ?? s.enemy.moves[0];
  if (!move) return;
  // chilled reduces enemy damage dealt
  let dealtMult = 1;
  for (const sid of Object.keys(s.enemy.statuses)) {
    const def = idx.enemyStatuses.get(sid);
    if (def?.dealtMult !== undefined) dealtMult *= def.dealtMult;
  }
  const dmg = Math.max(0, Math.round(s.enemy.atk * move.mult * dealtMult));
  if (dmg > 0) {
    s.player.hp = Math.max(0, s.player.hp - dmg);
    s.log.push(`${s.enemy.name} uses ${move.name} for ${String(dmg)}.`);
  } else {
    s.log.push(`${s.enemy.name} uses ${move.name}.`);
  }
  const rider = move.rider;
  if (rider?.type === 'playerStatus' && chance(rng, rider.chance)) {
    const ps = idx.world.playerStatuses.find((p) => p.id === rider.status);
    s.player.statuses[rider.status] = 3;
    s.log.push(`You are afflicted with ${ps?.label ?? rider.status}!`);
  } else if (rider?.type === 'mpDrain') {
    s.player.mp = Math.max(0, s.player.mp - rider.amount);
  }
}

function tickStatuses(idx: WorldIndex, s: BattleState): void {
  // enemy DoTs
  for (const sid of Object.keys(s.enemy.statuses)) {
    const def = idx.enemyStatuses.get(sid);
    if (def?.dot) {
      const d = Math.round(def.dot.base + def.dot.perLv * s.enemy.lv);
      s.enemy.hp = Math.max(0, s.enemy.hp - d);
      if (d > 0) s.log.push(`${s.enemy.name} takes ${String(d)} from ${def.label}.`);
    }
    const left = (s.enemy.statuses[sid] ?? 0) - 1;
    if (left <= 0) delete s.enemy.statuses[sid];
    else s.enemy.statuses[sid] = left;
  }
  // player DoTs
  for (const sid of Object.keys(s.player.statuses)) {
    const def = idx.world.playerStatuses.find((p) => p.id === sid);
    if (def?.dotPctMaxHp) {
      const d = Math.max(1, Math.round(s.player.maxhp * def.dotPctMaxHp));
      s.player.hp = Math.max(0, s.player.hp - d);
      s.log.push(`You take ${String(d)} from ${def.label}.`);
    }
    const left = (s.player.statuses[sid] ?? 0) - 1;
    if (left <= 0) delete s.player.statuses[sid];
    else s.player.statuses[sid] = left;
  }
}

function finish(_idx: WorldIndex, s: BattleState, outcome: 'win' | 'lose'): BattleState {
  s.over = outcome;
  s.log.push(outcome === 'win' ? `You defeated ${s.enemy.name}! (+${String(s.enemy.xp)} xp)` : 'You were defeated…');
  return s;
}

function clone(s: BattleState): BattleState {
  return {
    enemy: { ...s.enemy, statuses: { ...s.enemy.statuses } },
    player: { ...s.player, statuses: { ...s.player.statuses } },
    log: [...s.log],
    over: s.over,
  };
}

/** Pick a random enemy level within a zone's band. */
export function zoneLevel(rng: Rng, levelMin: number, levelMax: number): number {
  return randInt(rng, levelMin, Math.max(levelMin, levelMax));
}
