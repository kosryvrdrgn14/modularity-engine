// ============================================================
// Quest System — manages quests, flags, and content gating
// ============================================================

class QuestSystem {
  constructor() {
    this.gameManager = null;
    this.dataManager = null;
    this.eventBus = null;
    this._initialized = false;
    this._pendingFlagSets = [];

    // Quest definitions (loaded from content/quests.json)
    this.mainQuests = [];
    this.sideQuests = [];
    this.allQuests = [];

    // Gate rules (loaded from content/content_gates.json)
    this.gates = {};

    // Handler refs for cleanup
    this._handlers = {};

    // Tracking for quest:available event spam guard
    this._lastAvailableIds = new Set();

    // Objective handlers registry
    this._objectiveHandlers = {
      kill_count: this._handleKillCount.bind(this),
      talk_to: this._handleTalkTo.bind(this),
      complete_stage: this._handleCompleteStage.bind(this),
      collect_item: this._handleCollectItem.bind(this),
      reach_location: this._handleReachLocation.bind(this),
    };
  }

  // ── Initialization ─────────────────────────────────────

  init(gameManager, dataManager, eventBus) {
    this.gameManager = gameManager;
    this.dataManager = dataManager;
    this.eventBus = eventBus;

    if (!gameManager || !dataManager || !eventBus) {
      console.warn('[QUEST] Degraded mode — missing dependency. All content unlocked.');
      this._initialized = true;
      return;
    }

    // Load quest definitions
    const questsData = dataManager.quests;
    if (questsData) {
      this.mainQuests = questsData.main_quests || [];
      this.sideQuests = questsData.side_quests || [];
      this.allQuests = [...this.mainQuests, ...this.sideQuests];
    }

    // Load gate rules
    this.gates = dataManager.contentGates || {};

    // Register event listeners
    this._registerListeners();

    // Process pending flag sets from before init
    this._initialized = true;
    this._flushPendingFlags();

    // Process pending time events
    this._processPendingTimeEvents();

    // Re-evaluate availability
    this._reevaluateAvailability();

    console.log(`[QUEST] Initialized — ${this.allQuests.length} quests, ${Object.keys(this.gates).length} gate categories`);
  }

  // ── Event Listeners ────────────────────────────────────

  _registerListeners() {
    // Combat deaths → kill_count objectives
    this._handlers.death = (data) => {
      if (data.type === 'player') return;
      this._onObjectiveEvent('kill_count', data);
    };
    this.eventBus.on('death', this._handlers.death);

    // Combat session end → complete_stage objectives
    this._handlers.combatEnd = (data) => {
      this._onObjectiveEvent('complete_stage', data);
    };
    this.eventBus.on('combat:sessionEnd', this._handlers.combatEnd);

    // NPC dialogue opened → talk_to objectives (emitted by TownContent.openDialogue)
    this._handlers.npcTalked = (data) => {
      this._onObjectiveEvent('talk_to', data);
    };
    this.eventBus.on('npc:talked', this._handlers.npcTalked);

    // Location entered → reach_location objectives (emitted by LocationManager.navigateTo)
    this._handlers.locationNavigated = (data) => {
      this._onObjectiveEvent('reach_location', data);
    };
    this.eventBus.on('location:navigated', this._handlers.locationNavigated);
  }

  destroy() {
    if (this.eventBus) {
      if (this._handlers.death) this.eventBus.off('death', this._handlers.death);
      if (this._handlers.combatEnd) this.eventBus.off('combat:sessionEnd', this._handlers.combatEnd);
      if (this._handlers.npcTalked) this.eventBus.off('npc:talked', this._handlers.npcTalked);
      if (this._handlers.locationNavigated) this.eventBus.off('location:navigated', this._handlers.locationNavigated);
    }
    this._handlers = {};
    this._initialized = false;
  }

  // ── Flag Management ────────────────────────────────────

  setFlag(flag, value, source = 'unknown') {
    if (!this._initialized) {
      this._pendingFlagSets.push({ flag, value, source });
      return;
    }

    if (!this.gameManager) {
      console.warn('[QUEST] No gameManager — cannot set flag:', flag);
      return;
    }

    // No-op guard
    const currentValue = this.gameManager.get_flag(flag);
    if (currentValue === value) return;

    if (window.__QUEST_DEBUG__) {
      console.log(`[QUEST] Flag: ${flag} = ${value} (source: ${source})`);
    }

    this.gameManager.set_flag(flag, value);
    this.eventBus.emit('quest:flag_set', { flag, value, source });
    this._reevaluateAvailability();
  }

  getFlag(flag) {
    if (!this.gameManager) return false;
    return this.gameManager.get_flag(flag);
  }

  _flushPendingFlags() {
    const pending = [...this._pendingFlagSets];
    this._pendingFlagSets = [];
    for (const { flag, value, source } of pending) {
      this.setFlag(flag, value, source);
    }
  }

  // ── Content Gate Resolution ────────────────────────────

  isContentUnlocked(contentType, contentId) {
    const categoryGates = this.gates[contentType];
    if (!categoryGates) return true; // Unknown category — fail open

    const gate = categoryGates[contentId];
    if (!gate) return true; // No gate defined — unlocked by default

    // Check primary unlock flag
    if (gate.unlock_flag) {
      if (!this.getFlag(gate.unlock_flag)) return false;
    }

    // Check temp disable flag (for NPCs/companions that temporarily leave)
    if (gate.temp_disable_flag) {
      if (this.getFlag(gate.temp_disable_flag)) return false;
    }

    return true;
  }

  getUnlockedContent(contentType) {
    const categoryGates = this.gates[contentType];
    if (!categoryGates) return [];

    return Object.keys(categoryGates).filter(id => this.isContentUnlocked(contentType, id));
  }

  // ── Quest State Management ─────────────────────────────

  getAvailableQuests() {
    return this.allQuests.filter(q => {
      // Must not already be active or completed
      const store = this._getQuestStore();
      if (store.active.includes(q.id)) return false;
      if (store.completed.includes(q.id)) return false;
      if (store.failed && store.failed.includes(q.id)) return false;

      // Must meet all prerequisites
      return this._checkPrerequisites(q);
    });
  }

  getActiveQuests() {
    const store = this._getQuestStore();
    return store.active
      .map(id => this.allQuests.find(q => q.id === id))
      .filter(Boolean);
  }

  getCompletedQuests() {
    const store = this._getQuestStore();
    return store.completed
      .map(id => this.allQuests.find(q => q.id === id))
      .filter(Boolean);
  }

  getQuestProgress(questId) {
    const store = this._getQuestStore();
    const objectives = store.objectives[questId] || {};
    const quest = this.allQuests.find(q => q.id === questId);
    if (!quest) return null;

    return quest.objectives.map((obj, i) => ({
      ...obj,
      current: objectives[i]?.current || 0,
      required: objectives[i]?.required || this._getRequired(obj),
      complete: (objectives[i]?.current || 0) >= this._getRequired(obj),
    }));
  }

  startQuest(questId) {
    const store = this._getQuestStore();
    if (store.active.includes(questId)) return false;
    if (store.completed.includes(questId)) return false;

    const quest = this.allQuests.find(q => q.id === questId);
    if (!quest) {
      console.error(`[QUEST] Unknown quest: ${questId}`);
      return false;
    }

    if (!this._checkPrerequisites(quest)) {
      console.warn(`[QUEST] Prerequisites not met for: ${questId}`);
      return false;
    }

    store.active.push(questId);

    // Initialize objective tracking
    store.objectives[questId] = {};
    quest.objectives.forEach((obj, i) => {
      store.objectives[questId][i] = { current: 0, required: this._getRequired(obj) };
    });

    this._markDirty();
    this.eventBus.emit('quest:started', { questId });

    if (window.__QUEST_DEBUG__) {
      console.log(`[QUEST] Started: ${questId}`);
    }

    return true;
  }

  completeQuest(questId) {
    const store = this._getQuestStore();
    const idx = store.active.indexOf(questId);
    if (idx === -1) return false;

    const quest = this.allQuests.find(q => q.id === questId);
    if (!quest) return false;

    // Check all objectives complete
    const progress = this.getQuestProgress(questId);
    if (!progress.every(p => p.complete)) {
      console.warn(`[QUEST] Not all objectives complete for: ${questId}`);
      return false;
    }

    // Remove from active, add to completed
    store.active.splice(idx, 1);
    store.completed.push(questId);

    // Apply unlocks
    if (quest.unlocks_on_complete) {
      const u = quest.unlocks_on_complete;
      (u.flags || []).forEach(f => this.setFlag(f, true, questId));
      (u.weapons || []).forEach(w => {
        if (this.gameManager) this.gameManager.unlock_weapon(w);
      });
      (u.stages || []).forEach(s => {
        if (this.gameManager) this.gameManager.unlock_stage(s);
      });
      (u.regions || []).forEach(r => {
        const regionId = this._normalizeId(r);
        if (this.gameManager?.unlockRegion) this.gameManager.unlockRegion(regionId);
        this.setFlag(`region_${regionId}_unlocked`, true, questId);
      });
      (u.companions || []).forEach(c => {
        // Companion unlock handled by progression system
        this.setFlag(`companion_unlocked_${c}`, true, questId);
      });
      (u.locations || []).forEach(l => {
        // Locations gate via unlockCondition flags — this flag is for future content_gates use
        this.setFlag(`location_unlocked_${this._normalizeId(l)}`, true, questId);
      });
      (u.npcs || []).forEach(n => {
        this.setFlag(`npc_unlocked_${n}`, true, questId);
      });
      (u.dialogue || []).forEach(d => {
        this.setFlag(`dialogue_unlocked_${d}`, true, questId);
      });
    }

    // Apply rewards
    if (quest.rewards) {
      if (quest.rewards.gold && this.gameManager) {
        this.gameManager.add_currency(quest.rewards.gold, 'quest_reward');
      }
      if (quest.rewards.xp && this.gameManager) {
        this.gameManager.add_xp(quest.rewards.xp);
      }
    }

    // Schedule time events (top-level; nested unlocks_on_complete.time_events also accepted)
    const timeEvents = quest.time_events || (quest.unlocks_on_complete && quest.unlocks_on_complete.time_events) || [];
    for (const te of timeEvents) {
      if (te.trigger === 'on_complete') {
        this._scheduleTimeEvent(questId, te);
      }
    }

    this._markDirty();
    this.eventBus.emit('quest:completed', { questId, rewards: quest.rewards });

    if (window.__QUEST_DEBUG__) {
      console.log(`[QUEST] Completed: ${questId}`);
    }

    return true;
  }

  // ── Objective Tracking ─────────────────────────────────

  // Generic dispatcher: routes any objective event to the matching handler
  // for every active quest. Handlers return true when progress changed.
  _onObjectiveEvent(type, data) {
    const store = this._getQuestStore();
    const handler = this._objectiveHandlers[type];
    if (!handler) return;

    for (const questId of store.active) {
      const quest = this.allQuests.find(q => q.id === questId);
      if (!quest) continue;

      quest.objectives.forEach((obj, i) => {
        if (obj.type !== type) return;
        if (handler(questId, i, obj, data)) {
          this._markDirty();
          this.eventBus.emit('quest:objective_progress', {
            questId,
            objectiveIndex: i,
            current: store.objectives[questId][i].current,
            required: store.objectives[questId][i].required,
          });
        }
      });
    }
  }

  // ── Objective Handlers ─────────────────────────────────

  _handleKillCount(questId, index, obj, data) {
    // death events carry { entity, killer, position } — entity.enemyData.id is the content id
    const enemyId = (data && data.enemyId)
      || (data && data.entity && (data.entity.enemyData && data.entity.enemyData.id) || (data && data.entity && data.entity.enemyId))
      || (data && data.entity && data.entity.type !== 'player' ? data.entity.type : null);
    if (!enemyId) return false;
    if (obj.target && enemyId !== obj.target) return false;

    const store = this._getQuestStore();
    const progress = store.objectives[questId][index];
    if (!progress || progress.current >= progress.required) return false;

    progress.current++;
    return true;
  }

  _handleTalkTo(questId, index, obj, data) {
    // Called externally when player talks to NPC
    if (!data || data.npcId !== obj.target) return false;

    const store = this._getQuestStore();
    const progress = store.objectives[questId][index];
    if (!progress || progress.current >= progress.required) return false;

    progress.current = 1;
    return true;
  }

  _handleCompleteStage(questId, index, obj, data) {
    if (!data || !data.stageId) return false;
    // A lost run must not count — sessionEnd passes stage_completed only on victory
    if (data.stage_completed === false) return false;
    // Accept both `target` (canonical) and `stage_id` (alias used in early drafts)
    const targetId = obj.target || obj.stage_id;
    if (targetId && data.stageId !== targetId) return false;

    const store = this._getQuestStore();
    const progress = store.objectives[questId][index];
    if (!progress || progress.current >= progress.required) return false;

    progress.current = 1;
    return true;
  }

  _handleCollectItem(questId, index, obj, data) {
    if (!data || data.itemId !== obj.target) return false;

    const store = this._getQuestStore();
    const progress = store.objectives[questId][index];
    if (!progress || progress.current >= progress.required) return false;

    progress.current += (data.count || 1);
    if (progress.current > progress.required) progress.current = progress.required;
    return true;
  }

  _handleReachLocation(questId, index, obj, data) {
    if (!data || data.locationId !== obj.target) return false;

    const store = this._getQuestStore();
    const progress = store.objectives[questId][index];
    if (!progress || progress.current >= progress.required) return false;

    progress.current = 1;
    return true;
  }

  // ── Time Events ────────────────────────────────────────

  _scheduleTimeEvent(questId, timeEvent) {
    const store = this._getQuestStore();
    store.timeEvents.push({
      questId,
      flag: timeEvent.flag,
      fireAt: Date.now() + (timeEvent.delay_seconds * 1000),
      description: timeEvent.description,
    });
    this._markDirty();
  }

  _processPendingTimeEvents() {
    const store = this._getQuestStore();
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const eventsToFire = [];

    store.timeEvents = store.timeEvents.filter(te => {
      // Purge events older than 30 days
      if (now - te.fireAt > maxAge) return false;

      // Fire events that have passed
      if (te.fireAt <= now) {
        eventsToFire.push(te);
        return false;
      }
      return true;
    });

    for (const te of eventsToFire) {
      this.setFlag(te.flag, true, `time_event:${te.questId}`);
      this.eventBus.emit('quest:time_event', {
        questId: te.questId,
        flag: te.flag,
        description: te.description,
      });

      if (window.__QUEST_DEBUG__) {
        console.log(`[QUEST] Time event fired: ${te.flag} (from ${te.questId})`);
      }
    }

    if (eventsToFire.length > 0) {
      this._markDirty();
    }
  }

  // ── Prerequisite Checking ──────────────────────────────

  _checkPrerequisites(quest) {
    if (!quest.prerequisites || quest.prerequisites.length === 0) return true;
    return quest.prerequisites.every(flag => this.getFlag(flag));
  }

  // ── Availability Re-evaluation ─────────────────────────

  _reevaluateAvailability() {
    const available = this.getAvailableQuests();
    const currentIds = new Set(available.map(q => q.id));

    // Only emit for quests that just became available (spam guard)
    for (const quest of available) {
      if (this._lastAvailableIds.has(quest.id)) continue;
      this.eventBus.emit('quest:available', { questId: quest.id });
    }

    // Track state — drop ids no longer available (started/completed)
    for (const id of this._lastAvailableIds) {
      if (!currentIds.has(id)) this._lastAvailableIds.delete(id);
    }
    for (const id of currentIds) this._lastAvailableIds.add(id);
  }

  // ── Helpers ────────────────────────────────────────────

  _getQuestStore() {
    if (!this.gameManager || !this.gameManager.store) {
      return { active: [], completed: [], failed: [], objectives: {}, timeEvents: [] };
    }
    const store = this.gameManager.store.persistent.quests;
    if (!store.objectives) store.objectives = {};
    if (!store.timeEvents) store.timeEvents = [];
    if (!store.failed) store.failed = [];
    return store;
  }

  _getRequired(obj) {
    if (obj.count) return obj.count;
    return 1;
  }

  // Normalize display names to stable content ids: "Deep Woods" → "deep_woods"
  _normalizeId(value) {
    return String(value).toLowerCase().replace(/\s+/g, '_');
  }

  _markDirty() {
    if (this.gameManager) this.gameManager._dirty = true;
  }

  // ── Debug API ──────────────────────────────────────────

  debug() {
    if (!window.__QUEST_DEBUG__) return;
    window.QUEST_DEBUG = {
      flags: () => console.table(this.gameManager?.store?.flags || {}),
      active: () => console.table(this.getActiveQuests().map(q => ({ id: q.id, name: q.name }))),
      completed: () => console.table(this.getCompletedQuests().map(q => ({ id: q.id, name: q.name }))),
      available: () => console.table(this.getAvailableQuests().map(q => ({ id: q.id, name: q.name }))),
      unlock: (flag) => this.setFlag(flag, true, 'debug'),
      lock: (flag) => this.setFlag(flag, false, 'debug'),
      gates: () => console.table(this.gates),
      reset: () => {
        if (this.gameManager) {
          this.gameManager.store.persistent.quests = { active: [], completed: [], failed: [], objectives: {}, timeEvents: [] };
          this.gameManager.store.flags = {};
          this._markDirty();
        }
      },
    };
  }
}
