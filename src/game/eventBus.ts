// From 01_engine_architecture.md Section 3 — Event Bus Architecture

import type { Entity, GameEndResult } from './types';

// All event types from the spec
export interface GameEvents {
  damage: {
    attacker: Entity;
    defender: Entity;
    damage: number;
    isCrit: boolean;
    isPlayerDamage: boolean;
  };
  death: {
    entity: Entity;
    killer: Entity;
    position: { x: number; y: number };
  };
  pickup: {
    player: Entity;
    pickup: Entity;
  };
  levelUp: {
    player: Entity;
    newLevel: number;
  };
  bossSpawn: {
    boss: Entity;
  };
  bossDeath: {
    boss: Entity;
    killer: Entity;
  };
  screenWipe: {
    player: Entity;
  };
  gameOver: GameEndResult;
  pause: {
    paused: boolean;
  };
}

type EventKey = keyof GameEvents;
type Listener<K extends EventKey> = (data: GameEvents[K]) => void;

const MAX_NESTED = 32;

export class EventBus {
  private listeners = new Map<string, Function[]>();
  private nestedCount = 0;

  on<K extends EventKey>(event: K, callback: Listener<K>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off<K extends EventKey>(event: K, callback: Listener<K>): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  emit<K extends EventKey>(event: K, data: GameEvents[K]): void {
    if (this.nestedCount >= MAX_NESTED) {
      console.warn(`EventBus: max nested events (${MAX_NESTED}) reached, dropping "${event}"`);
      return;
    }
    this.nestedCount++;
    try {
      const list = this.listeners.get(event);
      if (list) {
        for (const cb of list) {
          cb(data);
        }
      }
    } finally {
      this.nestedCount--;
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
