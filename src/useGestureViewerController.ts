import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type GestureViewerManager from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';
import type { GestureViewerController, GestureViewerControllerState } from './types';

/**
 * Hook to control the gesture viewer programmatically.
 *
 * @param id - Viewer instance identifier (default: 'default')
 * @returns Methods and state for controlling the viewer
 *
 * **Available methods:**
 * - `goToIndex(index: number)` - Navigate to specific index (0 to totalCount-1)
 * - `goToPrevious()` - Navigate to previous item
 * - `goToNext()` - Navigate to next item
 * - `zoomIn(multiplier?: number)` - Zoom in (default: 0.25)
 * - `zoomOut(multiplier?: number)` - Zoom out (default: 0.25)
 * - `resetZoom(scale?: number)` - Reset zoom level (default: 1.0)
 * - `rotate(angle?: 0|90|180|270|360, clockwise?: boolean)` - Rotate content (default: 90° clockwise)
 *
 * **Available state:**
 * - `currentIndex: number` - Current active index (read-only)
 * - `totalCount: number` - Total number of items (read-only)
 *
 * @example
 * ```tsx
 * const { goToIndex, goToNext, goToPrevious, zoomIn, zoomOut, resetZoom, rotate, currentIndex, totalCount } = useGestureViewerController();
 *
 * // Navigate to specific index
 * goToIndex(2);
 *
 * // Go to next image
 * goToNext();
 *
 * // Zoom in by 25%
 * zoomIn();
 *
 * // Zoom out by 50%
 * zoomOut(0.5);
 *
 * // Reset to original size
 * resetZoom();
 *
 * // Rotate 90 degrees clockwise
 * rotate();
 *
 * // Rotate 180 degrees
 * rotate(180);
 *
 * // Check current state
 * console.log(`Image ${currentIndex + 1} of ${totalCount}`);
 *
 * // Check navigation availability
 * const canGoNext = currentIndex < totalCount - 1;
 * const canGoPrevious = currentIndex > 0;
 * ```
 */
export const useGestureViewerController = (id = 'default'): GestureViewerController => {
  const managerRef = useRef<GestureViewerManager | null>(null);
  const stateRef = useRef<GestureViewerControllerState>({ currentIndex: 0, totalCount: 0 });

  const updateState = useCallback((newState: GestureViewerControllerState, onStoreChange: () => void) => {
    if (
      stateRef.current.currentIndex !== newState.currentIndex ||
      stateRef.current.totalCount !== newState.totalCount
    ) {
      stateRef.current = {
        currentIndex: newState.currentIndex,
        totalCount: newState.totalCount,
      };
      onStoreChange();
    }
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let unsubscribeFromManager: (() => void) | null = null;

      const unsubscribeFromRegistry = registry.subscribeToManager(id, (newManager) => {
        unsubscribeFromManager?.();
        unsubscribeFromManager = null;
        managerRef.current = newManager;

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

  const controller = useMemo<Omit<GestureViewerController, 'currentIndex' | 'totalCount'>>(
    () => ({
      goToIndex: (index) => {
        managerRef.current?.goToIndex(index);
      },
      goToPrevious: () => {
        managerRef.current?.goToPrevious();
      },
      goToNext: () => {
        managerRef.current?.goToNext();
      },
      zoomIn: (multiplier) => {
        managerRef.current?.zoomIn(multiplier);
      },
      zoomOut: (multiplier) => {
        managerRef.current?.zoomOut(multiplier);
      },
      resetZoom: (scale) => {
        managerRef.current?.resetZoom(scale);
      },
      rotate: (angle, clockwise) => {
        managerRef.current?.rotate(angle, clockwise);
      },
    }),
    [],
  );

  return {
    ...controller,
    ...state,
  };
};
