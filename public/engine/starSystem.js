class StarSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  evaluate(result) {
    const stars = { one: false, two: false, three: false };
    if (!result || !result.stage_completed) return stars;

    // 1★: Always awarded on completion
    stars.one = true;

    // 2★: Meet at least 2 of 4 thresholds
    const t = result.time_survived || 0;
    const k = result.kills || 0;
    const lv = result.player_level || 1;
    const g = result.gold_earned || 0;
    let met = 0;
    if (k >= 250) met++;
    if (t <= 240 || result.boss_defeated) met++;
    if (lv >= 13) met++;
    if (g >= 600) met++;
    if (met >= 2) stars.two = true;

    // 3★: Meet at least 1 "hard" condition + 1 additional
    const hardConditions = [];
    const addConditions = [];

    // Hard (mutually exclusive)
    if (result.damage_taken === 0) hardConditions.push('no_hit');
    const wEnd = result.weapon_levels_end || {};
    const activeWeapons = Object.values(wEnd).filter(l => l > 0).length;
    if (activeWeapons <= 1) hardConditions.push('starter_only');
    if (lv <= 8) hardConditions.push('underleveled');
    if (result.companions_used === 0) hardConditions.push('solo');

    // Additional
    const allMaxed = Object.values(wEnd).length >= 3 && Object.values(wEnd).every(l => l >= 7);
    if (allMaxed) addConditions.push('all_maxed');
    if (result.boss_kill_time && result.boss_kill_time < 15) addConditions.push('speed_kill');
    if (result.pickups_collected === 0) addConditions.push('itemless');

    if (hardConditions.length >= 1 && addConditions.length >= 1) stars.three = true;

    return stars;
  }
}

// ============================================================
// FRENZY SYSTEM — Post-3★ chaos mode
// ============================================================
