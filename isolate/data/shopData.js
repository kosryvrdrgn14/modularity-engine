// Extracted from game2.html — pure data, no logic.

const SHOP_DATA = {
  combat: [
    { id: 'health_potion', name: 'Health Potion', icon: '🧪', desc: 'Restores 30 HP instantly', cost: 50, effect: 'heal_30' },
    { id: 'damage_charm', name: 'Damage Charm', icon: '🔥', desc: '+20% damage for 1 stage', cost: 150, effect: 'buff_damage' },
    { id: 'speed_scroll', name: 'Speed Scroll', icon: '💨', desc: '+30% move speed for 1 stage', cost: 120, effect: 'buff_speed' },
    { id: 'shield_talisman', name: 'Shield Talisman', icon: '🛡️', desc: 'Block next 3 hits taken', cost: 200, effect: 'shield_3' },
    { id: 'xp_crystal', name: 'XP Crystal', icon: '💎', desc: '+50 XP instantly', cost: 100, effect: 'xp_50' },
    { id: 'gold_finding_charm', name: 'Gold Finder', icon: '🪙', desc: '+25% gold for 1 stage', cost: 180, effect: 'buff_gold' },
    { id: 'boss_compass', name: 'Boss Compass', icon: '🧭', desc: 'Reveals boss spawn timer', cost: 75, effect: 'boss_reveal' },
  ],
  companion: [
    { id: 'treat_basic', name: 'Basic Treat', icon: '🍖', desc: '+5% companion damage for 1 stage', cost: 80, effect: 'companion_dmg_5' },
    { id: 'treat_premium', name: 'Premium Treat', icon: '🥩', desc: '+15% companion damage for 1 stage', cost: 250, effect: 'companion_dmg_15' },
    { id: 'training_manual', name: 'Training Manual', icon: '📖', desc: 'Companion cooldown -10% for 1 stage', cost: 200, effect: 'companion_cd_10' },
    { id: 'companion_collar', name: 'Enchanted Collar', icon: '📿', desc: 'Companion loot range +50% for 1 stage', cost: 160, effect: 'companion_loot_50' },
  ],
  estate: [
    { id: 'fertilizer', name: 'Fertilizer', icon: '🌱', desc: 'Estate output +25% for 3 runs', cost: 300, effect: 'estate_boost_25' },
    { id: 'tool_set', name: 'Tool Set', icon: '⚒️', desc: 'Estate output +50% for 1 run', cost: 400, effect: 'estate_boost_50' },
    { id: 'work_permit', name: 'Work Permit', icon: '📋', desc: 'Instantly complete 1 estate task', cost: 500, effect: 'estate_complete' },
  ],
  gifts: [
    { id: 'flowers', name: 'Wildflowers', icon: '🌸', desc: 'A simple gift. +2 affection', cost: 50, affection: 2 },
    { id: 'ribbon', name: 'Silk Ribbon', icon: '🎀', desc: 'A fine gift. +5 affection', cost: 200, affection: 5 },
    { id: 'gemstone', name: 'Gemstone', icon: '💎', desc: 'A precious gift. +10 affection', cost: 500, affection: 10 },
    { id: 'jewelry', name: 'Handmade Jewelry', icon: '💍', desc: 'An intimate gift. +20 affection', cost: 1200, affection: 20 },
  ],
};
