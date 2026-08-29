// Extracted from game2.html — pure data, no logic.

const FARMING_CONFIG = {
  maxSlots: 3,
  slotTypes: ['companion', 'adventurer', 'flexible'],
  slotLabels: ['🐕 Companion', '⚔️ Adventurer', '🔄 Flexible'],
  baseCompletionTime: 120, // 2 minutes base (real-time, background)
  lootMultiplier: 0.6, // auto-clear gives 60% of manual run loot
  materialYield: {
    wood: { min: 2, max: 5 },
    stone: { min: 1, max: 3 },
    herbs: { min: 0, max: 2 },
    ore: { min: 0, max: 1 },
  },
};
