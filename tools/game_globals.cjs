// ============================================================
// game_globals.cjs — the declared cross-file symbol surface of the
// classic-script game boot (single source for TWO consumers):
//   1. tools/eslint.game.cjs — no-undef must treat these as defined
//      (they are top-level const/class lexical bindings shared across
//      the load order, not window properties — ESLint can't see them).
//   2. tools/verify.cjs — meta-check: every entry here must still be
//      documented (backticked) in PROJECT_MAP.md. A symbol retired from
//      the code or the map turns the gate red — the list cannot rot.
// Mirrors PROJECT_MAP §1 tiers + §2 Defines. Update in the same change
// as the map (KNOWLEDGE §19 rides-along law).
// ============================================================
module.exports.PROJECT_GLOBALS = [
  // T0 data blobs
  'EMBEDDED_DATA', 'ASSET_MAP', 'DISASTER_EVENTS', 'FARMING_CONFIG',
  'AFFECTION_TIERS', 'ESTATE_TIERS', 'CHILD_GROWTH_STAGES', 'SANDBOX_DEFAULTS', 'SVG_PORTRAITS',
  // T1 early systems
  'TitleMenu', 'NPCExportSystem', 'TimeService', 'GameLogSystem', 'NPCExportUI',
  // T2 core
  'DataManager', 'EventBus', 'GameLoop', 'Camera', 'InputManager', 'GameState',
  // T3 sim & systems
  'EntityManager', 'SpawnSystem', 'MovementSystem', 'WeaponSystem', 'CollisionSystem',
  'DamageSystem', 'PickupSystem', 'LevelingSystem', 'TelegraphSystem', 'Renderer',
  'FloatingTextSystem', 'CompanionSystem', 'ConditionEngine',
  'NPCSystem', 'NpcMemoryLog', 'GameManager', 'StorageBackend', 'LocalStorageBackend',
  'AffectionSystem', 'ChildrenSystem', 'EstateSystem', 'FarmingSystem', 'DisasterSystem',
  'SandboxSystem', 'CHILD_GROWTH_THRESHOLD', 'StarSystem', 'FrenzySystem', 'GachaProtection',
  'QuestSystem', 'LocationManager',
  // Cross-file helper function declarations (classic-script globals)
  'preloadAssets', 'distBetween', 'isInCone',
  // T4 UI
  'AudioManager', 'TitleBGM', 'UIManager', 'DockMenu', 'WidgetRenderer', 'ShopSystem',
  'TownEngine', 'TownContent', 'LoadoutScreen', 'TownScreen',
  // T5 orchestrator
  'Game', 'game',
];
