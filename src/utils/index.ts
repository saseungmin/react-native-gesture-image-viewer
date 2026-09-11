const isValidDimension = (value: number): boolean => {
  'worklet';
  return Number.isFinite(value) && value > 0;
};

export const resolveGeometrySyncTranslationMode = (
  previousIndex: number | null,
  nextIndex: number,
  scale: number,
): 'constrain' | 'none' | 'reset' => {
  if (previousIndex !== null && previousIndex !== nextIndex) {
    return 'reset';
  }

  return scale > 1 ? 'constrain' : 'none';
};

const clampTranslation = (value: number, max: number): number => {
  'worklet';
  const result = Math.max(-max, Math.min(max, value));
  return result === 0 ? 0 : result;
};

export const clampTranslationToBounds = ({
  width,
  height,
  contentWidth,
  contentHeight,
  scale,
  translateX,
  translateY,
}: {
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  translateX: number;
  translateY: number;
  scale: number;
}) => {
  'worklet';

  if (scale <= 1) {
    return {
      translateX,
      translateY,
    };
  }

  const baseWidth =
    contentWidth !== undefined && isValidDimension(contentWidth) ? contentWidth : width;
  const baseHeight =
    contentHeight !== undefined && isValidDimension(contentHeight) ? contentHeight : height;
  const maxTranslateX = Math.max(0, (baseWidth * scale - width) / 2);
  const maxTranslateY = Math.max(0, (baseHeight * scale - height) / 2);

  return {
    translateX: clampTranslation(translateX, maxTranslateX),
    translateY: clampTranslation(translateY, maxTranslateY),
  };
};
