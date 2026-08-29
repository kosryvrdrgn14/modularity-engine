class GameManager {
  constructor(eventBus, backend) {
    this.eventBus = eventBus;
    this.backend = backend || new LocalStorageBackend();
    this.store = null;
    this._dirty = false;
    this._autoSaveTimer = 0;
  }

  init() {
    const saved = this.backend.load('modularity_engine_save');
    if (saved) {
      this.store = this._migrate(saved);
    } else {
      this.store = this._createDefault();
    }
    this._dirty = true;
  }

  _createDefault() {
    return {
      save_version: 2,
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
        quests: { active: [], completed: [] },
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
    this.backend.save('modularity_engine_save', this.store);
    this._dirty = false;
  }

  reset() {
    this.store = this._createDefault();
    this.save();
    this.eventBus.emit('save:reset');
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
