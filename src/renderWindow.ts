export const DEFAULT_WINDOW_SIZE = 3;
export const MIN_WINDOW_SIZE = 3;

export type RenderWindowSlot<ItemT> = {
  item: ItemT;
  logicalIndex: number;
  slotKey: string;
  virtualIndex: number;
};

export type NavigationResolution =
  | {
      kind: 'noop';
    }
  | {
      direction: -1 | 1;
      kind: 'step';
      targetIndex: number;
    }
  | {
      kind: 'jump';
      targetIndex: number;
    };

export type NavigationOptions = {
  animated?: boolean;
};

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export function normalizeWindowSize(windowSize?: number): number {
  const candidateWindowSize = windowSize ?? DEFAULT_WINDOW_SIZE;

  if (!Number.isFinite(candidateWindowSize)) {
    return DEFAULT_WINDOW_SIZE;
  }

  const integerWindowSize = Math.floor(candidateWindowSize);
  const boundedWindowSize = Math.max(MIN_WINDOW_SIZE, integerWindowSize);

  return boundedWindowSize % 2 === 0 ? boundedWindowSize + 1 : boundedWindowSize;
}

export function normalizePageSpacing(pageSpacing?: number): number {
  const candidatePageSpacing = pageSpacing ?? 0;

  if (!Number.isFinite(candidatePageSpacing) || candidatePageSpacing < 0) {
    return 0;
  }

  return candidatePageSpacing;
}

export function getPageStride(width: number, pageSpacing?: number): number {
  return width + normalizePageSpacing(pageSpacing);
}

export function clampIndex(index: number | undefined, dataLength: number): number {
  if (dataLength <= 0) {
    return 0;
  }

  const candidateIndex = index ?? 0;

  if (!Number.isFinite(candidateIndex)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(candidateIndex), 0), dataLength - 1);
}

export function getLogicalIndex(
  virtualIndex: number,
  dataLength: number,
  enableLoop: boolean,
): number | null {
  if (dataLength <= 0 || !Number.isFinite(virtualIndex)) {
    return null;
  }

  if (enableLoop) {
    return positiveModulo(Math.trunc(virtualIndex), dataLength);
  }

  if (virtualIndex < 0 || virtualIndex >= dataLength) {
    return null;
  }

  return Math.trunc(virtualIndex);
}

export function getVirtualIndexForLogicalIndex(
  logicalIndex: number,
  centerVirtualIndex: number,
  dataLength: number,
  enableLoop: boolean,
): number | null {
  if (dataLength <= 0 || logicalIndex < 0 || logicalIndex >= dataLength) {
    return null;
  }

  if (!enableLoop) {
    return logicalIndex;
  }

  const currentLogicalIndex = getLogicalIndex(centerVirtualIndex, dataLength, true);

  if (currentLogicalIndex === null) {
    return logicalIndex;
  }

  const forwardDistance = positiveModulo(logicalIndex - currentLogicalIndex, dataLength);
  const backwardDistance = positiveModulo(currentLogicalIndex - logicalIndex, dataLength);

  return forwardDistance <= backwardDistance
    ? centerVirtualIndex + forwardDistance
    : centerVirtualIndex - backwardDistance;
}

export function createRenderWindow<ItemT>({
  centerVirtualIndex,
  data,
  enableLoop,
  windowSize,
}: {
  centerVirtualIndex: number;
  data: ItemT[];
  enableLoop: boolean;
  windowSize?: number;
}): RenderWindowSlot<ItemT>[] {
  const dataLength = data.length;

  if (dataLength === 0) {
    return [];
  }

  const normalizedWindowSize = normalizeWindowSize(windowSize);
  const halfWindowSize = Math.floor(normalizedWindowSize / 2);
  const slots: RenderWindowSlot<ItemT>[] = [];

  for (let offset = -halfWindowSize; offset <= halfWindowSize; offset += 1) {
    const virtualIndex = centerVirtualIndex + offset;
    const logicalIndex = getLogicalIndex(virtualIndex, dataLength, enableLoop);

    if (logicalIndex === null || !(logicalIndex in data)) {
      continue;
    }

    slots.push({
      item: data[logicalIndex] as ItemT,
      logicalIndex,
      slotKey: `slot-${virtualIndex}`,
      virtualIndex,
    });
  }

  return slots;
}

export function resolveNavigation({
  currentIndex,
  dataLength,
  enableLoop,
  targetIndex,
}: {
  currentIndex: number;
  dataLength: number;
  enableLoop: boolean;
  targetIndex: number;
}): NavigationResolution {
  if (
    dataLength <= 0 ||
    targetIndex < 0 ||
    targetIndex >= dataLength ||
    currentIndex < 0 ||
    currentIndex >= dataLength
  ) {
    return { kind: 'noop' };
  }

  if (targetIndex === currentIndex) {
    return { kind: 'noop' };
  }

  if (targetIndex === currentIndex + 1) {
    return { direction: 1, kind: 'step', targetIndex };
  }

  if (targetIndex === currentIndex - 1) {
    return { direction: -1, kind: 'step', targetIndex };
  }

  if (enableLoop && dataLength > 1 && currentIndex === dataLength - 1 && targetIndex === 0) {
    return { direction: 1, kind: 'step', targetIndex };
  }

  if (enableLoop && dataLength > 1 && currentIndex === 0 && targetIndex === dataLength - 1) {
    return { direction: -1, kind: 'step', targetIndex };
  }

  return { kind: 'jump', targetIndex };
}

export function shouldRunNavigationDuringTransition(
  resolution: NavigationResolution,
  options?: NavigationOptions,
): boolean {
  if (resolution.kind === 'noop') {
    return false;
  }

  return resolution.kind === 'jump' || options?.animated === false;
}
