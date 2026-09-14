// ============================================================
// ConditionEngine — the shared gate/condition evaluator (MASTER_DESIGN §24
// Step 1; data_driven_systems_compilation.md §1). ONE evaluator for all
// consumers (quest availability today; NPC conditions, gift eligibility,
// and export spoiler gating later). No feature may fork this logic.
//
// Contract:
//   evaluate(condition, context) -> boolean. FAIL-CLOSED: any malformed
//   condition returns false and logs loudly (console.error) — never a
//   silent guess, never true-by-default (POT-012 philosophy applied to
//   evaluation: unknown shapes are REJECTED, not improvised).
//
//   Context shape (both styles accepted):
//     { flags: {id:bool}, quests: {id:'active'|'completed'|'failed'},
//       affection: {npcId:number} }            — static snapshot (tests)
//     { getFlag, getQuestState, getAffection } — getters (live game state)
//
// Supported leaf conditions:
//   { flag: 'id', equals?: bool }            — presence test when no equals
//   { questState: 'id', state: 'active'|'completed'|'failed' }
//   { affectionTier: 'npcId', atLeast: 'interest'|'respect'|'trust'|'claim' }
//
// Combinators (recursive, nest freely):
//   { all: [condition, ...] }  { any: [condition, ...] }  { not: condition }
//
// Reserved extension types (registered, deliberately UNIMPLEMENTED —
// building them is a later step's scope, so content authors get a clear
// rejection instead of a silent false):
//   time, dialogueChoice, location, season
// ============================================================

class ConditionEngine {
  static RESERVED_TYPES = ['time', 'dialogueChoice', 'location', 'season'];

  static TIER_ORDER = ['stranger', 'interest', 'respect', 'trust', 'claim'];

  constructor(options = {}) {
    // Tier table resolution: the live AFFECTION_TIERS global when present,
    // else the built-in defaults (same thresholds as data/affectionTiers.js).
    this._tiers = Array.isArray(options.tiers) ? options.tiers
      : (typeof AFFECTION_TIERS !== 'undefined' ? AFFECTION_TIERS : null);
    this._logger = options.logger || ((...a) => console.error('[CONDITION]', ...a));
  }

  // ── Public API ────────────────────────────────────────

  /** Evaluate a condition (object or — as sugar — a bare flag name string). */
  evaluate(condition, context) {
    // Bare string sugar: a flag name, matching quest.js prerequisites style.
    if (typeof condition === 'string') {
      return this._getFlag(context, condition);
    }
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
      this._logger('rejected: condition must be an object, got', condition);
      return false;
    }
    if (!context || typeof context !== 'object') {
      this._logger('rejected: missing evaluation context');
      return false;
    }

    const keys = Object.keys(condition);

    // Combinators first.
    if (keys.includes('all')) {
      if (!this._validCombinator(condition.all, 'all', keys)) return false;
      return condition.all.every((c) => this.evaluate(c, context));
    }
    if (keys.includes('any')) {
      if (!this._validCombinator(condition.any, 'any', keys)) return false;
      return condition.any.some((c) => this.evaluate(c, context));
    }
    if (keys.includes('not')) {
      if (keys.length !== 1 || !condition.not || typeof condition.not !== 'object') {
        this._logger('rejected: "not" takes exactly one condition object', condition);
        return false;
      }
      return !this.evaluate(condition.not, context);
    }

    // Leaf types — exactly one recognized discriminator key with clean extras.
    if (keys.includes('flag')) return this._evalFlag(condition, keys, context);
    if (keys.includes('questState')) return this._evalQuestState(condition, keys, context);
    if (keys.includes('affectionTier')) return this._evalAffectionTier(condition, keys, context);

    // Reserved-but-unimplemented types get a SPECIFIC rejection.
    const reserved = keys.find((k) => ConditionEngine.RESERVED_TYPES.includes(k));
    if (reserved) {
      this._logger(`rejected: "${reserved}" is a registered extension type — not implemented yet (data_driven_systems_compilation.md §1)`, condition);
      return false;
    }

    this._logger('rejected: unknown condition shape', condition);
    return false;
  }

  /** Load-time validation: returns a list of human-readable problems
   *  (empty array = valid). Walks combinators recursively. Used by the
   *  content pipeline so a malformed gate fails at load, not at runtime. */
  validate(condition, path = 'root', problems = []) {
    if (typeof condition === 'string') return problems; // flag-name sugar: valid
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
      problems.push(`${path}: condition must be an object`);
      return problems;
    }
    const keys = Object.keys(condition);
    if (keys.includes('all') || keys.includes('any')) {
      const k = keys.includes('all') ? 'all' : 'any';
      if (!Array.isArray(condition[k])) {
        problems.push(`${path}: "${k}" must be an array`);
      } else {
        if (condition[k].length === 0) problems.push(`${path}: "${k}" must not be empty`);
        condition[k].forEach((c, i) => this.validate(c, `${path}.${k}[${i}]`, problems));
      }
      if (keys.length > 1) problems.push(`${path}: combinator "${k}" must be the only key`);
      return problems;
    }
    if (keys.includes('not')) {
      if (keys.length !== 1) problems.push(`${path}: "not" must be the only key`);
      this.validate(condition.not, `${path}.not`, problems);
      return problems;
    }
    if (keys.includes('flag')) {
      if (typeof condition.flag !== 'string' || !condition.flag) problems.push(`${path}: "flag" must be a non-empty string`);
      if (keys.length > 2 || (keys.length === 2 && !keys.includes('equals'))) problems.push(`${path}: "flag" accepts only "equals" as an extra key`);
      return problems;
    }
    if (keys.includes('questState')) {
      if (typeof condition.questState !== 'string' || !condition.questState) problems.push(`${path}: "questState" must be a non-empty string`);
      if (typeof condition.state !== 'string' || !['active', 'completed', 'failed'].includes(condition.state)) problems.push(`${path}: "questState.state" must be active|completed|failed`);
      if (keys.length > 2) problems.push(`${path}: "questState" accepts only "state" as an extra key`);
      return problems;
    }
    if (keys.includes('affectionTier')) {
      if (typeof condition.affectionTier !== 'string' || !condition.affectionTier) problems.push(`${path}: "affectionTier" must be a non-empty npc id`);
      if (typeof condition.atLeast !== 'string' || !ConditionEngine.TIER_ORDER.includes(condition.atLeast)) {
        problems.push(`${path}: "affectionTier.atLeast" must be one of ${ConditionEngine.TIER_ORDER.join('|')}`);
      }
      if (keys.length > 2) problems.push(`${path}: "affectionTier" accepts only "atLeast" as an extra key`);
      return problems;
    }
    const reserved = keys.find((k) => ConditionEngine.RESERVED_TYPES.includes(k));
    problems.push(reserved
      ? `${path}: "${reserved}" is a registered extension type — not implemented yet`
      : `${path}: unknown condition shape (${keys.join(', ') || 'empty'})`);
    return problems;
  }

  // ── Context readers (getter style preferred, snapshot fallback) ──

  _getFlag(ctx, id) {
    if (typeof ctx.getFlag === 'function') return !!ctx.getFlag(id);
    return !!(ctx.flags && ctx.flags[id]);
  }

  _getQuestState(ctx, id) {
    if (typeof ctx.getQuestState === 'function') return ctx.getQuestState(id) || null;
    return (ctx.quests && ctx.quests[id]) || null;
  }

  _getAffection(ctx, npcId) {
    if (typeof ctx.getAffection === 'function') return ctx.getAffection(npcId) || 0;
    return (ctx.affection && ctx.affection[npcId]) || 0;
  }

  _tierIndexFor(name) {
    const t = this._tiers;
    if (Array.isArray(t)) {
      const i = t.findIndex((x) => String(x.name).toLowerCase() === String(name).toLowerCase());
      if (i >= 0) return i;
      return -1;
    }
    return ConditionEngine.TIER_ORDER.indexOf(String(name).toLowerCase());
  }

  // ── Leaf evaluators ───────────────────────────────────

  _evalFlag(cond, keys, ctx) {
    if (typeof cond.flag !== 'string' || !cond.flag) {
      this._logger('rejected: "flag" must be a non-empty string', cond);
      return false;
    }
    if (keys.length > 2 || (keys.length === 2 && !keys.includes('equals'))) {
      this._logger('rejected: "flag" accepts only "equals"', cond);
      return false;
    }
    const val = this._getFlag(ctx, cond.flag);
    if (keys.includes('equals')) {
      if (typeof cond.equals !== 'boolean') {
        this._logger('rejected: "equals" must be a boolean', cond);
        return false;
      }
      return val === cond.equals;
    }
    return val; // bare presence: gating semantic (absence = false)
  }

  _evalQuestState(cond, keys, ctx) {
    if (typeof cond.questState !== 'string' || !cond.questState) {
      this._logger('rejected: "questState" must be a non-empty quest id', cond);
      return false;
    }
    if (typeof cond.state !== 'string' || !['active', 'completed', 'failed'].includes(cond.state)) {
      this._logger('rejected: "questState.state" must be active|completed|failed', cond);
      return false;
    }
    if (keys.length > 2) {
      this._logger('rejected: "questState" accepts only "state"', cond);
      return false;
    }
    return this._getQuestState(ctx, cond.questState) === cond.state;
  }

  _evalAffectionTier(cond, keys, ctx) {
    if (typeof cond.affectionTier !== 'string' || !cond.affectionTier) {
      this._logger('rejected: "affectionTier" must be a non-empty npc id', cond);
      return false;
    }
    if (typeof cond.atLeast !== 'string') {
      this._logger('rejected: "affectionTier.atLeast" must be a tier name', cond);
      return false;
    }
    if (keys.length > 2) {
      this._logger('rejected: "affectionTier" accepts only "atLeast"', cond);
      return false;
    }
    const required = this._tierIndexFor(cond.atLeast);
    if (required < 0) {
      this._logger('rejected: unknown tier name', cond.atLeast);
      return false;
    }
    const aff = this._getAffection(ctx, cond.affectionTier);
    // Current tier index: highest tier whose min threshold is met.
    let current = 0;
    if (Array.isArray(this._tiers)) {
      for (let i = 0; i < this._tiers.length; i++) {
        if (aff >= (this._tiers[i].min || 0)) current = i;
      }
      return current >= required;
    }
    // No table available: fall back to the built-in threshold ladder.
    const ladders = ConditionEngine.TIER_ORDER.map((name, i) => ({ name, i, min: [0, 10, 30, 60, 100][i] }));
    for (const l of ladders) if (aff >= l.min) current = l.i;
    return current >= required;
  }

  _validCombinator(list, name, keys) {
    if (!Array.isArray(list)) {
      this._logger(`rejected: "${name}" must be an array`, list);
      return false;
    }
    if (keys.length > 1) {
      this._logger(`rejected: combinator "${name}" must be the only key`);
      return false;
    }
    return true;
  }
}

// Environment bridges — this ONE file serves both worlds with no fork:
//   Browser (classic script tag): top-level class declarations are lexical
//   globals; the globalThis assignment also exposes a window property for
//   devtools/detectors.
//   Node (content pipeline, type:module): the file imports as ESM and the
//   globalThis side-effect yields the class; the module.exports guard is
//   inert there but kept for potential CJS consumers.
if (typeof globalThis !== 'undefined') globalThis.ConditionEngine = ConditionEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = ConditionEngine;
