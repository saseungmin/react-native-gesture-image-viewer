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

  const { maxTranslateX, maxTranslateY } = getTranslationBounds({
    width,
    height,
    contentWidth,
    contentHeight,
    scale,
  });

  return {
    translateX: clampTranslation(translateX, maxTranslateX),
    translateY: clampTranslation(translateY, maxTranslateY),
  };
};
