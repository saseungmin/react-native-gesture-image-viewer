import type { GestureViewerPanInertiaConfig } from '../types';

export const DEFAULT_PAN_INERTIA = {
  deceleration: 0.9997,
  velocityFactor: 0.5,
  rubberBandEffect: true,
  rubberBandFactor: 1,
} as const;

function positiveOrDefault(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolvePanInertia(options: boolean | GestureViewerPanInertiaConfig | undefined) {
  const config = typeof options === 'object' ? options : undefined;
  const deceleration = config?.deceleration;
  return {
    enabled: options === true || config?.enabled === true,
    deceleration:
      deceleration !== undefined &&
      Number.isFinite(deceleration) &&
      deceleration > 0 &&
      deceleration < 1
        ? deceleration
        : DEFAULT_PAN_INERTIA.deceleration,
    velocityFactor: positiveOrDefault(config?.velocityFactor, DEFAULT_PAN_INERTIA.velocityFactor),
    rubberBandEffect:
      typeof config?.rubberBandEffect === 'boolean'
        ? config.rubberBandEffect
        : DEFAULT_PAN_INERTIA.rubberBandEffect,
    rubberBandFactor: positiveOrDefault(
      config?.rubberBandFactor,
      DEFAULT_PAN_INERTIA.rubberBandFactor,
    ),
  };
}
