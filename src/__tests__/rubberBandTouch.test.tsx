import { act, cleanup, renderHook } from '@testing-library/react-native';

import { useGestureViewer } from '../useGestureViewer';

describe('catching release rubber-banding', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it.each([
    ['pan-first', 1],
    ['tap-first', 1],
    ['pan-first', -1],
    ['tap-first', -1],
  ] as const)(
    'centers both axes when double-tapping a caught overshoot (%s, direction %s)',
    async (order, direction) => {
      const { result } = await renderHook(() =>
        useGestureViewer({
          data: ['portrait'],
          width: 400,
          height: 800,
          panInertia: true,
          getItemDimensions: () => ({ width: 200, height: 400 }),
        }),
      );
      const read = () =>
        (
          result.current.animatedStyle as unknown as {
            initial: { updater: () => { transform: Record<string, number>[] } };
          }
        ).initial.updater().transform;
      await act(() => {
        const pinch = result.current.zoomGesture
          .toGestureArray()
          .find((g) => g.handlerName === 'PinchGestureHandler')!;
        pinch.handlers.onStart?.({ focalX: 200, focalY: 400 } as never);
        pinch.handlers.onUpdate?.({ scale: 2, focalX: 200, focalY: 400 } as never);
      });
      await act(() => jest.advanceTimersByTime(32));
      const gestures = result.current.zoomGesture.toGestureArray();
      const pan = gestures.find((g) => g.handlerName === 'PanGestureHandler')!;
      const single = gestures.find((g) => g.config.numberOfTaps === 1)!;
      const double = gestures.find((g) => g.config.numberOfTaps === 2)!;
      await act(() => {
        pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, { fail: jest.fn() } as never);
        pan.handlers.onBegin?.({} as never);
        pan.handlers.onUpdate?.({
          translationX: direction * 200,
          translationY: direction * 400,
        } as never);
        pan.handlers.onEnd?.(
          { velocityX: direction * 1000, velocityY: direction * 1000 } as never,
          true,
        );
      });
      await act(() => jest.advanceTimersByTime(16));
      expect(direction * read()[4]!.translateX!).toBeGreaterThan(200);
      expect(direction * read()[3]!.translateY!).toBeGreaterThan(400);
      await act(() => {
        pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, { fail: jest.fn() } as never);
        pan.handlers.onBegin?.({} as never);
        single.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never);
        const finalizePan = () => pan.handlers.onFinalize?.({} as never, false);
        const zoomOut = () => double.handlers.onEnd?.({ x: 200, y: 400 } as never, true);
        if (order === 'pan-first') {
          finalizePan();
          zoomOut();
        } else {
          zoomOut();
          finalizePan();
        }
      });
      await act(() => jest.advanceTimersByTime(1000));
      expect(read()[5]).toEqual({ scale: 1 });
      expect(read()[4]).toEqual({ translateX: 0 });
      expect(read()[3]).toEqual({ translateY: 0 });
      // No follow-up gesture should be necessary to repair the fitted image.
      await act(() => jest.advanceTimersByTime(1000));
      expect(read()[4]).toEqual({ translateX: 0 });
      expect(read()[3]).toEqual({ translateY: 0 });
    },
  );

  it.each([false, true])('holds the overshoot and returns on release (drag: %s)', async (drag) => {
    const { result } = await renderHook(() =>
      useGestureViewer({
        data: ['photo'],
        width: 400,
        height: 800,
        panInertia: true,
      }),
    );
    const readX = () =>
      (
        result.current.animatedStyle as unknown as {
          initial: { updater: () => { transform: Record<string, number>[] } };
        }
      ).initial.updater().transform[4]!.translateX!;
    await act(() => {
      const pinch = result.current.zoomGesture
        .toGestureArray()
        .find((g) => g.handlerName === 'PinchGestureHandler')!;
      pinch.handlers.onStart?.({ focalX: 200, focalY: 400 } as never);
      pinch.handlers.onUpdate?.({ scale: 2, focalX: 200, focalY: 400 } as never);
    });
    await act(() => jest.advanceTimersByTime(32));
    const pan = result.current.zoomGesture
      .toGestureArray()
      .find((g) => g.handlerName === 'PanGestureHandler')!;
    await act(() => {
      pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, { fail: jest.fn() } as never);
      pan.handlers.onBegin?.({} as never);
      pan.handlers.onUpdate?.({ translationX: 200, translationY: 0 } as never);
      pan.handlers.onEnd?.({ velocityX: 1000, velocityY: 0 } as never, true);
      pan.handlers.onFinalize?.({} as never, true);
    });
    await act(() => jest.advanceTimersByTime(16));
    const caught = readX();
    expect(caught).toBeGreaterThan(203);
    await act(() => {
      pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, { fail: jest.fn() } as never);
      pan.handlers.onBegin?.({} as never);
    });
    expect(readX()).toBe(caught);
    await act(() => jest.advanceTimersByTime(1000));
    expect(readX()).toBe(caught);
    if (drag) {
      await act(() => {
        pan.handlers.onStart?.({} as never);
        pan.handlers.onUpdate?.({ translationX: -3, translationY: 0 } as never);
      });
      expect(readX()).toBeCloseTo(caught - 3);
    }
    const releasePosition = readX();
    await act(() => {
      if (drag) {
        pan.handlers.onEnd?.({ velocityX: 0, velocityY: 0 } as never, true);
      }
      // A stationary hold fails pan recognition, but still needs a return animation.
      pan.handlers.onFinalize?.({} as never, drag);
    });
    expect(readX()).toBeCloseTo(releasePosition);
    await act(() => jest.advanceTimersByTime(2000));
    expect(readX()).toBe(200);
  });
});
