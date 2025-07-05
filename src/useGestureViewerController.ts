import { useEffect, useMemo, useRef, useState } from 'react';
import type GestureViewerManager from './GestureViewerManager';
import type { GestureViewerManagerState } from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';

export const useGestureViewerController = (id = 'default') => {
  const [state, setState] = useState<GestureViewerManagerState>({
    currentIndex: 0,
    dataLength: 0,
  });

  const [manager, setManager] = useState<GestureViewerManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleManagerChange = (newManager: GestureViewerManager | null) => {
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
