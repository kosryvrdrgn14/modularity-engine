// From 01_engine_architecture.md Section 5 — Camera System + Section 9 — Screen Shake

export class Camera {
  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  lerpFactor = 0.08;

  // Screen shake — Section 9
  private shakeDuration = 0;
  private shakeIntensity = 0;
  private shakeTimer = 0;
  shakeOffsetX = 0;
  shakeOffsetY = 0;

  // HiDPI — Section 10
  private dpr = 1;
  logicalWidth = 800;
  logicalHeight = 600;

  constructor(canvas: HTMLCanvasElement) {
    this.setupHiDPI(canvas);
  }

  setupHiDPI(canvas: HTMLCanvasElement): void {
    this.dpr = window.devicePixelRatio || 1;
    this.logicalWidth = canvas.clientWidth;
    this.logicalHeight = canvas.clientHeight;
    canvas.width = this.logicalWidth * this.dpr;
    canvas.height = this.logicalHeight * this.dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(this.dpr, this.dpr);
  }

  snapToPlayer(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  follow(targetX: number, targetY: number): void {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  update(dt: number): void {
    // Smooth lerp
    this.x += (this.targetX - this.x) * this.lerpFactor;
    this.y += (this.targetY - this.y) * this.lerpFactor;

    // Screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;
      this.shakeOffsetX = (Math.random() * 2 - 1) * intensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * intensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  shake(duration: number, intensity: number): void {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx - this.x + this.logicalWidth / 2 + this.shakeOffsetX,
      y: wy - this.y + this.logicalHeight / 2 + this.shakeOffsetY,
    };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: sx + this.x - this.logicalWidth / 2,
      y: sy + this.y - this.logicalHeight / 2,
    };
  }

  isVisible(wx: number, wy: number, margin = 100): boolean {
    const s = this.worldToScreen(wx, wy);
    return (
      s.x > -margin && s.x < this.logicalWidth + margin &&
      s.y > -margin && s.y < this.logicalHeight + margin
    );
  }
}
