import { act, cleanup, renderHook } from '@testing-library/react-native';

import { PAGE_TRANSITION_CONFIG } from '../gestureViewerAnimation';
import { registry } from '../GestureViewerRegistry';
import type { GestureViewerProps } from '../types';
import { useGestureViewer } from '../useGestureViewer';
import { getEdgeHandoffDistance, resolveEdgeHandoffPaging } from '../utils/edgeHandoffPaging';

// At 2x a 400pt-wide item may travel 200pt either way before its edge meets the viewer's.
const WIDTH = 400;
const EDGE = 200;

describe('resolveEdgeHandoffPaging', () => {
  it('is off unless enabled explicitly', () => {
    expect(resolveEdgeHandoffPaging(undefined).enabled).toBe(false);
    expect(resolveEdgeHandoffPaging(false).enabled).toBe(false);
    expect(resolveEdgeHandoffPaging({ enabled: false, threshold: 40 }).enabled).toBe(false);
    expect(resolveEdgeHandoffPaging(true)).toEqual({ enabled: true, threshold: 0 });
    expect(resolveEdgeHandoffPaging({ enabled: true, threshold: 40 })).toEqual({
      enabled: true,
      threshold: 40,
    });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to the default threshold for %p',
    (threshold) => {
      expect(resolveEdgeHandoffPaging({ enabled: true, threshold }).threshold).toBe(0);
    },
  );
});

describe('getEdgeHandoffDistance', () => {
  it('keeps the drag direction and subtracts the threshold', () => {
    expect(getEdgeHandoffDistance(-100, 0)).toBe(-100);
    expect(getEdgeHandoffDistance(100, 40)).toBe(60);
    expect(getEdgeHandoffDistance(-30, 40)).toBe(0);
    expect(getEdgeHandoffDistance(0, 0)).toBe(0);
  });
});

describe('edge-handoff paging', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    registry.createManager('handoff');
  });
  afterEach(async () => {
    await cleanup();
    registry.deleteManager('handoff');
    jest.useRealTimers();
  });

  async function setup(
    props: Partial<GestureViewerProps<string>> = {},
    { initialIndex = 1 }: { initialIndex?: number } = {},
  ) {
    const hook = await renderHook(() =>
      useGestureViewer({
        data: ['one', 'two', 'three'],
        id: 'handoff',
        width: WIDTH,
        height: 800,
        initialIndex,
        edgeHandoffPaging: true,
        ...props,
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
    const center = hook.result.current.centerVirtualIndex;
    const page = () => hook.result.current.visualPage.get() - center;
    const index = () => registry.getManager('handoff')!.getState().currentIndex;

    async function drag(translationX: number) {
      await act(() => {
        pan().handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never);
        pan().handlers.onBegin?.({} as never);
        pan().handlers.onStart?.({} as never);
      });
      await move(translationX);
    }

    async function move(translationX: number) {
      await act(() => {
        pan().handlers.onUpdate?.({ translationX, translationY: 0 } as never);
      });
    }

    async function release(velocityX = 0) {
      await act(() => {
        pan().handlers.onEnd?.({ velocityX, velocityY: 0 } as never, true);
        pan().handlers.onFinalize?.({} as never, true);
      });
      await act(() => jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration + 500));
    }

    expect(hook.result.current.isZoomed).toBe(true);
    return { ...hook, drag, index, move, page, pan, release };
  }

  it('leaves the page alone when the prop is omitted', async () => {
    const { drag, index, page, release } = await setup({ edgeHandoffPaging: undefined });
    await drag(-(EDGE + 150));
    expect(page()).toBe(0);
    await release(-2000);
    expect(index()).toBe(1);
  });

  it('does not move the page while the item still has room to pan', async () => {
    const { drag, page } = await setup();
    await drag(-EDGE);
    expect(page()).toBe(0);
  });

  it('moves the page by the drag that the edge clamps away, in both directions', async () => {
    const { drag, move, page } = await setup();
    await drag(-(EDGE + 100));
    expect(page()).toBeCloseTo(100 / WIDTH);
    await move(-(EDGE + 50));
    expect(page()).toBeCloseTo(50 / WIDTH);
    await move(-EDGE);
    expect(page()).toBe(0);
  });

  it('moves toward the previous item from the other edge', async () => {
    const { drag, page } = await setup();
    await drag(EDGE + 100);
    expect(page()).toBeCloseTo(-100 / WIDTH);
  });

  it('turns the page past the distance threshold and brings the next item in fitted', async () => {
    const { drag, index, page, release, result } = await setup();
    await drag(-(EDGE + 150));
    await release();
    expect(index()).toBe(2);
    expect(page()).toBe(1);
    expect(result.current.isZoomed).toBe(false);
  });

  it('turns back toward the previous item from the other edge', async () => {
    const { drag, index, release } = await setup();
    await drag(EDGE + 150);
    await release();
    expect(index()).toBe(0);
  });

  it('snaps back and stays zoomed when released short of the threshold', async () => {
    const { drag, index, page, release, result } = await setup();
    await drag(-(EDGE + 60));
    await release();
    expect(index()).toBe(1);
    expect(page()).toBe(0);
    expect(result.current.isZoomed).toBe(true);
  });

  it('turns the page on a flick even when little of the drag was past the edge', async () => {
    const { drag, index, release } = await setup();
    await drag(-(EDGE + 20));
    await release(-1200);
    expect(index()).toBe(2);
  });

  it('does not turn the page the other way on a flick back toward the item', async () => {
    const { drag, index, page, release } = await setup();
    await drag(-(EDGE + 20));
    await release(1200);
    expect(index()).toBe(1);
    expect(page()).toBe(0);
  });

  it('ignores a flick that never reached the edge', async () => {
    const { drag, index, release } = await setup();
    await drag(-(EDGE - 20));
    await release(-2000);
    expect(index()).toBe(1);
  });

  it('waits for the configured threshold before the page follows', async () => {
    const { drag, move, page } = await setup({
      edgeHandoffPaging: { enabled: true, threshold: 40 },
    });
    await drag(-(EDGE + 30));
    expect(page()).toBe(0);
    await move(-(EDGE + 140));
    expect(page()).toBeCloseTo(100 / WIDTH);
  });

  it('respects horizontalSwipe.enabled', async () => {
    const { drag, page } = await setup({ horizontalSwipe: { enabled: false } });
    await drag(-(EDGE + 150));
    expect(page()).toBe(0);
  });

  it('resists and settles at the first item without looping', async () => {
    const { drag, index, page, release } = await setup({}, { initialIndex: 0 });
    await drag(EDGE + 200);
    expect(-page()).toBeLessThan(200 / WIDTH);
    await release(2000);
    expect(index()).toBe(0);
    expect(page()).toBe(0);
  });

  it('settles the page when a second finger turns the drag into a pinch', async () => {
    const { drag, index, page, pan } = await setup();
    await drag(-(EDGE + 150));
    await act(() => {
      pan().handlers.onTouchesDown?.({ numberOfTouches: 2 } as never, { fail: jest.fn() } as never);
    });
    await act(() => jest.advanceTimersByTime(1000));
    expect(page()).toBe(0);
    expect(index()).toBe(1);
  });

  it('settles the page when the pan is cancelled', async () => {
    const { drag, index, page, pan } = await setup();
    await drag(-(EDGE + 150));
    await act(() => {
      pan().handlers.onEnd?.({ velocityX: 0, velocityY: 0 } as never, false);
      pan().handlers.onFinalize?.({} as never, false);
    });
    await act(() => jest.advanceTimersByTime(1000));
    expect(page()).toBe(0);
    expect(index()).toBe(1);
  });
});
