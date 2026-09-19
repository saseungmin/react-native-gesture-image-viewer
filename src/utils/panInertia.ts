import type { GestureViewerPanInertiaConfig } from '../types';

export function resolvePanInertia(options: boolean | GestureViewerPanInertiaConfig | undefined) {
  const deceleration = typeof options === 'object' ? options?.deceleration : undefined;
  return {
    enabled: options === true || (typeof options === 'object' && options?.enabled === true),
    deceleration:
      deceleration !== undefined &&
      Number.isFinite(deceleration) &&
      deceleration > 0 &&
      deceleration < 1
        ? deceleration
        : 0.998,
  };
}
