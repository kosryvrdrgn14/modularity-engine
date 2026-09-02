class GachaProtection {
  static RAMP = [0.01, 0.05, 0.15, 0.25, 0.50, 0.75, 0.99];

  static getDropChance(clearsWithoutDrop) {
    const idx = Math.min(clearsWithoutDrop, GachaProtection.RAMP.length - 1);
    return GachaProtection.RAMP[idx];
  }

  static rollForDrop(clearsWithoutDrop) {
    const chance = GachaProtection.getDropChance(clearsWithoutDrop);
    const rolled = Math.random();
    return { dropped: rolled < chance, chance: chance, roll: rolled };
  }
}



// ============================================================
// LOCATION MANAGER — Hierarchical navigation (D1/D2)
// ============================================================

// LOCATION_TREE moved to data/locationTree.js (loaded via <script> tag before this one)
