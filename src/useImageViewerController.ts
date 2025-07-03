import { useEffect, useMemo, useRef, useState } from 'react';
import type ImageViewerManager from './ImageViewerManager';
import type { ImageViewerManagerState } from './ImageViewerManager';
import { registry } from './ImageViewerRegistry';

export const useImageViewerController = (id = 'default') => {
  const [state, setState] = useState<ImageViewerManagerState>({
    currentIndex: 0,
    dataLength: 0,
  });

  const [manager, setManager] = useState<ImageViewerManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleManagerChange = (newManager: ImageViewerManager | null) => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      setManager(newManager);

      if (newManager) {
        setState(newManager.getState());
        unsubscribeRef.current = newManager.subscribe(setState);
        return;
      }

      setState({ currentIndex: 0, dataLength: 0 });
    };

    const unsubscribeFromRegistry = registry.subscribeToManager(id, handleManagerChange);

    return () => {
      unsubscribeFromRegistry();
      unsubscribeRef.current?.();
    };
  }, [id]);

  const noopFunction = useMemo(() => () => {}, []);

  return {
    goToIndex: manager?.goToIndex || noopFunction,
    goToPrevious: manager?.goToPrevious || noopFunction,
    goToNext: manager?.goToNext || noopFunction,
    currentIndex: state.currentIndex,
    totalCount: state.dataLength,
  };
};
