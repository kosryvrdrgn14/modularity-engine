// Extracted from game2.html — pure data, no logic.

const ESTATE_TIERS = [
  { name: 'Homestead', level: 1, cost: { gold: 200 }, production: { wood: 1, stone: 0 }, questSlots: 0 },
  { name: 'Cottage', level: 2, cost: { gold: 500, wood: 20 }, production: { wood: 2, stone: 1 }, questSlots: 1 },
  { name: 'Manor', level: 3, cost: { gold: 1500, wood: 50, stone: 30 }, production: { wood: 3, stone: 2, herbs: 1 }, questSlots: 2 },
  { name: 'Keep', level: 4, cost: { gold: 5000, wood: 100, stone: 80 }, production: { wood: 5, stone: 4, herbs: 2, ore: 1 }, questSlots: 3 },
  { name: 'Dynasty', level: 5, cost: { gold: 15000, wood: 200, stone: 150 }, production: { wood: 8, stone: 6, herbs: 3, ore: 2 }, questSlots: 5 },
];
