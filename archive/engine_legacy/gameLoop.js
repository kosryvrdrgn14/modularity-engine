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
