class AffectionSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  getAffection(npcId) {
    return this.gameManager.get_counter('affection_' + npcId) || 0;
  }

  addAffection(npcId, amount) {
    this.gameManager.add_counter('affection_' + npcId, amount);
    return this.getAffection(npcId);
  }

  getTier(npcId) {
    const aff = this.getAffection(npcId);
    let tier = AFFECTION_TIERS[0];
    for (const t of AFFECTION_TIERS) {
      if (aff >= t.min) tier = t;
    }
    return tier;
  }

  getTierIndex(npcId) {
    const aff = this.getAffection(npcId);
    let idx = 0;
    for (let i = 0; i < AFFECTION_TIERS.length; i++) {
      if (aff >= AFFECTION_TIERS[i].min) idx = i;
    }
    return idx;
  }

  canDate(npcId) {
    return this.getTierIndex(npcId) >= 2; // Respect+
  }

  canMarry(npcId) {
    return this.getTierIndex(npcId) >= 4; // Claim
  }
}

// ============================================================
// ESTATE SYSTEM — Family homes + material production (E3)
// ============================================================

// ESTATE_TIERS moved to data/estateTiers.js (loaded via <script> tag before this one)
