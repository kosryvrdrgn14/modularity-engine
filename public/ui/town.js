// ============================================================
// TOWN SCREEN — Orchestrator (Engine + Content)
// ============================================================

class TownScreen {
  constructor({ audioManager, gameManager, eventBus, dataManager, companionSystem, estateSystem, affectionSystem, farmingSystem, disasterSystem, sandboxSystem, startGame, getPendingDisaster, clearPendingDisaster, onExitToTitle }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.dataManager = dataManager;
    this.startGame = startGame;

    // Create LocationManager — pass dataManager for JSON content access
    this.locationManager = new LocationManager({ gameManager, dataManager });
    
    // Create LoadoutScreen (pre-combat weapon & companion selection)
    this.loadoutScreen = new LoadoutScreen({ gameManager, dataManager, audioManager });

    // Create ShopSystem (new data-driven version)
    this.shopSystem = new ShopSystem({ gameManager, eventBus, audioManager });

    // Create Engine
    this.engine = new TownEngine({
      audioManager,
      dataManager,
      gameManager,
      onCombat: () => this._handleCombat(),
    });
    this.engine.setLocationManager(this.locationManager);

    // Create Dock Menu
    this.dockMenu = new DockMenu({
      audioManager,
      onTabSwitch: (tab) => this._handleTabSwitch(tab),
    });
    this.engine.setDockMenu(this.dockMenu);

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
      onExitToTitle: onExitToTitle || null,
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

  setQuestSystem(questSystem) {
    this.content.setQuestSystem(questSystem);
    this.loadoutScreen.setQuestSystem(questSystem);
    // Region gate checks in locationManager (Story Mode)
    this.locationManager.questSystem = questSystem;
  }

  show(runStats) {
    // Empty object (Story Mode) means "no run just finished" — don't render undefined stats
    if (runStats && Object.keys(runStats).length > 0) {
      this.content._lastRunStats = runStats;
    } else {
      this.content._lastRunStats = null;
    }
    this.engine.show();
    this.content.updateDisplay();
    this.content.renderLeftPanel();
    this.content.renderRightPanel();
    this.content.renderFarmingSlotsButton();
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
    // Handle panel switching in engine
    this.engine.handleTabSwitch(tab);

    // Handle specific tabs (engine already handles combat hide + onCombat)
    if (tab === 'shop') {
      this.shopSystem.openShop();
    } else if (tab === 'social') {
      this.content.renderLeftPanel();
    } else if (tab === 'systems') {
      this.content.renderRightPanel();
    }
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
    // Set stage from current location before starting combat
    const curLoc = this.locationManager?.getCurrentLocation();
    if (curLoc?.stageId) {
      this.gameManager.set('session.selected_stage_id', curLoc.stageId);
    }
    // Tier is already set by battle card click in townEngine
    const tier = this.gameManager.get('session.current_stage_tier') || 'standard';

    // Show loadout screen instead of jumping straight to combat
    this.hide();
    this.loadoutScreen.show({
      stageId: curLoc?.stageId,
      stageTier: tier,
      onConfirm: ({ weapons, companions }) => {
        this.gameManager.set('session.loadout_weapons', weapons);
        this.gameManager.set('session.loadout_companions', companions);
        this.startGame();
      },
      onBack: () => {
        // Return to town screen
        this.show({});
      },
    });
  }
}
