import type { GestureViewerPanInertiaConfig, GestureViewerProps } from '../index';
import { resolvePanInertia } from '../utils/panInertia';
import { getTranslationBounds } from '../utils/translationBounds';

describe('pan inertia public contract', () => {
  it.each([undefined, false, { enabled: false }])('is opt-in: %p', (option) => {
    expect(resolvePanInertia(option)).toEqual({ enabled: false, deceleration: 0.998 });
  });

  it('requires enabled for object configuration in TypeScript and JavaScript', () => {
    // @ts-expect-error An empty configuration must not implicitly enable inertia.
    const empty: GestureViewerPanInertiaConfig = {};
    expect(resolvePanInertia(empty).enabled).toBe(false);
    const config: GestureViewerProps<unknown, unknown>['panInertia'] = {
      enabled: true,
      deceleration: 0.995,
    };
    expect(resolvePanInertia(config)).toEqual({ enabled: true, deceleration: 0.995 });
    expect(resolvePanInertia(true)).toEqual({ enabled: true, deceleration: 0.998 });
  });

  it.each([NaN, Infinity, -Infinity, -1, 0, 1, 2])(
    'normalizes invalid deceleration %p',
    (deceleration) => {
      expect(resolvePanInertia({ enabled: true, deceleration }).deceleration).toBe(0.998);
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
