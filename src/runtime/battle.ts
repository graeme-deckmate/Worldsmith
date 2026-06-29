import type { Boss, Enemy } from '../model/index.ts';
import type { Rng } from './rng.ts';
import { chance, pickWeighted, randInt } from './rng.ts';
import type { WorldIndex } from './worldIndex.ts';

/**
 * A clean, deterministic, data-driven battle. Faithful to Sigilbound's shape
 * (multiple enemies, shields, element weak/resist, form/rune power, status DoTs,
 * enemy moves + riders) but a fresh implementation over the World's data — not a
 * byte-port of the game's reducer. All randomness flows through the seeded Rng.
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
  shield: number;
  // per-battle wheel flags (set by twin riders in E8.4)
  steamed?: boolean;
  noShieldTurns?: number;
  witherAmp?: boolean;
  rotDots?: boolean;
}

export interface BattlePlayer extends Fighter {
  mp: number;
  maxmp: number;
  level: number;
}

export interface BattleState {
  enemies: BattleEnemy[];
  target: number; // index of the focused enemy
  player: BattlePlayer;
  round: number;
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

/** Wheel/mastery/aspect numbers live in the flat `world.wheel.tuning` map. */
export const WTUNE = (idx: WorldIndex, key: string, fallback: number): number =>
  idx.world.wheel.tuning[key] ?? fallback;

export function playerMaxHp(idx: WorldIndex, level: number): number {
  return Math.round(TUNING(idx, 'progression', 'BASE_HP', 46) + TUNING(idx, 'progression', 'HP_PER_LEVEL', 8) * (level - 1));
}
export function playerMaxMp(idx: WorldIndex, level: number): number {
  return Math.round(TUNING(idx, 'progression', 'BASE_MP', 26) + TUNING(idx, 'progression', 'MP_PER_LEVEL', 4) * (level - 1));
}

function makeEnemy(def: Enemy, lv: number): BattleEnemy {
  const maxhp = Math.round(def.h0 + def.hpl * lv);
  return {
    name: def.name, lv, atk: def.a0 + def.al * lv, hp: maxhp, maxhp, statuses: {},
    weak: [...def.weak], resist: [...def.resist], moves: def.moves,
    xp: Math.round(def.xpBase + def.xpPerLv * lv), isBoss: false, shield: 0,
  };
}

/** Start a wild battle from a formation's spawned members. */
export function initBattle(_idx: WorldIndex, spawns: { def: Enemy; lv: number }[], player: BattlePlayer): BattleState {
  const enemies = spawns.map((s) => makeEnemy(s.def, s.lv));
  const names = enemies.map((e) => e.name).join(', ');
  return {
    enemies, target: 0, player: { ...player }, round: 0,
    log: [enemies.length > 1 ? `Ambushed by ${names}!` : `A wild ${names} appears!`], over: null,
  };
}

export function initBossBattle(_idx: WorldIndex, boss: Boss, player: BattlePlayer): BattleState {
  const e: BattleEnemy = {
    name: boss.name, lv: boss.lv, atk: boss.a0 + boss.al * boss.lv, hp: boss.hp, maxhp: boss.hp,
    statuses: {}, weak: [...boss.weak], resist: [...boss.resist], moves: boss.moves, xp: boss.xp,
    isBoss: true, bossId: boss.id, shield: 0,
  };
  return { enemies: [e], target: 0, player: { ...player }, round: 0, log: [boss.intro || `${boss.name} blocks your path!`], over: null };
}

function aliveIndices(s: BattleState): number[] {
  const out: number[] = [];
  s.enemies.forEach((e, i) => { if (e.hp > 0) out.push(i); });
  return out;
}

/** The targeted enemy index, snapping to the first alive enemy if the focus died. */
function targetIndex(s: BattleState): number {
  const focused = s.enemies[s.target];
  if (focused && focused.hp > 0) return s.target;
  return aliveIndices(s)[0] ?? -1;
}

export function setTarget(state: BattleState, i: number): BattleState {
  if ((state.enemies[i]?.hp ?? 0) <= 0) return state;
  return { ...state, target: i };
}

function elementMult(idx: WorldIndex, element: string, enemy: BattleEnemy): number {
  if (enemy.weak.includes(element)) return TUNING(idx, 'combat', 'weakMult', 1.6);
  if (enemy.resist.includes(element)) return TUNING(idx, 'combat', 'resistMult', 0.5);
  return 1;
}

/** Apply damage to an enemy, absorbing into its shield first. */
function damageEnemy(e: BattleEnemy, dmg: number): void {
  let d = dmg;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, d);
    e.shield -= absorbed;
    d -= absorbed;
  }
  e.hp = Math.max(0, e.hp - d);
}

export function spellCost(idx: WorldIndex, spell: Spell): number {
  const form = idx.forms.get(spell.form);
  const rune = idx.runes.get(spell.rune);
  return Math.max(1, Math.ceil((form?.mp ?? 1) * (rune?.mp ?? 1) * TUNING(idx, 'combat', 'costBase', 3)));
}

/** Player casts a spell at the focused enemy, then enemies act and statuses tick. */
export function castSpell(idx: WorldIndex, state: BattleState, spell: Spell, rng: Rng): BattleState {
  if (state.over) return state;
  const s = clone(state);
  const ti = targetIndex(s);
  const target = s.enemies[ti];
  if (!target) return finish(idx, s, 'win');

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
    const mult = (form?.pw ?? 1) * (rune?.pw ?? 1) * elementMult(idx, spell.element, target);
    const variance = 0.9 + rng() * 0.2;
    const dmg = Math.max(1, Math.round(base * mult * variance));
    damageEnemy(target, dmg);
    s.log.push(`You cast ${element?.label ?? spell.element} ${form?.label ?? spell.form} at ${target.name} for ${String(dmg)}.`);
    if (element && chance(rng, element.proc + (rune?.procBonus ?? 0))) {
      const st = idx.enemyStatuses.get(element.status);
      if (st) {
        target.statuses[st.id] = st.duration;
        s.log.push(`${target.name} is ${st.label}!`);
      }
    }
  }

  if (aliveIndices(s).length === 0) return finish(idx, s, 'win');
  enemyPhase(idx, s, rng);
  tickAll(idx, s);
  if (s.player.hp <= 0) return finish(idx, s, 'lose');
  if (aliveIndices(s).length === 0) return finish(idx, s, 'win');
  return s;
}

/** Defend: regain focus, then enemies act. */
export function defend(idx: WorldIndex, state: BattleState, rng: Rng): BattleState {
  if (state.over) return state;
  const s = clone(state);
  s.player.mp = Math.min(s.player.maxmp, s.player.mp + Math.ceil(s.player.maxmp * 0.35));
  s.log.push('You focus and recover some essence.');
  enemyPhase(idx, s, rng);
  tickAll(idx, s);
  if (s.player.hp <= 0) return finish(idx, s, 'lose');
  return s;
}

function enemyPhase(idx: WorldIndex, s: BattleState, rng: Rng): void {
  s.round += 1;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    if (e.statuses['stunned'] !== undefined) {
      s.log.push(`${e.name} is stunned and cannot act.`);
      continue;
    }
    const move = pickWeighted(rng, e.moves.map((m) => ({ item: m, weight: m.weight ?? 1 }))) ?? e.moves[0];
    if (!move) continue;
    let dealtMult = 1;
    for (const sid of Object.keys(e.statuses)) {
      const def = idx.enemyStatuses.get(sid);
      if (def?.dealtMult !== undefined) dealtMult *= def.dealtMult;
    }
    if (e.steamed) { dealtMult *= WTUNE(idx, 'steamMult', 0.7); e.steamed = false; }
    const dmg = Math.max(0, Math.round(e.atk * move.mult * dealtMult));
    if (dmg > 0) {
      s.player.hp = Math.max(0, s.player.hp - dmg);
      s.log.push(`${e.name} uses ${move.name} for ${String(dmg)}.`);
    } else {
      s.log.push(`${e.name} uses ${move.name}.`);
    }
    const rider = move.rider;
    if (rider?.type === 'playerStatus' && chance(rng, rider.chance)) {
      const ps = idx.world.playerStatuses.find((p) => p.id === rider.status);
      s.player.statuses[rider.status] = 3;
      s.log.push(`You are afflicted with ${ps?.label ?? rider.status}!`);
    } else if (rider?.type === 'mpDrain') {
      s.player.mp = Math.max(0, s.player.mp - rider.amount);
    } else if (rider?.type === 'selfShield') {
      e.shield += rider.amount;
    }
    if ((e.noShieldTurns ?? 0) > 0) e.noShieldTurns = (e.noShieldTurns ?? 0) - 1;
    if (s.player.hp <= 0) return;
  }
}

function tickEnemyDots(idx: WorldIndex, e: BattleEnemy, s: BattleState): void {
  for (const sid of Object.keys(e.statuses)) {
    const def = idx.enemyStatuses.get(sid);
    if (def?.dot) {
      const d = Math.round(def.dot.base + def.dot.perLv * e.lv);
      e.hp = Math.max(0, e.hp - d);
      if (d > 0) s.log.push(`${e.name} takes ${String(d)} from ${def.label}.`);
    }
  }
}

function tickAll(idx: WorldIndex, s: BattleState): void {
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    tickEnemyDots(idx, e, s);
    if (e.rotDots && e.hp > 0) tickEnemyDots(idx, e, s); // rot twin: DoTs tick twice
    for (const sid of Object.keys(e.statuses)) {
      const left = (e.statuses[sid] ?? 0) - 1;
      if (left <= 0) delete e.statuses[sid];
      else e.statuses[sid] = left;
    }
  }
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

/** Total XP from a finished battle and the boss ids that fell. */
export function battleXp(s: BattleState): number {
  return s.enemies.reduce((sum, e) => sum + e.xp, 0);
}
export function defeatedBossIds(s: BattleState): string[] {
  return s.enemies.filter((e) => e.isBoss && e.bossId).map((e) => e.bossId as string);
}

function finish(_idx: WorldIndex, s: BattleState, outcome: 'win' | 'lose'): BattleState {
  s.over = outcome;
  if (outcome === 'win') {
    const names = s.enemies.map((e) => e.name).join(', ');
    s.log.push(`You defeated ${names}! (+${String(battleXp(s))} xp)`);
  } else {
    s.log.push('You were defeated…');
  }
  return s;
}

function clone(s: BattleState): BattleState {
  return {
    enemies: s.enemies.map((e) => ({ ...e, statuses: { ...e.statuses } })),
    target: s.target,
    player: { ...s.player, statuses: { ...s.player.statuses } },
    round: s.round,
    log: [...s.log],
    over: s.over,
  };
}

/** Pick a random enemy level within a zone's band. */
export function zoneLevel(rng: Rng, levelMin: number, levelMax: number): number {
  return randInt(rng, levelMin, Math.max(levelMin, levelMax));
}
