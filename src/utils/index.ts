import { getTranslationBounds } from './translationBounds';

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

const clampTranslation = (value: number, max: number, overflow = 0): number => {
  'worklet';
  if (max <= 0) {
    return 0;
  }
  // While holding a rubber-band, retain only the overshoot captured at touch-down.
  const min = -max + Math.min(0, overflow);
  const upper = max + Math.max(0, overflow);
  const result = Math.max(min, Math.min(upper, value));
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
  overflowX = 0,
  overflowY = 0,
}: {
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  translateX: number;
  translateY: number;
  scale: number;
  overflowX?: number;
  overflowY?: number;
}) => {
  'worklet';

  if (scale <= 1) {
    return {
      translateX,
      translateY,
    };
  }

  const { maxTranslateX, maxTranslateY } = getTranslationBounds({
    width,
    height,
    contentWidth,
    contentHeight,
    scale,
  });

  return {
    translateX: clampTranslation(translateX, maxTranslateX, overflowX),
    translateY: clampTranslation(translateY, maxTranslateY, overflowY),
  };
};
