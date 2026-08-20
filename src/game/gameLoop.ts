// From 01_engine_architecture.md Section 1 — Game Loop

import type { GameState } from './types';

const FIXED_TIMESTEP = 1000 / 60; // 16.667ms
const MAX_FRAME_SKIP = 5;

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private updateFn: (dt: number) => void,
    private renderFn: (interpolation: number) => void,
    private getState: () => GameState,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const deltaTime = Math.min(now - this.lastTime, FIXED_TIMESTEP * MAX_FRAME_SKIP);
    this.lastTime = now;

    const state = this.getState();

    if (state === 'playing') {
      this.accumulator += deltaTime;

      while (this.accumulator >= FIXED_TIMESTEP) {
        this.updateFn(FIXED_TIMESTEP / 1000); // Convert to seconds
        this.accumulator -= FIXED_TIMESTEP;
      }

      const interpolation = this.accumulator / FIXED_TIMESTEP;
      this.renderFn(interpolation);
    } else {
      // Paused / level-up / game over — still render but don't update
      this.renderFn(1.0);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
