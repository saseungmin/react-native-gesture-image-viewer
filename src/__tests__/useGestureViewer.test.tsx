import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  type GestureType,
} from 'react-native-gesture-handler';
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils';

import { PAGE_TRANSITION_CONFIG } from '../gestureViewerAnimation';
import { registry } from '../GestureViewerRegistry';
import type { GestureViewerProps, GestureViewerState } from '../types';
import { useGestureViewer } from '../useGestureViewer';

type HorizontalSwipeOptions = GestureViewerProps<string>['horizontalSwipe'];

type HarnessProps = {
  horizontalSwipe?: HorizontalSwipeOptions;
  onGestureChange: (gesture: GestureType) => void;
  viewerId: string;
};

const createdManagerIds = new Set<string>();

function Harness({ horizontalSwipe, onGestureChange, viewerId }: HarnessProps) {
  const { currentIndex, dataLength, horizontalPagingGesture } = useGestureViewer({
    data: ['first', 'second', 'third', 'fourth'],
    height: 240,
    horizontalSwipe,
    id: viewerId,
    initialIndex: 0,
    width: 320,
  });

  onGestureChange(horizontalPagingGesture);

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={horizontalPagingGesture}>
        <View testID={`${viewerId}-gesture-target`} />
      </GestureDetector>
      <Text testID={`${viewerId}-state`}>
        {currentIndex}/{dataLength}
      </Text>
    </GestureHandlerRootView>
  );
}

async function renderHarness({
  horizontalSwipe,
  viewerId,
}: {
  horizontalSwipe?: HorizontalSwipeOptions;
  viewerId: string;
}) {
  registry.createManager(viewerId);
  createdManagerIds.add(viewerId);

  const gestures: GestureType[] = [];
  const rendered = await render(
    <Harness
      horizontalSwipe={horizontalSwipe}
      onGestureChange={(gesture) => gestures.push(gesture)}
      viewerId={viewerId}
    />,
  );

  await waitFor(() => {
    expect(registry.getManager(viewerId)?.getState()).toEqual({
      currentIndex: 0,
      totalCount: 4,
    });
  });

  return {
    get gesture() {
      const gesture = gestures.at(-1);

      if (!gesture) {
        throw new Error('Horizontal paging gesture was not captured');
      }

      return gesture;
    },
    rendered,
  };
}

async function rerenderHarness({
  horizontalSwipe,
  rendered,
  viewerId,
}: {
  horizontalSwipe?: HorizontalSwipeOptions;
  rendered: Awaited<ReturnType<typeof render>>;
  viewerId: string;
}) {
  const gestures: GestureType[] = [];

  await act(async () => {
    await rendered.rerender(
      <Harness
        horizontalSwipe={horizontalSwipe}
        onGestureChange={(gesture) => gestures.push(gesture)}
        viewerId={viewerId}
      />,
    );
  });

  const gesture = gestures.at(-1);

  if (!gesture) {
    throw new Error('Horizontal paging gesture was not captured after rerender');
  }

  return gesture;
}

function subscribeToManager(viewerId: string) {
  const manager = registry.getManager(viewerId);
  const listener = jest.fn<void, [GestureViewerState]>();

  if (!manager) {
    throw new Error('GestureViewer manager was not registered');
  }

  const unsubscribe = manager.subscribe(listener);

  listener.mockClear();

  return { listener, manager, unsubscribe };
}

async function fireHorizontalPan(
  gesture: GestureType,
  event: { translationX: number; velocityX: number },
) {
  await act(async () => {
    fireGestureHandler(gesture, [event]);
  });
}

async function advancePageTransition() {
  await act(async () => {
    jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration);
  });
}

describe('useGestureViewer horizontal swipe options', () => {
  afterEach(() => {
    cleanup();
    createdManagerIds.forEach((viewerId) => registry.deleteManager(viewerId));
    createdManagerIds.clear();
    jest.useRealTimers();
  });

  it('uses default thresholds when horizontalSwipe is omitted and settles at equality', async () => {
    jest.useFakeTimers();

    const viewerId = 'default-omitted';
    const { gesture } = await renderHarness({ viewerId });
    const { listener, manager, unsubscribe } = subscribeToManager(viewerId);

    await fireHorizontalPan(gesture, { translationX: -80, velocityX: -800 });
    await advancePageTransition();

    expect(listener).not.toHaveBeenCalled();
    expect(manager.getState()).toEqual({ currentIndex: 0, totalCount: 4 });

    unsubscribe();
  });

  it('uses default thresholds when horizontalSwipe is empty and commits beyond equality', async () => {
    jest.useFakeTimers();

    const viewerId = 'default-empty';
    const { gesture } = await renderHarness({ horizontalSwipe: {}, viewerId });
    const { listener, manager, unsubscribe } = subscribeToManager(viewerId);

    await fireHorizontalPan(gesture, { translationX: -81, velocityX: 0 });
    await advancePageTransition();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ currentIndex: 1, totalCount: 4 });
    expect(manager.getState()).toEqual({ currentIndex: 1, totalCount: 4 });

    unsubscribe();
  });

  it('uses custom distance thresholds without swapping velocity', async () => {
    jest.useFakeTimers();

    const settleViewerId = 'custom-distance-settle';
    const settleHarness = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.5, velocityThreshold: 100_000 },
      viewerId: settleViewerId,
    });
    const settle = subscribeToManager(settleViewerId);

    await fireHorizontalPan(settleHarness.gesture, { translationX: -160, velocityX: -10 });
    await advancePageTransition();

    expect(settle.listener).not.toHaveBeenCalled();
    expect(settle.manager.getState()).toEqual({ currentIndex: 0, totalCount: 4 });
    settle.unsubscribe();

    const commitViewerId = 'custom-distance-commit';
    const commitHarness = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.5, velocityThreshold: 100_000 },
      viewerId: commitViewerId,
    });
    const commit = subscribeToManager(commitViewerId);

    await fireHorizontalPan(commitHarness.gesture, { translationX: -161, velocityX: -10 });
    await advancePageTransition();

    expect(commit.listener).toHaveBeenCalledTimes(1);
    expect(commit.listener).toHaveBeenLastCalledWith({ currentIndex: 1, totalCount: 4 });
    expect(commit.manager.getState()).toEqual({ currentIndex: 1, totalCount: 4 });
    commit.unsubscribe();
  });

  it('uses custom velocity thresholds without swapping distance', async () => {
    jest.useFakeTimers();

    const settleViewerId = 'custom-velocity-settle';
    const settleHarness = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 10, velocityThreshold: 100 },
      viewerId: settleViewerId,
    });
    const settle = subscribeToManager(settleViewerId);

    await fireHorizontalPan(settleHarness.gesture, { translationX: -10, velocityX: -100 });
    await advancePageTransition();

    expect(settle.listener).not.toHaveBeenCalled();
    expect(settle.manager.getState()).toEqual({ currentIndex: 0, totalCount: 4 });
    settle.unsubscribe();

    const commitViewerId = 'custom-velocity-commit';
    const commitHarness = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 10, velocityThreshold: 100 },
      viewerId: commitViewerId,
    });
    const commit = subscribeToManager(commitViewerId);

    await fireHorizontalPan(commitHarness.gesture, { translationX: -10, velocityX: -101 });
    await advancePageTransition();

    expect(commit.listener).toHaveBeenCalledTimes(1);
    expect(commit.listener).toHaveBeenLastCalledWith({ currentIndex: 1, totalCount: 4 });
    expect(commit.manager.getState()).toEqual({ currentIndex: 1, totalCount: 4 });
    commit.unsubscribe();
  });

  it('falls back for invalid thresholds and accepts zero thresholds', async () => {
    jest.useFakeTimers();

    const invalidViewerId = 'invalid-thresholds';
    const invalidHarness = await renderHarness({
      horizontalSwipe: {
        distanceThresholdRatio: Number.NaN,
        velocityThreshold: Number.POSITIVE_INFINITY,
      },
      viewerId: invalidViewerId,
    });
    const invalid = subscribeToManager(invalidViewerId);

    await fireHorizontalPan(invalidHarness.gesture, { translationX: -80, velocityX: -800 });
    await advancePageTransition();

    expect(invalid.listener).not.toHaveBeenCalled();
    expect(invalid.manager.getState()).toEqual({ currentIndex: 0, totalCount: 4 });
    invalid.unsubscribe();

    const zeroViewerId = 'zero-thresholds';
    const zeroHarness = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0, velocityThreshold: 0 },
      viewerId: zeroViewerId,
    });
    const zero = subscribeToManager(zeroViewerId);

    await fireHorizontalPan(zeroHarness.gesture, { translationX: -1, velocityX: 0 });
    await advancePageTransition();

    expect(zero.listener).toHaveBeenCalledTimes(1);
    expect(zero.listener).toHaveBeenLastCalledWith({ currentIndex: 1, totalCount: 4 });
    expect(zero.manager.getState()).toEqual({ currentIndex: 1, totalCount: 4 });
    zero.unsubscribe();
  });

  it('preserves gesture identity for equivalent primitive values and rebuilds on threshold change', async () => {
    const viewerId = 'gesture-identity';
    const { gesture, rendered } = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.5, velocityThreshold: 100_000 },
      viewerId,
    });

    const equivalentGesture = await rerenderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.5, velocityThreshold: 100_000 },
      rendered,
      viewerId,
    });

    expect(equivalentGesture).toBe(gesture);

    const changedGesture = await rerenderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.25, velocityThreshold: 100_000 },
      rendered,
      viewerId,
    });

    expect(changedGesture).not.toBe(gesture);
  });

  it('uses changed threshold closure values after rebuilding the gesture', async () => {
    jest.useFakeTimers();

    const viewerId = 'changed-threshold-closure';
    const { rendered } = await renderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.5, velocityThreshold: 100_000 },
      viewerId,
    });
    const gesture = await rerenderHarness({
      horizontalSwipe: { distanceThresholdRatio: 0.25, velocityThreshold: 100_000 },
      rendered,
      viewerId,
    });
    const { listener, manager, unsubscribe } = subscribeToManager(viewerId);

    await fireHorizontalPan(gesture, { translationX: -81, velocityX: -10 });
    await advancePageTransition();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ currentIndex: 1, totalCount: 4 });
    expect(manager.getState()).toEqual({ currentIndex: 1, totalCount: 4 });

    unsubscribe();
  });

  it('does not commit fired pan events when horizontal swipe is disabled', async () => {
    jest.useFakeTimers();

    const viewerId = 'disabled-horizontal-swipe';
    const { gesture } = await renderHarness({
      horizontalSwipe: { enabled: false },
      viewerId,
    });
    const { listener, manager, unsubscribe } = subscribeToManager(viewerId);

    await fireHorizontalPan(gesture, { translationX: -320, velocityX: -10_000 });
    await advancePageTransition();

    expect(listener).not.toHaveBeenCalled();
    expect(manager.getState()).toEqual({ currentIndex: 0, totalCount: 4 });

    unsubscribe();
  });

  it('reserves multi-pointer input for pinch across every competing pan gesture', async () => {
    const viewerId = 'single-pointer-pan-guards';

    registry.createManager(viewerId);
    createdManagerIds.add(viewerId);

    const { result } = await renderHook(() =>
      useGestureViewer({
        data: ['first', 'second'],
        height: 240,
        id: viewerId,
        width: 320,
      }),
    );

    const zoomPanGesture = result.current.zoomGesture
      .toGestureArray()
      .find((gesture) => gesture.handlerName === 'PanGestureHandler');

    expect(result.current.dismissGesture.config.maxPointers).toBe(1);
    expect(result.current.horizontalPagingGesture.config.maxPointers).toBe(1);
    expect(zoomPanGesture?.config.maxPointers).toBe(1);

    const dismissStateManager = { fail: jest.fn() };
    const zoomPanStateManager = { fail: jest.fn() };

    result.current.dismissGesture.handlers.onTouchesDown?.(
      { numberOfTouches: 2 } as never,
      dismissStateManager as never,
    );
    zoomPanGesture?.handlers.onTouchesDown?.(
      { numberOfTouches: 2 } as never,
      zoomPanStateManager as never,
    );

    expect(dismissStateManager.fail).toHaveBeenCalledTimes(1);
    expect(zoomPanStateManager.fail).toHaveBeenCalledTimes(1);
  });

  it('suppresses a native single tap after a pinch and restores taps for the next touch', async () => {
    const onSingleTap = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewer({
        data: ['first'],
        height: 240,
        onSingleTap,
        width: 320,
      }),
    );
    const singleTapGesture = result.current.zoomGesture
      .toGestureArray()
      .find(
        (gesture) =>
          gesture.handlerName === 'TapGestureHandler' && gesture.config.numberOfTaps === 1,
      );

    expect(singleTapGesture).toBeDefined();

    await act(async () => {
      singleTapGesture?.handlers.onTouchesDown?.(
        { numberOfTouches: 1 } as never,
        { fail: jest.fn() } as never,
      );
      result.current.zoomPinchGesture.handlers.onTouchesDown?.(
        { numberOfTouches: 2 } as never,
        { fail: jest.fn() } as never,
      );
      singleTapGesture?.handlers.onEnd?.({ x: 100, y: 120 } as never, true);
    });

    expect(onSingleTap).not.toHaveBeenCalled();

    await act(async () => {
      singleTapGesture?.handlers.onTouchesDown?.(
        { numberOfTouches: 1 } as never,
        { fail: jest.fn() } as never,
      );
      singleTapGesture?.handlers.onEnd?.({ x: 120, y: 140 } as never, true);
    });

    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onSingleTap).toHaveBeenCalledWith({ index: 0, item: 'first', x: 120, y: 140 });
  });

  it('does not emit a single tap when a horizontal swipe settles', async () => {
    const onSingleTap = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewer({
        data: ['first', 'second'],
        height: 240,
        onSingleTap,
        width: 320,
      }),
    );
    const singleTapGesture = result.current.zoomGesture
      .toGestureArray()
      .find(
        (gesture) =>
          gesture.handlerName === 'TapGestureHandler' && gesture.config.numberOfTaps === 1,
      );

    expect(singleTapGesture).toBeDefined();

    await act(async () => {
      singleTapGesture?.handlers.onTouchesDown?.(
        { numberOfTouches: 1 } as never,
        { fail: jest.fn() } as never,
      );
      result.current.horizontalPagingGesture.handlers.onStart?.({} as never);
      result.current.horizontalPagingGesture.handlers.onUpdate?.({ translationX: -40 } as never);
      result.current.horizontalPagingGesture.handlers.onEnd?.(
        {
          translationX: -40,
          velocityX: 0,
        } as never,
        true,
      );
      singleTapGesture?.handlers.onEnd?.({ x: 100, y: 120 } as never, true);
    });

    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('limits tap travel when competing pan gestures fail to activate', async () => {
    const { result } = await renderHook(() =>
      useGestureViewer({
        data: ['first', 'second'],
        height: 240,
        width: 320,
      }),
    );
    const tapGestures = result.current.zoomGesture
      .toGestureArray()
      .filter((gesture) => gesture.handlerName === 'TapGestureHandler');

    expect(tapGestures).toHaveLength(2);
    expect(tapGestures.map((gesture) => gesture.config.maxDist)).toEqual([10, 10]);
  });

  it('resets an interrupted dismiss before pinch updates the image', async () => {
    const onDismiss = jest.fn();
    const { rerender, result } = await renderHook(() =>
      useGestureViewer({
        data: ['first'],
        dismiss: { direction: 'both' },
        height: 240,
        onDismiss,
        width: 320,
      }),
    );
    const dismissStateManager = { fail: jest.fn() };

    await act(async () => {
      result.current.dismissGesture.handlers.onUpdate?.({ translationY: 160 } as never);
      result.current.dismissGesture.handlers.onTouchesDown?.(
        { numberOfTouches: 2 } as never,
        dismissStateManager as never,
      );
      result.current.zoomPinchGesture.handlers.onStart?.({ focalX: 160, focalY: 120 } as never);
      result.current.zoomPinchGesture.handlers.onUpdate?.({
        focalX: 160,
        focalY: 120,
        scale: 1.5,
      } as never);
      result.current.dismissGesture.handlers.onEnd?.({ translationY: 160 } as never, false);
      result.current.dismissGesture.handlers.onFinalize?.({} as never, false);
    });

    await rerender({});

    const transform = (
      result.current.animatedStyle as unknown as {
        initial: {
          updater: () => { transform: Array<Record<string, number | string>> };
        };
      }
    ).initial.updater().transform;

    expect(dismissStateManager.fail).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(transform[3]).toEqual({ translateY: 0 });
    expect(transform[5]).toEqual({ scale: 1.5 });
  });
});
