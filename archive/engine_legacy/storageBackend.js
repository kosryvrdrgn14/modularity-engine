class StorageBackend {
  load(key) { return null; }
  save(key, data) {}
  remove(key) {}
}

class LocalStorageBackend extends StorageBackend {
  load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }
  save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
  }
  remove(key) { localStorage.removeItem(key); }
}

// ============================================================
// GAME MANAGER
// Central store, resource tracking, combat session results
// ============================================================
