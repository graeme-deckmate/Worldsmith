import type { Boss, Enemy, Reaction, Surge } from '../model/index.ts';
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
  // per-battle twin-rider flags
  steamMult?: number; // next enemy move damage ×  (steam)
  noShieldTurns?: number; // selfShield blocked while > 0  (depth)
  witherTakenMult?: number; // extra incoming-damage ×  (night)
  rotDots?: boolean; // DoTs tick twice  (rot)
  actsLast?: boolean; // acts last in the enemy phase  (mire)
}

export interface BattlePlayer extends Fighter {
  mp: number;
  maxmp: number;
  level: number;
  mastery: Record<string, number>; // elementId -> points
  aspect: string | null; // ascendant element id
}

export interface BattleState {
  enemies: BattleEnemy[];
  target: number; // index of the focused enemy
  player: BattlePlayer;
  round: number;
  hitElements: string[]; // elements that landed a hit (for mastery growth)
  log: string[];
  over: null | 'win' | 'lose';
}

export interface Spell {
  element: string;
  element2?: string; // optional twin element
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
    enemies, target: 0, player: { ...player }, round: 0, hitElements: [],
    log: [enemies.length > 1 ? `Ambushed by ${names}!` : `A wild ${names} appears!`], over: null,
  };
}

export function initBossBattle(_idx: WorldIndex, boss: Boss, player: BattlePlayer): BattleState {
  const e: BattleEnemy = {
    name: boss.name, lv: boss.lv, atk: boss.a0 + boss.al * boss.lv, hp: boss.hp, maxhp: boss.hp,
    statuses: {}, weak: [...boss.weak], resist: [...boss.resist], moves: boss.moves, xp: boss.xp,
    isBoss: true, bossId: boss.id, shield: 0,
  };
  return { enemies: [e], target: 0, player: { ...player }, round: 0, hitElements: [], log: [boss.intro || `${boss.name} blocks your path!`], over: null };
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

/** Apply damage to an enemy, absorbing into its shield first (unless ignored). */
function damageEnemy(e: BattleEnemy, dmg: number, ignoreShield = false): void {
  let d = dmg;
  if (e.shield > 0 && !ignoreShield) {
    const absorbed = Math.min(e.shield, d);
    e.shield -= absorbed;
    d -= absorbed;
  }
  e.hp = Math.max(0, e.hp - d);
}

type TwinRider = NonNullable<ReturnType<typeof twinPairFor>>['effect'];

/** Roll status procs (dual at half for twins) with mastery/aspect bonuses + rider flags. */
function rollProcs(idx: WorldIndex, s: BattleState, target: BattleEnemy, spell: Spell, rune: ReturnType<WorldIndex['runes']['get']>, rng: Rng, rider: TwinRider): void {
  const procFrac = WTUNE(idx, 'twinProcFrac', 0.5);
  const parts = spell.element2
    ? [{ el: spell.element, frac: procFrac }, { el: spell.element2, frac: procFrac }]
    : [{ el: spell.element, frac: 1 }];
  for (const part of parts) {
    const elDef = idx.elements.get(part.el);
    if (!elDef || target.hp <= 0) continue;
    let p = (elDef.proc + (rune?.procBonus ?? 0)) * part.frac;
    if (masteryTier(idx, s.player.mastery[part.el] ?? 0) >= 2) p += WTUNE(idx, 'masteryT2Proc', 0.1);
    if (s.player.aspect === part.el) p += WTUNE(idx, 'aspectProc', 0.1);
    if (chance(rng, p)) {
      const st = idx.enemyStatuses.get(elDef.status);
      if (st) {
        target.statuses[st.id] = st.duration;
        s.log.push(`${target.name} is ${st.label}!`);
        if (rider?.extraDotTick && st.dot) target.rotDots = true;
        if (rider?.witherTakenMult !== undefined) target.witherTakenMult = rider.witherTakenMult;
      }
    }
  }
}

/** Apply a twin rider's post-hit effects (mp gain, steam/depth/mire marks, arc). */
function applyRiderPostHit(s: BattleState, target: BattleEnemy, rider: NonNullable<TwinRider>, dmg: number, rng: Rng): void {
  if (rider.mpOnHit) s.player.mp = Math.min(s.player.maxmp, s.player.mp + rider.mpOnHit);
  if (rider.enemyNextMoveMult !== undefined && target.hp > 0) target.steamMult = rider.enemyNextMoveMult;
  if (rider.blockEnemyShieldTurns && target.hp > 0) target.noShieldTurns = rider.blockEnemyShieldTurns;
  if (rider.enemyActsLast && target.hp > 0) target.actsLast = true;
  if (rider.arcFrac) {
    const others = s.enemies.filter((e) => e.hp > 0 && e !== target);
    if (others.length > 0) {
      const pick = others[randInt(rng, 0, others.length - 1)];
      if (pick) {
        const a = Math.max(1, Math.round(dmg * rider.arcFrac));
        damageEnemy(pick, a);
        s.log.push(`The arc leaps to ${pick.name} for ${String(a)}.`);
      }
    }
  }
}

export function spellCost(idx: WorldIndex, spell: Spell): number {
  const form = idx.forms.get(spell.form);
  const rune = idx.runes.get(spell.rune);
  let cost = (form?.mp ?? 1) * (rune?.mp ?? 1) * TUNING(idx, 'combat', 'costBase', 3);
  if (spell.element2) cost *= WTUNE(idx, 'twinMpMult', 1.6);
  return Math.max(1, Math.ceil(cost));
}

function basePower(idx: WorldIndex, level: number): number {
  return TUNING(idx, 'combat', 'basePower', 8) + level * TUNING(idx, 'combat', 'levelScaling', 2);
}

/** Product of a target's status `takenMult` (+ night-twin amp) for incoming dmg. */
function enemyTakenMult(idx: WorldIndex, enemy: BattleEnemy): number {
  let m = 1;
  for (const sid of Object.keys(enemy.statuses)) {
    const def = idx.enemyStatuses.get(sid);
    if (def?.takenMult !== undefined) m *= def.takenMult;
  }
  if (enemy.witherTakenMult) m *= enemy.witherTakenMult;
  return m;
}

function masteryTier(idx: WorldIndex, points: number): 0 | 1 | 2 | 3 {
  if (points >= WTUNE(idx, 'masteryT3', 50)) return 3;
  if (points >= WTUNE(idx, 'masteryT2', 25)) return 2;
  if (points >= WTUNE(idx, 'masteryT1', 10)) return 1;
  return 0;
}

function twinPairFor(idx: WorldIndex, a: string, b: string) {
  return idx.world.wheel.twinPairs.find(
    (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a),
  ) ?? null;
}

/** Twin matchup: the better of the two elements' mults, capped. */
function twinMatchup(idx: WorldIndex, spell: Spell, enemy: BattleEnemy, cap: number): number {
  if (!spell.element2) return elementMult(idx, spell.element, enemy);
  const a = elementMult(idx, spell.element, enemy);
  const b = elementMult(idx, spell.element2, enemy);
  return Math.min(cap, Math.max(a, b));
}

/** Product of the player's status `spellPowerMult` (e.g. chilled weakens casts). */
function playerPowerMult(idx: WorldIndex, player: BattlePlayer): number {
  let m = 1;
  for (const sid of Object.keys(player.statuses)) {
    const def = idx.world.playerStatuses.find((p) => p.id === sid);
    if (def?.spellPowerMult !== undefined) m *= def.spellPowerMult;
  }
  return m;
}

function dotTick(idx: WorldIndex, statusId: string, lv: number): number {
  const def = idx.enemyStatuses.get(statusId);
  return def?.dot ? Math.round(def.dot.base + def.dot.perLv * lv) : 0;
}

/** The reaction (if any) that fires: cast element == trigger AND enemy has setup. */
function reactionFor(idx: WorldIndex, element: string, enemy: BattleEnemy): Reaction | null {
  for (const r of idx.world.wheel.reactions)
    if (r.trigger === element && (enemy.statuses[r.setup] ?? 0) > 0) return r;
  return null;
}

/** Apply a reaction's non-hit portions and consume its setup status. */
function applyReaction(idx: WorldIndex, s: BattleState, target: BattleEnemy, r: Reaction, keepSetup: boolean): void {
  const setupTurns = target.statuses[r.setup] ?? 0;
  if (!keepSetup) delete target.statuses[r.setup];
  const eff = r.effect;
  if (eff?.instantDot) {
    const tick = dotTick(idx, eff.instantDot.status, target.lv) || dotTick(idx, r.setup, target.lv) || 1;
    const turns = eff.instantDot.perRemainingTurn ? Math.max(1, setupTurns) : 1;
    const d = Math.max(1, Math.round(tick * eff.instantDot.mult * turns));
    damageEnemy(target, d);
    s.log.push(`${r.line || 'Reaction!'} (${String(d)})`);
  } else {
    s.log.push(r.line || 'Reaction!');
  }
  if (eff?.applyStatus) {
    const st = idx.enemyStatuses.get(eff.applyStatus.status);
    if (st && target.hp > 0) {
      target.statuses[st.id] = eff.applyStatus.turns;
      s.log.push(`${target.name} is ${st.label}!`);
    }
  }
}

/** Roll a wyrd surge (rune `surges` or a tuned chance; never if `alwaysStable`). */
function maybeSurge(idx: WorldIndex, s: BattleState, spell: Spell, rng: Rng): void {
  const rune = idx.runes.get(spell.rune);
  if (rune?.alwaysStable) return;
  const gate = rune?.surges === true || chance(rng, WTUNE(idx, 'surgeChance', 0));
  if (!gate) return;
  const face = randInt(rng, 1, 10);
  const surge = idx.world.wheel.surges.find((su) => su.roll === face);
  if (surge) applySurge(idx, s, spell, surge, rng);
}

function applySurge(idx: WorldIndex, s: BattleState, spell: Spell, surge: Surge, rng: Rng): void {
  s.log.push(surge.line || 'The wyrd stirs.');
  const e = surge.effect;
  if (!e) return;
  const alive = s.enemies.filter((en) => en.hp > 0);
  const first = alive[0];
  const element = idx.elements.get(spell.element);
  if (e.damage && first) { damageEnemy(first, Math.max(1, Math.round(e.damage))); s.log.push(`The cast bites ${first.name} for ${String(Math.round(e.damage))}.`); }
  if (e.healHp) s.player.hp = Math.min(s.player.maxhp, s.player.hp + Math.round(e.healHp));
  if (e.restoreMp) s.player.mp = Math.min(s.player.maxmp, s.player.mp + Math.round(e.restoreMp));
  if (e.forceElementStatus && first && element) {
    const st = idx.enemyStatuses.get(element.status);
    if (st) { first.statuses[st.id] = st.duration; s.log.push(`${first.name} is ${st.label}!`); }
  }
  if (e.randomEnemyStatus && alive.length > 0) {
    const pick = alive[randInt(rng, 0, alive.length - 1)];
    const st = idx.enemyStatuses.get(e.randomEnemyStatus.status);
    if (pick && st) { pick.statuses[st.id] = e.randomEnemyStatus.turns; s.log.push(`${pick.name} is ${st.label}!`); }
  }
  if (e.recastFrac && first) {
    const form = idx.forms.get(spell.form);
    const rune = idx.runes.get(spell.rune);
    const d = Math.max(1, Math.round(basePower(idx, s.player.level) * (form?.pw ?? 1) * (rune?.pw ?? 1) * elementMult(idx, spell.element, first) * e.recastFrac * (0.9 + rng() * 0.2)));
    damageEnemy(first, d);
    s.log.push(`The echo echoes for ${String(d)}.`);
  }
  if (e.selfElementStatus && element && idx.world.playerStatuses.some((p) => p.id === element.status)) {
    s.player.statuses[element.status] = 3;
  }
  if (e.selfHpFracFee) s.player.hp = Math.max(1, s.player.hp - Math.round(s.player.maxhp * e.selfHpFracFee));
  if (e.mpDrain) s.player.mp = Math.max(0, s.player.mp - e.mpDrain);
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
  const pair = spell.element2 ? twinPairFor(idx, spell.element, spell.element2) : null;
  const rider = pair?.effect;
  const mTier = masteryTier(idx, s.player.mastery[spell.element] ?? 0);
  let cost = spellCost(idx, spell);
  if (mTier >= 3) cost = Math.max(1, cost + WTUNE(idx, 'masteryT3Cost', -1));

  if (s.player.mp < cost) {
    s.log.push('Not enough focus — you steady yourself instead.');
    s.player.mp = Math.min(s.player.maxmp, s.player.mp + Math.ceil(s.player.maxmp * 0.35));
  } else {
    s.player.mp -= cost;
    // pipeline: base → mastery T1 → aspect → twin matchup → player power →
    // variance → crit → reaction hit-amp → enemy taken-mult → round → shield.
    let dmg = basePower(idx, s.player.level) * (form?.pw ?? 1) * (rune?.pw ?? 1);
    if (mTier >= 1) dmg *= WTUNE(idx, 'masteryT1Power', 1.05);
    if (s.player.aspect === spell.element) dmg *= WTUNE(idx, 'aspectPower', 1.1);
    const cap = rider?.matchupCap ?? WTUNE(idx, 'twinMatchupCap', 1.3);
    dmg *= twinMatchup(idx, spell, target, cap);
    dmg *= playerPowerMult(idx, s.player);
    dmg *= 0.9 + rng() * 0.2;
    const critChance = rune?.crit?.chance ?? TUNING(idx, 'combat', 'critChance', 0.08);
    const critMult = rune?.crit?.mult ?? TUNING(idx, 'combat', 'critMult', 1.5);
    const crit = chance(rng, critChance);
    if (crit) dmg *= critMult;
    let reaction = reactionFor(idx, spell.element, target);
    if (!reaction && spell.element2) reaction = reactionFor(idx, spell.element2, target);
    if (reaction) {
      const hb = rider?.reactionHitBonus ?? reaction.effect?.hitBonus;
      if (hb) dmg *= 1 + hb;
    }
    dmg *= enemyTakenMult(idx, target);
    const final = Math.max(1, Math.round(dmg));
    damageEnemy(target, final, rider?.ignoreShield === true);
    s.hitElements.push(spell.element);
    if (spell.element2) s.hitElements.push(spell.element2);
    const castName = pair ? pair.prefix : (element?.label ?? spell.element);
    s.log.push(`You cast ${castName} ${form?.label ?? spell.form} at ${target.name} for ${String(final)}${crit ? ' (crit!)' : ''}.`);
    if (rider) applyRiderPostHit(s, target, rider, final, rng);
    if (reaction) applyReaction(idx, s, target, reaction, rune?.keepsReactionSetup === true);
    // wildfire: spread a status to all when the target falls
    if (rider?.spreadStatusOnKill && target.hp <= 0) {
      const st = idx.enemyStatuses.get(rider.spreadStatusOnKill);
      if (st) {
        for (const en of s.enemies) if (en.hp > 0) en.statuses[st.id] = st.duration;
        s.log.push('The flames spread!');
      }
    }
    rollProcs(idx, s, target, spell, rune, rng, rider);
    if (aliveIndices(s).length > 0) maybeSurge(idx, s, spell, rng);
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
  // mire twin makes flagged enemies act last
  const order = [...s.enemies].sort((a, b) => Number(a.actsLast ?? false) - Number(b.actsLast ?? false));
  for (const e of order) {
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
    if (e.steamMult !== undefined) { dealtMult *= e.steamMult; e.steamMult = undefined; }
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
    } else if (rider?.type === 'selfShield' && (e.noShieldTurns ?? 0) <= 0) {
      e.shield += rider.amount;
    }
    if ((e.noShieldTurns ?? 0) > 0) e.noShieldTurns = (e.noShieldTurns ?? 0) - 1;
    if (s.player.hp <= 0) return;
  }
}

function tickEnemyDots(idx: WorldIndex, e: BattleEnemy, s: BattleState, aspectStatus: string | undefined): void {
  for (const sid of Object.keys(e.statuses)) {
    const def = idx.enemyStatuses.get(sid);
    if (def?.dot) {
      let d = def.dot.base + def.dot.perLv * e.lv;
      if (aspectStatus && sid === aspectStatus) d *= WTUNE(idx, 'aspectDot', 1.1);
      const r = Math.round(d);
      e.hp = Math.max(0, e.hp - r);
      if (r > 0) s.log.push(`${e.name} takes ${String(r)} from ${def.label}.`);
    }
  }
}

function tickAll(idx: WorldIndex, s: BattleState): void {
  const aspectStatus = s.player.aspect ? idx.elements.get(s.player.aspect)?.status : undefined;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    tickEnemyDots(idx, e, s, aspectStatus);
    if (e.rotDots && e.hp > 0) tickEnemyDots(idx, e, s, aspectStatus); // rot twin: DoTs tick twice
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
    player: { ...s.player, statuses: { ...s.player.statuses }, mastery: { ...s.player.mastery } },
    round: s.round,
    hitElements: [...s.hitElements],
    log: [...s.log],
    over: s.over,
  };
}

/** Pick a random enemy level within a zone's band. */
export function zoneLevel(rng: Rng, levelMin: number, levelMax: number): number {
  return randInt(rng, levelMin, Math.max(levelMin, levelMax));
}

export function masteryCap(idx: WorldIndex): number {
  return WTUNE(idx, 'masteryCap', 50);
}

/** +1 mastery for each element that landed a hit, capped. Returns a new map. */
export function bumpMastery(mastery: Record<string, number>, hitElements: readonly string[], cap: number): Record<string, number> {
  const next = { ...mastery };
  for (const el of new Set(hitElements)) next[el] = Math.min(cap, (next[el] ?? 0) + 1);
  return next;
}

/** Public mastery tier of a point total (0–3), for HUD display. */
export function tierOf(idx: WorldIndex, points: number): 0 | 1 | 2 | 3 {
  return masteryTier(idx, points);
}
