import { act, cleanup, renderHook } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { useGestureViewer } from '../useGestureViewer';
import { applyTapZoomAtPoint, finishTapZoomOut } from '../utils/tapZoom';

describe('dismiss gesture takeover during double-tap zoom-out', () => {
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it('keeps recognizers available and rejects touches on the wrong side of the zoom boundary', async () => {
    jest.useFakeTimers();
    const { result } = await renderHook(() =>
      useGestureViewer({ data: ['image'], width: 400, height: 800 }),
    );
    const pan = () =>
      result.current.zoomGesture
        .toGestureArray()
        .find((g) => g.handlerName === 'PanGestureHandler')!;
    expect(pan().config.enabled).toBe(true);
    const fittedPan = { fail: jest.fn() };
    await act(() =>
      pan().handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, fittedPan as never),
    );
    expect(fittedPan.fail).toHaveBeenCalledTimes(1);

    await act(() => {
      const pinch = result.current.zoomPinchGesture;
      pinch.handlers.onStart?.({ focalX: 200, focalY: 400 } as never);
      pinch.handlers.onUpdate?.({ scale: 2, focalX: 200, focalY: 400 } as never);
    });
    await act(() => jest.advanceTimersByTime(32));
    expect(result.current.dismissGesture.config.enabled).toBe(true);
    const zoomedDismiss = { fail: jest.fn() };
    await act(() =>
      result.current.dismissGesture.handlers.onTouchesDown?.(
        { numberOfTouches: 1 } as never,
        zoomedDismiss as never,
      ),
    );
    expect(zoomedDismiss.fail).toHaveBeenCalledTimes(1);
  });

  it.each(['dismiss-first', 'pan-first'])(
    'lets an active dismiss drag take over without later zoom-out frames overwriting it (%s)',
    async (order) => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      const { result } = await renderHook(() =>
        useGestureViewer({ data: ['image'], width: 400, height: 800, onDismiss }),
      );
      await act(() => {
        const pinch = result.current.zoomPinchGesture;
        pinch.handlers.onStart?.({ focalX: 200, focalY: 400 } as never);
        pinch.handlers.onUpdate?.({ scale: 2, focalX: 200, focalY: 400 } as never);
      });
      await act(() => jest.advanceTimersByTime(32));
      const gestures = result.current.zoomGesture.toGestureArray();
      const single = gestures.find((g) => g.config.numberOfTaps === 1)!;
      const double = gestures.find((g) => g.config.numberOfTaps === 2)!;
      const pan = gestures.find((g) => g.handlerName === 'PanGestureHandler')!;
      await act(() => {
        single.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never);
        double.handlers.onEnd?.({ x: 200, y: 400 } as never, true);
      });
      const dismissState = { fail: jest.fn() };
      const panState = { fail: jest.fn() };
      const dismissDown = () =>
        result.current.dismissGesture.handlers.onTouchesDown?.(
          { numberOfTouches: 1 } as never,
          dismissState as never,
        );
      const panDown = () =>
        pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, panState as never);
      await act(() => {
        if (order === 'dismiss-first') {
          dismissDown();
          panDown();
        } else {
          panDown();
          dismissDown();
        }
        result.current.dismissGesture.handlers.onStart?.({} as never);
        result.current.dismissGesture.handlers.onUpdate?.({ translationY: 200 } as never);
      });
      expect(dismissState.fail).not.toHaveBeenCalled();
      expect(panState.fail).toHaveBeenCalledTimes(1);
      const read = () =>
        (
          result.current.animatedStyle as unknown as {
            initial: { updater: () => { transform: Record<string, number>[] } };
          }
        ).initial.updater().transform;
      expect(read()[5]).toEqual({ scale: 1 });
      expect(read()[3]).toEqual({ translateY: 100 });
      await act(() => jest.advanceTimersByTime(400));
      expect(read()[3]).toEqual({ translateY: 100 });
      await act(() =>
        result.current.dismissGesture.handlers.onEnd?.({ translationY: 200 } as never, true),
      );
      await act(() => jest.advanceTimersByTime(32));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    },
  );

  it('tracks only the current tap animation and never finishes a zoom-in as a zoom-out', async () => {
    jest.useFakeTimers();
    const { result } = await renderHook(() => ({
      scale: useSharedValue(2),
      translateX: useSharedValue(50),
      translateY: useSharedValue(20),
      tapZoomTarget: useSharedValue<number | null>(null),
    }));
    const tap = () =>
      applyTapZoomAtPoint({
        ...result.current,
        x: 200,
        y: 400,
        width: 400,
        height: 800,
        maxZoomScale: 2,
      });
    await act(() => {
      tap();
      tap();
    });
    expect(result.current.tapZoomTarget.get()).toBe(1);
    await act(() => finishTapZoomOut(result.current));
    expect(result.current.scale.get()).toBe(1);
    expect(result.current.translateX.get()).toBe(0);
    expect(result.current.translateY.get()).toBe(0);
    await act(() => tap());
    expect(result.current.tapZoomTarget.get()).toBe(2);
    await act(() => finishTapZoomOut(result.current));
    expect(result.current.tapZoomTarget.get()).toBe(2);
    await act(() => jest.advanceTimersByTime(400));
    expect(result.current.scale.get()).toBe(2);
    expect(result.current.tapZoomTarget.get()).toBeNull();
  });
});
