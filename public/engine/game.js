class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Core systems
    this.eventBus = new EventBus();
    this.dataManager = new DataManager();
    this.gameState = new GameState(this.eventBus);

    // Game systems
    this.camera = new Camera(this.canvas);
    this.inputManager = new InputManager(this.canvas, this.eventBus);
    this.inputManager._game = this;
    this.entityManager = new EntityManager();
    this.spawnSystem = new SpawnSystem(this.entityManager, this.dataManager, this.eventBus);
    this.movementSystem = new MovementSystem(this.entityManager, this.inputManager);
    this.collisionSystem = new CollisionSystem(this.entityManager, this.eventBus);
    this.weaponSystem = new WeaponSystem(this.entityManager, this.dataManager, this.eventBus);
    this.renderer = new Renderer(this.canvas, this.camera);
    this.damageSystem = new DamageSystem(this.entityManager, this.eventBus, this.renderer);
    this.pickupSystem = new PickupSystem(this.entityManager, this.dataManager, this.eventBus);
    this.levelingSystem = new LevelingSystem(this.entityManager, this.dataManager, this.eventBus);
    this.uiManager = new UIManager(this.canvas, this.eventBus);
    this.audioManager = new AudioManager(this.eventBus);
    this.telegraphSystem = new TelegraphSystem(this.entityManager, this.eventBus);
    this.companionSystem = new CompanionSystem(this.entityManager, this.eventBus);
    this.gameManager = new GameManager(this.eventBus);
    this.gameManager.init();
    this.starSystem = new StarSystem(this.gameManager);
    this.frenzySystem = new FrenzySystem(this.gameManager, this.starSystem);
    this._queuedBossIntro = null;
    this.introOverlay = null;
    this.announcements = [];
    this._announcementTriggered = {};
    this.floatingTextSystem = new FloatingTextSystem(this.eventBus);

    // Game loop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (interp) => this.render(interp)
    );

    this.gameTime = 0;
    this.player = null;
    this._sessionDamageTaken = 0;
    this._sessionPickupsCollected = 0;
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
  }

  async init() {
    const loadingFill = document.getElementById('loading-fill');
    const loadingStatus = document.getElementById('loading-status');
    const loadingScreen = document.getElementById('loading-screen');

    // Load data
    await this.dataManager.loadAll((progress, status) => {
      loadingFill.style.width = `${progress * 100}%`;
      loadingStatus.textContent = status;
    });

    // Preload SVG assets
    this.renderer.imageCache = await preloadAssets((p) => {
      loadingFill.style.width = `${p * 100}%`;
      loadingStatus.textContent = `Loading assets... ${Math.round(p * 100)}%`;
    });

    // Init systems
    this.damageSystem.init();
    this.pickupSystem.init();
    this.levelingSystem.init();
    this.pickupSystem.setGameManager(this.gameManager);
    this.audioManager.init();

    // E1: Farming System (auto-clear)
    this.farmingSystem = new FarmingSystem(this.gameManager, this.eventBus);

    // E2-E4: Progression systems
    this.affectionSystem = new AffectionSystem(this.gameManager);
    this.estateSystem = new EstateSystem(this.gameManager);
    this.childrenSystem = new ChildrenSystem(this.gameManager);

    // F1: Sandbox System
    this.sandboxSystem = new SandboxSystem(this.gameManager, this.eventBus);

    // D5: Disaster System (used in _handleGameOver)
    this.disasterSystem = new DisasterSystem(this.gameManager, this.eventBus);



    // Connect telegraph system to renderer
    this.renderer._telegraphSystem = this.telegraphSystem;
    this.movementSystem.telegraphSystem = this.telegraphSystem;

    // Setup event listeners

    // Companion events
    this.eventBus.on('companionLootCollect', (data) => {
      // Collect pickup and deliver to player (same as player pickup)
      if (data.pickup && data.pickup.active && data.player) {
        this.eventBus.emit('pickup', { player: data.player, pickup: data.pickup });
        this.entityManager.destroy(data.pickup);
      }
    });

    this.eventBus.on('companionGrowl', (data) => {
      // Play dog growl sound
      this.audioManager._playCompanionGrowl();
    });

    this.eventBus.on('companionSpawn', (data) => {
      this.audioManager._playCompanionBark();
    });

    // Level sync: when W1 upgrades, update Dog's stats
    this.eventBus.on('weaponLevelUp', (data) => {
      // C1: Refresh companion weapon buffs when weapon levels up
      if (this.companionSystem) this.companionSystem.refreshWeaponBuffs();
      if (data.weaponId === 'w1_projectile') {
        this.companionSystem.setLevel('dog', data.newLevel);
      }
    });

    // Boss intro: reset companion state
    this.eventBus.on('bossIntro', () => {
      this.companionSystem.onBossIntro();
    });
    this._setupEvents();

    // Hide loading screen
    loadingScreen.style.display = 'none';

    // Initialize title BGM and menu
    this.titleBGM = new TitleBGM(this.audioManager.ctx, this.audioManager.musicGain);
    this.titleBGM.init();
    this.titleMenu = new TitleMenu(this);
    this.townScreen = new TownScreen(this);

    // Show title screen (audio unlocks on first user gesture)
    this.gameState.setState('title');
    this.titleMenu.show();
    this.titleBGM.fadeIn(1.5);
  }

  _setupEvents() {
    // DEBUG: Press B to spawn boss immediately
    this.eventBus.on('skipToBoss', () => {
      console.log('[SKIP] state=' + this.gameState.state);
      if (this.gameState.isPlaying() && window.skipToBoss) {
        window.skipToBoss();
      }
    });

    this.eventBus.on('pause', (data) => {
      if (this.gameState.isPlaying()) {
        this.gameState.setState('paused');
        this.gameLoop.paused = true;
        this.inputManager._isPaused = true;
      } else if (this.gameState.isPaused()) {
        this.gameState.setState('playing');
        this.gameLoop.paused = false;
        this.inputManager._isPaused = false;
        this.audioManager.duckForLevelUp(false);
      }
    });

    this.eventBus.on('levelUp', (data) => {
      this._checkWeaponUnlocks();
      
      // Consume the queue entry that triggered this event. Without this,
      // the entry stays in the queue and selectUpgrade() sees it as a
      // still-pending level-up, opening a second upgrade screen.
      if (this.levelingSystem.hasPendingLevelUp()) {
        this.levelingSystem.consumeLevelUp();
      }
      
      this.gameState.setState('levelUp');
      this.gameLoop.paused = true;
      this.inputManager._isPaused = true;
      this.audioManager.duckForLevelUp(true);
      this._showUpgradeOptions();
    });

    this._isSelectingUpgrade = false;
    this.eventBus.on('selectUpgrade', (data) => {
      if (!this.gameState.isLevelUp()) return;
      if (this._isSelectingUpgrade) return;
      if (!this.uiManager.levelUpOptions) return;
      this._isSelectingUpgrade = true;
      const index = data.index;
      if (index < 0 || index >= this.uiManager.levelUpOptions.length) return;
      const option = this.uiManager.levelUpOptions[index];
      if (option && option.apply) option.apply(this);
      this.uiManager.hideLevelUp();
      if (this.levelingSystem.hasPendingLevelUp()) {
        this.levelingSystem.consumeLevelUp();
        this._isSelectingUpgrade = false;
        this._showUpgradeOptions();
      } else {
        this._isSelectingUpgrade = false;
        this.gameState.setState('playing');
        this.gameLoop.paused = false;
        this.inputManager._isPaused = false;
        this.audioManager.duckForLevelUp(false);
      }
    });

    this.eventBus.on('damage', (data) => {
      // F1: Track sandbox DPS
      if (this.sandboxSystem?.isActive && data.entity !== this.player) {
        this.sandboxSystem.recordDamage(data.amount || 1);
      }
      if (data.entity === this.player) this._sessionDamageTaken = (this._sessionDamageTaken || 0) + (data.amount || 1);
      if (data.entity === this.player && data.entity.hp <= 0) {
        this.gameState.triggerGameOver('defeat', this._getStats());
        this._handleGameOver();
        this.audioManager.stopOrbitHum();
      }
    });

    this.eventBus.on('death', (data) => {
      // F1: Track sandbox kills
      if (this.sandboxSystem?.isActive && data.type !== 'player') {
        this.sandboxSystem.recordKill();
      }
      // GAP 5 FIX: Skip boss deaths here — handled by bossDeath event
      if (data.type === 'boss_gravekeeper') return;
      if (data.entity === this.player) {
        this.gameState.triggerGameOver('defeat', this._getStats());
        this._handleGameOver();
        this.audioManager.stopOrbitHum();
      }
    });

    this.eventBus.on('bossSpawn', (data) => {
      this.renderer.bossEntity = data.boss;
      // Check if boss has intro config
      const bossData = this.dataManager.enemies.find(e => e.type === 'boss');
      if (bossData && bossData.intro) {
        this.startBossIntro(bossData.intro);
      } else {
        this.camera.shake(8, 0.5);
      }
    });

    this.eventBus.on('bossDeath', (data) => {
      this.gameState.triggerGameOver('victory', this._getStats());
      this._handleGameOver();
    });

    this.eventBus.on('pickup', (data) => {
      this._sessionPickupsCollected = (this._sessionPickupsCollected || 0) + 1;
      if (data.pickup.pickupData?.id === 'magnet') {
        this.eventBus.emit('magnetActivate', { player: data.player });
      }
      
      // Weapon Level-Up pickup: upgrade lowest-level active weapon
      if (data.pickup.pickupData?.id === 'pickup_weapon_level_up') {
        this._applyWeaponLevelUp();
      }
    });

    this.eventBus.on('restart', () => {
      this.startGame();
    });
  }

  startGame() {
    this.gameState.reset();
    this.renderer.bossEntity = null;
    this.telegraphSystem.clearAll();
    if (this.gameManager) {
      this.gameManager.store.persistent.town.resources.gold = 0;
      this.gameManager.store.counters.total_runs++;
    }
    this.introOverlay = null;
    this._announcementTriggered = {};
    this.renderer._announcements = [];
    this.renderer._dimOverlay = null;
    this.entityManager.clearAll();
    this.pickupSystem.reset();
    this.levelingSystem.reset();
    this.weaponSystem.reset();

    // Select stage by ID from session, fallback to first available
    const selectedStageId = this.gameManager.get('session.selected_stage_id');
    if (selectedStageId && this.dataManager._allStages) {
      this.dataManager.selectStage(selectedStageId);
    }

    // B1: Player loadout — weapons are what the player chose, not the stage's
    const stageTier = this.gameManager.get('session.current_stage_tier') || 'standard';
    const stageData = this.dataManager.stages;
    const tierConfig = stageData?.tierConfig?.[stageTier];
    // Loadout comes exclusively from player selection (stored in session)
    const devWeapons = this.gameManager.get('session.dev_weapons');
    if (devWeapons && devWeapons.length > 0) {
      this._activeWeapons = devWeapons.filter(Boolean);
    } else {
      // Fallback: use stage-recommended weapons if player hasn't chosen
      this._activeWeapons = tierConfig?.recommendedWeapons || ['w1_projectile', 'w2_orbit', 'weapon_area_pulse'];
    }
    for (const wid of this._activeWeapons) {
      this.weaponSystem.unlockWeapon(wid);
    }

    // B3: Apply tier multipliers to spawn system
    const tierMults = stageData?.tierMultipliers?.[stageTier];
    if (this.spawnSystem) {
      this.spawnSystem._tierHpMult = tierMults?.hp || 1.0;
      this.spawnSystem._tierGoldMult = tierMults?.gold || 1.0;
      this.spawnSystem._tierXpMult = tierMults?.xp || 1.0;
      this.spawnSystem._tierSpawnRateMult = tierMults?.spawnRate || 1.0;
    }
    // Dynamic boss spawn time from stage data (duration - 60s for boss fight)
    const stageDuration = tierConfig?.duration || 300;
    const bossSpawnTime = stageDuration - 60; // Boss spawns 60s before end
    this._bossSpawnTime = bossSpawnTime;
    this.spawnSystem.reset(bossSpawnTime);
    this.companionSystem.companions = [];
    this.gameTime = 0;

    // Create player
    const charData = this.dataManager.characters;
    this.player = this.entityManager.create('player', {
      x: 0,
      y: 0,
      hp: charData.stats.maxHealth,
      maxHp: charData.stats.maxHealth,
      speed: charData.stats.moveSpeed,
      stats: charData.stats,
      size: charData.hitbox.width / 2,
      visual: charData.visual,
      damageMultiplier: 1,
    });

    this.weaponSystem.init(this.player);

    // Spawn companions from GameManager (or dev override)
    const devCompanions = this.gameManager.get('session.dev_companions');
    let companionIds = (devCompanions && devCompanions.some(Boolean))
      ? devCompanions.filter(Boolean)
      : this.gameManager.get_companions();
    if (companionIds && companionIds.length > 0) {
      this.companionSystem.init(companionIds, this.player, this.weaponSystem);
      // C2: Mark companions as deployed in combat
      for (const id of companionIds) {
        this.gameManager.deployCompanion(id);
      }
    }

    // GAP 4 FIX: Pass player reference to AudioManager for distance calculations
    this.audioManager.setPlayer(this.player);
    this.gameState.setState('playing');
    this.gameLoop.paused = false;
    this.gameLoop.start();
  }

  update(dt) {
    // Boss intro state: only update intro timer
    if (this.gameState.isBossIntro()) {
      this._updateBossIntro(dt);
      return;
    }
    if (!this.gameState.isPlaying()) return;
    // Guard: prevent updates after game over
    if (this.gameState.isGameOver()) return;

    this.gameTime += dt;

    // Check pre-boss announcements
    this._updateAnnouncements();

    // Run all systems in order
    this.telegraphSystem.update(dt);
    this.movementSystem.update(dt);
    this.companionSystem.update(dt, this.player, this.entityManager.getActive('enemy'));

    // E1: Update farming system (background completion)
    if (this.farmingSystem) this.farmingSystem.update(dt);

    // F1: Update sandbox DPS timer
    if (this.sandboxSystem?.isActive) this.sandboxSystem.updateTimer(dt);
    this.weaponSystem.update(dt);
    this.collisionSystem.update();
    this.damageSystem.update(dt);
    this.entityManager.cleanup();
    this.spawnSystem.update(dt);
    this.pickupSystem.update(dt);
    this.levelingSystem.update(dt);

    // GAP 2+3 FIX: Detect boss state transitions for audio events
    this._detectBossStateChanges();

    // Update camera
    if (this.player) {
      this.camera.follow(this.player);
    }
    this.camera.update(dt);

    // Check game over conditions
    if (this.gameTime >= 300) {
      this.gameState.triggerGameOver('survived', this._getStats());
      this._handleGameOver();
    }
  }

  _updateBossIntro(dt) {
    if (!this.introOverlay) return;
    this.introOverlay.elapsed += dt;

    // Camera shake during intro
    if (this.introOverlay.elapsed >= 1.0 && this.introOverlay.elapsed < 1.1) {
      this.camera.shake(10, 0.3);
    }

    // Skip on tap/click if allowed
    if (this.introOverlay.allowSkip && this.introOverlay.elapsed > 0.5) {
      if (this._skipIntroQueued) {
        this._skipIntroQueued = false;
    this._introClickX = undefined;
    this._introClickY = undefined;
        this._endBossIntro();
        return;
      }
      // Also check click position (skip button area)
      if (this._introClickX !== undefined) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (this._introClickX > w/2 - 60 && this._introClickX < w/2 + 60 &&
            this._introClickY > h - 50 && this._introClickY < h - 20) {
          this._introClickX = undefined;
          this._endBossIntro();
          return;
        }
        this._introClickX = undefined;
      }
    }

    if (this.introOverlay.elapsed >= this.introOverlay.totalDuration) {
      this._endBossIntro();
    }
  }

  _endBossIntro() {
    this.introOverlay = null;
    this.gameState.setState('playing');
    this.gameLoop.paused = false;
    this.inputManager._isPaused = false;
    if (this._introClickHandler) {
      this.canvas.removeEventListener('click', this._introClickHandler);
      this._introClickHandler = null;
    }
    // Start boss AI
    if (this.renderer.bossEntity) {
      this.renderer.bossEntity._bossState = 'chase';
      this.renderer.bossEntity._stateTimer = 3;
    }
    this.eventBus.emit('bossIntroComplete');
  }

  _updateAnnouncements() {
    const stageData = this.dataManager.stages;
    if (!stageData || !stageData.bossConfig || !stageData.bossConfig.announcement) return;
    // Announcements are defined relative to boss spawn time in the data
    // e.g. time: 230 means 10s before boss spawn at 240. We offset dynamically.
    const bossBase = 240; // Reference time the data was designed for (standard 5min)
    const bossActual = this._bossSpawnTime || 240;
    const offset = bossActual - bossBase;
    
    for (const ann of stageData.bossConfig.announcement) {
      const adjustedTime = ann.time + offset;
      if (this._announcementTriggered[adjustedTime]) continue;
      if (this.gameTime >= adjustedTime) {
        this._announcementTriggered[adjustedTime] = true;
        if (ann.type === 'text' || ann.type === 'boss_name') {
          this.renderer.showAnnouncement(ann.text, ann.styling || {});
        }
        if (ann.type === 'dim') {
          this.renderer.startDimming(ann.brightness || 0.8);
        }
      }
    }
  }

  startBossIntro(introConfig) {
    // Queue if currently in level-up
    if (this.gameState.isLevelUp()) {
      this._queuedBossIntro = introConfig;
      return;
    }
    this.gameState.setState('bossIntro');
    this.gameLoop.paused = true;
    this.inputManager._isPaused = true;
    this.introOverlay = {
      bossName: introConfig.bossName || '???',
      bossSubtitle: introConfig.bossSubtitle || '',
      totalDuration: introConfig.totalDuration || 3.5,
      elapsed: 0,
      allowSkip: introConfig.allowSkip !== false,
      dimColor: introConfig.dimColor || 'rgba(0, 0, 0, 0.75)',
      nameColor: introConfig.nameColor || '#FF4444',
      subtitleColor: introConfig.subtitleColor || '#888888',
      nameFontSize: introConfig.nameFontSize || 40,
      subtitleFontSize: introConfig.subtitleFontSize || 18,
    };
    this._skipIntroQueued = false;
    this.audioManager.eventBus.emit('bossIntro', introConfig);
    // Click/tap to skip intro
    this._introClickHandler = (e) => {
      if (this.gameState.isBossIntro()) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this._introClickX = (e.clientX - rect.left) * scaleX;
        this._introClickY = (e.clientY - rect.top) * scaleY;
      }
    };
    this.canvas.addEventListener('click', this._introClickHandler, { once: false });
  }

  _applyWeaponLevelUp() {
    const weaponIds = this._activeWeapons || ['w1_projectile', 'w2_orbit', 'weapon_area_pulse'];
    // Find the lowest-level active weapon (prioritize upgrading what's unlocked)
    let bestWeapon = null;
    let bestLevel = Infinity;
    for (const wid of weaponIds) {
      const level = this.weaponSystem.weaponLevels[wid] || 0;
      if (level > 0 && level < bestLevel) {
        bestLevel = level;
        bestWeapon = wid;
      }
    }
    if (bestWeapon) {
      this.weaponSystem.levelUp(bestWeapon);
    }
  }

  // GAP 2+3 FIX: Detect boss state transitions and emit events for AudioManager
  _detectBossStateChanges() {
    if (!this.renderer.bossEntity) return;
    const boss = this.renderer.bossEntity;
    if (!boss || boss.hp <= 0) return;
    
    const prevState = boss._prevAudioState || '';
    const currState = boss._bossState || '';
    
    if (prevState !== currState) {
      boss._prevAudioState = currState;
      
      // Windup = telegraph before charge — play warning growl
      if (currState === 'windup') {
        this.eventBus.emit('bossCharge', { boss, phase: 'windup' });
      }
      // Charge = actual rush — play impact sound
      if (currState === 'charge') {
        this.eventBus.emit('bossCharge', { boss, phase: 'charge' });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // TITLE SCREEN INTEGRATION
  // ═══════════════════════════════════════════════

  _testTown() {
    // Debug: go directly to town with 100 gold
    this.titleMenu.hide();
    this.titleBGM.stop();
    this.audioManager.resume();
    if (this.gameManager) {
      this.gameManager.add_currency(100, 'debug');
      this.gameManager.set('persistent.town.phase', 1);
      this.gameManager.set_flag('town_camp_upgraded', false);
      NPC_DATA.cute_girl.unlocked = false;
    }
    this.gameState.setState('town');
    this.townScreen.show({ time: '4:32', level: 8, kills: 20, gold: 100 });
  }

  _startFromTitle() {
    this.titleMenu.hide();
    this.titleBGM.fadeOut(1.5);
    // Resume audio context (browser unlock)
    this.audioManager.resume();
    // Start game after title BGM fades
    setTimeout(() => {
      this.titleBGM.stop();
      this.startGame();
    }, 1500);
  }

  _showSettings() {
    const screen = document.getElementById('settings-screen');
    screen.classList.add('active');
    // Wire sliders
    const sfxSlider = document.getElementById('sfx-slider');
    const musicSlider = document.getElementById('music-slider');
    const sfxVal = document.getElementById('sfx-val');
    const musicVal = document.getElementById('music-val');
    
    // Set initial values
    sfxSlider.value = Math.round((this.audioManager.sfxGain?.gain?.value || 0.85) / 0.85 * 100);
    sfxVal.textContent = sfxSlider.value + '%';
    musicSlider.value = Math.round((this.audioManager.musicGain?.gain?.value || 0.4) / 0.4 * 100);
    musicVal.textContent = musicSlider.value + '%';

    sfxSlider.oninput = () => {
      const v = parseInt(sfxSlider.value);
      sfxVal.textContent = v + '%';
      if (this.audioManager.sfxGain) {
        this.audioManager.sfxGain.gain.value = (v / 100) * 0.85;
      }
      this.audioManager.playMenuSound('slider');
    };
    musicSlider.oninput = () => {
      const v = parseInt(musicSlider.value);
      musicVal.textContent = v + '%';
      if (this.titleBGM && this.titleBGM.gainNode) {
        this.titleBGM.gainNode.gain.value = (v / 100) * 0.4;
      }
      this.audioManager.playMenuSound('slider');
    };

    // Back button
    const backBtn = document.getElementById('settings-back');
    backBtn.onclick = () => {
      this.audioManager.playMenuSound('back');
      screen.classList.remove('active');
    };

    // Reset progress
    const resetBtn = document.getElementById('reset-progress');
    resetBtn.onclick = () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        if (this.gameManager) {
          this.gameManager.backend.remove('modularity_engine_save');
          this.gameManager.store = this.gameManager._createDefault();
          this.titleMenu._updateInfo();
          this.audioManager.playMenuSound('select');
        }
      }
    };

    // Escape to go back
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.audioManager.playMenuSound('back');
        screen.classList.remove('active');
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  _returnToTitle() {
    // Show title screen again after game over
    this.gameState.setState('title');
    this.titleMenu.show();
    this.titleBGM.fadeIn(1.5);
  }

  _handleGameOver() {
    // C2: Recall all companions from combat
    if (this.gameManager) {
      const companions = this.gameManager.get_companions();
      for (const id of companions) {
        this.gameManager.recallCompanion(id);
      }
    }
    // E4: Grow children after each run
    if (this.childrenSystem) this.childrenSystem.growChildren();
    // D5: Check for disaster event
    if (this.disasterSystem) {
      const runs = this.gameManager.get('counters.total_runs') || 0;
      const disaster = this.disasterSystem.checkForDisaster(runs);
      if (disaster) {
        this._pendingDisaster = disaster;
      }
    }
    // Pause the game loop
    this.gameLoop.paused = true;
    this.inputManager._isPaused = true;
    
    // Build and submit combat result
    const stats = this.gameState.endStats || this._getStats();
    const result = this.gameState.endResult || 'defeat';
    if (this.gameManager) {
      const combatResult = this.gameManager._buildResult({
        stageId: 'stage_graveyard',
        stage_completed: result === 'victory',
        time_survived: this.gameTime,
        player_level: this.levelingSystem.level,
        kills: this.entityManager.getCount('enemy'),
        gold_earned: this.gameManager.get_resource('gold'),
        xp_earned: this.levelingSystem.xp,
        boss_defeated: result === 'victory',
        weapons_used: Object.keys(this.weaponSystem.weaponLevels).filter(k => this.weaponSystem.weaponLevels[k] > 0),
        weapon_levels_end: { ...this.weaponSystem.weaponLevels },
        damage_taken: this._sessionDamageTaken || 0,
        companions_used: this.companionSystem ? this.companionSystem.getActiveCount() : 0,
        pickups_collected: this._sessionPickupsCollected || 0,
      });
      // Evaluate stars before saving
      if (this.starSystem) {
        combatResult.stars = this.starSystem.evaluate(combatResult);
      }
      // Gacha protection: roll for rare drops per-item, reset on drop
      if (combatResult.stage_completed) {
        const rareDropItems = [
          { id: 'pickup_weapon_level_up', name: 'Weapon Level-Up' },
          { id: 'screen_wipe', name: 'Screen Wipe' },
        ];
        combatResult.rareDrops = [];
        for (const item of rareDropItems) {
          const clearsWithout = this.gameManager.getGachaCount(item.id);
          const roll = GachaProtection.rollForDrop(clearsWithout);
          if (roll.dropped) {
            // Drop acquired — reset counter
            this.gameManager.resetGachaCount(item.id);
            combatResult.rareDrops.push({ id: item.id, name: item.name, chance: roll.chance });
          } else {
            // No drop — increment counter (next clear = higher chance)
            this.gameManager.incrementGachaCount(item.id);
          }
        }
        // Also increment stage clear counter for tracking
        this.gameManager.incrementClearCount(combatResult.stageId);
      }
      this.gameManager.end_session(combatResult);
      // Merge stars into stats for UI display
      if (combatResult.stars) stats.stars = combatResult.stars;
      // E1: Unlock farming slot 3 on 3★ clear
      if (combatResult.stars?.three && this.gameManager) {
        const slots = this.gameManager.store.farming?.slots;
        if (slots && slots[2]?.status === 'locked') {
          slots[2].status = 'idle';
          this.gameManager._dirty = true;
        }
      }
      // B4: Check if frenzy is unlocked
      if (this.frenzySystem && combatResult.stars?.three) {
        stats.frenzyUnlocked = true;
        stats.frenzyAvailable = this.frenzySystem.isUnlocked(combatResult.stageId);
      }
    }
    
    // Show end screen with result and stats
    this.uiManager.showEndScreen(result, stats);
    
    // Wire "Return to Title" — after 2 seconds, show a button or auto-transition
    this._gameOverReturnTimer = setTimeout(() => {
      this._showGameOverReturnOption();
    }, 1500);
  }

  _showGameOverReturnOption() {
    // Transition to town screen after a brief delay
    const stats = this._getStats();
    this.gameState.setState('town');
    this.townScreen.show(stats);
  }

  render(interp) {
    // Tick boss intro timer even when game loop is paused
    if (this.gameState.isBossIntro() && this.introOverlay) {
      const now = performance.now();
      if (!this._lastIntroTick) this._lastIntroTick = now;
      const dt = (now - this._lastIntroTick) / 1000;
      this._lastIntroTick = now;
      this._updateBossIntro(Math.min(dt, 0.1));
    } else {
      this._lastIntroTick = null;
    }

    const entities = this.entityManager.getActive();
    
    // Always render the game world (even during intro, as a frozen frame)
    this.renderer.render(entities, this.player);
    // Render companions on top of entities
    this.companionSystem.render(this.renderer.ctx, this.camera);
    
    // Boss intro overlay
    if (this.gameState.isBossIntro() && this.introOverlay) {
      this.renderer._drawBossIntro(this.introOverlay);
    }
    
    // Announcements (rendered on top of everything)
    this.renderer.renderAnnouncements(1/60);
    this.renderer._drawAnnouncements();

    // Update renderer UI data
    if (this.player) {
      this.renderer.level = this.levelingSystem.level;
      this.renderer.xpPercent = this.levelingSystem.xp / this.levelingSystem._getXpToNext(this.levelingSystem.level);
    }

    // Floating damage/pickup text
    this.floatingTextSystem.update(1/60);
    const ctx = this.renderer.ctx;
    ctx.save();
    this.camera.apply(ctx);
    this.floatingTextSystem.draw(ctx);
    ctx.restore();

    // F1: Sandbox DPS overlay
    if (this.sandboxSystem?.isActive && this.sandboxSystem.config.showDps) {
      const ctx2 = this.renderer.ctx;
      const dps = this.sandboxSystem.getDps();
      const stats = this.sandboxSystem.getStats();
      ctx2.save();
      ctx2.fillStyle = 'rgba(0,0,0,0.6)';
      ctx2.fillRect(10, 80, 160, 60);
      ctx2.fillStyle = '#FFD700';
      ctx2.font = 'bold 14px monospace';
      ctx2.textAlign = 'left';
      ctx2.fillText(`DPS: ${dps}`, 16, 100);
      ctx2.fillStyle = '#CCC';
      ctx2.font = '11px monospace';
      ctx2.fillText(`Total: ${stats.totalDamage}`, 16, 118);
      ctx2.fillText(`Kills: ${stats.totalKills}  Time: ${stats.time}s`, 16, 134);
      ctx2.restore();
    }

    // Always render UI (includes end screen overlay when game over)
    this.uiManager.render();
  }

  _checkWeaponUnlocks() {
    const level = this.levelingSystem.level;
    const weapons = this.dataManager.weapons;
    if (!weapons || !Array.isArray(weapons)) return;
    for (const weapon of weapons) {
      // Only unlock weapons that are active in this run (stage loadout + dev picks)
      if (!this._activeWeapons?.includes(weapon.id)) continue;
      if (weapon.unlockLevel && level >= weapon.unlockLevel) {
        if (!this.weaponSystem.weaponLevels[weapon.id]) {
            this.weaponSystem.unlockWeapon(weapon.id);
          this.eventBus.emit('weaponUnlock', { weaponId: weapon.id, name: weapon.name });
        }
      }
    }
  }

  _showUpgradeOptions() {
    if (this.gameState.isLevelUp() && this.uiManager.levelUpOptions) return;
  
    // Build upgrade pool: stat upgrades + weapon upgrades for ACTIVE weapons only
    const upgrades = [
      {
        name: 'Damage Up',
        desc: '+15% base damage',
        apply: (g) => {
          if (g.player) {
            if (!g.player.damageMultiplier) g.player.damageMultiplier = 1;
            g.player.damageMultiplier *= 1.15;
          }
        },
      },
      {
        name: 'Speed Up',
        desc: '+10% move speed',
        apply: (g) => {
          if (g.player) {
            if (!g.player.speedMultiplier) g.player.speedMultiplier = 1;
            g.player.speedMultiplier *= 1.10;
            g.player.speed = (g.player.stats?.moveSpeed || 200) * g.player.speedMultiplier;
          }
        },
      },
      {
        name: 'Health Up',
        desc: '+20 max HP & heal',
        apply: (g) => {
          if (g.player) {
            g.player.maxHp += 20;
            g.player.hp = Math.min(g.player.hp + 20, g.player.maxHp);
          }
        },
      },
    ];

    // Add weapon upgrades for ALL active weapons (stage loadout + dev picks)
    const activeWeaponIds = this._activeWeapons || Object.keys(this.weaponSystem.weaponLevels).filter(wid => this.weaponSystem.weaponLevels[wid] > 0);
    const weaponNames = {
      w1_projectile: 'Projectile', w2_orbit: 'Orbit', weapon_area_pulse: 'Area',
      w4_flame_wave: 'Flame Wave', w5_arcane_bolt: 'Arcane Bolt',
      w6_shadow_dagger: 'Dagger', w7_soul_whip: 'Whip', w8_grave_claymore: 'Claymore',
    };
    for (const wid of activeWeaponIds) {
      const wLevel = this.weaponSystem.weaponLevels[wid] || 0;
      if (wLevel > 0 && wLevel < 7) {
        const wData = this.dataManager.weapons?.find(w => w.id === wid);
        const nextStats = wData?.statsPerLevel?.[wLevel];
        const desc = nextStats ? `Lv ${wLevel} \u2192 ${wLevel + 1}` : `Upgrade ${weaponNames[wid] || wid}`;
        upgrades.push({
          name: `${weaponNames[wid] || wid} Up`,
          desc: desc,
          apply: (g) => {
            g.weaponSystem.levelUp(wid);
          },
        });
      }
    }

    // Shuffle and pick 3
    for (let i = upgrades.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [upgrades[i], upgrades[j]] = [upgrades[j], upgrades[i]];
    }
    this.uiManager.showLevelUp(upgrades.slice(0, 3));
  }

  _getStats() {
    return {
      time: `${Math.floor(this.gameTime / 60)}:${String(Math.floor(this.gameTime % 60)).padStart(2, '0')}`,
      level: this.levelingSystem.level,
      kills: this.entityManager.getCount('enemy'),
      gold: this.gameManager ? this.gameManager.get_resource('gold') : 0,
    };
  }
}
