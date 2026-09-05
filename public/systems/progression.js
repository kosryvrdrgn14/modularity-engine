class StorageBackend {
  load(key) { return null; }
  save(key, data) {}
  remove(key) {}
}

class LocalStorageBackend extends StorageBackend {
  load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }
  save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
  }
  remove(key) { localStorage.removeItem(key); }
}

// ============================================================
// GAME MANAGER
// Central store, resource tracking, combat session results
// ============================================================

class GameManager {
  constructor(eventBus, backend) {
    this.eventBus = eventBus;
    this.backend = backend || new LocalStorageBackend();
    this.store = null;
    this._dirty = false;
    this._autoSaveTimer = 0;
  }

  // ── Save slots (SLOT system) ──────────────────
  // Layout: me_save_slot1..3 hold full stores; me_active_slot is the pointer.
  // Legacy single key ('modularity_engine_save') is adopted into slot 1 once.
  static SLOT_COUNT = 3;
  static SLOT_KEY(n) { return `me_save_slot${n}`; }
  static ACTIVE_KEY = 'me_active_slot';
  static LEGACY_KEY = 'modularity_engine_save';

  _slotKey(n) { return GameManager.SLOT_KEY(n); }

  _readActiveSlot() {
    const raw = this.backend.load(GameManager.ACTIVE_KEY);
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    return (n >= 1 && n <= GameManager.SLOT_COUNT) ? n : 1;
  }

  _writeActiveSlot(n) { this.backend.save(GameManager.ACTIVE_KEY, n); }

  init() {
    // Legacy adoption: an old single-key save becomes slot 1 exactly once,
    // so no existing player progress is lost when the slot system lands.
    const legacy = this.backend.load(GameManager.LEGACY_KEY);
    const slot1Raw = this.backend.load(this._slotKey(1));
    if (legacy && !slot1Raw) {
      this.backend.save(this._slotKey(1), this._migrate(legacy));
    }
    if (legacy && slot1Raw) {
      // Both exist — legacy is superseded; drop it so adoption never re-fires
      // after a slot-1 wipe.
      this.backend.remove(GameManager.LEGACY_KEY);
    }

    this.activeSlot = this._readActiveSlot();
    const saved = this.backend.load(this._slotKey(this.activeSlot));
    if (saved) {
      this.store = this._migrate(saved);
    } else {
      this.store = this._createDefault();
      this.save();
    }
    this._dirty = true;
  }

  _createDefault() {
    return {
      save_version: 3,
      session: {
        current_stage_id: null,
        run_in_progress: false,
        run_data: { time_survived: 0, kills: 0, gold_earned: 0, level_reached: 1 },
      },
      world: {
        currentRegion: "town",
        currentLocation: "city_root",
        locationHistory: ["town:city_root"],
        regionIndex: 0,
        regionUnlocks: { town: true, graveyard: false, forest: false },
        locationUnlocks: { "town:city_root": true },
      },
      persistent: {
        currency: 0,
        player: { level: 1, xp: 0, total_gold: 0, base_stats: { max_health: 100, move_speed: 200, damage_multiplier: 1.0, speed_multiplier: 1.0 } },
        combat: { unlocked_weapons: ["w1_projectile"], weapon_levels: {}, best_run: null, run_history: [], stars: {} },
        skills: { unlocked: [], skill_points: 0 },
        town: { level: 1, population: 0, popCap: 5, buildings: {}, resources: { gold: 0, wood: 0, stone: 0, herbs: 0, ore: 0 }, workers: { farmers: 0, miners: 0, builders: 0, idle: 0 } },
        npcs: { met: [], relationships: {}, companions: [], companionStatus: {} },
        factions: { wanderers_guild: { reputation: 0, rank: "unknown" }, shadow_covenant: { reputation: 0, rank: "unknown" }, forge_brotherhood: { reputation: 0, rank: "unknown" } },
        quests: { active: [], completed: [], failed: [], objectives: {}, timeEvents: [] },
        unlocks: { stages: ["stage_graveyard"], items: [], features: ["town_basic", "combat_basic"] },
        estates: [],
        family: { wives: [], children: [] },
        inventory: { equipment: { weapon: null, armor: null }, consumables: [], max_slots: 24 },
      },
      farming: {
        slots: [
          { id: 1, stageId: null, unitType: null, unitId: null, status: "idle", timer: 0 },
          { id: 2, stageId: null, unitType: null, unitId: null, status: "idle", timer: 0 },
          { id: 3, stageId: null, unitType: null, unitId: null, status: "locked", timer: 0 },
        ],
        plans: [],
        pityCounters: {},
        clearCounters: {},
        gachaCounters: {},
      },
      estates: [],
      flags: {},
      counters: { total_kills: 0, total_runs: 0 },
    };
  }

  _migrate(data) {
    const v = data.save_version || data.version || 0;
    if (v < 1) {
      data.inventory = data.inventory || {};
      data.inventory.maxSlots = data.inventory.maxSlots || 24;
      data.quests = data.quests || {};
      data.quests.estateQueue = data.quests.estateQueue || [];
      data.save_version = 1;
    }
    if (v < 2) {
      // Add world state (D9: unified location hierarchy)
      data.world = data.world || {
        currentRegion: "town",
        currentLocation: "city_root",
        locationHistory: ["town:city_root"],
        regionIndex: 0,
        regionUnlocks: { town: true, graveyard: false, forest: false },
        locationUnlocks: { "town:city_root": true },
      };
      // Add farming state
      data.farming = data.farming || {
        slots: [
          { id: 1, stageId: null, unitType: null, unitId: null, status: "idle", timer: 0 },
          { id: 2, stageId: null, unitType: null, unitId: null, status: "idle", timer: 0 },
          { id: 3, stageId: null, unitType: null, unitId: null, status: "locked", timer: 0 },
        ],
        plans: [],
        pityCounters: {},
        clearCounters: {},
      };
      // Update town structure
      if (data.persistent && data.persistent.town) {
        if (data.persistent.town.phase !== undefined) {
          data.persistent.town.level = data.persistent.town.phase;
          delete data.persistent.town.phase;
        }
        data.persistent.town.level = data.persistent.town.level || 1;
        data.persistent.town.popCap = data.persistent.town.popCap || 5;
        data.persistent.town.workers = data.persistent.town.workers || { farmers: 0, miners: 0, builders: 0, idle: 0 };
      }
      // Add companion status
      if (data.persistent && data.persistent.npcs) {
        data.persistent.npcs.companionStatus = data.persistent.npcs.companionStatus || {};
      }
      // Add missing factions
      if (data.persistent && data.persistent.factions) {
        data.persistent.factions.shadow_covenant = data.persistent.factions.shadow_covenant || { reputation: 0, rank: "unknown" };
        data.persistent.factions.forge_brotherhood = data.persistent.factions.forge_brotherhood || { reputation: 0, rank: "unknown" };
      }
      data.save_version = 2;
    }
    if (v < 3) {
      // Quest system state (v3) — active/completed quests, objective progress, pending time events
      if (!data.persistent) data.persistent = {};
      const q = data.persistent.quests || {};
      q.active = q.active || [];
      q.completed = q.completed || [];
      q.failed = q.failed || [];
      q.objectives = q.objectives || {};
      q.timeEvents = q.timeEvents || [];
      data.persistent.quests = q;
      data.save_version = 3;
    }
    return data;
  }

  // ── Store Access ───────────────────────────────
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.store);
  }

  set(path, value) {
    const keys = path.split('.');
    let obj = this.store;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._dirty = true;
  }

  // ── Resource Tracking ──────────────────────────
  // ── Currency (engine-agnostic name) ──────────────
  add_currency(amount, source) {
    if (amount <= 0) return;
    this.store.persistent.currency += amount;
    this.store.persistent.town.resources.gold += amount;
    this._dirty = true;
    this.eventBus.emit('resources:changed', { currency: this.store.persistent.currency, source });
  }

  spend_currency(amount, source) {
    if (amount > this.store.persistent.currency) return false;
    this.store.persistent.currency -= amount;
    this.store.persistent.town.resources.gold -= amount;
    this._dirty = true;
    this.eventBus.emit('resources:changed', { currency: this.store.persistent.currency, source });
    return true;
  }

  get_currency() { return this.store.persistent.currency || 0; }

  // ── Resources ──────────────────────────────────
  add_resource(type, amount) {
    if (!this.store.persistent.town.resources.hasOwnProperty(type)) return;
    this.store.persistent.town.resources[type] += amount;
    this._dirty = true;
  }

  spend_resource(type, amount) {
    const res = this.store.persistent.town.resources;
    if (!res.hasOwnProperty(type) || amount > res[type]) return false;
    res[type] -= amount;
    this._dirty = true;
    return true;
  }

  get_resource(type) { return this.store.persistent.town.resources[type] || 0; }
  has_resource(type, amount) { return this.get_resource(type) >= amount; }

  // ── Flags (flat key/value) ─────────────────────
  set_flag(key, value) { this.store.flags[key] = value; this._dirty = true; }
  get_flag(key) { return !!this.store.flags[key]; }
  toggle_flag(key) { this.store.flags[key] = !this.store.flags[key]; this._dirty = true; }

  // ── Counters (flat numeric) ────────────────────
  add_counter(key, amount) {
    this.store.counters[key] = (this.store.counters[key] || 0) + amount;
    this._dirty = true;
    this.eventBus.emit('counter:changed', { key, value: this.store.counters[key] });
  }
  get_counter(key) { return this.store.counters[key] || 0; }
  set_counter(key, value) { this.store.counters[key] = value; this._dirty = true; }

  // ---- Companion system ----
  get_companions() { return this.store.companions || []; }
  has_companion(id) { return (this.store.companions || []).includes(id); }
  add_companion(id) {
    if (!this.store.companions) this.store.companions = [];
    if (!this.store.companions.includes(id)) {
      this.store.companions.push(id);
      this._dirty = true;
      return true;
    }
    return false;
  }
  remove_companion(id) {
    if (!this.store.companions) return;
    const idx = this.store.companions.indexOf(id);
    if (idx >= 0) { this.store.companions.splice(idx, 1); this._dirty = true; }
  }
  get_companion_count() { return (this.store.companions || []).length; }

  // C2/C3: Companion deployment status tracking
  getCompanionDeployStatus(companionId) {
    const s = this.store.persistent?.npcs?.companionStatus || {};
    return s[companionId] || 'available';
  }

  setCompanionDeployStatus(companionId, status) {
    if (!this.store.persistent.npcs.companionStatus) {
      this.store.persistent.npcs.companionStatus = {};
    }
    this.store.persistent.npcs.companionStatus[companionId] = status;
    this._dirty = true;
  }

  // Mark companion as deployed in combat
  deployCompanion(companionId) {
    this.setCompanionDeployStatus(companionId, 'deployed_combat');
  }

  // Mark companion as deployed in auto-clear
  deployCompanionAutoClear(companionId) {
    this.setCompanionDeployStatus(companionId, 'autoclear');
  }

  // Return companion to available
  recallCompanion(companionId) {
    this.setCompanionDeployStatus(companionId, 'available');
  }

  // Lock companion (story/event)
  lockCompanion(companionId, reason) {
    this.setCompanionDeployStatus(companionId, 'locked');
  }

  // Get all companions with their statuses
  getCompanionRoster() {
    const companions = this.get_companions();
    return companions.map(id => ({
      id,
      status: this.getCompanionDeployStatus(id),
      slot: COMPANION_DATA[id]?.slot || 0,
      pairedWeapon: COMPANION_DATA[id]?.pairedWeapon || null,
    }));
  }

  // ── Player Progress ────────────────────────────
  add_xp(amount) {
    const p = this.store.persistent.player;
    p.xp += amount;
    const xpNeeded = 10 + p.level * 5;
    while (p.xp >= xpNeeded) {
      p.xp -= xpNeeded;
      p.level++;
      this.store.persistent.skills.skill_points++;
      this.eventBus.emit('player:levelUp', { level: p.level });
    }
    this._dirty = true;
  }

  unlock_weapon(weapon_id) {
    const w = this.store.persistent.combat.unlocked_weapons;
    if (!w.includes(weapon_id)) { w.push(weapon_id); this._dirty = true; this.eventBus.emit('unlock:weapon', { weapon_id }); }
  }

  unlock_stage(stage_id) {
    const s = this.store.persistent.unlocks.stages;
    if (!s.includes(stage_id)) { s.push(stage_id); this._dirty = true; this.eventBus.emit('unlock:stage', { stage_id }); }
  }

  unlock_feature(feature_id) {
    const f = this.store.persistent.unlocks.features;
    if (!f.includes(feature_id)) { f.push(feature_id); this._dirty = true; this.eventBus.emit('unlock:feature', { feature_id }); }
  }

  // ── Combat Session ─────────────────────────────
  _buildResult(data) {
    return {
      stageId: data.stageId || 'stage_graveyard',
      stage_completed: data.stageCompleted || false,
      time_survived: data.timeSurvived || 0,
      player_level: data.playerLevel || 1,
      kills: data.kills || 0,
      kills_by_type: data.killsByType || {},
      gold_earned: data.goldEarned || 0,
      xp_earned: data.xpEarned || 0,
      items: data.itemsFound || [],
      boss_defeated: data.bossDefeated || false,
      weapons_used: data.weaponsUsed || [],
      weapon_levels_end: data.weapon_levels_end || {},
      questEvents: data.questEvents || [],
    };
  }

  end_session(result) {
    const p = this.store.persistent;
    const s = this.store.session;

    // Currency rewards
    if (result.rewards && result.rewards.currency) {
      p.currency += result.rewards.currency;
      p.town.resources.gold += result.rewards.currency;
    }

    // XP rewards
    if (result.rewards && result.rewards.xp) {
      this.add_xp(result.rewards.xp);
    }

    // Flags triggered
    if (result.flags_triggered) {
      for (const flag of result.flags_triggered) {
        this.store.flags[flag] = true;
      }
    }

    // Counters updated
    if (result.counters_updated) {
      for (const [key, val] of Object.entries(result.counters_updated)) {
        this.store.counters[key] = (this.store.counters[key] || 0) + val;
      }
    }

    // Stats
    this.store.counters.total_runs = (this.store.counters.total_runs || 0) + 1;
    if (result.stats && result.stats.kills) {
      this.store.counters.total_kills = (this.store.counters.total_kills || 0) + result.stats.kills;
    }

    // Best run
    const time = result.stats ? result.stats.time_survived : 0;
    if (!p.combat.best_run || time > (p.combat.best_run.stats?.time_survived || 0)) {
      p.combat.best_run = result;
    }

    // Run history (keep last 10)
    p.combat.run_history.unshift(result);
    if (p.combat.run_history.length > 10) p.combat.run_history.pop();

    // Items
    if (result.rewards && result.rewards.items) {
      for (const item of result.rewards.items) {
        const existing = p.inventory.consumables.find(i => i.id === item.id);
        if (existing) existing.count += item.count || 1;
        else p.inventory.consumables.push({ id: item.id, count: item.count || 1 });
      }
    }

    // Clear session
    s.run_in_progress = false;
    s.run_data = { time_survived: 0, kills: 0, gold_earned: 0, level_reached: 1 };

    // Emit events
    this.eventBus.emit('combat:sessionEnd', result);
    this.eventBus.emit('resources:changed', { currency: p.currency });

    this.save();
  }

  _addToInventory(item) {
    // Simplified: just track count in consumables
    const existing = this.store.inventory.consumables.find(i => i.id === item.id);
    if (existing) {
      existing.count += item.count || 1;
    } else {
      this.store.inventory.consumables.push({ id: item.id, count: item.count || 1 });
    }
    this._dirty = true;
  }

  // ── Query Helpers ──────────────────────────────
  getEffectiveStats() {
    const base = this.store.player.baseStats;
    // TODO: add skill tree bonuses and equipment bonuses
    return { ...base };
  }

  getUnlockedWeapons() {
    return this.store.persistent.combat.unlocked_weapons;
  }

  getRunHistory() {
    return this.store.persistent.combat.run_history;
  }

  getBestRun() {
    return this.store.persistent.combat.best_run;
  }

  // ── World State ──────────────────────────────
  getCurrentRegion() { return this.store.world?.currentRegion || "town"; }
  setCurrentRegion(region) { if (this.store.world) { this.store.world.currentRegion = region; this._dirty = true; } }
  getCurrentLocation() { return this.store.world?.currentLocation || "city_root"; }
  setCurrentLocation(loc) { if (this.store.world) { this.store.world.currentLocation = loc; this._dirty = true; } }
  isRegionUnlocked(region) { return !!this.store.world?.regionUnlocks?.[region]; }
  unlockRegion(region) { if (this.store.world) { this.store.world.regionUnlocks[region] = true; this._dirty = true; } }
  isLocationUnlocked(loc) { return !!this.store.world?.locationUnlocks?.[loc]; }
  unlockLocation(loc) { if (this.store.world) { this.store.world.locationUnlocks[loc] = true; this._dirty = true; } }

  // ── Farming State ──────────────────────────────
  getFarmingSlot(id) { return this.store.farming?.slots?.find(s => s.id === id); }
  setFarmingSlot(id, data) {
    if (!this.store.farming) return;
    const slot = this.store.farming.slots.find(s => s.id === id);
    if (slot) { Object.assign(slot, data); this._dirty = true; }
  }
  getClearCount(stageId) { return this.store.farming?.clearCounters?.[stageId] || 0; }
  incrementClearCount(stageId) {
    if (!this.store.farming) return;
    this.store.farming.clearCounters[stageId] = (this.store.farming.clearCounters[stageId] || 0) + 1;
    this._dirty = true;
  }

  // ── Gacha Protection (per-item, resets on drop) ──────────
  getGachaCount(itemId) {
    return this.store.farming?.gachaCounters?.[itemId] || 0;
  }

  incrementGachaCount(itemId) {
    if (!this.store.farming) return;
    if (!this.store.farming.gachaCounters) this.store.farming.gachaCounters = {};
    this.store.farming.gachaCounters[itemId] = (this.store.farming.gachaCounters[itemId] || 0) + 1;
    this._dirty = true;
  }

  resetGachaCount(itemId) {
    if (!this.store.farming) return;
    if (!this.store.farming.gachaCounters) this.store.farming.gachaCounters = {};
    this.store.farming.gachaCounters[itemId] = 0;
    this._dirty = true;
  }

  // ── Save/Load ──────────────────────────────────
  save() {
    this.backend.save(this._slotKey(this.activeSlot || 1), this.store);
    this._dirty = false;
  }

  reset() {
    this.store = this._createDefault();
    this.save();
    this.eventBus.emit('save:reset');
  }

  // ── Slot management API ────────────────────────
  getActiveSlot() { return this.activeSlot || 1; }

  /** Load another slot's store into this manager IN PLACE (reference kept).
   *  Callers own orchestration (quest system, world re-sync) around this. */
  switchToSlot(n) {
    n = (n >= 1 && n <= GameManager.SLOT_COUNT) ? n : 1;
    // Persist current state first so the outgoing slot is never stale.
    this.save();
    this.activeSlot = n;
    this._writeActiveSlot(n);
    const saved = this.backend.load(this._slotKey(n));
    this.store = saved ? this._migrate(saved) : this._createDefault();
    this._dirty = true;
    this.eventBus.emit('save:slotSwitched', { slot: n });
    return this.store;
  }

  /** Wipe a slot to a fresh default. If it is the ACTIVE slot, the live
   *  store is replaced (same in-place semantics as switchToSlot). */
  wipeSlot(n) {
    n = (n >= 1 && n <= GameManager.SLOT_COUNT) ? n : 1;
    if (n === this.getActiveSlot()) {
      this.reset();
    } else {
      this.backend.remove(this._slotKey(n));
    }
    this.eventBus.emit('save:slotWiped', { slot: n });
  }

  /** Lightweight summaries for the picker UI (never mutates stores). */
  getSlotSummaries() {
    const out = [];
    for (let n = 1; n <= GameManager.SLOT_COUNT; n++) {
      const raw = this.backend.load(this._slotKey(n));
      if (!raw) { out.push({ slot: n, exists: false }); continue; }
      const s = this._migrate(raw);
      out.push({
        slot: n,
        exists: true,
        level: s?.persistent?.player?.level ?? 1,
        gold: s?.persistent?.currency ?? s?.persistent?.town?.resources?.gold ?? 0,
        questsDone: (s?.persistent?.quests?.completed || []).length,
        region: s?.world?.currentRegion || 'town',
      });
    }
    return out;
  }

  // ── Auto-save ──────────────────────────────────
  update(dt) {
    if (this._dirty) {
      this._autoSaveTimer += dt;
      if (this._autoSaveTimer >= 60) {
        this.save();
        this._autoSaveTimer = 0;
      }
    }
  }
}



// ============================================================
// STAR SYSTEM — Evaluate stage performance stars (1★/2★/3★)
// ============================================================

class DisasterSystem {
  constructor(gameManager, eventBus) {
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this._lastDisasterRun = 0;
    this._cooldown = 3; // runs between disasters
  }

  // Called at end of each combat run
  checkForDisaster(runNumber) {
    if (runNumber - this._lastDisasterRun < this._cooldown) return null;
    // 20% chance per eligible run
    if (Math.random() > 0.2) return null;
    
    const disaster = DISASTER_EVENTS[Math.floor(Math.random() * DISASTER_EVENTS.length)];
    this._lastDisasterRun = runNumber;
    return disaster;
  }

  resolve(disaster, gold) {
    if (gold >= disaster.goldCost) {
      this.gameManager.spend_currency(disaster.goldCost, 'disaster_' + disaster.id);
      return { resolved: true, cost: disaster.goldCost };
    }
    return { resolved: false, cost: disaster.goldCost };
  }
}


// ============================================================
// FARMING SYSTEM — Auto-Clear (Rule of 3)
// ============================================================

// FARMING_CONFIG moved to data/farmingConfig.js (loaded via <script> tag before this one)


class FarmingSystem {
  constructor(gameManager, eventBus) {
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this._checkInterval = 5; // check every 5 seconds
    this._timer = 0;
  }

  update(dt) {
    this._timer += dt;
    if (this._timer < this._checkInterval) return;
    this._timer = 0;

    const slots = this.gameManager.store.farming?.slots || [];
    for (const slot of slots) {
      if (slot.status !== 'running') continue;
      slot.timer += this._checkInterval;
      if (slot.timer >= slot.completionTime) {
        this._completeSlot(slot);
      }
    }
  }

  assignSlot(slotId, stageId, unitType, unitId) {
    const slot = this.gameManager.getFarmingSlot(slotId);
    if (!slot || slot.status === 'locked') return false;
    if (slot.status === 'running') return false; // already running

    // C2: One-place-only lockout
    if (unitType === 'companion') {
      const deployStatus = this.gameManager.getCompanionDeployStatus(unitId);
      if (deployStatus === 'deployed_combat') return false;
      this.gameManager.deployCompanionAutoClear(unitId);
    }

    slot.stageId = stageId;
    slot.unitType = unitType;
    slot.unitId = unitId;
    slot.status = 'running';
    slot.timer = 0;
    slot.completionTime = FARMING_CONFIG.baseCompletionTime;
    slot.loot = null;
    this.gameManager._dirty = true;
    return true;
  }

  collectSlot(slotId) {
    const slot = this.gameManager.getFarmingSlot(slotId);
    if (!slot || slot.status !== 'complete') return null;

    const loot = slot.loot || this._generateLoot(slot);

    // Apply loot to player
    if (loot.gold) this.gameManager.add_resource('gold', loot.gold);
    if (loot.xp) this.gameManager.add_xp(loot.xp);
    for (const [mat, amount] of Object.entries(loot.materials || {})) {
      if (amount > 0) this.gameManager.add_resource(mat, amount);
    }

    // Release companion lockout
    if (slot.unitType === 'companion' && slot.unitId) {
      this.gameManager.recallCompanion(slot.unitId);
    }

    // Reset slot
    slot.status = 'idle';
    slot.stageId = null;
    slot.unitType = null;
    slot.unitId = null;
    slot.timer = 0;
    slot.loot = null;
    this.gameManager._dirty = true;

    return loot;
  }

  _completeSlot(slot) {
    slot.loot = this._generateLoot(slot);
    slot.status = 'complete';
    this.gameManager._dirty = true;
    this.eventBus.emit('farmingComplete', { slotId: slot.id, loot: slot.loot });
  }

  _generateLoot(slot) {
    const mult = FARMING_CONFIG.lootMultiplier;
    const stage = slot.stageId || 'stage_graveyard';
    const clearCount = this.gameManager.getClearCount(stage);

    // Base loot scales with clear count
    const gold = Math.round((10 + clearCount * 2) * mult);
    const xp = Math.round((5 + clearCount) * mult);
    const materials = {};
    for (const [mat, range] of Object.entries(FARMING_CONFIG.materialYield)) {
      const base = range.min + Math.random() * (range.max - range.min);
      materials[mat] = Math.round(base * mult * (1 + clearCount * 0.1));
    }

    return { gold, xp, materials, stageId: stage };
  }

  getSlotStatus(slotId) {
    const slot = this.gameManager.getFarmingSlot(slotId);
    if (!slot) return null;
    return {
      id: slot.id,
      status: slot.status,
      progress: slot.status === 'running' ? Math.min(1, slot.timer / (slot.completionTime || 1)) : 0,
      timeRemaining: slot.status === 'running' ? Math.max(0, (slot.completionTime || 0) - slot.timer) : 0,
      stageId: slot.stageId,
      unitType: slot.unitType,
      unitId: slot.unitId,
      loot: slot.loot,
    };
  }
}



// ============================================================
// AFFECTION SYSTEM — NPC relationship tracking (E2)
// ============================================================

// AFFECTION_TIERS moved to data/affectionTiers.js (loaded via <script> tag before this one)


class AffectionSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  getAffection(npcId) {
    return this.gameManager.get_counter('affection_' + npcId) || 0;
  }

  addAffection(npcId, amount) {
    this.gameManager.add_counter('affection_' + npcId, amount);
    return this.getAffection(npcId);
  }

  getTier(npcId) {
    const aff = this.getAffection(npcId);
    let tier = AFFECTION_TIERS[0];
    for (const t of AFFECTION_TIERS) {
      if (aff >= t.min) tier = t;
    }
    return tier;
  }

  getTierIndex(npcId) {
    const aff = this.getAffection(npcId);
    let idx = 0;
    for (let i = 0; i < AFFECTION_TIERS.length; i++) {
      if (aff >= AFFECTION_TIERS[i].min) idx = i;
    }
    return idx;
  }

  canDate(npcId) {
    return this.getTierIndex(npcId) >= 2; // Respect+
  }

  canMarry(npcId) {
    return this.getTierIndex(npcId) >= 4; // Claim
  }
}

// ============================================================
// ESTATE SYSTEM — Family homes + material production (E3)
// ============================================================

// ESTATE_TIERS moved to data/estateTiers.js (loaded via <script> tag before this one)


class EstateSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  getEstates() {
    return this.gameManager.store.estates || [];
  }

  getEstate(wifeId) {
    return this.getEstates().find(e => e.wifeId === wifeId);
  }

  createEstate(wifeId, tier) {
    if (!this.gameManager.store.estates) this.gameManager.store.estates = [];
    const tierData = ESTATE_TIERS[tier - 1];
    if (!tierData) return false;

    const estate = {
      wifeId,
      tier: tier,
      name: tierData.name,
      production: { ...tierData.production },
      questSlots: tierData.questSlots,
      activeQuests: [],
      children: [],
    };
    this.gameManager.store.estates.push(estate);
    this.gameManager._dirty = true;
    return estate;
  }

  upgradeEstate(wifeId) {
    const estate = this.getEstate(wifeId);
    if (!estate) return false;
    if (estate.tier >= ESTATE_TIERS.length) return false;

    const nextTier = ESTATE_TIERS[estate.tier]; // tier is 1-indexed
    // Check resources
    if (!this.gameManager.has_resource('gold', nextTier.cost.gold)) return false;

    // Spend resources
    this.gameManager.spend_currency(nextTier.cost.gold, 'estate_upgrade');
    estate.tier = nextTier.level;
    estate.name = nextTier.name;
    estate.production = { ...nextTier.production };
    estate.questSlots = nextTier.questSlots;
    this.gameManager._dirty = true;
    return true;
  }

  collectProduction(wifeId) {
    const estate = this.getEstate(wifeId);
    if (!estate) return null;
    // E3: Production scales with wife affection tier
    const affection = this.gameManager.get_counter('affection_' + wifeId) || 0;
    const tierBonus = 1 + Math.floor(affection / 30) * 0.25; // +25% per tier
    const produced = {};
    for (const [mat, amount] of Object.entries(estate.production)) {
      const scaled = Math.round(amount * tierBonus);
      if (scaled > 0) {
        this.gameManager.add_resource(mat, scaled);
        produced[mat] = scaled;
      }
    }
    return produced;
  }
}

// ============================================================
// CHILDREN SYSTEM — Growth + Legacy Companions (E4)
// ============================================================

// CHILD_GROWTH_STAGES moved to data/childGrowthStages.js (loaded via <script> tag before this one)

const CHILD_GROWTH_THRESHOLD = 10; // runs per growth stage

class ChildrenSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  getChildren(wifeId) {
    const estates = this.gameManager.store.estates || [];
    const estate = estates.find(e => e.wifeId === wifeId);
    return estate?.children || [];
  }

  addChild(wifeId, name) {
    const estates = this.gameManager.store.estates || [];
    const estate = estates.find(e => e.wifeId === wifeId);
    if (!estate) return false;
    if (!estate.children) estate.children = [];

    const child = {
      name: name || 'Child',
      growthStage: 0, // index into CHILD_GROWTH_STAGES
      runsLived: 0,
      path: null, // null = undecided, 'companion' or 'manager'
      companionData: null, // set when path = companion
    };
    estate.children.push(child);
    this.gameManager._dirty = true;
    return child;
  }

  growChildren() {
    // Called after each combat run
    const estates = this.gameManager.store.estates || [];
    for (const estate of estates) {
      if (!estate.children) continue;
      for (const child of estate.children) {
        child.runsLived++;
        if (child.runsLived >= CHILD_GROWTH_THRESHOLD && child.growthStage < CHILD_GROWTH_STAGES.length - 1) {
          child.growthStage++;
          child.runsLived = 0;
        }
      }
    }
    this.gameManager._dirty = true;
  }

  getGrowthStage(child) {
    return CHILD_GROWTH_STAGES[child.growthStage] || 'Unknown';
  }

  isAdult(child) {
    return child.growthStage >= CHILD_GROWTH_STAGES.length - 1;
  }

  assignPath(child, path) {
    if (!this.isAdult(child)) return false;
    child.path = path;
    if (path === 'companion') {
      // Generate legacy companion data based on parent's mythology
      child.companionData = {
        id: 'child_' + child.name.toLowerCase(),
        name: child.name,
        slot: 0, // assigned when deployed
        pairedWeapon: null,
        isLegacy: true,
      };
    }
    this.gameManager._dirty = true;
    return true;
  }
}



// ============================================================
// SANDBOX SYSTEM — Endgame build testing (F1)
// ============================================================

// SANDBOX_DEFAULTS moved to data/sandboxDefaults.js (loaded via <script> tag before this one)


class SandboxSystem {
  constructor(gameManager, eventBus) {
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.config = { ...SANDBOX_DEFAULTS, weaponLevels: { ...SANDBOX_DEFAULTS.weaponLevels } };
    this.isActive = false;
    this._dpsTimer = 0;
    this._dpsWindow = []; // {damage, time} entries
    this._totalDamage = 0;
    this._totalKills = 0;
    this._startTime = 0;
  }

  activate(config) {
    this.isActive = true;
    this.config = { ...SANDBOX_DEFAULTS, ...config };
    if (config?.weaponLevels) this.config.weaponLevels = { ...config.weaponLevels };
    this._dpsTimer = 0;
    this._dpsWindow = [];
    this._totalDamage = 0;
    this._totalKills = 0;
    this._startTime = 0;
  }

  deactivate() {
    this.isActive = false;
    this.config = { ...SANDBOX_DEFAULTS, weaponLevels: { ...SANDBOX_DEFAULTS.weaponLevels } };
  }

  recordDamage(amount) {
    if (!this.isActive || !this.config.showDps) return;
    this._totalDamage += amount;
    this._dpsWindow.push({ damage: amount, time: this._startTime });
    // Keep only last 5 seconds of data
    const cutoff = this._startTime - 5;
    this._dpsWindow = this._dpsWindow.filter(d => d.time > cutoff);
  }

  recordKill() {
    if (!this.isActive) return;
    this._totalKills++;
  }

  updateTimer(dt) {
    if (!this.isActive) return;
    this._startTime += dt;
  }

  getDps() {
    if (this._dpsWindow.length === 0) return 0;
    const totalDmg = this._dpsWindow.reduce((sum, d) => sum + d.damage, 0);
    const windowSize = Math.min(this._startTime, 5);
    return windowSize > 0 ? Math.round(totalDmg / windowSize) : 0;
  }

  getStats() {
    return {
      dps: this.getDps(),
      totalDamage: this._totalDamage,
      totalKills: this._totalKills,
      time: Math.round(this._startTime),
      avgDamagePerKill: this._totalKills > 0 ? Math.round(this._totalDamage / this._totalKills) : 0,
    };
  }

  getReport() {
    const stats = this.getStats();
    return {
      difficulty: this.config.difficulty,
      weaponLevels: { ...this.config.weaponLevels },
      companionSlots: [...this.config.companionSlots],
      stats,
      timestamp: Date.now(),
    };
  }
}


