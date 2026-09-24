// ============================================================
// eslint.game.cjs — minimal no-undef gate for the classic-script game
// files (F5, v2.19.4). Used ONLY by tools/verify.cjs — NOT the project's
// general lint config (eslint.config.js, untouched).
//
// Scope discipline: exactly ONE rule is enforced here (no-undef) — this
// gate exists to move the partyBtn lesson into the unconditional gate,
// not to re-style the game code. Cross-file lexical bindings are declared
// in game_globals.cjs (meta-checked against PROJECT_MAP by verify).
// ============================================================
const globals = require('globals');
const { PROJECT_GLOBALS } = require('./game_globals.cjs');

module.exports = [
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // Dual-env export shim idiom (documented in PROJECT_MAP §5.3):
        // classic script under file://, module.exports when unit-loaded.
        module: 'readonly',
        ...Object.fromEntries(PROJECT_GLOBALS.map((g) => [g, 'readonly'])),
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },
];
