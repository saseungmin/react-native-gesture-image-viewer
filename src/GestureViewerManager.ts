import { type SharedValue, withTiming } from 'react-native-reanimated';
import { createBoundsConstraint } from './utils';

export type GestureViewerManagerState = {
  currentIndex: number;
  dataLength: number;
};

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
  private listeners = new Set<(state: GestureViewerManagerState) => void>();

  private notifyListeners() {
    const state = this.getState();

    this.listeners.forEach((listener) => listener(state));
  }

  subscribe(listener: (state: GestureViewerManagerState) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return {
      currentIndex: this.currentIndex,
      dataLength: this.dataLength,
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

  /**
   * @param multiplier - The multiplier to zoom in.
   * @range 0.01 - 1
   * @default 0.25
   */
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

  /**
   * @param multiplier - The multiplier to zoom out.
   * @range 0.01 - 1
   * @default 0.25
   */
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

  /**
   * @param scale - The scale to reset to.
   * @default 1
   */
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
  }
}

export default GestureViewerManager;
