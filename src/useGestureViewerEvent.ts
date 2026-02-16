import { useEffect } from 'react';

import type GestureViewerManager from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';
import type { GestureViewerEventCallback, GestureViewerEventType } from './types';

/**
 * Hook for subscribing to GestureViewer events on the default instance.
 *
 * This hook allows you to listen to specific events from the default GestureViewer instance
 * (with ID 'default'), such as zoom changes or rotation changes. Events are automatically
 * throttled to prevent excessive callback invocations during gestures.
 *
 * @param eventType - The type of event to listen for
 * @param callback - Function to call when the event occurs
 *
 * @example
 * ```tsx
 * // Listen to zoom changes on the default instance (ID: 'default')
 * useGestureViewerEvent('zoomChange', (data) => {
 *   console.log(`Zoom changed from ${data.previousScale} to ${data.scale}`);
 * });
 *
 * // Listen to rotation changes on the default instance (ID: 'default')
 * useGestureViewerEvent('rotationChange', (data) => {
 *   console.log(`Rotation changed from ${data.previousRotation}° to ${data.rotation}°`);
 * });
 * ```
 */
export function useGestureViewerEvent<T extends GestureViewerEventType>(
  eventType: T,
  callback: GestureViewerEventCallback<T>,
): void;

/**
 * Hook for subscribing to GestureViewer events with a specific instance ID.
 *
 * Use this overload when you have multiple GestureViewer instances and need
 * to listen to events from a specific one.
 *
 * @param id - The unique identifier of the GestureViewer instance
 * @param eventType - The type of event to listen for
 * @param callback - Function to call when the event occurs
 *
 * @example
 * ```tsx
 * // Listen to zoom changes on a specific instance
 * useGestureViewerEvent('gallery', 'zoomChange', (data) => {
 *   console.log(`Gallery zoom: ${data.scale}x`);
 * });
 *
 * // Listen to rotation changes on a modal viewer
 * useGestureViewerEvent('modal-viewer', 'rotationChange', (data) => {
 *   updateRotationIndicator(data.rotation);
 * });
 * ```
 */
export function useGestureViewerEvent<T extends GestureViewerEventType>(
  id: string,
  eventType: T,
  callback: GestureViewerEventCallback<T>,
): void;

/**
 * Implementation of the useGestureViewerEvent hook.
 *
 * @internal
 */
export function useGestureViewerEvent<T extends GestureViewerEventType>(
  idOrEventType: string | T,
  eventTypeOrCallback: T | GestureViewerEventCallback<T>,
  callback?: GestureViewerEventCallback<T>,
) {
  const id = typeof idOrEventType === 'string' && callback ? idOrEventType : 'default';
  const eventType =
    typeof idOrEventType === 'string' && callback
      ? (eventTypeOrCallback as T)
      : (idOrEventType as T);
  const finalCallback = callback || (eventTypeOrCallback as GestureViewerEventCallback<T>);

  useEffect(() => {
    let unsubscribeFromManager: (() => void) | null = null;

    const handleManagerChange = (manager: GestureViewerManager | null) => {
      unsubscribeFromManager?.();
      unsubscribeFromManager = null;

      if (manager) {
        unsubscribeFromManager = manager.addEventListener(eventType, finalCallback);
      }
    };

    const unsubscribeFromRegistry = registry.subscribeToManager(id, handleManagerChange);

    return () => {
      unsubscribeFromRegistry();
      unsubscribeFromManager?.();
    };
  }, [id, eventType, finalCallback]);
}
