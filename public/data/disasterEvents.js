// Extracted from game2.html — pure data, no logic.

const DISASTER_EVENTS = [
  { id: 'rat_infestation', name: '🐀 Rat Infestation', desc: 'Rats are eating the food stores!', goldCost: 80, runCooldown: 3 },
  { id: 'bandit_raid', name: '🗡️ Bandit Raid', desc: 'Bandits are attacking the outer tents!', goldCost: 150, runCooldown: 3 },
  { id: 'plague_scare', name: '🤢 Plague Scare', desc: 'Someone is showing symptoms. Quarantine needed.', goldCost: 200, runCooldown: 3 },
  { id: 'fire_outbreak', name: '🔥 Fire!', desc: 'A campfire spread to the tents!', goldCost: 120, runCooldown: 3 },
  { id: 'water_contamination', name: '💧 Water Contamination', desc: 'The well water looks dirty.', goldCost: 100, runCooldown: 3 },
];
