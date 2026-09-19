import { act, cleanup, render, renderHook } from '@testing-library/react-native';
import {
  ReduceMotion,
  ReducedMotionConfig,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { usePanInertia } from '../usePanInertia';

// Use real Reanimated animations and its Jest frame clock, not a withDecay stub.
describe('pan inertia frame progression', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  async function setup(deceleration = 0.998) {
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
        ...usePanInertia({
          panInertia: { enabled: true, deceleration },
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
    const result = await setup();
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
});
