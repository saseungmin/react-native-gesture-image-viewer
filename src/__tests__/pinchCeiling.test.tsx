import { act, cleanup, renderHook } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import * as Reanimated from 'react-native-reanimated';

import { useGestureViewer } from '../useGestureViewer';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  withTiming: jest.fn((target) => target),
}));

const data = ['image'];

async function setup(maxZoomScale = 4, contentHeight = 852) {
  const hook = await renderHook(() =>
    useGestureViewer({
      data,
      width: 393,
      height: 852,
      maxZoomScale,
      getItemDimensions: () => ({ width: 393, height: contentHeight }),
    }),
  );
  const pinch = hook.result.current.zoomGesture.toGestureArray()[0] as ReturnType<
    typeof Gesture.Pinch
  >;
  const readTransform = () => {
    const { transform } = (
      hook.result.current.animatedStyle as unknown as {
        initial: { updater: () => { transform: Array<Record<string, number>> } };
      }
    ).initial.updater();
    return {
      scale: transform[5]!.scale!,
      x: transform[4]!.translateX!,
      y: transform[3]!.translateY!,
    };
  };
  const start = (x: number, y: number) =>
    pinch.handlers.onStart?.({ focalX: x, focalY: y } as never);
  const update = (scale: number, x: number, y: number) =>
    pinch.handlers.onUpdate?.({ scale, focalX: x, focalY: y } as never);
  const end = () => pinch.handlers.onEnd?.({} as never, true);
  return { start, update, end, readTransform };
}

describe('pinch ceiling focal preservation', () => {
  beforeEach(() => {
    jest
      .mocked(Reanimated.withTiming)
      .mockReset()
      .mockImplementation((target) => target);
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([5, 6, 8])(
    'keeps an off-center detail fixed when settling from %sx',
    async (overScale) => {
      const viewer = await setup();
      await act(async () => {
        viewer.start(96.5, 326);
        viewer.update(overScale, 96.5, 326);
      });
      const before = viewer.readTransform();
      await act(async () => viewer.end());
      const after = viewer.readTransform();
      expect(after.scale).toBe(4);
      expect(after.x).toBeCloseTo(300);
      expect(after.y).toBeCloseTo(300);
      // Track the same content point, independent of the production translation helper.
      expect(((-100 - before.x) / before.scale) * after.scale + after.x).toBeCloseTo(-100);
      expect(((-100 - before.y) / before.scale) * after.scale + after.y).toBeCloseTo(-100);
    },
  );

  it('uses the release transform after zooming an already shifted image', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.start(96.5, 326);
      viewer.update(2, 96.5, 326);
      viewer.end();
      viewer.start(196.5, 426);
      viewer.update(3, 196.5, 426);
      viewer.end();
    });
    expect(viewer.readTransform()).toEqual({ scale: 4, x: 200, y: 200 });
  });

  it('falls back to the center when no update supplied an active focal point', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.start(96.5, 326);
      viewer.update(5, 96.5, 326);
      viewer.start(50, 50);
      viewer.end();
    });
    expect(viewer.readTransform()).toEqual({ scale: 4, x: 320, y: 320 });
  });

  it('prioritizes fitted content bounds over preserving an out-of-bounds focal point', async () => {
    const viewer = await setup(2, 616);
    await act(async () => {
      viewer.start(196.5, 126);
      viewer.update(3, 196.5, 126);
      viewer.end();
    });
    expect(viewer.readTransform()).toEqual({ scale: 2, x: 0, y: 190 });
  });

  it('centers an axis whose fitted content becomes smaller than the viewport', async () => {
    const viewer = await setup(2, 200);
    await act(async () => {
      viewer.start(196.5, 326);
      viewer.update(6, 196.5, 326);
      viewer.end();
    });
    expect(viewer.readTransform()).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('centers the image when the configured ceiling is the fitted scale', async () => {
    const viewer = await setup(1);
    await act(async () => {
      viewer.start(96.5, 326);
      viewer.update(5, 96.5, 326);
      viewer.end();
    });
    expect(viewer.readTransform()).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it.each([0.8, 2, 4])(
    'preserves existing behavior at %sx without overshooting the ceiling',
    async (scale) => {
      const viewer = await setup();
      await act(async () => {
        viewer.start(96.5, 326);
        viewer.update(scale, 96.5, 326);
        viewer.end();
      });
      const expectedScale = Math.max(1, scale);
      expect(viewer.readTransform()).toEqual({
        scale: expectedScale,
        x: (expectedScale - 1) * 100,
        y: (expectedScale - 1) * 100,
      });
    },
  );

  it('uses matching timing for scale and both translation axes', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.start(96.5, 326);
      viewer.update(5, 96.5, 326);
    });
    jest.mocked(Reanimated.withTiming).mockClear();
    await act(async () => viewer.end());
    const calls = jest.mocked(Reanimated.withTiming).mock.calls;
    expect(calls).toHaveLength(3);
    const config = calls[0]![1];
    expect(config).toEqual(expect.objectContaining({ duration: 300, easing: expect.anything() }));
    expect(calls[1]![1]).toBe(config);
    expect(calls[2]![1]).toBe(config);
  });
  it('keeps the detail fixed during the return animation and a new pinch', async () => {
    jest.useFakeTimers();
    const viewer = await setup();
    await act(async () => {
      viewer.start(96.5, 326);
      viewer.update(5, 96.5, 326);
    });
    jest
      .mocked(Reanimated.withTiming)
      .mockImplementation(
        jest.requireActual<typeof Reanimated>('react-native-reanimated').withTiming,
      );
    await act(async () => viewer.end());
    await act(async () => jest.advanceTimersByTime(100));
    const during = viewer.readTransform();
    expect(during.scale).toBeGreaterThan(4);
    expect(during.scale).toBeLessThan(5);
    expect(-100 * during.scale + during.x).toBeCloseTo(-100);
    expect(-100 * during.scale + during.y).toBeCloseTo(-100);
    await act(async () => {
      viewer.start(96.5, 326);
      viewer.update(1, 96.5, 326);
    });
    const restarted = viewer.readTransform();
    expect(restarted).toEqual(during);
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.readTransform()).toEqual(restarted);
  });
});
