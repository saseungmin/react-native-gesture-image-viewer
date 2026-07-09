import { useEffect, useState, type RefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type GestureViewerManager from './GestureViewerManager';
import type { GestureViewerNavigationOptions } from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';

type UseGestureViewerManagerBridgeOptions = {
  currentIndexRef: RefObject<number>;
  dataLengthRef: RefObject<number>;
  goToIndex: (index: number, options?: GestureViewerNavigationOptions) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  hasRotationChangeListeners: SharedValue<boolean>;
  hasZoomChangeListeners: SharedValue<boolean>;
  height: number;
  id: string;
  managerRef: RefObject<GestureViewerManager | null>;
  maxZoomScale: number;
  rotation: SharedValue<number>;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  width: number;
};

/**
 * Owns the registry-to-manager bridge side effects for one viewer instance.
 */
export function useGestureViewerManagerBridge({
  currentIndexRef,
  dataLengthRef,
  goToIndex,
  goToNext,
  goToPrevious,
  hasRotationChangeListeners,
  hasZoomChangeListeners,
  height,
  id,
  managerRef,
  maxZoomScale,
  rotation,
  scale,
  translateX,
  translateY,
  width,
}: UseGestureViewerManagerBridgeOptions) {
  const [manager, setManager] = useState<GestureViewerManager | null>(null);

  useEffect(() => {
    return registry.subscribeToManager(id, (managerInstance) => {
      managerRef.current = managerInstance;
      setManager(managerInstance);
    });
  }, [id, managerRef]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setWidth(width);
    manager.setHeight(height);
    manager.setZoomSharedValues(scale, translateX, translateY, maxZoomScale);
    manager.setRotation(rotation);
  }, [height, manager, maxZoomScale, rotation, scale, translateX, translateY, width]);

  useEffect(() => {
    if (!manager) {
      hasZoomChangeListeners.set(false);
      hasRotationChangeListeners.set(false);
      return;
    }

    return manager.subscribeToEventListenerPresence((eventType, hasListeners) => {
      if (eventType === 'zoomChange') {
        hasZoomChangeListeners.set(hasListeners);
        return;
      }

      if (eventType === 'rotationChange') {
        hasRotationChangeListeners.set(hasListeners);
      }
    });
  }, [hasRotationChangeListeners, hasZoomChangeListeners, manager]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setStateReader(() => ({
      currentIndex: currentIndexRef.current,
      totalCount: dataLengthRef.current,
    }));
    manager.notifyStateChange();

    return () => {
      manager.setStateReader(null);
    };
  }, [currentIndexRef, dataLengthRef, manager]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setNavigationAdapter({
      goToIndex,
      goToNext,
      goToPrevious,
    });

    return () => {
      manager.setNavigationAdapter(null);
    };
  }, [goToIndex, goToNext, goToPrevious, manager]);
}
