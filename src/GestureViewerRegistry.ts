import type { View } from 'react-native';

import GestureViewerManager from './GestureViewerManager';

class GestureViewerRegistry {
  private managers = new Map<string, GestureViewerManager>();
  private subscribers = new Map<string, Set<(manager: GestureViewerManager | null) => void>>();
  private activeTriggerSubscribers = new Map<string, Set<(node: View | null) => void>>();
  private activeTriggers = new Map<string, View | null>();
  private indexedTriggers = new Map<string, Map<number, View | null>>();

  subscribeToManager(id: string, callback: (manager: GestureViewerManager | null) => void) {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }

    this.subscribers.get(id)?.add(callback);

    const manager = this.managers.get(id) || null;

    callback(manager);

    return () => {
      const subscribers = this.subscribers.get(id);

      subscribers?.delete(callback);

      if (subscribers && subscribers.size === 0) {
        this.subscribers.delete(id);
      }
    };
  }

  subscribeToActiveTrigger(id: string, callback: (node: View | null) => void) {
    if (!this.activeTriggerSubscribers.has(id)) {
      this.activeTriggerSubscribers.set(id, new Set());
    }

    this.activeTriggerSubscribers.get(id)?.add(callback);

    callback(this.getActiveTriggerNode(id));

    return () => {
      const subscribers = this.activeTriggerSubscribers.get(id);

      subscribers?.delete(callback);

      if (subscribers && subscribers.size === 0) {
        this.activeTriggerSubscribers.delete(id);
      }
    };
  }

  createManager(id: string): GestureViewerManager | null {
    if (this.managers.has(id)) {
      return this.managers.get(id) || null;
    }

    const manager = new GestureViewerManager();
    this.managers.set(id, manager);

    this.notifySubscribers(id, manager);

    return manager;
  }

  getManager(id: string): GestureViewerManager | null {
    return this.managers.get(id) || null;
  }

  deleteManager(id: string) {
    const manager = this.managers.get(id);

    if (manager) {
      manager.cleanUp();
      this.managers.delete(id);

      this.notifySubscribers(id, null);

      this.activeTriggers.delete(id);
      this.notifyActiveTriggerSubscribers(id, null);
    }
  }

  notifySubscribers(id: string, manager: GestureViewerManager | null) {
    const listeners = this.subscribers.get(id);

    if (listeners) {
      [...listeners].forEach((callback) => callback(manager));
    }
  }

  notifyActiveTriggerSubscribers(id: string, node: View | null) {
    const listeners = this.activeTriggerSubscribers.get(id);

    if (listeners) {
      [...listeners].forEach((callback) => callback(node));
    }
  }

  setActiveTriggerNode(id: string, node: View | null) {
    this.activeTriggers.set(id, node);
    this.notifyActiveTriggerSubscribers(id, node);
  }

  getActiveTriggerNode(id: string): View | null {
    return this.activeTriggers.get(id) ?? null;
  }

  clearActiveTriggerNode(id: string) {
    this.activeTriggers.delete(id);
    this.notifyActiveTriggerSubscribers(id, null);
  }

  setIndexedTriggerNode(id: string, index: number, node: View | null) {
    if (!this.indexedTriggers.has(id)) {
      this.indexedTriggers.set(id, new Map());
    }

    this.indexedTriggers.get(id)?.set(index, node);
  }

  getIndexedTriggerNode(id: string, index: number): View | null {
    return this.indexedTriggers.get(id)?.get(index) ?? null;
  }

  clearIndexedTriggerNode(id: string, index: number) {
    const triggersByIndex = this.indexedTriggers.get(id);

    if (!triggersByIndex) {
      return;
    }

    triggersByIndex.delete(index);

    if (triggersByIndex.size === 0) {
      this.indexedTriggers.delete(id);
    }
  }
}

export const registry = new GestureViewerRegistry();
