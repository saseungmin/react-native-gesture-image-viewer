import type { SharedValue } from 'react-native-reanimated';
import { Easing, withTiming } from 'react-native-reanimated';

import { clampTranslationToBounds } from '.';

export const getTapZoomTarget = ({
  x,
  y,
  width,
  height,
  contentWidth,
  contentHeight,
  maxZoomScale,
  scale,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  maxZoomScale: number;
  scale: number;
}) => {
  'worklet';

  const nextScale = scale > 1 ? 1 : maxZoomScale;

  if (nextScale <= 1) {
    return {
      scale: nextScale,
      translateX: 0,
      translateY: 0,
    };
  }

  const centerX = x - width / 2;
  const centerY = y - height / 2;
  return {
    scale: nextScale,
    ...clampTranslationToBounds({
      contentHeight,
      contentWidth,
      height,
      scale: nextScale,
      translateX: -centerX * (nextScale - 1),
      translateY: -centerY * (nextScale - 1),
      width,
    }),
  };
};

export const applyTapZoomAtPoint = ({
  x,
  y,
  width,
  height,
  contentWidth,
  contentHeight,
  maxZoomScale,
  scale,
  translateX,
  translateY,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  maxZoomScale: number;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) => {
  'worklet';

  const target = getTapZoomTarget({
    contentHeight,
    contentWidth,
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

  translateX.set(withTiming(target.translateX, timingConfig));
  translateY.set(withTiming(target.translateY, timingConfig));

  scale.set(withTiming(target.scale, timingConfig));
};
