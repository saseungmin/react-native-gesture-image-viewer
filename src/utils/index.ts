export const createBoundsConstraint =
  ({ width, height }: { width: number; height: number }) =>
  ({
    scale,
    translateX,
    translateY,
  }: {
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

    const maxTranslateX = (width * scale - width) / 2;
    const maxTranslateY = (height * scale - height) / 2;

    return {
      translateX: Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX)),
      translateY: Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY)),
    };
  };
