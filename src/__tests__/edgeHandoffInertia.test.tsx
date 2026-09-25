import { act, cleanup, renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { PAGE_TRANSITION_CONFIG } from '../gestureViewerAnimation';
import { registry } from '../GestureViewerRegistry';
import { useGestureViewer } from '../useGestureViewer';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  withDecay: jest.fn(() => 0),
}));

// At 2x a 400pt-wide item may travel 200pt either way before its edge meets the viewer's.
const EDGE = 200;

describe('edge-handoff paging with pan inertia', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    registry.createManager('handoff-inertia');
  });
  afterEach(async () => {
    await cleanup();
    registry.deleteManager('handoff-inertia');
    jest.useRealTimers();
  });

  async function setup() {
    const hook = await renderHook(() =>
      useGestureViewer({
        data: ['one', 'two', 'three'],
        id: 'handoff-inertia',
        width: 400,
        height: 800,
        initialIndex: 1,
        edgeHandoffPaging: true,
        panInertia: true,
      }),
    );
    const pinch = hook.result.current.zoomPinchGesture;
    await act(() => {
      pinch.handlers.onStart?.({ focalX: 200, focalY: 400 } as never);
      pinch.handlers.onUpdate?.({ scale: 2, focalX: 200, focalY: 400 } as never);
      pinch.handlers.onEnd?.({} as never, true);
      pinch.handlers.onFinalize?.({} as never, true);
    });
    await act(() => jest.advanceTimersByTime(500));
    const pan = () =>
      hook.result.current.zoomGesture
        .toGestureArray()
        .find((g) => g.handlerName === 'PanGestureHandler')!;

    async function drag(...translations: number[]) {
      await act(() => {
        pan().handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never);
        pan().handlers.onBegin?.({} as never);
        pan().handlers.onStart?.({} as never);
        for (const translationX of translations) {
          pan().handlers.onUpdate?.({ translationX, translationY: 0 } as never);
        }
      });
      jest.mocked(Reanimated.withDecay).mockClear();
    }

    async function release(velocityX: number, velocityY = 0) {
      await act(() => {
        pan().handlers.onEnd?.({ velocityX, velocityY } as never, true);
        pan().handlers.onFinalize?.({} as never, true);
      });
    }

    const decayVelocities = () =>
      jest.mocked(Reanimated.withDecay).mock.calls.map(([config]) => config.velocity);
    const index = () => registry.getManager('handoff-inertia')!.getState().currentIndex;

    return { drag, decayVelocities, index, release };
  }

  it('gives the item its momentum back once the drag has returned inside it', async () => {
    const { drag, decayVelocities, release } = await setup();
    await drag(-(EDGE + 50), -(EDGE - 50));
    await release(-1500);
    expect(decayVelocities()).toEqual([-1500]);
  });

  it('lets a flick back into the item glide while the page settles', async () => {
    const { drag, decayVelocities, index, release } = await setup();
    await drag(-(EDGE + 20));
    await release(1500);
    expect(decayVelocities()).toEqual([1500]);
    await act(() => jest.advanceTimersByTime(1000));
    expect(index()).toBe(1);
  });

  it('keeps the item at its edge when released toward it without turning the page', async () => {
    const { drag, decayVelocities, release } = await setup();
    await drag(-(EDGE + 60));
    await release(-300);
    expect(decayVelocities()).toEqual([]);
  });

  it('leaves only vertical momentum to the item when the page turns', async () => {
    const { drag, decayVelocities, index, release } = await setup();
    await drag(-(EDGE + 150));
    await release(-300, 400);
    expect(decayVelocities()).toEqual([400]);
    await act(() => jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration + 500));
    expect(index()).toBe(2);
  });
});
