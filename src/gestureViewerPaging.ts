export type HorizontalSwipeDirection = -1 | 0 | 1;

export type HorizontalPagingTarget =
  | {
      kind: 'move';
      targetVirtualIndex: number;
    }
  | {
      kind: 'settle';
    };

export function resolveHorizontalSwipeDirection(
  translationX: number,
  velocityX: number,
  width: number,
  thresholdRatio: number,
  velocityThreshold: number,
): HorizontalSwipeDirection {
  'worklet';

  const translationThreshold = width * thresholdRatio;

  if (-translationX > translationThreshold || velocityX < -velocityThreshold) {
    return 1;
  }

  if (translationX > translationThreshold || velocityX > velocityThreshold) {
    return -1;
  }

  return 0;
}

export function applyHorizontalEdgeResistance(
  nextPage: number,
  currentIndex: number,
  dataLength: number,
  centerVirtualIndex: number,
  enableLoop: boolean,
  resistance: number,
): number {
  'worklet';

  if (dataLength <= 1) {
    return centerVirtualIndex;
  }

  if (enableLoop) {
    return nextPage;
  }

  if (currentIndex <= 0 && nextPage < centerVirtualIndex) {
    return centerVirtualIndex + (nextPage - centerVirtualIndex) * resistance;
  }

  if (currentIndex >= dataLength - 1 && nextPage > centerVirtualIndex) {
    return centerVirtualIndex + (nextPage - centerVirtualIndex) * resistance;
  }

  return nextPage;
}

export function canMoveHorizontalPage(
  currentIndex: number,
  dataLength: number,
  direction: HorizontalSwipeDirection,
  enableLoop: boolean,
): boolean {
  'worklet';

  if (direction === 0 || dataLength <= 1) {
    return false;
  }

  if (enableLoop) {
    return true;
  }

  const nextIndex = currentIndex + direction;

  return nextIndex >= 0 && nextIndex < dataLength;
}

export function resolveHorizontalPagingTarget(
  centerVirtualIndex: number,
  currentIndex: number,
  dataLength: number,
  direction: HorizontalSwipeDirection,
  enableLoop: boolean,
): HorizontalPagingTarget {
  'worklet';

  if (!canMoveHorizontalPage(currentIndex, dataLength, direction, enableLoop)) {
    return { kind: 'settle' };
  }

  return {
    kind: 'move',
    targetVirtualIndex: centerVirtualIndex + direction,
  };
}
