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
