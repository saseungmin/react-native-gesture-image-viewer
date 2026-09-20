export function getTranslationBounds({
  width,
  height,
  contentWidth,
  contentHeight,
  scale,
}: {
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  scale: number;
}) {
  'worklet';
  const baseWidth =
    contentWidth !== undefined && Number.isFinite(contentWidth) && contentWidth > 0
      ? contentWidth
      : width;
  const baseHeight =
    contentHeight !== undefined && Number.isFinite(contentHeight) && contentHeight > 0
      ? contentHeight
      : height;
  return {
    maxTranslateX: Math.max(0, (baseWidth * scale - width) / 2),
    maxTranslateY: Math.max(0, (baseHeight * scale - height) / 2),
  };
}
