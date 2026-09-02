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
