class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventQueue = [];
    this.processing = false;
    this.maxNesting = 32;
    this.nestingDepth = 0;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(event, data) {
    // If already processing, queue for later (re-entrancy protection)
    if (this.processing) {
      if (this.nestingDepth < this.maxNesting) {
        this.eventQueue.push({ event, data });
      }
      return;
    }

    this.processing = true;
    this.nestingDepth = 0;
    this._dispatch(event, data);
    
    // Process queued events
    while (this.eventQueue.length > 0) {
      const queued = this.eventQueue.shift();
      this._dispatch(queued.event, queued.data);
    }
    
    this.processing = false;
  }

  _dispatch(event, data) {
    this.nestingDepth++;
    const list = this.listeners.get(event);
    if (list) {
      for (let i = 0; i < list.length; i++) {
        try {
          list[i](data);
        } catch (e) {
          console.error(`[EventBus] Listener ${i} for '${event}' threw:`, e);
        }
      }
    }
    this.nestingDepth--;
  }

  clear() {
    this.listeners.clear();
    this.eventQueue = [];
    this.processing = false;
    this.nestingDepth = 0;
  }
}

// --- DataManager ---
// Loads and validates JSON content files
class DataManager {
  constructor() {
    this.characters = null;
    this.weapons = null;
    this.enemies = null;
    this.stages = null;
    this.pickups = null;
    this.leveling = null;
  }

  async loadAll(onProgress) {
    const files = [
      { key: 'characters', path: 'content/characters.json' },
      { key: 'weapons', path: 'content/weapons.json' },
      { key: 'enemies', path: 'content/enemies.json' },
      { key: 'stages', path: 'content/stages.json' },
      { key: 'pickups', path: 'content/pickups.json' },
      { key: 'leveling', path: 'content/leveling.json' },
      { key: 'attackAreas', path: 'content/attackAreas.json' },
      { key: 'visuals', path: 'content/visuals.json' },
      { key: 'elements', path: 'content/elements.json' },
    ];

    const results = await Promise.all(
      files.map(async (file, idx) => {
        if (onProgress) onProgress(idx / files.length, `Loading ${file.key}...`);
        try {
          const response = await fetch(file.path);
          if (!response.ok) throw new Error(`Failed to load ${file.path}`);
          const data = await response.json();
          return { key: file.key, data, error: null };
        } catch (error) {
          console.warn(`Could not load ${file.path}, using embedded data`);
          return { key: file.key, data: null, error };
        }
      })
    );

    // Use embedded data as fallback
    for (const result of results) {
      if (result.data) {
        this[result.key] = result.data;
      } else {
        this[result.key] = this.getEmbeddedData(result.key);
      }
    }

    // Support stages as array - select by ID
    this._normalizeStages();

    if (onProgress) onProgress(1, 'Ready');
    return true;
  }

  _normalizeStages() {
    if (!this.stages) return;
    if (Array.isArray(this.stages)) {
      this._allStages = this.stages;
      this.selectStage(this.stages[0] && this.stages[0].id);
    } else {
      this._allStages = [this.stages];
    }
  }

  selectStage(stageId) {
    if (!this._allStages) return;
    if (stageId && this._allStages.find(s => s.id === stageId)) {
      this.stages = this._allStages.find(s => s.id === stageId);
    } else {
      this.stages = this._allStages[0];
    }
    return this.stages;
  }

  getStageList() {
    return this._allStages || (this.stages ? [this.stages] : []);
  }

  getEmbeddedData(key) {
    return EMBEDDED_DATA[key];
  }
}

// --- GameState ---
// State machine with validated transitions
class GameState {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.state = 'loading';
    this.previousState = null;
    this.endResult = null;
    this.endStats = null;

    // Valid transitions table
    this.transitions = {
      loading: ['menu', 'playing', 'title'],
      menu: ['playing', 'title'],
      title: ['playing'],
      playing: ['paused', 'levelUp', 'gameOver', 'bossIntro'],
      paused: ['playing'],
      levelUp: ['playing'],
      bossIntro: ['playing'],
      gameOver: ['endScreen'],
      endScreen: ['town', 'menu', 'playing'],
      town: ['combat', 'title', 'town'],
    };
  }

  canTransition(newState) {
    const allowed = this.transitions[this.state];
    return allowed && allowed.includes(newState);
  }

  setState(newState, data) {
    if (!this.canTransition(newState)) {
      console.warn(`Invalid transition: ${this.state} → ${newState}`);
      return false;
    }
    this.previousState = this.state;
    this.state = newState;
    this.eventBus.emit('stateChange', { from: this.previousState, to: newState, data });
    return true;
  }

  isPlaying() { return this.state === 'playing'; }
  isPaused() { return this.state === 'paused'; }
  isLevelUp() { return this.state === 'levelUp'; }
  isGameOver() { return this.state === 'gameOver'; }
  isEndScreen() { return this.state === 'endScreen'; }
  isTown() { return this.state === 'town'; }
  isBossIntro() { return this.state === 'bossIntro'; }

  triggerGameOver(result, stats) {
    // Prevent multiple triggers
    if (this.state === 'gameOver' || this.state === 'endScreen') return;
    this.endResult = result;
    this.endStats = stats;
    this.setState('gameOver');
  }

  reset() {
    this.state = 'menu';
    this.previousState = null;
    this.endResult = null;
    this.endStats = null;
  }
}

// ============================================================
// EMBEDDED DATA (Fallback if JSON files not found)
// ============================================================
// EMBEDDED_DATA moved to data/embeddedData.js (loaded via <script> tag before this one)


// ============================================================
// PHASE 2: GAME LOOP & CAMERA
// ============================================================

// --- GameLoop ---
// Fixed-timestep update/render at 60 FPS
class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.running = false;
    this.paused = false;
    this.frameCount = 0;
    this.timestep = 1000 / 60; // 16.67ms
    this.accumulator = 0;
    this.lastTime = 0;
    this.maxDelta = 1000 / 30; // Clamp to 33ms (max 2 frames)
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._loop(this.lastTime);
  }

  stop() {
    this.running = false;
  }

  _loop(currentTime) {
    if (!this.running) return;

    let delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Clamp delta time (safeguard P7)
    if (delta > this.maxDelta) delta = this.maxDelta;

    this.accumulator += delta;

    // Fixed-timestep updates
    while (this.accumulator >= this.timestep) {
      if (!this.paused) {
        this.updateFn(this.timestep / 1000); // Pass delta in seconds
        this.frameCount++;
      }
      this.accumulator -= this.timestep;
    }

    // Render
    this.renderFn(this.accumulator / this.timestep);

    requestAnimationFrame((t) => this._loop(t));
  }
}

// --- Camera ---
// Follows player with smooth lerp
class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.lerp = 0.1;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  follow(target) {
    this.targetX = target.x - this.canvas.width / 2;
    this.targetY = target.y - this.canvas.height / 2;
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  update(dt) {
    // Smooth lerp
    this.x += (this.targetX - this.x) * this.lerp;
    this.y += (this.targetY - this.y) * this.lerp;

    // Screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  apply(ctx) {
    ctx.translate(
      Math.round(-this.x + this.shakeX),
      Math.round(-this.y + this.shakeY)
    );
  }

  screenToWorld(screenX, screenY) {
    return { x: screenX + this.x, y: screenY + this.y };
  }

  worldToScreen(worldX, worldY) {
    return { x: worldX - this.x, y: worldY - this.y };
  }
}

// ============================================================
// PHASE 3: INPUT SYSTEM
// ============================================================

// --- InputManager ---
// Handles mouse/touch click-to-move and WASD/arrow keys
class InputManager {
  constructor(canvas, eventBus) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    
    // Click/tap target
    this.targetX = 0;
    this.targetY = 0;
    this.hasTarget = false;
    
    // WASD/Arrow state
    this.keys = {};
    
    // Touch tracking
    this.touchId = null;
    
    // Pause state (prevents movement clicks during levelUp/pause)
    this._isPaused = false;
    this._upgradeKeyLock = false;
    
    this._bindEvents();
  }

  _bindEvents() {
    // Mouse
    this.canvas.addEventListener('mousedown', (e) => this._onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons & 1) this._onPointerMove(e.clientX, e.clientY);
    });
    
    // Touch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.touchId = touch.identifier;
      this._onPointerDown(touch.clientX, touch.clientY);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.touchId) {
          this._onPointerMove(touch.clientX, touch.clientY);
        }
      }
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchId = null;
    });
    
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // DEBUG: B key skips to boss
      if (e.code === 'KeyB') {
        console.log('[B KEY] Pressed, emitting skipToBoss');
        this.eventBus.emit('skipToBoss');
        return;
      }
      if (e.code === 'Escape') {
        this.eventBus.emit('pause', { paused: true });
      }
      // Upgrade selection during levelUp state (debounced)
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        if (!this._upgradeKeyLock) { this._upgradeKeyLock = true; this.eventBus.emit('selectUpgrade', { index: 0 }); }
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        if (!this._upgradeKeyLock) { this._upgradeKeyLock = true; this.eventBus.emit('selectUpgrade', { index: 1 }); }
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        if (!this._upgradeKeyLock) { this._upgradeKeyLock = true; this.eventBus.emit('selectUpgrade', { index: 2 }); }
      }
      // Skip boss intro
      if ((e.code === 'Enter' || e.code === 'Space') && this._game && this._game.gameState.isBossIntro()) {
        this._game._skipIntroQueued = true;
      }
      // Restart on end screen
      if (e.code === 'Enter' || e.code === 'Space') {
        this.eventBus.emit('restart');
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      // Reset upgrade lock when ANY number key is released
      if (e.code === 'Digit1' || e.code === 'Numpad1' ||
          e.code === 'Digit2' || e.code === 'Numpad2' ||
          e.code === 'Digit3' || e.code === 'Numpad3') {
        this._upgradeKeyLock = false;
      }
    });
  }

  _onPointerDown(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left) * (this.canvas.width / rect.width);
    const y = (screenY - rect.top) * (this.canvas.height / rect.height);
    
    // Check if clicking on upgrade cards during levelUp state (debounced)
    const cardIndex = this._getUpgradeCardAt(x, y);
    if (cardIndex >= 0) {
      if (!this._upgradeKeyLock) { this._upgradeKeyLock = true; this.eventBus.emit('selectUpgrade', { index: cardIndex }); }
      return;
    }
    
    // Check if skipping boss intro
    if (this._game && this._game.gameState.isBossIntro()) {
      this._game._skipIntroQueued = true;
      return;
    }
    // Check if clicking to restart on end screen
    if (this._game && (this._game.gameState.isGameOver() || this._game.gameState.isEndScreen())) {
      this.eventBus.emit('restart');
      return;
    }
    
    // Ignore movement clicks during levelUp/paused state
    if (this._isPaused) return;
    
    this.targetX = x;
    this.targetY = y;
    this.hasTarget = true;
  }

  _getUpgradeCardAt(x, y) {
    // Card layout must match UIManager._renderLevelUp()
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cardWidth = 160;
    const cardHeight = 200;
    const spacing = 20;
    const startX = (w - (cardWidth * 3 + spacing * 2)) / 2;
    const cardY = h / 2 - 80;

    for (let i = 0; i < 3; i++) {
      const cardX = startX + i * (cardWidth + spacing);
      if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + cardHeight) {
        return i;
      }
    }
    return -1;
  }

  _onPointerMove(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    this.targetX = (screenX - rect.left) * (this.canvas.width / rect.width);
    this.targetY = (screenY - rect.top) * (this.canvas.height / rect.height);
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  getMovement() {
    let dx = 0, dy = 0;
    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) dy -= 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) dy += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) dx -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) dx += 1;
    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }
    return { dx, dy };
  }

  clearTarget() {
    this.hasTarget = false;
  }
}

// ============================================================
// PHASE 4: ENTITY MANAGEMENT
// ============================================================

// --- EntityManager ---
// Object pooling for game entities
