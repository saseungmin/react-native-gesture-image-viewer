import type { SharedValue } from 'react-native-reanimated';

import GestureViewerManager from '../GestureViewerManager';

function createSharedValue(initialValue: number): SharedValue<number> {
  let value = initialValue;

  return {
    get: () => value,
    set: (nextValue: number) => {
      const animatedValue = nextValue as unknown as { current?: number; toValue?: number };

      value = animatedValue.current ?? animatedValue.toValue ?? nextValue;
    },
  } as SharedValue<number>;
}

function configureZoomManager({
  contentHeight = 616,
  contentWidth = 393,
  itemSpacing = 0,
  scale = 1,
  translateX = 0,
  translateY = 426,
  useContentDimensions = true,
}: {
  contentHeight?: number;
  contentWidth?: number;
  itemSpacing?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
  useContentDimensions?: boolean;
} = {}) {
  const manager = new GestureViewerManager();
  const sharedScale = createSharedValue(scale);
  const sharedTranslateX = createSharedValue(translateX);
  const sharedTranslateY = createSharedValue(translateY);
  const sharedContentWidth = createSharedValue(contentWidth);
  const sharedContentHeight = createSharedValue(contentHeight);

  manager.setPagingStride(393 + itemSpacing);
  manager.setViewportWidth(393);
  manager.setHeight(852);
  manager.setZoomSharedValues({
    contentHeight: useContentDimensions ? sharedContentHeight : undefined,
    contentWidth: useContentDimensions ? sharedContentWidth : undefined,
    maxZoomScale: 2,
    scale: sharedScale,
    translateX: sharedTranslateX,
    translateY: sharedTranslateY,
  });

  return {
    contentHeight: sharedContentHeight,
    contentWidth: sharedContentWidth,
    manager,
    scale: sharedScale,
    translateX: sharedTranslateX,
    translateY: sharedTranslateY,
  };
}

describe('GestureViewerManager tap events', () => {
  it('emits tap events to tap listeners and supports unsubscribe', () => {
    const manager = new GestureViewerManager();
    const tapListener = jest.fn();
    const zoomListener = jest.fn();

    const unsubscribeTap = manager.addEventListener('tap', tapListener);
    manager.addEventListener('zoomChange', zoomListener);

    manager.emitTap({ kind: 'single', x: 12, y: 34, index: 2 });

    expect(tapListener).toHaveBeenCalledTimes(1);
    expect(tapListener).toHaveBeenCalledWith({ kind: 'single', x: 12, y: 34, index: 2 });
    expect(zoomListener).not.toHaveBeenCalled();

    unsubscribeTap();
    manager.emitTap({ kind: 'single', x: 1, y: 2, index: 0 });

    expect(tapListener).toHaveBeenCalledTimes(1);
  });
});

describe('GestureViewerManager content-aware zoom bounds', () => {
  it('clamps zoom-in with fitted content dimensions instead of the paging stride', () => {
    const { manager, scale, translateY } = configureZoomManager({ itemSpacing: 24 });

    manager.zoomIn(1);

    expect(scale.get()).toBe(2);
    expect(translateY.get()).toBe(190);
  });

  it('keeps item spacing in navigation while zoom bounds use the true viewport width', () => {
    const { manager } = configureZoomManager({ itemSpacing: 24 });
    const scrollTo = jest.fn();

    manager.setDataLength(2);
    manager.setListRef({ scrollTo });
    manager.goToIndex(1);

    expect(scrollTo).toHaveBeenCalledWith({ animated: true, x: 417 });
  });

  it('recenters translations when zooming out to scale one', () => {
    const { manager, scale, translateX, translateY } = configureZoomManager({
      scale: 2,
      translateY: 190,
    });

    manager.zoomOut(1);

    expect(scale.get()).toBe(1);
    expect(translateX.get()).toBe(0);
    expect(translateY.get()).toBe(0);
  });

  it('recenters an axis when zoom-out makes fitted content smaller than the viewport', () => {
    const { manager, scale, translateY } = configureZoomManager({
      scale: 1.4,
      translateY: 50,
    });

    manager.zoomOut(0.25);

    expect(scale.get()).toBeCloseTo(1.12);
    expect(translateY.get()).toBe(0);
  });

  it('uses viewport-cell bounds when no active content dimensions are registered', () => {
    const { manager, translateY } = configureZoomManager({
      translateY: 999,
      useContentDimensions: false,
    });

    manager.zoomIn(1);

    expect(translateY.get()).toBe(426);
  });
});
