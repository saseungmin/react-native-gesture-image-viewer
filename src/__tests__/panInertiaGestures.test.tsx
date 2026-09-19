import { act, cleanup, renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { registry } from '../GestureViewerRegistry';
import type { GestureViewerProps } from '../types';
import { useGestureViewer } from '../useGestureViewer';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  withTiming: jest.fn((target) => target),
  withDecay: jest.fn(() => 0),
  cancelAnimation: jest.fn(),
}));

describe('zoom pan inertia integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    registry.createManager('inertia');
  });
  afterEach(async () => {
    await cleanup();
    registry.deleteManager('inertia');
    jest.useRealTimers();
  });

  async function setup(panInertia: GestureViewerProps<string>['panInertia'] = true) {
    const hook = await renderHook(() =>
      useGestureViewer({
        data: ['one', 'two'],
        id: 'inertia',
        width: 400,
        height: 800,
        maxZoomScale: 4,
        panInertia,
      }),
    );
    const pinch = hook.result.current.zoomPinchGesture;
    await act(() => {
      pinch.handlers.onStart?.({ focalX: 200, focalY: 400 } as never);
      pinch.handlers.onUpdate?.({ scale: 2, focalX: 200, focalY: 400 } as never);
      pinch.handlers.onEnd?.({} as never, true);
      pinch.handlers.onFinalize?.({} as never, true);
    });
    await act(() => jest.advanceTimersByTime(32));
    const pan = hook.result.current.zoomGesture
      .toGestureArray()
      .find((g) => g.handlerName === 'PanGestureHandler')!;
    await act(() => {
      pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never);
      pan.handlers.onBegin?.({} as never);
      pan.handlers.onUpdate?.({ translationX: 40, translationY: 20 } as never);
    });
    jest.mocked(Reanimated.cancelAnimation).mockClear();
    return { ...hook, pan, pinch };
  }

  it('starts only after successful release, not cancellation; finalize preserves decay', async () => {
    const { pan } = await setup();
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, false));
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
    await act(() => {
      pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true);
      pan.handlers.onFinalize?.({} as never, true);
    });
    expect(Reanimated.withDecay).toHaveBeenCalledTimes(2);
    expect(Reanimated.cancelAnimation).not.toHaveBeenCalled();
  });

  it('preserves the existing release behavior when omitted', async () => {
    const { pan } = await setup(false);
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true));
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
  });

  it('stops on a new touch and before pinch takes its initial position', async () => {
    const { pan, pinch } = await setup();
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true));
    await act(() => pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never));
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(2);
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true));
    await act(() => pinch.handlers.onTouchesDown?.({ numberOfTouches: 2 } as never, {} as never));
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(4);
    jest.mocked(Reanimated.withDecay).mockClear();
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true));
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
  });

  it('does not carry a release into controller page navigation', async () => {
    const { pan } = await setup();
    await act(() => registry.getManager('inertia')?.goToNext());
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true));
    expect(Reanimated.withDecay).not.toHaveBeenCalled();
  });

  it('stops inertia when dismissing', async () => {
    const { pan, result } = await setup();
    await act(() => pan.handlers.onEnd?.({ velocityX: 500, velocityY: 200 } as never, true));
    await act(() => result.current.handleDismiss());
    await act(() => jest.advanceTimersByTime(32));
    expect(Reanimated.cancelAnimation).toHaveBeenCalledTimes(2);
  });
});
