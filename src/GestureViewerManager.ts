import { type SharedValue, withTiming } from 'react-native-reanimated';

import type {
  GestureViewerEventCallback,
  GestureViewerEventData,
  GestureViewerEventType,
  GestureViewerState,
} from './types';
import { animateZoom } from './utils/animateZoom';

export type GestureViewerNavigationOptions = {
  animated?: boolean;
};

export type GestureViewerNavigationAdapter = {
  goToIndex: (index: number, options?: GestureViewerNavigationOptions) => void;
  goToNext: () => void;
  goToPrevious: () => void;
};

export type GestureViewerStateReader = () => GestureViewerState;

type ZoomSharedValuesOptions = {
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  maxZoomScale: number;
  viewportSize?: SharedValue<{ width: number; height: number }>;
  contentWidth?: SharedValue<number>;
  contentHeight?: SharedValue<number>;
};

type GestureViewerEventListenerPresenceCallback = (
  eventType: GestureViewerEventType,
  hasListeners: boolean,
) => void;

const DEFAULT_STATE_READER: GestureViewerStateReader = () => ({
  currentIndex: 0,
  totalCount: 0,
});

class GestureViewerManager {
  private width = 0;
  private height = 0;
  private maxZoomScale = 2;
  private navigationAdapter: GestureViewerNavigationAdapter | null = null;
  private stateReader = DEFAULT_STATE_READER;

  private scale: SharedValue<number> | null = null;
  private rotation: SharedValue<number> | null = null;
  private translateX: SharedValue<number> | null = null;
  private translateY: SharedValue<number> | null = null;
  private viewportSize: SharedValue<{ width: number; height: number }> | null = null;
  private contentWidth: SharedValue<number> | null = null;
  private contentHeight: SharedValue<number> | null = null;

  private listeners = new Set<(state: GestureViewerState) => void>();
  private eventListeners = new Map<GestureViewerEventType, Set<(data: any) => void>>();
  private eventListenerPresenceSubscribers = new Set<GestureViewerEventListenerPresenceCallback>();

  private notifyListeners() {
    const state = this.getState();

    this.listeners.forEach((listener) => listener(state));
  }

  subscribe(listener: (state: GestureViewerState) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  addEventListener<T extends GestureViewerEventType>(
    eventType: T,
    callback: GestureViewerEventCallback<T>,
  ) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)?.add(callback);
    this.notifyEventListenerPresence(eventType);

    return () => {
      const listeners = this.eventListeners.get(eventType);

      if (listeners) {
        listeners.delete(callback);

        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }

      this.notifyEventListenerPresence(eventType);
    };
  }

  subscribeToEventListenerPresence(callback: GestureViewerEventListenerPresenceCallback) {
    this.eventListenerPresenceSubscribers.add(callback);

    this.notifyEventListenerPresenceSubscriber(callback, 'zoomChange');
    this.notifyEventListenerPresenceSubscriber(callback, 'rotationChange');
    this.notifyEventListenerPresenceSubscriber(callback, 'tap');

    return () => {
      this.eventListenerPresenceSubscribers.delete(callback);
    };
  }

  hasEventListeners(eventType: GestureViewerEventType) {
    return (this.eventListeners.get(eventType)?.size ?? 0) > 0;
  }

  private notifyEventListenerPresence(eventType: GestureViewerEventType) {
    this.eventListenerPresenceSubscribers.forEach((callback) => {
      this.notifyEventListenerPresenceSubscriber(callback, eventType);
    });
  }

  private notifyEventListenerPresenceSubscriber(
    callback: GestureViewerEventListenerPresenceCallback,
    eventType: GestureViewerEventType,
  ) {
    callback(eventType, this.hasEventListeners(eventType));
  }

  private emitEvent<T extends GestureViewerEventType>(
    eventType: T,
    data: GestureViewerEventData[T],
  ) {
    const listeners = this.eventListeners.get(eventType);

    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  emitZoomChange = (scale: number, previousScale: number | null) => {
    this.emitEvent('zoomChange', { scale, previousScale });
  };

  emitRotationChange = (rotation: number, previousRotation: number | null) => {
    this.emitEvent('rotationChange', { rotation, previousRotation });
  };

  emitTap = (data: GestureViewerEventData['tap']) => {
    this.emitEvent('tap', data);
  };

  getState(): GestureViewerState {
    return this.stateReader();
  }

  setWidth(width: number) {
    this.width = width;
  }

  setHeight(height: number) {
    this.height = height;
  }

  setNavigationAdapter(adapter: GestureViewerNavigationAdapter | null) {
    this.navigationAdapter = adapter;
  }

  setStateReader(reader: GestureViewerStateReader | null) {
    this.stateReader = reader ?? DEFAULT_STATE_READER;
  }

  setZoomSharedValues({
    scale,
    translateX,
    translateY,
    maxZoomScale,
    viewportSize,
    contentWidth,
    contentHeight,
  }: ZoomSharedValuesOptions) {
    this.scale = scale;
    this.translateX = translateX;
    this.translateY = translateY;
    this.maxZoomScale = maxZoomScale;
    this.viewportSize = viewportSize ?? null;
    this.contentWidth = contentWidth ?? null;
    this.contentHeight = contentHeight ?? null;
  }

  notifyStateChange() {
    this.notifyListeners();
  }

  setRotation(rotation: SharedValue<number>) {
    this.rotation = rotation;
  }

  rotate = (angle: 0 | 90 | 180 | 270 | 360 = 90, clockwise = true) => {
    const MAX_ANGLE = 360;

    const currentRotation = this.rotation?.get();

    if (
      currentRotation === undefined ||
      angle < 0 ||
      angle > MAX_ANGLE ||
      (angle !== 0 && currentRotation % angle !== 0 && angle !== 360)
    ) {
      return;
    }

    if (angle === 0) {
      const nextAngle = Math.floor(currentRotation / MAX_ANGLE) * MAX_ANGLE;

      this.rotation?.set(withTiming(clockwise ? nextAngle : nextAngle - MAX_ANGLE));
      return;
    }

    if (angle === 360) {
      this.rotation?.set(
        withTiming(clockwise ? currentRotation + MAX_ANGLE : currentRotation - MAX_ANGLE),
      );
      return;
    }

    const nextAngle = clockwise ? currentRotation + angle : currentRotation - angle;

    this.rotation?.set(withTiming(nextAngle));
  };

  zoomIn = (multiplier = 0.25) => {
    if (
      !this.scale ||
      !this.translateX ||
      !this.translateY ||
      multiplier < 0.01 ||
      multiplier > 1
    ) {
      return;
    }

    const nextScale = Math.min(this.scale.get() * (1 + multiplier), this.maxZoomScale);

    this.animateZoomToScale(nextScale);
  };

  zoomOut = (multiplier = 0.25) => {
    if (
      !this.scale ||
      !this.translateX ||
      !this.translateY ||
      multiplier < 0.01 ||
      multiplier > 1
    ) {
      return;
    }

    const nextScale = Math.max(this.scale.get() / (1 + multiplier), 1);

    this.animateZoomToScale(nextScale);
  };

  resetZoom = (scale = 1) => {
    if (
      !this.scale ||
      !this.translateX ||
      !this.translateY ||
      scale <= 0 ||
      scale > this.maxZoomScale
    ) {
      return;
    }

    this.scale.set(withTiming(scale));
    this.translateX.set(withTiming(0));
    this.translateY.set(withTiming(0));
  };

  goToIndex = (index: number, options?: GestureViewerNavigationOptions) => {
    if (!this.navigationAdapter) {
      return;
    }

    this.navigationAdapter.goToIndex(index, options);
  };

  goToPrevious = () => {
    if (!this.navigationAdapter) {
      return;
    }

    this.navigationAdapter.goToPrevious();
  };

  goToNext = () => {
    if (!this.navigationAdapter) {
      return;
    }

    this.navigationAdapter.goToNext();
  };

  cleanUp() {
    this.listeners.clear();
    this.navigationAdapter = null;
    this.stateReader = DEFAULT_STATE_READER;
    this.width = 0;
    this.height = 0;
    this.maxZoomScale = 2;
    this.scale = null;
    this.translateX = null;
    this.translateY = null;
    this.rotation = null;
    this.viewportSize = null;
    this.contentWidth = null;
    this.contentHeight = null;
    this.eventListeners.clear();
    this.eventListenerPresenceSubscribers.clear();
  }

  private animateZoomToScale = (nextScale: number) => {
    if (!this.scale || !this.translateX || !this.translateY) return;
    animateZoom({
      width: this.width,
      height: this.height,
      viewportSize: this.viewportSize,
      contentWidth: this.contentWidth,
      contentHeight: this.contentHeight,
      rotation: this.rotation,
      scale: this.scale,
      translateX: this.translateX,
      translateY: this.translateY,
      target: {
        scale: nextScale,
        translateX: this.translateX.get(),
        translateY: this.translateY.get(),
      },
    });
  };
}

export default GestureViewerManager;
