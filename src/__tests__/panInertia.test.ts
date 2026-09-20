import type { GestureViewerPanInertiaConfig, GestureViewerProps } from '../index';
import { clampTranslationToBounds } from '../utils';
import { resolvePanInertia } from '../utils/panInertia';
import { getTranslationBounds } from '../utils/translationBounds';

describe('pan inertia public contract', () => {
  it.each([-1, 1])('preserves captured overscroll and inward dragging on side %s', (side) => {
    const bounds = { width: 400, height: 800, scale: 2, translateY: 0, overflowX: side * 30 };
    expect(clampTranslationToBounds({ ...bounds, translateX: side * 230 }).translateX).toBe(
      side * 230,
    );
    expect(clampTranslationToBounds({ ...bounds, translateX: side * 220 }).translateX).toBe(
      side * 220,
    );
    expect(clampTranslationToBounds({ ...bounds, translateX: side * 150 }).translateX).toBe(
      side * 150,
    );
    expect(clampTranslationToBounds({ ...bounds, translateX: side * 260 }).translateX).toBe(
      side * 230,
    );
    expect(
      clampTranslationToBounds({ ...bounds, contentWidth: 100, translateX: side * 230 }).translateX,
    ).toBe(0);
  });

  it('accepts only the four supported decay fields in the public configuration', () => {
    const options: GestureViewerPanInertiaConfig = {
      enabled: true,
      deceleration: 0.9997,
      velocityFactor: 1.2,
      rubberBandEffect: false,
      rubberBandFactor: 0.4,
    };
    expect(resolvePanInertia(options)).toEqual(options);
    // @ts-expect-error Release velocity is supplied by the gesture.
    const velocity: GestureViewerPanInertiaConfig = { enabled: true, velocity: 100 };
    // @ts-expect-error Content bounds are owned by the viewer.
    const clamp: GestureViewerPanInertiaConfig = { enabled: true, clamp: [-1, 1] };
    // @ts-expect-error Accessibility preferences remain system-controlled.
    const motion: GestureViewerPanInertiaConfig = { enabled: true, reduceMotion: 'never' };
    for (const config of [velocity, clamp, motion]) {
      const resolved = resolvePanInertia(config);
      expect(resolved).not.toHaveProperty('velocity');
      expect(resolved).not.toHaveProperty('clamp');
      expect(resolved).not.toHaveProperty('reduceMotion');
    }
  });

  it.each([NaN, Infinity, -Infinity, -1, 0])('normalizes invalid multipliers %p', (value) => {
    const resolved = resolvePanInertia({
      enabled: true,
      velocityFactor: value,
      rubberBandFactor: value,
    });
    expect(resolved.velocityFactor).toBe(0.65);
    expect(resolved.rubberBandFactor).toBe(2);
  });

  it.each([undefined, false, { enabled: false }])('is opt-in: %p', (option) => {
    expect(resolvePanInertia(option)).toEqual({
      enabled: false,
      deceleration: 0.9997,
      velocityFactor: 0.65,
      rubberBandEffect: true,
      rubberBandFactor: 2,
    });
  });

  it('requires enabled for object configuration in TypeScript and JavaScript', () => {
    // @ts-expect-error An empty configuration must not implicitly enable inertia.
    const empty: GestureViewerPanInertiaConfig = {};
    expect(resolvePanInertia(empty).enabled).toBe(false);
    const config: GestureViewerProps<unknown>['panInertia'] = {
      enabled: true,
      deceleration: 0.995,
    };
    expect(resolvePanInertia(config)).toEqual({
      enabled: true,
      deceleration: 0.995,
      velocityFactor: 0.65,
      rubberBandEffect: true,
      rubberBandFactor: 2,
    });
    expect(resolvePanInertia(true)).toEqual({
      enabled: true,
      deceleration: 0.9997,
      velocityFactor: 0.65,
      rubberBandEffect: true,
      rubberBandFactor: 2,
    });
  });

  it.each([NaN, Infinity, -Infinity, -1, 0, 1, 2])(
    'normalizes invalid deceleration %p',
    (deceleration) => {
      expect(resolvePanInertia({ enabled: true, deceleration }).deceleration).toBe(0.9997);
    },
  );

  it('uses fitted content bounds, centering undersized axes', () => {
    expect(
      getTranslationBounds({
        width: 400,
        height: 800,
        contentWidth: 400,
        contentHeight: 400,
        scale: 2,
      }),
    ).toEqual({ maxTranslateX: 200, maxTranslateY: 0 });
    expect(getTranslationBounds({ width: 400, height: 800, scale: 2 })).toEqual({
      maxTranslateX: 200,
      maxTranslateY: 400,
    });
  });
});
