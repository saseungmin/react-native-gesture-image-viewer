import { useEffect, useState } from 'react';
import type { ImageViewerManagerState } from './ImageViewerManager';
import { registry } from './ImageViewerRegistry';

export const useImageViewerController = (id = 'default') => {
  const [state, setState] = useState<ImageViewerManagerState>({
    currentIndex: 0,
    dataLength: 0,
  });

  useEffect(() => {
    const manager = registry.createManager(id);

    if (!manager) {
      return;
    }

    setState(manager.getState());

    return manager.subscribe(setState);
  }, [id]);

  const manager = registry.getManager(id);

  return {
    goToIndex: manager?.goToIndex || (() => {}),
    goToPrevious: manager?.goToPrevious || (() => {}),
    goToNext: manager?.goToNext || (() => {}),
    currentIndex: state.currentIndex,
    totalCount: state.dataLength,
  };
};
