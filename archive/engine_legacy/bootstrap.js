// DEBUG: window.skipToBoss() to spawn boss immediately
const game = new Game();
window.skipToBoss = () => {
  if (!game.gameState.isPlaying()) {
    console.log('[DEBUG] Cannot skip — state:', game.gameState.state);
    return;
  }
  const ss = game.spawnSystem;
  if (ss) {
    ss.bossSpawned = true;
    ss.gameTime = 245;
    ss._spawnBoss();
    console.log('[DEBUG] Boss spawned via spawnSystem!');
  } else {
    console.log('[DEBUG] spawnSystem not found');
  }
};
game.init().catch(console.error);
