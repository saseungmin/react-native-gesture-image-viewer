import { act, cleanup, render, renderHook } from '@testing-library/react-native';
import {
  ReduceMotion,
  ReducedMotionConfig,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { GestureViewerPanInertiaConfig } from '../types';
import { usePanInertia } from '../usePanInertia';

// Use real Reanimated animations and its Jest frame clock, not a withDecay stub.
describe('pan inertia frame progression', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  async function setup(
    deceleration = 0.9997,
    options: Partial<GestureViewerPanInertiaConfig> = {},
  ) {
    const hook = await renderHook(() => {
      const translateX = useSharedValue(0);
      const translateY = useSharedValue(0);
      const scale = useSharedValue(2);
      const rotation = useSharedValue(0);
      const contentWidth = useSharedValue(400);
      const contentHeight = useSharedValue(800);
      return {
        translateX,
        translateY,
        scale,
        contentHeight,
        ...usePanInertia({
          panInertia: { enabled: true, deceleration, ...options },
          enablePanWhenZoomed: true,
          width: 400,
          height: 800,
          translateX,
          translateY,
          scale,
          rotation,
          contentWidth,
          contentHeight,
        }),
      };
    });
    await act(() => jest.advanceTimersByTime(32));
    return hook.result;
  }

  it('moves after release, clamps at the edge and stops moving after interruption', async () => {
    const result = await setup(0.999, { rubberBandEffect: false });
    await act(() => result.current.startPanInertia(5000, -400));
    await act(() => jest.advanceTimersByTime(64));
    expect(result.current.translateX.get()).toBeGreaterThan(0);
    expect(result.current.translateY.get()).toBeLessThan(0);
    await act(() => jest.advanceTimersByTime(2000));
    expect(result.current.translateX.get()).toBe(200);
    expect(result.current.translateY.get()).toBeGreaterThanOrEqual(-400);
    await act(() => result.current.startPanInertia(-1500, 400));
    await act(() => jest.advanceTimersByTime(64));
    await act(() => result.current.stopPanInertia());
    const stopped = [result.current.translateX.get(), result.current.translateY.get()];
    await act(() => jest.advanceTimersByTime(1000));
    expect([result.current.translateX.get(), result.current.translateY.get()]).toEqual(stopped);
  });

  it('travels less with a lower deceleration and settles inside the bounds', async () => {
    const slow = await setup(0.998);
    const fast = await setup(0.995);
    await act(() => {
      slow.current.startPanInertia(150, 0);
      fast.current.startPanInertia(150, 0);
    });
    await act(() => jest.advanceTimersByTime(300));
    expect(slow.current.translateX.get()).toBeGreaterThan(fast.current.translateX.get());
    await act(() => jest.advanceTimersByTime(4000));
    const stopped = slow.current.translateX.get();
    expect(stopped).toBeGreaterThan(0);
    expect(stopped).toBeLessThan(200);
    await act(() => jest.advanceTimersByTime(1000));
    expect(slow.current.translateX.get()).toBe(stopped);
  });

  it('gives the default profile a longer glide than the previous 0.998 profile', async () => {
    const current = await setup();
    const previous = await setup(0.998, { velocityFactor: 1, rubberBandEffect: false });
    await act(() => {
      current.current.startPanInertia(150, 0);
      previous.current.startPanInertia(150, 0);
    });
    await act(() => jest.advanceTimersByTime(2000));
    expect(current.current.translateX.get()).toBeGreaterThan(previous.current.translateX.get());
    expect(current.current.translateX.get()).toBeLessThan(200);
  });
  it('does not cancel replacement reset animations when scale changes', async () => {
    const result = await setup();
    await act(() => result.current.startPanInertia(1500, 400));
    await act(() => jest.advanceTimersByTime(64));
    await act(() => {
      result.current.scale.set(withTiming(1, { duration: 300 }));
      result.current.translateX.set(withTiming(0, { duration: 300 }));
      result.current.translateY.set(withTiming(0, { duration: 300 }));
    });
    await act(() => jest.advanceTimersByTime(500));
    expect(result.current.scale.get()).toBe(1);
    expect(result.current.translateX.get()).toBe(0);
    expect(result.current.translateY.get()).toBe(0);
  });

  it('honors reduced motion without gliding', async () => {
    await render(<ReducedMotionConfig mode={ReduceMotion.Always} />);
    const result = await setup();
    await act(() => result.current.startPanInertia(1500, -400));
    await act(() => jest.advanceTimersByTime(500));
    expect(result.current.translateX.get()).toBe(0);
    expect(result.current.translateY.get()).toBe(0);
  });

  it('briefly crosses a boundary with rubber-banding and returns exactly to it', async () => {
    const result = await setup();
    await act(() => {
      result.current.translateX.set(190);
      result.current.startPanInertia(800, 0);
    });
    let furthest = 190;
    await act(() => {
      for (let frame = 0; frame < 300; frame++) {
        jest.advanceTimersByTime(16);
        furthest = Math.max(furthest, result.current.translateX.get());
      }
    });
    expect(furthest).toBeGreaterThan(200);
    expect(result.current.translateX.get()).toBe(200);
  });

  it('holds the visual overshoot on touch and returns only after release', async () => {
    const result = await setup();
    await act(() => {
      result.current.translateX.set(200);
      result.current.startPanInertia(1000, 0);
    });
    await act(() => jest.advanceTimersByTime(16));
    const held = result.current.translateX.get();
    expect(held).toBeGreaterThan(200);
    await act(() => result.current.stopPanInertia());
    expect(result.current.translateX.get()).toBe(held);
    await act(() => jest.advanceTimersByTime(1000));
    expect(result.current.translateX.get()).toBe(held);
    await act(() => result.current.startPanInertia(0, 0));
    expect(result.current.translateX.get()).toBeCloseTo(held);
    await act(() => jest.advanceTimersByTime(2000));
    expect(result.current.translateX.get()).toBe(200);
  });

  it('scales travel for the same release speed without moving an undersized axis', async () => {
    const normal = await setup(0.999, { velocityFactor: 1, rubberBandEffect: false });
    const faster = await setup(0.999, { velocityFactor: 1.5, rubberBandEffect: false });
    await act(() => {
      normal.current.contentHeight.set(200);
      faster.current.contentHeight.set(200);
    });
    await act(() => jest.advanceTimersByTime(32));
    await act(() => {
      normal.current.startPanInertia(100, 500);
      faster.current.startPanInertia(100, 500);
    });
    await act(() => jest.advanceTimersByTime(300));
    expect(faster.current.translateX.get()).toBeCloseTo(normal.current.translateX.get() * 1.5);
    expect(normal.current.translateY.get()).toBe(0);
    expect(faster.current.translateY.get()).toBe(0);
  });

  it('uses rubberBandFactor to control the return strength', async () => {
    const soft = await setup(0.999, { rubberBandFactor: 0.3 });
    const firm = await setup(0.999, { rubberBandFactor: 0.9 });
    await act(() => {
      soft.current.translateX.set(190);
      firm.current.translateX.set(190);
      soft.current.startPanInertia(800, 0);
      firm.current.startPanInertia(800, 0);
    });
    let softPeak = 190;
    let firmPeak = 190;
    await act(() => {
      for (let frame = 0; frame < 300; frame++) {
        jest.advanceTimersByTime(16);
        softPeak = Math.max(softPeak, soft.current.translateX.get());
        firmPeak = Math.max(firmPeak, firm.current.translateX.get());
      }
    });
    expect(softPeak).toBeGreaterThan(firmPeak);
    expect(soft.current.translateX.get()).toBe(200);
    expect(firm.current.translateX.get()).toBe(200);
  });
});
