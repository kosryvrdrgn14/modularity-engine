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
    
    const gameState = this._game?.gameState?.state || 'unknown';
    const isPaused = this._isPaused;
    
    // Check if clicking on upgrade cards during levelUp state (debounced)
    const cardIndex = this._getUpgradeCardAt(x, y);
    if (cardIndex >= 0) {
      console.log('[Input] Card tap detected, index:', cardIndex, 'lock:', this._upgradeKeyLock, 'state:', gameState);
      if (!this._upgradeKeyLock) { this._upgradeKeyLock = true; this.eventBus.emit('selectUpgrade', { index: cardIndex }); }
      else { console.log('[Input] BLOCKED by _upgradeKeyLock'); }
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
