import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils';

import { PAGE_TRANSITION_CONFIG } from '../gestureViewerAnimation';
import { useGestureViewerPaging } from '../useGestureViewerPaging';

const createPagingOptions = ({
  clearPendingWebSingleTap = jest.fn(),
  commitVirtualIndexOnly = jest.fn(),
  currentIndex = 0,
  horizontalSwipeDistanceThresholdRatio = 0.25,
  horizontalSwipeEnabled = true,
  horizontalSwipeVelocityThreshold = 800,
  initialPage = 0,
}: {
  clearPendingWebSingleTap?: jest.Mock;
  commitVirtualIndexOnly?: jest.Mock;
  currentIndex?: number;
  horizontalSwipeDistanceThresholdRatio?: number;
  horizontalSwipeEnabled?: boolean;
  horizontalSwipeVelocityThreshold?: number;
  initialPage?: number;
} = {}) => ({
  centerVirtualIndex: 0,
  clearPendingWebSingleTap,
  commitVirtualIndexOnly,
  currentIndex,
  dataLength: 4,
  enableLoop: false,
  horizontalSwipeDistanceThresholdRatio,
  horizontalSwipeEnabled,
  horizontalSwipeVelocityThreshold,
  initialPage,
  isPinching: false,
  isRotated: false,
  isTriggerOpening: false,
  isZoomed: false,
  pageStride: 320,
  width: 320,
});

type PagingResult = ReturnType<typeof useGestureViewerPaging>;
type PagingOptions = ReturnType<typeof createPagingOptions>;

function PagingGestureHarness({
  onResult,
  options,
}: {
  onResult: (result: PagingResult) => void;
  options: PagingOptions;
}) {
  const result = useGestureViewerPaging(options);

  onResult(result);

  return React.createElement(
    GestureHandlerRootView,
    null,
    React.createElement(
      GestureDetector,
      { gesture: result.horizontalPagingGesture },
      React.createElement(View, { testID: 'paging-gesture-target' }),
    ),
  );
}

async function renderPagingGesture(options: PagingOptions) {
  const results: PagingResult[] = [];

  const rendered = await render(
    React.createElement(PagingGestureHarness, {
      onResult: (result) => results.push(result),
      options,
    }),
  );

  await waitFor(() => {
    expect(results.at(-1)).toBeDefined();
  });

  return {
    get result() {
      const result = results.at(-1);

      if (!result) {
        throw new Error('Paging hook result was not captured');
      }

      return result;
    },
    rendered,
  };
}

async function advancePageTransition() {
  await act(async () => {
    jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration);
  });
}

describe('useGestureViewerPaging commands', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('snaps to a virtual page and clears transition state immediately', async () => {
    const clearPendingWebSingleTap = jest.fn();
    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(
        createPagingOptions({
          clearPendingWebSingleTap,
          commitVirtualIndexOnly,
        }),
      ),
    );

    await act(async () => {
      result.current.snapToVirtualPage(2);
    });

    expect(result.current.visualPage.get()).toBe(2);
    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(2);
    expect(result.current.isPageTransitioningRef.current).toBe(false);
    expect(result.current.pageTransitionLocked.get()).toBe(false);
    expect(clearPendingWebSingleTap).toHaveBeenCalledTimes(1);
  });

  it('animates to a virtual page and clears transition state on finish', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(
        createPagingOptions({
          commitVirtualIndexOnly,
        }),
      ),
    );

    await act(async () => {
      result.current.animateToVirtualPage(3);
    });

    expect(result.current.isPageTransitioningRef.current).toBe(true);
    expect(result.current.pageTransitionLocked.get()).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration);
    });

    expect(result.current.visualPage.get()).toBe(3);
    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(3);
    expect(result.current.isPageTransitioningRef.current).toBe(false);
    expect(result.current.pageTransitionLocked.get()).toBe(false);
  });

  it('cancels an active paging animation without committing a target', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(
        createPagingOptions({
          commitVirtualIndexOnly,
        }),
      ),
    );

    await act(async () => {
      result.current.animateToVirtualPage(3);
    });

    await act(async () => {
      result.current.cancelPagingInteraction();
    });

    expect(commitVirtualIndexOnly).not.toHaveBeenCalled();
    expect(result.current.isPageTransitioningRef.current).toBe(false);
    expect(result.current.pageTransitionLocked.get()).toBe(false);
  });
});

describe('useGestureViewerPaging horizontal gesture thresholds', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('settles at the custom distance boundary and commits beyond it', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderPagingGesture(
      createPagingOptions({
        commitVirtualIndexOnly,
        horizontalSwipeDistanceThresholdRatio: 0.5,
        horizontalSwipeVelocityThreshold: 100_000,
      }),
    );

    await act(async () => {
      fireGestureHandler(result.horizontalPagingGesture, [{ translationX: -160, velocityX: 0 }]);
    });
    await advancePageTransition();

    expect(commitVirtualIndexOnly).not.toHaveBeenCalled();

    await act(async () => {
      fireGestureHandler(result.horizontalPagingGesture, [{ translationX: -161, velocityX: 0 }]);
    });
    await advancePageTransition();

    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(1);
  });

  it('settles at the custom velocity boundary and commits beyond it', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderPagingGesture(
      createPagingOptions({
        commitVirtualIndexOnly,
        horizontalSwipeDistanceThresholdRatio: 10,
        horizontalSwipeVelocityThreshold: 100,
      }),
    );

    await act(async () => {
      fireGestureHandler(result.horizontalPagingGesture, [{ translationX: -10, velocityX: -100 }]);
    });
    await advancePageTransition();

    expect(commitVirtualIndexOnly).not.toHaveBeenCalled();

    await act(async () => {
      fireGestureHandler(result.horizontalPagingGesture, [{ translationX: -10, velocityX: -101 }]);
    });
    await advancePageTransition();

    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(1);
  });

  it('uses custom thresholds for previous-page movement', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderPagingGesture(
      createPagingOptions({
        commitVirtualIndexOnly,
        currentIndex: 1,
        horizontalSwipeDistanceThresholdRatio: 0.5,
        horizontalSwipeVelocityThreshold: 100_000,
        initialPage: 0,
      }),
    );

    await act(async () => {
      fireGestureHandler(result.horizontalPagingGesture, [{ translationX: 161, velocityX: 0 }]);
    });
    await advancePageTransition();

    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(-1);
  });

  it('releases active paging immediately when a pinch adds a second pointer', async () => {
    const { result } = await renderHook(() => useGestureViewerPaging(createPagingOptions()));
    const gesture = result.current.horizontalPagingGesture;

    await act(async () => {
      gesture.handlers.onStart?.({} as never);
      gesture.handlers.onUpdate?.({ translationX: -64 } as never);
    });

    expect(result.current.pageTransitionLocked.get()).toBe(true);
    expect(result.current.visualPage.get()).toBe(0.2);

    const stateManager = { fail: jest.fn() };

    await act(async () => {
      gesture.handlers.onTouchesDown?.({ numberOfTouches: 2 } as never, stateManager as never);
    });

    expect(stateManager.fail).toHaveBeenCalledTimes(1);
    expect(result.current.pageTransitionLocked.get()).toBe(false);

    await act(async () => {
      gesture.handlers.onFinalize?.({} as never, false);
    });

    expect(result.current.pageTransitionLocked.get()).toBe(false);
  });

  it('disables the pan gesture when horizontal swipe is disabled', async () => {
    const { result } = await renderHook(() =>
      useGestureViewerPaging(createPagingOptions({ horizontalSwipeEnabled: false })),
    );
    const gestureConfig = result.current.horizontalPagingGesture.config;

    expect(gestureConfig.enabled).toBe(false);
  });
});
