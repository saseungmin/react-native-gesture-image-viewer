import type { GestureViewerEdgeHandoffPagingConfig } from '../types';

export const DEFAULT_EDGE_HANDOFF_PAGING = {
  threshold: 0,
} as const;

export function resolveEdgeHandoffPaging(
  options: boolean | GestureViewerEdgeHandoffPagingConfig | undefined,
) {
  const config = typeof options === 'object' ? options : undefined;
  const threshold = config?.threshold;
  return {
    enabled: options === true || config?.enabled === true,
    threshold:
      threshold !== undefined && Number.isFinite(threshold) && threshold >= 0
        ? threshold
        : DEFAULT_EDGE_HANDOFF_PAGING.threshold,
  };
}

/**
 * Converts the part of a zoomed drag that the bounds clamp away into paging travel.
 * @returns The signed travel past `threshold`, in the same direction as the drag, or `0`.
 */
export function getEdgeHandoffDistance(clampedOverflow: number, threshold: number): number {
  'worklet';
  const travel = Math.abs(clampedOverflow) - threshold;
  if (travel <= 0) {
    return 0;
  }
  return clampedOverflow > 0 ? travel : -travel;
}
