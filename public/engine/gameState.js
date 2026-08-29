class GameState {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.state = 'loading';
    this.previousState = null;
    this.endResult = null;
    this.endStats = null;

    // Valid transitions table
    this.transitions = {
      loading: ['menu', 'playing'],
      menu: ['playing'],
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
