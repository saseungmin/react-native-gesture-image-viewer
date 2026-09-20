import type { SharedValue } from 'react-native-reanimated';
import { cancelAnimation, Easing, withTiming } from 'react-native-reanimated';

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
    return { scale: nextScale, translateX: 0, translateY: 0 };
  }
  return {
    scale: nextScale,
    ...clampTranslationToBounds({
      contentHeight,
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
  contentWidth,
  contentHeight,
  maxZoomScale,
  scale,
  translateX,
  translateY,
  tapZoomTarget,
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
  tapZoomTarget?: SharedValue<number | null>;
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
  // Cancel the previous scale animation before publishing the new target so its
  // cancellation callback cannot clear the new transition.
  cancelAnimation(scale);
  tapZoomTarget?.set(target.scale);
  scale.set(
    withTiming(target.scale, timingConfig, () => {
      tapZoomTarget?.set(null);
    }),
  );
};

/** A new touch can take over an explicitly requested return to fitted scale. */
export function finishTapZoomOut({
  tapZoomTarget,
  scale,
  translateX,
  translateY,
}: {
  tapZoomTarget: SharedValue<number | null>;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  'worklet';
  if (tapZoomTarget.get() !== 1) {
    return;
  }
  cancelAnimation(scale);
  tapZoomTarget.set(null);
  scale.set(1);
  translateX.set(0);
  translateY.set(0);
}
