import ImageViewerManager from './ImageViewerManager';

class ImageViewerRegistry {
  private managers = new Map<string, ImageViewerManager>();
  private subscribers = new Map<string, Set<(manager: ImageViewerManager | null) => void>>();

  subscribeToManager(id: string, callback: (manager: ImageViewerManager | null) => void) {
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

  createManager(id: string): ImageViewerManager | null {
    if (this.managers.has(id)) {
      return this.managers.get(id) || null;
    }

    const manager = new ImageViewerManager();
    this.managers.set(id, manager);

    this.notifySubscribers(id, manager);

    return manager;
  }

  getManager(id: string): ImageViewerManager | null {
    return this.managers.get(id) || null;
  }

  deleteManager(id: string) {
    const manager = this.managers.get(id);

    if (manager) {
      manager.cleanUp();
      this.managers.delete(id);

      this.notifySubscribers(id, null);
    }
  }

  notifySubscribers(id: string, manager: ImageViewerManager | null) {
    const listeners = this.subscribers.get(id);

    if (listeners) {
      [...listeners].forEach((callback) => callback(manager));
    }
  }
}

export const registry = new ImageViewerRegistry();
