import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [state, setState] = useState<GestureViewerControllerState>({
    currentIndex: 0,
    totalCount: 0,
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

      setState({ currentIndex: 0, totalCount: 0 });
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
    zoomIn: manager?.zoomIn || noopFunction,
    zoomOut: manager?.zoomOut || noopFunction,
    resetZoom: manager?.resetZoom || noopFunction,
    rotate: manager?.rotate || noopFunction,
    ...state,
  };
};
