export const getWebScrollPhysicalIndex = (offsetX: number, pageWidth: number): number => {
  if (!Number.isFinite(offsetX) || !Number.isFinite(pageWidth) || pageWidth <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(offsetX / pageWidth));
};

export const resolveWebScrollFinalState = ({
  dataLength,
  enableLoop,
  lastSettledPhysicalIndex,
  offsetX,
  pageWidth,
}: {
  offsetX: number;
  pageWidth: number;
  lastSettledPhysicalIndex: number;
  dataLength: number;
  enableLoop: boolean;
}): { logicalIndex: number; rawPhysicalIndex: number; settledPhysicalIndex: number } | null => {
  if (
    dataLength <= 0 ||
    !Number.isFinite(offsetX) ||
    !Number.isFinite(pageWidth) ||
    pageWidth <= 0
  ) {
    return null;
  }

  const maxPhysicalIndex = enableLoop && dataLength > 1 ? dataLength + 1 : dataLength - 1;
  const rawPhysicalIndex = getWebScrollPhysicalIndex(offsetX, pageWidth);

  if (enableLoop && dataLength > 1) {
    const isWrappingBackward = lastSettledPhysicalIndex === 1 && rawPhysicalIndex >= dataLength;
    const isWrappingForward = lastSettledPhysicalIndex === dataLength && rawPhysicalIndex <= 1;

    if (isWrappingBackward || rawPhysicalIndex === 0) {
      return {
        logicalIndex: dataLength - 1,
        rawPhysicalIndex,
        settledPhysicalIndex: dataLength,
      };
    }

    if (isWrappingForward || rawPhysicalIndex >= dataLength + 1) {
      return {
        logicalIndex: 0,
        rawPhysicalIndex,
        settledPhysicalIndex: 1,
      };
    }
  }

  const targetPhysicalIndex = Math.max(0, Math.min(maxPhysicalIndex, rawPhysicalIndex));

  if (enableLoop && dataLength > 1) {
    return {
      logicalIndex: targetPhysicalIndex - 1,
      rawPhysicalIndex,
      settledPhysicalIndex: targetPhysicalIndex,
    };
  }

  return {
    logicalIndex: targetPhysicalIndex,
    rawPhysicalIndex,
    settledPhysicalIndex: targetPhysicalIndex,
  };
};

export const getWebAutoPlayTargetPhysicalIndex = ({
  currentIndex,
  dataLength,
  enableLoop,
}: {
  currentIndex: number;
  dataLength: number;
  enableLoop: boolean;
}): number | null => {
  if (dataLength <= 1) {
    return null;
  }

  if (enableLoop && currentIndex === dataLength - 1) {
    return dataLength + 1;
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex >= dataLength) {
    return null;
  }

  return enableLoop ? nextIndex + 1 : nextIndex;
};
