import { useCallback, useRef, useSyncExternalStore } from 'react';

import { registry } from './GestureViewerRegistry';
import type { GestureViewerState } from './types';

/**
 * Hook to access the current state of the gesture viewer.
 *
 * @param id - Viewer instance identifier (default: 'default')
 * @returns Current state of the viewer
 *
 * **Available state:**
 * - `currentIndex: number` - Current active index (read-only)
 * - `totalCount: number` - Total number of items (read-only)
 *
 * @example
 * ```tsx
 * const { currentIndex, totalCount } = useGestureViewerState();
 *
 * // Display current position
 * return (
 *   <Text>
 *     {currentIndex + 1} / {totalCount}
 *   </Text>
 * );
 *
 * // React to index changes
 * useEffect(() => {
 *   console.log(`Moved to image ${currentIndex + 1}`);
 *   trackPageView(currentIndex);
 * }, [currentIndex]);
 *
 * // Check navigation availability
 * const canGoNext = currentIndex < totalCount - 1;
 * const canGoPrevious = currentIndex > 0;
 * ```
 */
export const useGestureViewerState = (id = 'default'): GestureViewerState => {
  const stateRef = useRef<GestureViewerState>({ currentIndex: 0, totalCount: 0 });

  const updateState = useCallback((newState: GestureViewerState, onStoreChange: () => void) => {
    if (
      stateRef.current.currentIndex !== newState.currentIndex ||
      stateRef.current.totalCount !== newState.totalCount
    ) {
      stateRef.current = { ...newState };
      onStoreChange();
    }
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let unsubscribeFromManager: (() => void) | null = null;

      const unsubscribeFromRegistry = registry.subscribeToManager(id, (newManager) => {
        unsubscribeFromManager?.();
        unsubscribeFromManager = null;

        if (newManager) {
          unsubscribeFromManager = newManager.subscribe((newState) => {
            updateState(newState, onStoreChange);
          });

          updateState(newManager.getState(), onStoreChange);
          return;
        }

        updateState({ currentIndex: 0, totalCount: 0 }, onStoreChange);
      });

      return () => {
        unsubscribeFromRegistry();
        unsubscribeFromManager?.();
      };
    },
    [id, updateState],
  );

  const getSnapshot = useCallback(() => {
    return stateRef.current;
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  return state;
};
