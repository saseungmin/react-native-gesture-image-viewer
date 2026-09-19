import type { SharedValue } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

import { animateZoom } from './animateZoom';

import { clampTranslationToBounds } from '.';

export const getTapZoomTarget = ({
  x,
  y,
  width,
  height,
  contentWidth,
  contentHeight,
  rotation = 0,
  maxZoomScale,
  scale,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  rotation?: number;
  maxZoomScale: number;
  scale: number;
}) => {
  'worklet';
  const nextScale = scale > 1 ? 1 : maxZoomScale;
  if (nextScale <= 1) return { scale: nextScale, translateX: 0, translateY: 0 };
  return {
    scale: nextScale,
    ...clampTranslationToBounds({
      contentHeight,
      rotation,
      contentWidth,
      height,
      scale: nextScale,
      translateX: -(x - width / 2) * (nextScale - 1),
      translateY: -(y - height / 2) * (nextScale - 1),
      width,
    }),
  };
};

export const applyTapZoomAtPoint = ({
  x,
  y,
  width,
  height,
  viewportSize,
  contentWidth,
  contentHeight,
  rotation,
  maxZoomScale,
  scale,
  translateX,
  translateY,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportSize?: SharedValue<{ width: number; height: number }>;
  contentWidth?: SharedValue<number>;
  contentHeight?: SharedValue<number>;
  rotation?: SharedValue<number>;
  maxZoomScale: number;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) => {
  'worklet';

  const target = getTapZoomTarget({
    contentHeight: contentHeight?.get(),
    rotation: rotation?.get(),
    contentWidth: contentWidth?.get(),
    height,
    maxZoomScale,
    scale: scale.get(),
    width,
    x,
    y,
  });
  const timingConfig = {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  };

  animateZoom({
    viewportSize,
    width,
    height,
    contentWidth,
    contentHeight,
    rotation,
    scale,
    translateX,
    translateY,
    target,
    config: timingConfig,
  });
};
