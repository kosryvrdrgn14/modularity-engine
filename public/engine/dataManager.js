class DataManager {
  constructor() {
    this.characters = null;
    this.weapons = null;
    this.enemies = null;
    this.stages = null;
    this.pickups = null;
    this.leveling = null;
  }

  async loadAll(onProgress) {
    const files = [
      { key: 'characters', path: 'content/characters.json' },
      { key: 'weapons', path: 'content/weapons.json' },
      { key: 'enemies', path: 'content/enemies.json' },
      { key: 'stages', path: 'content/stages.json' },
      { key: 'pickups', path: 'content/pickups.json' },
      { key: 'leveling', path: 'content/leveling.json' },
    ];

    const results = await Promise.all(
      files.map(async (file, idx) => {
        if (onProgress) onProgress(idx / files.length, `Loading ${file.key}...`);
        try {
          const response = await fetch(file.path);
          if (!response.ok) throw new Error(`Failed to load ${file.path}`);
          const data = await response.json();
          return { key: file.key, data, error: null };
        } catch (error) {
          console.warn(`Could not load ${file.path}, using embedded data`);
          return { key: file.key, data: null, error };
        }
      })
    );

    // Use embedded data as fallback
    for (const result of results) {
      if (result.data) {
        this[result.key] = result.data;
      } else {
        this[result.key] = this.getEmbeddedData(result.key);
      }
    }

    if (onProgress) onProgress(1, 'Ready');
    return true;
  }

  getEmbeddedData(key) {
    return EMBEDDED_DATA[key];
  }
}

// --- GameState ---
// State machine with validated transitions
