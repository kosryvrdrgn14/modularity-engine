// ============================================================
// TOWN SCREEN — Orchestrator (Engine + Content)
// ============================================================

class TownScreen {
  constructor({ audioManager, gameManager, eventBus, dataManager, companionSystem, estateSystem, affectionSystem, farmingSystem, disasterSystem, sandboxSystem, startGame, getPendingDisaster, clearPendingDisaster }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.startGame = startGame;

    // Create LocationManager
    this.locationManager = new LocationManager(gameManager);
    
    // Create ShopSystem (new data-driven version)
    this.shopSystem = new ShopSystem({ gameManager, eventBus, audioManager });

    // Create Engine
    this.engine = new TownEngine({
      audioManager,
      onTabSwitch: (tab) => this._handleTabSwitch(tab),
      onLocationSelect: (loc) => this._handleLocationSelect(loc),
      onBack: () => this._handleBack(),
      onCombat: () => this._handleCombat(),
      onSandbox: () => this.shopSystem.openSandbox(this.content.sandboxSystem),
    });
    this.engine.setLocationManager(this.locationManager);

    // Create Content
    this.content = new TownContent({
      audioManager,
      gameManager,
      eventBus,
      companionSystem,
      estateSystem,
      affectionSystem,
      farmingSystem,
      disasterSystem,
      sandboxSystem,
      locationManager: this.locationManager,
      shopSystem: this.shopSystem,
      getPendingDisaster,
      clearPendingDisaster,
    });
    this.content.setEngine(this.engine);

    // Wire content renderer to engine
    this.engine.setContentRenderer(this.content);

    // Wire location navigation callback
    this.locationManager.onNavigate = (loc) => {
      this.engine._onLocationNavigate(loc);
      this.content.renderFarmingSlotsButton();
      this.content.renderCompanionSlots();
      this.content.updateDisplay();
    };
  }

  show(runStats) {
    this.content._lastRunStats = runStats;
    this.engine.show();
    this.content.updateDisplay();
    this.content.renderFarmingSlotsButton();
    this.content.renderCompanionSlots();
    this.content.renderCompanionSlots();
  }

  hide() {
    this.engine.hide();
    if (this.content.dom.dialogueOverlay) {
      this.content.dom.dialogueOverlay.classList.remove('active');
    }
    if (this.content._dogDialogue) {
      this.content._dogDialogue.classList.remove('active');
    }
    if (this.content._notifEl) {
      this.content._notifEl.classList.remove('active');
    }
  }

  _handleTabSwitch(tab) {
    if (tab === 'shop') {
      this.shopSystem.openShop();
    }
    // Other tabs handled by engine
  }

  _handleLocationSelect(loc) {
    // Handled by engine
  }

  _handleBack() {
    this.content.updateDisplay();
    this.engine.renderBreadcrumb();
    this.engine.renderLocationCards();
  }

  _handleCombat() {
    this.hide();
    this.startGame();
  }
}
