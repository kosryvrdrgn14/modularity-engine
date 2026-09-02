class EstateSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  getEstates() {
    return this.gameManager.store.estates || [];
  }

  getEstate(wifeId) {
    return this.getEstates().find(e => e.wifeId === wifeId);
  }

  createEstate(wifeId, tier) {
    if (!this.gameManager.store.estates) this.gameManager.store.estates = [];
    const tierData = ESTATE_TIERS[tier - 1];
    if (!tierData) return false;

    const estate = {
      wifeId,
      tier: tier,
      name: tierData.name,
      production: { ...tierData.production },
      questSlots: tierData.questSlots,
      activeQuests: [],
      children: [],
    };
    this.gameManager.store.estates.push(estate);
    this.gameManager._dirty = true;
    return estate;
  }

  upgradeEstate(wifeId) {
    const estate = this.getEstate(wifeId);
    if (!estate) return false;
    if (estate.tier >= ESTATE_TIERS.length) return false;

    const nextTier = ESTATE_TIERS[estate.tier]; // tier is 1-indexed
    // Check resources
    if (!this.gameManager.has_resource('gold', nextTier.cost.gold)) return false;

    // Spend resources
    this.gameManager.spend_currency(nextTier.cost.gold, 'estate_upgrade');
    estate.tier = nextTier.level;
    estate.name = nextTier.name;
    estate.production = { ...nextTier.production };
    estate.questSlots = nextTier.questSlots;
    this.gameManager._dirty = true;
    return true;
  }

  collectProduction(wifeId) {
    const estate = this.getEstate(wifeId);
    if (!estate) return null;
    // E3: Production scales with wife affection tier
    const affection = this.gameManager.get_counter('affection_' + wifeId) || 0;
    const tierBonus = 1 + Math.floor(affection / 30) * 0.25; // +25% per tier
    const produced = {};
    for (const [mat, amount] of Object.entries(estate.production)) {
      const scaled = Math.round(amount * tierBonus);
      if (scaled > 0) {
        this.gameManager.add_resource(mat, scaled);
        produced[mat] = scaled;
      }
    }
    return produced;
  }
}

// ============================================================
// CHILDREN SYSTEM — Growth + Legacy Companions (E4)
// ============================================================

// CHILD_GROWTH_STAGES moved to data/childGrowthStages.js (loaded via <script> tag before this one)

const CHILD_GROWTH_THRESHOLD = 10; // runs per growth stage
