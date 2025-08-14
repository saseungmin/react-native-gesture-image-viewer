import { useEffect, useMemo, useRef } from 'react';
import type GestureViewerManager from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';
import type { GestureViewerController } from './types';

/**
 * Hook to control the gesture viewer programmatically.
 *
 * @param id - Viewer instance identifier (default: 'default')
 * @returns Methods for controlling the viewer
 *
 * **Available methods:**
 * - `goToIndex(index: number)` - Navigate to specific index (0 to totalCount-1)
 * - `goToPrevious()` - Navigate to previous item
 * - `goToNext()` - Navigate to next item
 * - `zoomIn(multiplier?: number)` - Zoom in (default: 0.25)
 * - `zoomOut(multiplier?: number)` - Zoom out (default: 0.25)
 * - `resetZoom(scale?: number)` - Reset zoom level (default: 1.0)
 * - `rotate(angle?: RotationAngle, clockwise?: boolean)` - Rotate content (default: 90° clockwise)
 *
 * @example
 * ```tsx
 * const controller = useGestureViewerController();
 *
 * // Navigate to specific index
 * controller.goToIndex(2);
 *
 * // Go to next image
 * controller.goToNext();
 *
 * // Zoom in by 25%
 * controller.zoomIn();
 *
 * // Zoom out by 50%
 * controller.zoomOut(0.5);
 *
 * // Reset to original size
 * controller.resetZoom();
 *
 * // Rotate 90 degrees clockwise
 * controller.rotate();
 *
 * // Rotate 180 degrees
 * controller.rotate(180);
 * ```
 */
export const useGestureViewerController = (id = 'default'): GestureViewerController => {
  const managerRef = useRef<GestureViewerManager | null>(null);

  useEffect(() => {
    const unsubscribe = registry.subscribeToManager(id, (manager) => {
      managerRef.current = manager;
    });

    return unsubscribe;
  }, [id]);

  return useMemo<GestureViewerController>(
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
};
