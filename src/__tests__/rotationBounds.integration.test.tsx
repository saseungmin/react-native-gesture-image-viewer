import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { PanGesture, TapGesture } from 'react-native-gesture-handler';

import { registry } from '../GestureViewerRegistry';
import { useGestureViewer } from '../useGestureViewer';

const id = 'rotation-bounds';
const data = ['first', 'second'];
const getItemDimensions = () => ({ width: 393, height: 616 });

async function setup() {
  const manager = registry.createManager(id)!;
  const zoomSpy = jest.spyOn(manager, 'setZoomSharedValues');
  const rotationSpy = jest.spyOn(manager, 'setRotation');
  const hook = await renderHook(
    ({ width, height }: { width: number; height: number }) =>
      useGestureViewer({
        data,
        id,
        width,
        height,
        maxZoomScale: 4,
        getItemDimensions,
      }),
    { initialProps: { width: 393, height: 852 } },
  );
  const values = zoomSpy.mock.calls.at(-1)![0];
  const rotation = rotationSpy.mock.calls.at(-1)![0];
  const read = () => ({
    x: values.translateX.get(),
    y: values.translateY.get(),
    rotation: rotation.get(),
  });
  return { manager, hook, values, rotation, read };
}

describe('rotation bounds lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await cleanup();
    registry.deleteManager(id);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reconciles a panned image when rotation completes without another gesture or listener', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.values.scale.set(2);
      viewer.values.translateY.set(190);
      viewer.manager.rotate();
    });
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.read()).toEqual({ x: 0, y: 0, rotation: 90 });
  });

  it('uses rotated extents for controller zoom', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.rotation.set(90);
      viewer.values.scale.set(2);
      viewer.values.translateX.set(400);
      viewer.values.translateY.set(190);
      viewer.manager.zoomOut(0.25);
    });
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.values.scale.get()).toBe(1.6);
    expect(viewer.read().x).toBeCloseTo(296.3);
    expect(viewer.read().y).toBe(0);
  });

  it('keeps final bounds valid when zoom-out continues after rotation finishes', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.values.scale.set(2);
      viewer.manager.rotate();
    });
    await act(async () => jest.advanceTimersByTime(150));
    await act(async () => {
      viewer.values.translateX.set(500);
      viewer.manager.zoomOut(0.25);
    });
    await act(async () => jest.advanceTimersByTime(500));
    expect(viewer.values.scale.get()).toBe(1.6);
    expect(viewer.read().x).toBeLessThanOrEqual(296.3 + 0.00001);
    expect(viewer.read().y).toBe(0);
  });

  it('continues an active pan from the position corrected by rotation', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.rotation.set(90);
      viewer.values.scale.set(2);
      viewer.values.translateX.set(400);
    });
    const pan = viewer.hook.result.current.zoomGesture
      .toGestureArray()
      .find((gesture) => gesture.handlerName === 'PanGestureHandler') as PanGesture;
    await act(async () => {
      pan.handlers.onBegin?.({} as never);
      pan.handlers.onUpdate?.({ translationX: 0, translationY: 0 } as never);
      viewer.manager.rotate();
    });
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.read().x).toBe(196.5);
    await act(async () => {
      pan.handlers.onUpdate?.({ translationX: -10, translationY: 0 } as never);
    });
    expect(viewer.read().x).toBeCloseTo(186.5);
  });

  it('clamps a rotated pinch, its ceiling settlement, and subsequent pan', async () => {
    const viewer = await setup();
    await act(async () => viewer.rotation.set(90));
    const pinch = viewer.hook.result.current.zoomPinchGesture;
    await act(async () => {
      pinch.handlers.onStart?.({ focalX: 196.5, focalY: 0 } as never);
      pinch.handlers.onUpdate?.({ focalX: 196.5, focalY: 0, scale: 5 } as never);
      pinch.handlers.onEnd?.({} as never, true);
      pinch.handlers.onFinalize?.({} as never, true);
    });
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.values.scale.get()).toBe(4);
    expect(viewer.read().y).toBe(360);
    const pan = viewer.hook.result.current.zoomGesture
      .toGestureArray()
      .find((gesture) => gesture.handlerName === 'PanGestureHandler') as PanGesture;
    await act(async () => {
      pan.handlers.onTouchesDown?.({ numberOfTouches: 1 } as never, {} as never);
      pan.handlers.onBegin?.({} as never);
      pan.handlers.onUpdate?.({ translationX: 2000, translationY: 2000 } as never);
    });
    expect(viewer.read()).toEqual({ x: 1035.5, y: 360, rotation: 90 });
  });

  it('uses rotated bounds for native double-tap and late content dimensions', async () => {
    const viewer = await setup();
    await act(async () => viewer.rotation.set(90));
    const doubleTap = viewer.hook.result.current.zoomGesture
      .toGestureArray()
      .find(
        (gesture) =>
          gesture.handlerName === 'TapGestureHandler' &&
          (gesture as TapGesture).config.numberOfTaps === 2,
      ) as TapGesture;
    await act(async () => doubleTap.handlers.onEnd?.({ x: 0, y: 0 } as never, true));
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.values.scale.get()).toBe(4);
    expect(viewer.read()).toEqual({ x: 589.5, y: 360, rotation: 90 });
    await act(async () =>
      viewer.hook.result.current.setItemDimensions(0, 'first', { width: 393, height: 200 }),
    );
    await act(async () => jest.advanceTimersByTime(400));
    expect(viewer.read().x).toBe(203.5);
    expect(viewer.values.contentWidth?.get()).toBe(393);
    expect(viewer.values.contentHeight?.get()).toBe(200);
  });

  it('reconciles a tap zoom that finishes after a concurrent rotation', async () => {
    const viewer = await setup();
    await act(async () => viewer.manager.rotate());
    await act(async () => jest.advanceTimersByTime(250));
    const doubleTap = viewer.hook.result.current.zoomGesture
      .toGestureArray()
      .find(
        (gesture) =>
          gesture.handlerName === 'TapGestureHandler' &&
          (gesture as TapGesture).config.numberOfTaps === 2,
      ) as TapGesture;
    await act(async () => doubleTap.handlers.onEnd?.({ x: 0, y: 0 } as never, true));
    await act(async () => jest.advanceTimersByTime(500));
    expect(viewer.values.scale.get()).toBe(4);
    expect(viewer.read().y).toBeLessThanOrEqual(360);
    expect(viewer.read().rotation).toBe(90);
  });

  it('keeps an active pinch anchored after rotation corrects its baseline', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.values.scale.set(2);
      viewer.rotation.set(90);
      viewer.values.translateX.set(400);
    });
    const pinch = viewer.hook.result.current.zoomPinchGesture;
    await act(async () => {
      pinch.handlers.onStart?.({ focalX: 196.5, focalY: 426 } as never);
      pinch.handlers.onUpdate?.({ focalX: 196.5, focalY: 426, scale: 1.25 } as never);
      viewer.manager.rotate();
    });
    await act(async () => jest.advanceTimersByTime(400));
    const corrected = viewer.read();
    await act(async () => {
      pinch.handlers.onUpdate?.({ focalX: 196.5, focalY: 426, scale: 1.25 } as never);
    });
    expect(viewer.read().x).toBeCloseTo(corrected.x);
    expect(viewer.read().y).toBeCloseTo(corrected.y);
    await act(async () => {
      pinch.handlers.onUpdate?.({ focalX: 186.5, focalY: 426, scale: 1.25 } as never);
    });
    expect(viewer.read().x).toBeCloseTo(corrected.x - 10);
  });

  it.each([false, true])(
    'handles repeated clockwise and counterclockwise rotation (listener=%s)',
    async (listen) => {
      const viewer = await setup();
      const listener = jest.fn();
      if (listen) viewer.manager.addEventListener('rotationChange', listener);
      await act(async () => {
        viewer.values.scale.set(2);
        viewer.values.translateY.set(190);
      });
      for (let step = 0; step < 5; step++) {
        // eslint-disable-next-line no-await-in-loop -- Each rotation must finish before the next command.
        await act(async () => viewer.manager.rotate(90, false));
        // eslint-disable-next-line no-await-in-loop -- Advance the same animation timeline sequentially.
        await act(async () => jest.advanceTimersByTime(400));
      }
      expect(viewer.read()).toEqual({ x: 0, y: 0, rotation: -450 });
      await act(async () => viewer.manager.rotate(0));
      await act(async () => jest.advanceTimersByTime(400));
      expect(viewer.read().rotation % 360).toBe(-0);
      expect(viewer.read().y).toBe(0);
      if (listen) expect(listener).toHaveBeenCalled();
    },
  );

  it('does not restore stale viewport bounds when zoom completes after a resize', async () => {
    const viewer = await setup();
    await act(async () => viewer.rotation.set(90));
    const doubleTap = viewer.hook.result.current.zoomGesture
      .toGestureArray()
      .find(
        (gesture) =>
          gesture.handlerName === 'TapGestureHandler' &&
          (gesture as TapGesture).config.numberOfTaps === 2,
      ) as TapGesture;
    await act(async () => doubleTap.handlers.onEnd?.({ x: 0, y: 0 } as never, true));
    await act(async () => jest.advanceTimersByTime(290));
    await viewer.hook.rerender({ width: 200, height: 852 });
    await act(async () => jest.advanceTimersByTime(500));
    expect(viewer.read().x).toBeGreaterThan(500);
    expect(viewer.read().x).toBeLessThanOrEqual((((616 * 200) / 393) * 4 - 200) / 2);
  });

  it('does not apply an old zoom completion to a newly mounted viewer', async () => {
    const old = await setup();
    await act(async () => {
      old.manager.zoomIn(1);
      old.manager.rotate();
    });
    await act(async () => jest.advanceTimersByTime(100));
    await old.hook.unmount();
    registry.deleteManager(id);
    const next = await setup();
    await act(async () => jest.advanceTimersByTime(500));
    expect(next.read()).toEqual({ x: 0, y: 0, rotation: 0 });
    expect(next.values.scale.get()).toBe(1);
  });

  it('does not let a cancelled rotation overwrite the next page reset', async () => {
    const viewer = await setup();
    await act(async () => {
      viewer.values.scale.set(2);
      viewer.values.translateY.set(190);
      viewer.manager.rotate();
    });
    await act(async () => jest.advanceTimersByTime(100));
    expect(viewer.rotation.get()).toBeGreaterThan(0);
    expect(viewer.rotation.get()).toBeLessThan(90);
    await act(async () => viewer.manager.goToIndex(1, { animated: false }));
    await act(async () => jest.advanceTimersByTime(500));
    expect(viewer.read()).toEqual({ x: 0, y: 0, rotation: 0 });
    expect(viewer.values.scale.get()).toBe(1);
  });
});
