import type { GestureViewerDismissDirection } from '../types';

export const shouldDismissByDirection = (
  translationY: number,
  threshold: number,
  direction: GestureViewerDismissDirection,
): boolean => {
  'worklet';

  if (direction === 'up') {
    return translationY < -threshold;
  }

  if (direction === 'both') {
    return Math.abs(translationY) > threshold;
  }

  return translationY > threshold;
};

export const getDismissDistance = (
  translationY: number,
  direction: GestureViewerDismissDirection,
): number => {
  'worklet';

  if (direction === 'up') {
    return Math.max(-translationY, 0);
  }

  if (direction === 'both') {
    return Math.abs(translationY);
  }

  return Math.max(translationY, 0);
};
