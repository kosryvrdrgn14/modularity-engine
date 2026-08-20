// From 01_engine_architecture.md Section 15 — Game Timer System

export class GameTimer {
  elapsed = 0;
  running = false;

  update(dt: number): void {
    if (this.running) {
      this.elapsed += dt;
    }
  }

  get formatted(): string {
    const minutes = Math.floor(this.elapsed / 60);
    const seconds = Math.floor(this.elapsed % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get bossSpawnTime(): boolean {
    return this.elapsed >= 240; // 4:00
  }

  get gameTimeExpired(): boolean {
    return this.elapsed >= 300; // 5:00
  }

  start(): void {
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  reset(): void {
    this.elapsed = 0;
    this.running = false;
  }
}
