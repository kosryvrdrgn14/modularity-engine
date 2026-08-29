class LevelingSystem {
  constructor(entityManager, dataManager, eventBus) {
    this.entityManager = entityManager;
    this.dataManager = dataManager;
    this.eventBus = eventBus;
    this.level = 1;
    this.xp = 0;
    this.queue = [];
  }

  init() {
    this.eventBus.on('pickup', (data) => this._onPickup(data));
    this.eventBus.on('death', (data) => this._onEnemyDeath(data));
  }

  _onPickup(data) {
    if (data.pickup.pickupData?.id === 'exp_small') {
      this.addXP(data.pickup.pickupData.value);
    } else if (data.pickup.pickupData?.id === 'gold_coin') {
      // Gold is tracked separately (not implemented yet)
    }
  }

  _onEnemyDeath(data) {
    // XP from kills is handled via pickups
  }

  addXP(amount) {
    this.xp += amount;
    
    while (this.xp >= this._getXpToNext(this.level) && this.queue.length < 3) {
      const xpNeeded = this._getXpToNext(this.level);
      this.xp -= xpNeeded;
      this.level++;
      this.queue.push(this.level);
      this.eventBus.emit('levelUp', { level: this.level });
    }
  }

  _getXpToNext(level) {
    const curve = this.dataManager.leveling.xpCurve;
    const entry = curve.find(e => e.level === level);
    if (entry) return entry.xpToNext;
    // Formula for level 14+
    return Math.floor(375 * Math.pow(1.3, level - 14));
  }

  hasPendingLevelUp() {
    return this.queue.length > 0;
  }

  getNextLevel() {
    return this.queue[0];
  }

  consumeLevelUp() {
    return this.queue.shift();
  }

  reset() {
    this.level = 1;
    this.xp = 0;
    this.queue = [];
  }

  update(dt) {
    // Leveling system is event-driven, no per-frame updates needed
    // This method exists for consistency with other systems
  }
}

// ============================================================
// PHASE 12: RENDERING
// ============================================================

// --- Renderer ---
// Canvas 2D rendering
// ─── ASSET MANAGER ─── Preloads SVGs as Image objects
// ASSET_MAP moved to data/assetMap.js (loaded via <script> tag before this one)


async function preloadAssets(onProgress) {
  const cache = {};
  const entries = Object.entries(ASSET_MAP);
  let loaded = 0;
  for (const [key, path] of entries) {
    const img = new Image();
    img.src = path;
    cache[key] = img;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    loaded++;
    if (onProgress) onProgress(loaded / entries.length);
  }
  return cache;
}

// ============================================================
// TELEGRAPH SYSTEM
// Data-driven attack warnings and environmental hazard telegraphs
// ============================================================
