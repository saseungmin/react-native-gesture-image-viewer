import { act, renderHook } from '@testing-library/react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type {
  UseGestureViewerPagingArgs,
  UseGestureViewerPagingResult,
} from '../useGestureViewerPaging.types';
import { useGestureViewerPaging } from '../useGestureViewerPaging.web';

function createScrollEvent(offsetX: number): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: {
      contentOffset: { x: offsetX, y: 0 },
    },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

function createSharedValue(value: number): SharedValue<number> {
  return {
    get: () => value,
    set: jest.fn(),
  } as unknown as SharedValue<number>;
}

function createArgs(
  overrides: Partial<UseGestureViewerPagingArgs> = {},
): UseGestureViewerPagingArgs {
  return {
    adjustedInitialIndex: 0,
    autoPlay: false,
    autoPlayInterval: 3000,
    currentIndex: 0,
    dataLength: 3,
    enableDoubleTapZoom: true,
    enableHorizontalSwipe: true,
    enableLoop: false,
    height: 480,
    isRotated: false,
    isZoomed: false,
    itemSpacing: 0,
    manager: null,
    maxZoomScale: 2,
    scale: createSharedValue(1),
    scrollTo: jest.fn(),
    syncCurrentIndex: jest.fn(),
    syncPendingIndex: jest.fn(),
    translateX: createSharedValue(0),
    translateY: createSharedValue(0),
    width: 320,
    ...overrides,
  };
}

describe('useGestureViewerPaging web active state', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps the previous cell active until the web scroll settles', async () => {
    const syncCurrentIndex = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(createArgs({ syncCurrentIndex })),
    );

    expect(result.current.activeListIndex).toBe(0);

    await act(async () => {
      result.current.onScroll?.(createScrollEvent(320));
    });

    expect(result.current.activeListIndex).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(180);
    });

    expect(syncCurrentIndex).toHaveBeenCalledWith(1);
    expect(result.current.activeListIndex).toBe(1);
  });

  it('resets the active cell when the adjusted initial index changes', async () => {
    const { rerender, result } = await renderHook<
      UseGestureViewerPagingResult,
      { adjustedInitialIndex: number }
    >(({ adjustedInitialIndex }) => useGestureViewerPaging(createArgs({ adjustedInitialIndex })), {
      initialProps: { adjustedInitialIndex: 0 },
    });

    expect(result.current.activeListIndex).toBe(0);

    await rerender({ adjustedInitialIndex: 2 });

    expect(result.current.activeListIndex).toBe(2);
  });
});
