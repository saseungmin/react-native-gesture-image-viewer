import type { SharedValue } from 'react-native-reanimated';

import GestureViewerManager from '../GestureViewerManager';

const createSharedValue = (initial: number) => {
  let value = initial;

  return {
    get: () => value,
    set: (next: number) => {
      const animatedValue = next as unknown as { current?: number; toValue?: number };
      value = animatedValue.current ?? animatedValue.toValue ?? next;
    },
  } as SharedValue<number>;
};

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

  it('notifies event listener presence changes', () => {
    const manager = new GestureViewerManager();
    const presenceListener = jest.fn();
    const zoomListener = jest.fn();

    const unsubscribePresence = manager.subscribeToEventListenerPresence(presenceListener);

    expect(presenceListener).toHaveBeenCalledWith('zoomChange', false);
    expect(presenceListener).toHaveBeenCalledWith('rotationChange', false);
    expect(presenceListener).toHaveBeenCalledWith('tap', false);

    presenceListener.mockClear();

    const unsubscribeZoom = manager.addEventListener('zoomChange', zoomListener);

    expect(manager.hasEventListeners('zoomChange')).toBe(true);
    expect(presenceListener).toHaveBeenCalledWith('zoomChange', true);

    presenceListener.mockClear();
    unsubscribeZoom();

    expect(manager.hasEventListeners('zoomChange')).toBe(false);
    expect(presenceListener).toHaveBeenCalledWith('zoomChange', false);

    unsubscribePresence();
  });
});

describe('GestureViewerManager navigation adapter', () => {
  it('delegates controller navigation to the registered adapter', () => {
    const manager = new GestureViewerManager();
    const adapter = {
      goToIndex: jest.fn(),
      goToNext: jest.fn(),
      goToPrevious: jest.fn(),
    };

    manager.setNavigationAdapter(adapter);
    manager.goToIndex(2, { animated: false });

    expect(adapter.goToIndex).toHaveBeenCalledWith(2, { animated: false });
  });

  it('keeps programmatic navigation available regardless of horizontal gesture settings', () => {
    const manager = new GestureViewerManager();
    const adapter = {
      goToIndex: jest.fn(),
      goToNext: jest.fn(),
      goToPrevious: jest.fn(),
    };

    manager.setNavigationAdapter(adapter);
    manager.goToIndex(1);

    expect(adapter.goToIndex).toHaveBeenCalledWith(1, undefined);
  });

  it('delegates next and previous without owning paging state', () => {
    const manager = new GestureViewerManager();
    const adapter = {
      goToIndex: jest.fn(),
      goToNext: jest.fn(),
      goToPrevious: jest.fn(),
    };

    manager.setNavigationAdapter(adapter);
    manager.goToNext();
    manager.goToPrevious();

    expect(adapter.goToNext).toHaveBeenCalledTimes(1);
    expect(adapter.goToPrevious).toHaveBeenCalledTimes(1);
  });
});

describe('GestureViewerManager state reader', () => {
  it('publishes state from the registered state reader', () => {
    const manager = new GestureViewerManager();
    const listener = jest.fn();

    manager.setStateReader(() => ({ currentIndex: 2, totalCount: 5 }));
    manager.subscribe(listener);
    manager.notifyStateChange();

    expect(manager.getState()).toEqual({ currentIndex: 2, totalCount: 5 });
    expect(listener).toHaveBeenCalledWith({ currentIndex: 2, totalCount: 5 });
  });
});

describe('GestureViewerManager content-aware zoom', () => {
  it('uses active content dimensions and preserves no-dim fallback', () => {
    const manager = new GestureViewerManager();
    const scale = createSharedValue(1);
    const x = createSharedValue(0);
    const y = createSharedValue(426);
    manager.setWidth(393);
    manager.setHeight(852);
    manager.setZoomSharedValues({
      scale,
      translateX: x,
      translateY: y,
      maxZoomScale: 2,
      contentWidth: createSharedValue(393),
      contentHeight: createSharedValue(616),
    });
    manager.zoomIn(1);
    expect(y.get()).toBe(190);
    manager.zoomOut(1);
    expect(y.get()).toBe(0);
    const fallback = new GestureViewerManager();
    const fs = createSharedValue(1);
    const fy = createSharedValue(426);
    fallback.setWidth(393);
    fallback.setHeight(852);
    fallback.setZoomSharedValues({
      scale: fs,
      translateX: createSharedValue(0),
      translateY: fy,
      maxZoomScale: 2,
    });
    fallback.zoomIn(1);
    expect(fy.get()).toBe(426);
  });
});
