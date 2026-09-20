import { useCallback, useEffect, useRef } from 'react';
import {
  cancelAnimation,
  ReduceMotion,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import type { GestureViewerPanInertiaConfig } from './types';
import { resolvePanInertia } from './utils/panInertia';
import { getTranslationBounds } from './utils/translationBounds';

// Only cancel animations owned by inertia; pinch settling and controller timing
// animations share these translations and must be allowed to finish.
function stopAxis(translation: SharedValue<number>, owner: SharedValue<number>, max?: number) {
  'worklet';
  if (owner.get() === 0) {
    return;
  }
  owner.set(0);
  cancelAnimation(translation);
  if (max !== undefined) {
    const position = Math.max(-max, Math.min(max, translation.get()));
    translation.set(position === 0 ? 0 : position);
  }
}

function startAxis(
  translation: SharedValue<number>,
  owner: SharedValue<number>,
  token: number,
  max: number,
  velocity: number,
  config: Omit<ReturnType<typeof resolvePanInertia>, 'enabled'>,
) {
  'worklet';
  const current = translation.get();
  const bounded = Math.max(-max, Math.min(max, current));
  const isOutside = current !== bounded;
  const releaseVelocity = Number.isFinite(velocity) ? velocity : 0;
  if (
    !isOutside &&
    (max <= 0 ||
      releaseVelocity === 0 ||
      (!config.rubberBandEffect &&
        ((current >= max && releaseVelocity > 0) || (current <= -max && releaseVelocity < 0))))
  ) {
    return;
  }
  const onComplete = (finished?: boolean) => {
    'worklet';
    if (owner.get() !== token) {
      return;
    }
    owner.set(0);
    if (finished) {
      const settled = Math.max(-max, Math.min(max, translation.get()));
      translation.set(settled === 0 ? 0 : settled);
    }
  };
  owner.set(token);
  if (isOutside && (!config.rubberBandEffect || max <= 0)) {
    translation.set(
      withTiming(
        bounded === 0 ? 0 : bounded,
        { duration: 180, reduceMotion: ReduceMotion.System },
        onComplete,
      ),
    );
    return;
  }
  translation.set(
    withDecay(
      {
        ...config,
        velocity: releaseVelocity,
        clamp: [-max, max],
        reduceMotion: ReduceMotion.System,
      },
      onComplete,
    ),
  );
}

export function usePanInertia({
  panInertia,
  enablePanWhenZoomed,
  width,
  height,
  contentWidth,
  contentHeight,
  scale,
  rotation,
  translateX,
  translateY,
}: {
  panInertia: boolean | GestureViewerPanInertiaConfig | undefined;
  enablePanWhenZoomed: boolean;
  width: number;
  height: number;
  contentWidth: SharedValue<number>;
  contentHeight: SharedValue<number>;
  scale: SharedValue<number>;
  rotation: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  const options = resolvePanInertia(panInertia);
  const enabled = options.enabled && enablePanWhenZoomed;
  const { deceleration, velocityFactor, rubberBandEffect, rubberBandFactor } = options;
  const ownerX = useSharedValue(0);
  const ownerY = useSharedValue(0);
  const sequence = useSharedValue(0);

  const stop = useCallback(() => {
    'worklet';
    stopAxis(translateX, ownerX);
    stopAxis(translateY, ownerY);
  }, [ownerX, ownerY, translateX, translateY]);

  const stopAndConstrain = useCallback(() => {
    'worklet';
    const { maxTranslateX, maxTranslateY } = getTranslationBounds({
      width,
      height,
      contentWidth: contentWidth.get(),
      contentHeight: contentHeight.get(),
      scale: scale.get(),
    });
    stopAxis(translateX, ownerX, maxTranslateX);
    stopAxis(translateY, ownerY, maxTranslateY);
  }, [ownerX, ownerY, translateX, translateY, width, height, contentWidth, contentHeight, scale]);

  const start = useCallback(
    (velocityX: number, velocityY: number) => {
      'worklet';
      if (scale.get() <= 1) {
        return;
      }
      stop();
      const { maxTranslateX, maxTranslateY } = getTranslationBounds({
        width,
        height,
        contentWidth: contentWidth.get(),
        contentHeight: contentHeight.get(),
        scale: scale.get(),
      });
      const token = sequence.get() + 1;
      sequence.set(token);
      const config = {
        deceleration,
        velocityFactor,
        rubberBandEffect: enabled && rubberBandEffect,
        rubberBandFactor,
      };
      startAxis(translateX, ownerX, token, maxTranslateX, enabled ? velocityX : 0, config);
      startAxis(translateY, ownerY, token, maxTranslateY, enabled ? velocityY : 0, config);
    },
    [
      enabled,
      scale,
      stop,
      width,
      height,
      contentWidth,
      contentHeight,
      sequence,
      translateX,
      translateY,
      ownerX,
      ownerY,
      deceleration,
      velocityFactor,
      rubberBandEffect,
      rubberBandFactor,
    ],
  );

  useAnimatedReaction(
    () => [scale.get(), rotation.get(), contentWidth.get(), contentHeight.get()],
    (current, previous) => {
      if (previous && current.some((value, index) => value !== previous[index])) {
        stopAndConstrain();
      }
    },
    [stopAndConstrain],
  );

  const stopOnUnmount = useRef(stopAndConstrain);

  useEffect(() => {
    stopOnUnmount.current = stopAndConstrain;
    scheduleOnUI(stopAndConstrain);
  }, [enabled, width, height, stopAndConstrain]);

  useEffect(() => () => scheduleOnUI(stopOnUnmount.current), []);

  return { startPanInertia: start, stopPanInertia: stop };
}
