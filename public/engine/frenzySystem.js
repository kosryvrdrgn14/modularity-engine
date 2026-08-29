class FrenzySystem {
  constructor(gameManager, starSystem) {
    this.gameManager = gameManager;
    this.starSystem = starSystem;
  }

  isUnlocked(stageId) {
    const best = this.gameManager.get('persistent.combat.best_run');
    if (!best || best.stageId !== stageId) return false;
    return best.stars && best.stars.three;
  }

  getModifiers() {
    return {
      enemyHpMultiplier: 0.7,
      goldMultiplier: 1.5,
      xpMultiplier: 1.2,
      rareDropBonus: 0.1,
    };
  }
}

// ============================================================
// GACHA PROTECTION — Per-stage-clear rare drop ramp
// ============================================================
