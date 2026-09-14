// ============================================================
// NpcMemoryLog + NPCSystem (data_driven_systems_compilation.md §2,
// MASTER_DESIGN §24 step 2; spec: npc_condition_system_spec.md).
//
// NpcMemoryLog — the ONE canonical NPC event log (append-only, per-save,
// shaped to §4's export schema from day one). Owned here, written via
// GameManager.logNpcEvent typed methods, read via projections. No feature
// builds a second log; the export system (§4) is a pure consumer.
//
// NPCSystem — data-driven dialogue selection over ConditionEngine (the ONE
// evaluator from §24 step 1; no forks): locationRules (first-match-wins,
// unconditional fallback), dialogueSets (first passing set wins, guaranteed
// unconditional fallback), per-topic conditions, mood layer (selection
// input only), npc:* producer listeners (central registration, no
// per-feature saves — §21 rule).
//
// Fail-closed philosophy (POT-012 applied): unknown shapes are rejected
// loudly, never improvised; malformed log events are dropped with a log.
// ============================================================

class NpcMemoryLog {
  constructor(storeOrGetter) {
    // Accepts the store object OR a getter (() => gameManager.store). The
    // getter form is required in the live game: GameManager REPLACES
    // this.store on slot switch/load, so a captured object would go stale
    // (the exact split-brain class BUG-026 taught us to avoid). _branch()
    // resolves it per call.
    this._storeOrGetter = storeOrGetter;
  }

  static EVENT_TYPES = [
    'dialogueChoiceMade',
    'npcTalkedTo',
    'questCompleted',
    'giftGiven',
    'flagSet',
  ];

  _branch() {
    const store = typeof this._storeOrGetter === 'function' ? this._storeOrGetter() : this._storeOrGetter;
    if (!store || !store.persistent || !store.persistent.npcs) return null;
    const npcs = store.persistent.npcs;
    if (!Array.isArray(npcs.eventLog)) npcs.eventLog = [];
    if (typeof npcs.eventSeq !== 'number') npcs.eventSeq = 0;
    return npcs;
  }

  /** Append one event. Returns the stored event, or null (rejected — logged
   *  loudly, never silently improvised). Marks the store dirty via callback. */
  append(spec, opts = {}) {
    const npcs = this._branch();
    if (!npcs) {
      console.error('[MEMORYLOG] rejected: store has no persistent.npcs branch');
      return null;
    }
    const problems = NpcMemoryLog.validateSpec(spec);
    if (problems.length) {
      console.error('[MEMORYLOG] rejected event:', problems.join('; '), JSON.stringify(spec));
      return null;
    }
    npcs.eventSeq += 1;
    const ev = {
      eventId: `${spec.chapterMarker || 'town'}:${npcs.eventSeq}`,
      seq: npcs.eventSeq,
      chapterMarker: spec.chapterMarker || 'town',
      npcIds: spec.npcIds.slice(),
      type: spec.type,
      payload: spec.payload || null,
      spoilerTag: spec.spoilerTag || null,
    };
    npcs.eventLog.push(ev);
    if (typeof opts.onDirty === 'function') opts.onDirty();
    return ev;
  }

  static validateSpec(spec) {
    const problems = [];
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      return ['spec must be an object'];
    }
    if (!Array.isArray(spec.npcIds) || spec.npcIds.length === 0 ||
        !spec.npcIds.every((id) => typeof id === 'string' && id)) {
      problems.push('npcIds must be a non-empty array of strings');
    }
    if (typeof spec.type !== 'string' || !NpcMemoryLog.EVENT_TYPES.includes(spec.type)) {
      problems.push(`type must be one of ${NpcMemoryLog.EVENT_TYPES.join('|')}`);
    }
    if (spec.payload !== undefined && spec.payload !== null &&
        (typeof spec.payload !== 'object' || Array.isArray(spec.payload))) {
      problems.push('payload must be an object or null');
    }
    if (spec.spoilerTag !== undefined && spec.spoilerTag !== null &&
        typeof spec.spoilerTag !== 'string') {
      problems.push('spoilerTag must be a string or null');
    }
    if (spec.chapterMarker !== undefined && spec.chapterMarker !== null &&
        typeof spec.chapterMarker !== 'string') {
      problems.push('chapterMarker must be a string or null');
    }
    return problems;
  }

  size() {
    const npcs = this._branch();
    return npcs ? npcs.eventLog.length : 0;
  }

  /** Projection: all events (optionally filtered). Order = append order. */
  getEvents(opts = {}) {
    const npcs = this._branch();
    if (!npcs) return [];
    let list = npcs.eventLog;
    if (opts.type) list = list.filter((e) => e.type === opts.type);
    if (opts.upToSeq !== undefined) list = list.filter((e) => e.seq <= opts.upToSeq);
    if (opts.spoilerFilter === 'safe') list = list.filter((e) => !e.spoilerTag);
    return list.slice(); // copy — append-only discipline means callers never mutate
  }

  /** Projection: events visible to ONE npc (multi-NPC events are stored once
   *  and appear for every listed npcId — the §4 superset property). */
  getEventsForNpc(npcId, opts = {}) {
    return this.getEvents(opts).filter((e) => e.npcIds.includes(npcId));
  }

  /** Dev/test only. */
  clear() {
    const npcs = this._branch();
    if (npcs) {
      npcs.eventLog = [];
      npcs.eventSeq = 0;
    }
  }
}

class NPCSystem {
  /** deps: { gameManager, eventBus, dataManager }
   *  No construct-time store access; init() registers producers exactly once. */
  constructor(deps = {}) {
    this.gameManager = deps.gameManager || null;
    this.eventBus = deps.eventBus || null;
    this.dataManager = deps.dataManager || null;
    this.chapterMarker = 'town';
    this._listenersRegistered = false;
  }

  init() {
    if (this._listenersRegistered) return; // KNOWLEDGE.md double-listener rule
    this._listenersRegistered = true;

    // Producers — centrally registered (§21 pattern): the log rides the
    // existing autosave machinery; logNpcEvent never calls save() itself.
    if (this.eventBus) {
      // Dialogue choice: emitted at THE single selection point in TownContent.
      this.eventBus.on('npc:dialogueChoice', (d) => {
        if (!d || !d.npcId) return;
        this.logEvent({
          npcIds: [d.npcId],
          type: 'dialogueChoiceMade',
          payload: {
            conversationId: d.conversationId || null,
            choiceId: d.choiceId || null,
            mood: d.mood || null,
          },
        });
      });
      // Quest completions — narrative milestone context (existing event).
      this.eventBus.on('quest:completed', (d) => {
        if (!d || !d.questId) return;
        this.logEvent({
          npcIds: [], // filled below via store-agnostic path
          type: 'questCompleted',
          payload: { questId: d.questId },
          chapterMarker: d.chapter ? `chapter:${d.chapter}` : this.chapterMarker,
        });
      });
      // Talked-to (greeting opened) — existing emit in TownContent.openDialogue.
      this.eventBus.on('npc:talked', (d) => {
        if (!d || !d.npcId) return;
        this.logEvent({
          npcIds: [d.npcId],
          type: 'npcTalkedTo',
          payload: { conversationId: d.conversationId || null },
        });
      });
      // Dialogue-authored flag set (topic.flag) — TownContent emits on set.
      this.eventBus.on('npc:dialogueFlag', (d) => {
        if (!d || !d.npcId || !d.flagId) return;
        this.logEvent({
          npcIds: [d.npcId],
          type: 'flagSet',
          payload: { flagId: d.flagId, conversationId: d.conversationId || null },
        });
      });
      // Affection from dialogue topics — v1 proxy for gift events (spec §2.3).
      // Curation: logged ONCE per (npc, choiceId) — topic.affection re-fires
      // on every conversation, and an append-only log must not grow with
      // repeats (spec §7 log-growth note).
      this.eventBus.on('npc:dialogueAffection', (d) => {
        if (!d || !d.npcId || !(d.affection > 0)) return;
        const log = this.gameManager?.memoryLog;
        if (log && d.choiceId) {
          const seen = log.getEventsForNpc(d.npcId, { type: 'giftGiven' })
            .some((e) => e.payload && e.payload.choiceId === d.choiceId);
          if (seen) return;
        }
        this.logEvent({
          npcIds: [d.npcId],
          type: 'giftGiven',
          payload: { itemId: null, affection: d.affection, choiceId: d.choiceId || null, conversationId: d.conversationId || null },
        });
      });
    }
  }

  /** Typed write path (POT-012: never raw set()). Returns event or null. */
  logEvent(spec) {
    if (!this.gameManager || !this.gameManager.memoryLog) {
      console.error('[NPCSYSTEM] logEvent: no memory log wired');
      return null;
    }
    // questCompleted has no natural single npcId — log it as a town-level
    // event visible to no specific NPC unless a listener names some.
    const clean = { ...spec };
    if (clean.type === 'questCompleted' && (!Array.isArray(clean.npcIds) || clean.npcIds.length === 0)) {
      clean.npcIds = ['__town__'];
    }
    return this.gameManager.logNpcEvent(clean);
  }

  setChapterMarker(marker) {
    if (typeof marker === 'string' && marker) this.chapterMarker = marker;
  }

  _npcsData() {
    if (this.dataManager?.npcs) return this.dataManager.npcs;
    if (typeof NPC_DATA !== 'undefined') return NPC_DATA;
    return {};
  }

  getNpc(npcId) {
    return this._npcsData()[npcId] || null;
  }

  // ── locationRules: first-match-wins, unconditional fallback ──

  resolveLocation(npcId) {
    const npc = this.getNpc(npcId);
    if (!npc) return null;
    const ctx = this._conditionContext();
    const rules = Array.isArray(npc.locationRules) ? npc.locationRules : [];
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object') continue;
      const loc = typeof rule.location === 'string' ? rule.location : null;
      if (!loc) continue;
      if (rule.when == null) return loc; // unconditional entry = fallback
      const problems = this._validateCondition(rule.when, `npcs.${npcId}.locationRules`);
      if (problems.length) {
        console.error(`[NPCSYSTEM] ${npcId} locationRule rejected: ${problems.join('; ')}`);
        continue; // fail-closed for THIS rule; keep scanning
      }
      if (this.gameManager.evaluateCondition(rule.when, ctx)) return loc;
    }
    return npc.location || null;
  }

  // ── dialogueSets: first passing set wins, guaranteed fallback ──

  selectDialogueSet(npcId) {
    const npc = this.getNpc(npcId);
    if (!npc) return null;
    const ctx = this._conditionContext();
    const sets = Array.isArray(npc.dialogueSets) ? npc.dialogueSets : [];
    for (const set of sets) {
      if (!set || typeof set !== 'object' || !Array.isArray(set.topics)) continue;
      if (set.when == null) return set; // unconditional = guaranteed fallback
      const problems = this._validateCondition(set.when, `npcs.${npcId}.dialogueSets[${set.id || '?'}]`);
      if (problems.length) {
        console.error(`[NPCSYSTEM] ${npcId} dialogueSet "${set.id || '?'}" rejected: ${problems.join('; ')}`);
        continue;
      }
      if (this.gameManager.evaluateCondition(set.when, ctx)) return set;
    }
    // Legacy NPC (no dialogueSets): synthesize the fallback set from root topics.
    if (Array.isArray(npc.topics)) {
      return { id: 'legacy_topics', when: null, greeting: npc.greeting, topics: npc.topics };
    }
    return null;
  }

  /** Topics of the winning set with per-topic `when` filters applied. */
  selectTopics(npcId) {
    const set = this.selectDialogueSet(npcId);
    if (!set) return [];
    const ctx = this._conditionContext();
    const out = [];
    for (const topic of set.topics) {
      if (!topic || typeof topic !== 'object') continue;
      if (topic.when != null) {
        const problems = this._validateCondition(topic.when, `npcs.${npcId}.topic[${topic.id || '?'}]`);
        if (problems.length) {
          console.error(`[NPCSYSTEM] ${npcId} topic "${topic.id || '?'}" rejected: ${problems.join('; ')}`);
          continue;
        }
        if (!this.gameManager.evaluateCondition(topic.when, ctx)) continue;
      }
      out.push(topic);
    }
    return out;
  }

  // ── mood layer: selection input only (stamped into event payloads) ──

  getMood(npcId) {
    const npc = this.getNpc(npcId);
    if (!npc || !npc.mood || typeof npc.mood !== 'object') return null;
    const ctx = this._conditionContext();
    const rules = Array.isArray(npc.mood.rules) ? npc.mood.rules : [];
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object') continue;
      if (rule.when == null) return rule.mood || null;
      const problems = this._validateCondition(rule.when, `npcs.${npcId}.mood.rules`);
      if (problems.length) continue;
      if (this.gameManager.evaluateCondition(rule.when, ctx)) return rule.mood || null;
    }
    return npc.mood.base || null;
  }

  // ── Dev Condition Inspector (house style: window.__QUEST_DEBUG__ pattern) ──

  installInspector() {
    if (typeof window === 'undefined' || window.__NPC_DEBUG__) return;
    const sys = this;
    window.__NPC_DEBUG__ = {
      evaluate(npcId) {
        const set = sys.selectDialogueSet(npcId);
        return {
          id: npcId,
          location: sys.resolveLocation(npcId),
          locationRuleId: (sys.getNpc(npcId)?.locationRules || []).find((r) => r && r.location === sys.resolveLocation(npcId))?.when === undefined ? 'fallback' : 'matched',
          dialogueSetId: set ? (set.id || 'legacy_topics') : null,
          mood: sys.getMood(npcId),
          topics: sys.selectTopics(npcId).map((t) => t.id || t.text),
        };
      },
      explain(npcId) {
        const npc = sys.getNpc(npcId);
        if (!npc) return { error: 'unknown npc' };
        const ctx = sys._conditionContext();
        const out = { locationRules: [], dialogueSets: [], moodRules: [] };
        for (const r of (npc.locationRules || [])) {
          out.locationRules.push({ location: r?.location, when: r?.when ?? 'unconditional(fallback)', passes: r?.when == null ? true : sys.gameManager.evaluateCondition(r.when, ctx) });
        }
        for (const s of (npc.dialogueSets || [])) {
          out.dialogueSets.push({ id: s?.id, when: s?.when ?? 'unconditional(fallback)', passes: s?.when == null ? true : sys.gameManager.evaluateCondition(s.when, ctx) });
        }
        for (const r of (npc.mood?.rules || [])) {
          out.moodRules.push({ mood: r?.mood, when: r?.when ?? 'unconditional', passes: r?.when == null ? true : sys.gameManager.evaluateCondition(r.when, ctx) });
        }
        return out;
      },
      log(npcId, opts = {}) {
        return sys.gameManager?.memoryLog
          ? sys.gameManager.memoryLog.getEventsForNpc(npcId, opts)
          : [];
      },
      schema() {
        return {
          dialogueSet: '{ id, when: condition|null(unconditional fallback — REQUIRED last), greeting, topics[] }',
          topic: '{ id, text, response, affection?, flag?, close?, when?: condition }',
          locationRule: '{ when: condition|null(unconditional fallback), location }',
          mood: '{ base, rules: [{ when, mood }] }',
          condition: '{ flag|questState|affectionTier, ... } | { all|any: [condition] } | { not: condition }',
          logEvent: '{ npcIds[], type: ' + NpcMemoryLog.EVENT_TYPES.join('|') + ', payload, spoilerTag?, chapterMarker? }',
        };
      },
    };
  }

  // ── internals ──

  _conditionContext() {
    return this.gameManager ? this.gameManager.buildConditionContext() : {};
  }

  _validateCondition(cond, label) {
    if (!this.gameManager?.conditionEngine) return ['no condition engine wired'];
    return this.gameManager.conditionEngine.validate(cond, label);
  }
}

// Environment bridges — same dual-world pattern as conditionEngine.js:
// browser classic script exposes globals; Node (type: module) imports the
// file as ESM and reads the globalThis side-effect.
if (typeof globalThis !== 'undefined') {
  globalThis.NpcMemoryLog = NpcMemoryLog;
  globalThis.NPCSystem = NPCSystem;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NpcMemoryLog, NPCSystem };
}
