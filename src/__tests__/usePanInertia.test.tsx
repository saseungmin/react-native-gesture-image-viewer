import { act, cleanup, renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import type { GestureViewerPanInertiaConfig } from '../types';
import { usePanInertia } from '../usePanInertia';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  withDecay: jest.fn(() => 0),
  cancelAnimation: jest.fn(),
}));

async function setup(panInertia: boolean | GestureViewerPanInertiaConfig | undefined = true) {
  const hook = await renderHook(
    (props: {
      option: boolean | GestureViewerPanInertiaConfig | undefined;
      pan: boolean;
      width: number;
    }) => {
      const scale = Reanimated.useSharedValue(2);
      const rotation = Reanimated.useSharedValue(0);
      const translateX = Reanimated.useSharedValue(0);
      const translateY = Reanimated.useSharedValue(0);
      const contentWidth = Reanimated.useSharedValue(400);
      const contentHeight = Reanimated.useSharedValue(800);
      const inertia = usePanInertia({
        panInertia: props.option,
        enablePanWhenZoomed: props.pan,
        width: props.width,
        height: 800,
        scale,
        rotation,
        translateX,
        translateY,
        contentWidth,
        contentHeight,
      });
      return { ...inertia, scale, rotation, translateX, translateY, contentWidth, contentHeight };
    },
    { initialProps: { option: panInertia, pan: true, width: 400 } },
  );
  await act(() => jest.advanceTimersByTime(32));
  return hook;
}

describe('pan inertia animation ownership', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it('forwards custom motion settings while retaining release velocity, bounds and system accessibility', async () => {
    const { result } = await setup({
      enabled: true,
      deceleration: 0.9995,
      velocityFactor: 1.2,
      rubberBandEffect: true,
      rubberBandFactor: 0.4,
    });
    await act(() => {
      result.current.translateX.set(200);
      result.current.startPanInertia(800, 0);
    });
    expect(Reanimated.withDecay).toHaveBeenCalledWith(
      {
        velocity: 800,
        clamp: [-200, 200],
        deceleration: 0.9995,
        velocityFactor: 1.2,
        rubberBandEffect: true,
        rubberBandFactor: 0.4,
        reduceMotion: Reanimated.ReduceMotion.System,
      },
      expect.any(Function),
    );
  });

  it('starts each axis with release velocity and fitted bounds', async () => {
    const { result } = await setup({ enabled: true, deceleration: 0.995 });
    await act(() => result.current.startPanInertia(900, -400));
    expect(Reanimated.withDecay).toHaveBeenNthCalledWith(
      1,
      {
        velocity: 900,
        deceleration: 0.995,
        velocityFactor: 0.5,
        rubberBandEffect: true,
        rubberBandFactor: 1,
        reduceMotion: Reanimated.ReduceMotion.System,
        clamp: [-200, 200],
      },
      expect.any(Function),
    );
    expect(Reanimated.withDecay).toHaveBeenNthCalledWith(
      2,
      {
        velocity: -400,
        deceleration: 0.995,
        velocityFactor: 0.5,
        rubberBandEffect: true,
        rubberBandFactor: 1,
        reduceMotion: Reanimated.ReduceMotion.System,
        clamp: [-400, 400],
      },
      expect.any(Function),
    );
  });

  it('does not cancel unrelated animations when there is no owned inertia', async () => {
    const { result } = await setup(false);
    await act(() => {
      result.current.stopPanInertia();
      result.current.startPanInertia(100, 100);
    });
    expect(Reanimated.cancelAnimation).not.toHaveBeenCalled();
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
  });

  it('does not start on fitted images or disabled zoom panning', async () => {
    const { result, rerender } = await setup();
    await act(() => {
      result.current.scale.set(1);
      result.current.startPanInertia(100, 100);
    });
    await rerender({ option: true, pan: false, width: 400 });
    await act(() => {
      result.current.scale.set(2);
      result.current.startPanInertia(100, 100);
    });
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
  });

  it('skips undersized axes, invalid velocities and outward throws at the edge', async () => {
    const { result } = await setup({ enabled: true, rubberBandEffect: false });
    await act(() => {
      result.current.contentHeight.set(400);
      result.current.translateX.set(200);
      result.current.startPanInertia(500, 500);
      result.current.startPanInertia(NaN, Infinity);
    });
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
    // withDecay is mocked to return 0, so restore the edge before testing inward movement.
    await act(() => {
      result.current.translateX.set(200);
      result.current.startPanInertia(-500, 500);
    });
    expect(Reanimated.withDecay).toHaveBeenCalledTimes(1);
  });

  it('retains newer ownership when an old completion arrives late', async () => {
    const { result } = await setup();
    await act(() => result.current.startPanInertia(500, 0));
    const oldCompletion = jest.mocked(Reanimated.withDecay).mock.calls[0]![1]!;
    await act(() => {
      result.current.stopPanInertia();
      result.current.startPanInertia(600, 0);
      oldCompletion(false);
    });
    jest.mocked(Reanimated.cancelAnimation).mockClear();
    await act(() => result.current.stopPanInertia());
    expect(Reanimated.cancelAnimation).toHaveBeenCalledWith(result.current.translateX);
  });

  it('releases ownership on replacement and keeps the other axis independent', async () => {
    const { result } = await setup();
    await act(() => result.current.startPanInertia(500, 500));
    const xCompletion = jest.mocked(Reanimated.withDecay).mock.calls[0]![1]!;
    await act(() => xCompletion(false));
    await act(() => result.current.stopPanInertia());
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(1);
    expect(Reanimated.cancelAnimation).toHaveBeenCalledWith(result.current.translateY);
  });

  it('uses the new viewport bounds when cancelling an overshoot after resize', async () => {
    const { result, rerender } = await setup();
    await act(() => {
      result.current.startPanInertia(800, 0);
      // Emulate an in-flight frame; this suite stubs the animation implementation.
      result.current.translateX.set(240);
    });
    await rerender({ option: true, pan: true, width: 600 });
    await act(() => jest.advanceTimersByTime(32));
    expect(result.current.translateX.get()).toBe(100);
  });

  it.each([false, { enabled: true, rubberBandEffect: false }])(
    'returns a held overshoot on release even after settings change to %p',
    async (option) => {
      const { result, rerender } = await setup();
      await act(() => {
        result.current.startPanInertia(800, 0);
        result.current.translateX.set(240);
        result.current.stopPanInertia();
      });
      await rerender({ option, pan: true, width: 400 });
      await act(() => jest.advanceTimersByTime(32));
      expect(result.current.translateX.get()).toBe(240);
      await act(() => result.current.startPanInertia(0, 0));
      expect(result.current.translateX.get()).toBeCloseTo(240);
      await act(() => jest.advanceTimersByTime(400));
      expect(result.current.translateX.get()).toBe(200);
    },
  );

  it.each(['scale', 'rotation', 'contentWidth', 'contentHeight'] as const)(
    'stops owned inertia when %s changes',
    async (field) => {
      const { result } = await setup();
      await act(() => result.current.startPanInertia(500, 500));
      await act(() => result.current[field].set(result.current[field].get() + 1));
      await act(() => jest.advanceTimersByTime(32));
      expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(2);
    },
  );

  it('keeps a running animation when tuning changes, but stops on disable, resize and unmount', async () => {
    const { result, rerender, unmount } = await setup();
    await act(() => result.current.startPanInertia(500, 0));
    await rerender({ option: { enabled: true, deceleration: 0.99 }, pan: true, width: 400 });
    expect(Reanimated.cancelAnimation).not.toHaveBeenCalled();
    await rerender({ option: false, pan: true, width: 400 });
    await act(() => jest.advanceTimersByTime(32));
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(1);
    await rerender({ option: true, pan: true, width: 400 });
    await act(() => jest.advanceTimersByTime(32));
    await act(() => result.current.startPanInertia(500, 0));
    await rerender({ option: true, pan: true, width: 500 });
    await act(() => jest.advanceTimersByTime(32));
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(2);
    await act(() => result.current.startPanInertia(500, 0));
    await unmount();
    await act(() => jest.advanceTimersByTime(32));
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(3);
  });
});
