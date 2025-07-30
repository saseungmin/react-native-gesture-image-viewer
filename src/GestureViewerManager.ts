import { type SharedValue, withTiming } from 'react-native-reanimated';
import type {
  GestureViewerControllerState,
  GestureViewerEventCallback,
  GestureViewerEventData,
  GestureViewerEventType,
} from './types';
import { createBoundsConstraint, createScrollAction } from './utils';

class GestureViewerManager {
  private currentIndex = 0;
  private dataLength = 0;
  private width = 0;
  private height = 0;
  private maxZoomScale = 2;
  private enableSwipeGesture = true;
  private enableLoop = false;
  private listRef: any | null = null;

  private scale: SharedValue<number> | null = null;
  private rotation: SharedValue<number> | null = null;
  private translateX: SharedValue<number> | null = null;
  private translateY: SharedValue<number> | null = null;

  private loopCallback: (() => void) | null = null;

  private listeners = new Set<(state: GestureViewerControllerState) => void>();
  private eventListeners = new Map<GestureViewerEventType, Set<(data: any) => void>>();

  private notifyListeners() {
    const state = this.getState();

    this.listeners.forEach((listener) => listener(state));
  }

  subscribe(listener: (state: GestureViewerControllerState) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  addEventListener<T extends GestureViewerEventType>(eventType: T, callback: GestureViewerEventCallback<T>) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)?.add(callback);

    return () => {
      const listeners = this.eventListeners.get(eventType);

      if (listeners) {
        listeners.delete(callback);

        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  private emitEvent<T extends GestureViewerEventType>(eventType: T, data: GestureViewerEventData[T]) {
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

  getState() {
    return {
      currentIndex: this.currentIndex,
      totalCount: this.dataLength,
    };
  }

  setEnableLoop(enabled: boolean) {
    this.enableLoop = enabled;
  }

  setWidth(width: number) {
    this.width = width;
  }

  setHeight(height: number) {
    this.height = height;
  }

  setListRef(ref: any) {
    this.listRef = ref;
  }

  setDataLength(length: number) {
    this.dataLength = length;
  }

  setEnableSwipeGesture(enabled: boolean) {
    this.enableSwipeGesture = enabled;
  }

  setCurrentIndex(index: number) {
    if (index !== this.currentIndex) {
      this.currentIndex = index;
    }
  }

  setZoomSharedValues(
    scale: SharedValue<number>,
    translateX: SharedValue<number>,
    translateY: SharedValue<number>,
    maxZoomScale: number,
  ) {
    this.scale = scale;
    this.translateX = translateX;
    this.translateY = translateY;
    this.maxZoomScale = maxZoomScale;
  }

  notifyStateChange() {
    this.notifyListeners();
  }

  setRotation(rotation: SharedValue<number>) {
    this.rotation = rotation;
  }

  rotate = (angle: 0 | 90 | 180 | 270 | 360 = 90, clockwise = true) => {
    const MAX_ANGLE = 360;

    if (
      !this.rotation ||
      angle < 0 ||
      angle > MAX_ANGLE ||
      (angle !== 0 && this.rotation.value % angle !== 0 && angle !== 360)
    ) {
      return;
    }

    if (angle === 0) {
      const nextAngle = Math.floor(this.rotation.value / MAX_ANGLE) * MAX_ANGLE;

      this.rotation.value = withTiming(clockwise ? nextAngle : nextAngle - MAX_ANGLE);
      return;
    }

    if (angle === 360) {
      this.rotation.value = withTiming(clockwise ? this.rotation.value + MAX_ANGLE : this.rotation.value - MAX_ANGLE);
      return;
    }

    const nextAngle = clockwise ? this.rotation.value + angle : this.rotation.value - angle;

    this.rotation.value = withTiming(nextAngle);
  };

  zoomIn = (multiplier = 0.25) => {
    if (!this.scale || !this.translateX || !this.translateY || multiplier < 0.01 || multiplier > 1) {
      return;
    }

    const nextScale = Math.min(this.scale.value * (1 + multiplier), this.maxZoomScale);

    this.scale.value = withTiming(nextScale);

    const { translateX, translateY } = createBoundsConstraint({
      width: this.width,
      height: this.height,
    })({
      translateX: this.translateX.value,
      translateY: this.translateY.value,
      scale: nextScale,
    });

    this.translateX.value = withTiming(translateX);
    this.translateY.value = withTiming(translateY);
  };

  zoomOut = (multiplier = 0.25) => {
    if (!this.scale || !this.translateX || !this.translateY || multiplier < 0.01 || multiplier > 1) {
      return;
    }

    const nextScale = Math.max(this.scale.value / (1 + multiplier), 1);

    this.scale.value = withTiming(nextScale);

    if (nextScale === 1) {
      this.translateX.value = withTiming(0);
      this.translateY.value = withTiming(0);
      return;
    }

    const { translateX, translateY } = createBoundsConstraint({
      width: this.width,
      height: this.height,
    })({
      translateX: this.translateX.value,
      translateY: this.translateY.value,
      scale: nextScale,
    });

    this.translateX.value = withTiming(translateX);
    this.translateY.value = withTiming(translateY);
  };

  resetZoom = (scale = 1) => {
    if (!this.scale || !this.translateX || !this.translateY || scale <= 0 || scale > this.maxZoomScale) {
      return;
    }

    this.scale.value = withTiming(scale);
    this.translateX.value = withTiming(0);
    this.translateY.value = withTiming(0);
  };

  goToIndex = (index: number) => {
    if (!this.enableSwipeGesture || !this.listRef) {
      return;
    }

    this.loopCallback = null;

    const { scrollTo } = createScrollAction(this.listRef, this.width);

    if (this.enableLoop && this.dataLength > 1) {
      if (index < 0) {
        this.loopCallback = () => {
          scrollTo(this.dataLength, false);
          this.updateCurrentIndex(this.dataLength - 1);
          this.loopCallback = null;
        };

        scrollTo(0, true);
        return;
      }

      if (index >= this.dataLength) {
        this.loopCallback = () => {
          scrollTo(1, false);
          this.updateCurrentIndex(0);
          this.loopCallback = null;
        };

        scrollTo(this.dataLength + 1, true);
        return;
      }

      scrollTo(index + 1, true);
      this.updateCurrentIndex(index);

      return;
    }

    if (index < 0 || index >= this.dataLength) {
      return;
    }

    scrollTo(index, true);
    this.updateCurrentIndex(index);
  };

  handleMomentumScrollEnd = (scrollIndex: number) => {
    if (!this.loopCallback) {
      return false;
    }

    if (scrollIndex === 0 || scrollIndex === this.dataLength + 1) {
      this.loopCallback();
      return true;
    }

    this.loopCallback = null;
    return true;
  };

  handleScrollBeginDrag = () => {
    this.loopCallback = null;
  };

  goToPrevious = () => {
    this.goToIndex(this.currentIndex - 1);
  };

  goToNext = () => {
    this.goToIndex(this.currentIndex + 1);
  };

  cleanUp() {
    this.loopCallback = null;
    this.listeners.clear();
    this.listRef = null;
    this.enableSwipeGesture = true;
    this.currentIndex = 0;
    this.dataLength = 0;
    this.maxZoomScale = 2;
    this.scale = null;
    this.translateX = null;
    this.translateY = null;
    this.rotation = null;
    this.eventListeners.clear();
  }

  private updateCurrentIndex = (targetIndex: number) => {
    this.currentIndex = targetIndex;
    this.notifyListeners();
  };
}

export default GestureViewerManager;
