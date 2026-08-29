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
