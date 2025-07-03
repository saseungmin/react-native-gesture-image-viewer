import ImageViewerManager from './ImageViewerManager';

class ImageViewerRegistry {
  private managers = new Map<string, ImageViewerManager>();

  createManager(id: string): ImageViewerManager | null {
    if (this.managers.has(id)) {
      return this.managers.get(id) || null;
    }

    const manager = new ImageViewerManager();
    this.managers.set(id, manager);
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
    }
  }
}

export const registry = new ImageViewerRegistry();
