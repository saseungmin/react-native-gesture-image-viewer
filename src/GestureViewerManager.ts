import { type SharedValue, withTiming } from 'react-native-reanimated';
import type { GestureViewerControllerState } from './types';
import { createBoundsConstraint } from './utils';

class GestureViewerManager {
  private currentIndex = 0;
  private dataLength = 0;
  private width = 0;
  private height = 0;
  private scale: SharedValue<number> | null = null;
  private translateX: SharedValue<number> | null = null;
  private translateY: SharedValue<number> | null = null;
  private maxZoomScale = 2;
  private listRef: any | null = null;
  private enableSwipeGesture = true;
  private listeners = new Set<(state: GestureViewerControllerState) => void>();
  private rotation: SharedValue<number> | null = null;

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

  getState() {
    return {
      currentIndex: this.currentIndex,
      totalCount: this.dataLength,
    };
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
    if (index < 0 || index >= this.dataLength || !this.enableSwipeGesture || !this.listRef) {
      return;
    }

    this.currentIndex = index;

    if (this.listRef.scrollToIndex) {
      this.listRef.scrollToIndex({ index, animated: true });
    } else if (this.listRef.scrollTo) {
      this.listRef.scrollTo({ x: index * this.width, animated: true });
    }

    this.notifyListeners();
  };

  goToPrevious = () => {
    if (this.currentIndex > 0) {
      this.goToIndex(this.currentIndex - 1);
    }
  };

  goToNext = () => {
    if (this.currentIndex < this.dataLength - 1) {
      this.goToIndex(this.currentIndex + 1);
    }
  };

  cleanUp() {
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
  }
}

export default GestureViewerManager;
