import { act, renderHook } from '@testing-library/react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { useGestureViewerPaging } from '../useGestureViewerPaging';
import type {
  UseGestureViewerPagingArgs,
  UseGestureViewerPagingResult,
} from '../useGestureViewerPaging.types';

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

describe('useGestureViewerPaging native active state', () => {
  it('resets the active cell when the page layout changes', async () => {
    const { rerender, result } = await renderHook<UseGestureViewerPagingResult, { width: number }>(
      ({ width }) => useGestureViewerPaging(createArgs({ adjustedInitialIndex: 1, width })),
      {
        initialProps: { width: 320 },
      },
    );

    await act(async () => {
      result.current.onMomentumScrollEnd?.(createScrollEvent(640));
    });

    expect(result.current.activeListIndex).toBe(2);

    await rerender({ width: 400 });

    expect(result.current.activeListIndex).toBe(1);
  });

  it('keeps the settled cell when a layout change does not reschedule initial scrolling', async () => {
    const { rerender, result } = await renderHook<UseGestureViewerPagingResult, { width: number }>(
      ({ width }) => useGestureViewerPaging(createArgs({ width })),
      {
        initialProps: { width: 320 },
      },
    );

    await act(async () => {
      result.current.onMomentumScrollEnd?.(createScrollEvent(640));
    });

    expect(result.current.activeListIndex).toBe(2);

    await rerender({ width: 400 });

    expect(result.current.activeListIndex).toBe(2);
  });

  it('resets the active cell when the data length changes', async () => {
    const { rerender, result } = await renderHook<
      UseGestureViewerPagingResult,
      { dataLength: number }
    >(({ dataLength }) => useGestureViewerPaging(createArgs({ dataLength })), {
      initialProps: { dataLength: 3 },
    });

    await act(async () => {
      result.current.onMomentumScrollEnd?.(createScrollEvent(640));
    });

    expect(result.current.activeListIndex).toBe(2);

    await rerender({ dataLength: 1 });

    expect(result.current.activeListIndex).toBe(0);
  });
});
