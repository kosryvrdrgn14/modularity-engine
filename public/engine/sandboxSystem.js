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
