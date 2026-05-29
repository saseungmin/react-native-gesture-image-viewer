export const calculateFocalPointTranslation = ({
  currentFocalX,
  currentFocalY,
  height,
  initialScale,
  initialTranslateX,
  initialTranslateY,
  nextScale,
  startFocalX,
  startFocalY,
  width,
}: {
  currentFocalX: number;
  currentFocalY: number;
  height: number;
  initialScale: number;
  initialTranslateX: number;
  initialTranslateY: number;
  nextScale: number;
  startFocalX: number;
  startFocalY: number;
  width: number;
}) => {
  'worklet';

  const scaleRatio = nextScale / initialScale;
  const currentCenterX = currentFocalX - width / 2;
  const currentCenterY = currentFocalY - height / 2;
  const startCenterX = startFocalX - width / 2;
  const startCenterY = startFocalY - height / 2;

  return {
    translateX: initialTranslateX * scaleRatio + currentCenterX - startCenterX * scaleRatio,
    translateY: initialTranslateY * scaleRatio + currentCenterY - startCenterY * scaleRatio,
  };
};

export const shouldAcceptFocalPoint = ({
  focalX,
  focalY,
  hasActiveFocal,
  lastFocalX,
  lastFocalY,
  threshold,
}: {
  focalX: number;
  focalY: number;
  hasActiveFocal: boolean;
  lastFocalX: number;
  lastFocalY: number;
  threshold: number;
}) => {
  'worklet';

  if (!hasActiveFocal) {
    return true;
  }

  return Math.abs(focalX - lastFocalX) < threshold && Math.abs(focalY - lastFocalY) < threshold;
};
