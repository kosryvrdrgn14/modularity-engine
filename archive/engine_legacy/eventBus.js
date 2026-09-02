class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventQueue = [];
    this.processing = false;
    this.maxNesting = 32;
    this.nestingDepth = 0;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(event, data) {
    // If already processing, queue for later (re-entrancy protection)
    if (this.processing) {
      if (this.nestingDepth < this.maxNesting) {
        this.eventQueue.push({ event, data });
      }
      return;
    }

    this.processing = true;
    this.nestingDepth = 0;
    this._dispatch(event, data);
    
    // Process queued events
    while (this.eventQueue.length > 0) {
      const queued = this.eventQueue.shift();
      this._dispatch(queued.event, queued.data);
    }
    
    this.processing = false;
  }

  _dispatch(event, data) {
    this.nestingDepth++;
    const list = this.listeners.get(event);
    if (list) {
      for (let i = 0; i < list.length; i++) {
        list[i](data);
      }
    }
    this.nestingDepth--;
  }

  clear() {
    this.listeners.clear();
    this.eventQueue = [];
    this.processing = false;
    this.nestingDepth = 0;
  }
}

// --- DataManager ---
// Loads and validates JSON content files
