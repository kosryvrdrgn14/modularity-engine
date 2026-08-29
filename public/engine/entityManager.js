class EntityManager {
  constructor() {
    this.entities = [];
    this.nextId = 1;
    this.pools = {
      enemy: [],
      projectile: [],
      pickup: [],
      orb: [],
      companion: [],
    };
    this.poolLimits = {
      enemy: 200,
      projectile: 500,
      pickup: 500,
      orb: 50,
      companion: 3,
    };
  }

  create(type, data) {
    const entity = {
      ...data,
      id: this.nextId++,
      type,
      active: true,
      x: data.x || 0,
      y: data.y || 0,
      vx: data.vx || 0,
      vy: data.vy || 0,
      hp: data.hp || 0,
      maxHp: data.hp || 0,
      damage: data.damage || 0,
      speed: data.speed || 0,
      size: data.size || 10,
      stats: data.stats || {},
      behavior: data.behavior || null,
      weaponData: data.weaponData || null,
      pickupData: data.pickupData || null,
      visual: data.visual || {},
      iFrames: 0,
      age: 0,
    };
    this.entities.push(entity);
    return entity;
  }

  destroy(entity) {
    entity.active = false;
  }

  clearAll() {
    this.entities = [];
    this.nextId = 1;
  }

  getActive(type) {
    if (type) {
      return this.entities.filter(e => e.active && e.type === type);
    }
    return this.entities.filter(e => e.active);
  }

  getCount(type) {
    return this.entities.filter(e => e.active && e.type === type).length;
  }

  cleanup() {
    // Remove inactive entities (safeguard P6 - separate cleanup phase)
    this.entities = this.entities.filter(e => e.active);
  }

  getPoolCount(type) {
    return this.pools[type] ? this.pools[type].length : 0;
  }
}

// ============================================================
// COMPANION SYSTEM — Foundation
// ============================================================

/**
 * Check if a target is within a cone from a source.
 * @param {Object} source - { x, y, facing } where facing is angle in radians
 * @param {Object} target - { x, y }
 * @param {number} coneAngle - Total cone angle in radians (e.g., PI/3 for 60°)
 * @param {number} coneRange - Max distance in pixels
 * @returns {boolean}
 */
function isInCone(source, target, coneAngle, coneRange) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > coneRange || dist < 1) return false;
  const angleToTarget = Math.atan2(dy, dx);
  let angleDiff = angleToTarget - source.facing;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  return Math.abs(angleDiff) <= coneAngle / 2;
}

/** Distance between two entities */
function distBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Companion data — Dog (Slot 1, paired with W1)
// COMPANION_DATA moved to data/companionData.js (loaded via <script> tag before this one)


// ============================================================
// COMPANION SYSTEM — AI, Movement, Attack
// ============================================================
