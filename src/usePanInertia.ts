import { useCallback, useEffect } from 'react';
import {
  cancelAnimation,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import type { GestureViewerPanInertiaConfig } from './types';
import { resolvePanInertia } from './utils/panInertia';
import { getTranslationBounds } from './utils/translationBounds';

// Only cancel animations owned by inertia; pinch settling and controller timing
// animations share these translations and must be allowed to finish.
function stopAxis(translation: SharedValue<number>, owner: SharedValue<number>) {
  'worklet';
  if (owner.get() !== 0) {
    owner.set(0);
    cancelAnimation(translation);
  }
}

function startAxis(
  translation: SharedValue<number>,
  owner: SharedValue<number>,
  token: number,
  max: number,
  velocity: number,
  deceleration: number,
) {
  'worklet';
  const position = Math.max(-max, Math.min(max, translation.get()));
  translation.set(position === 0 ? 0 : position);
  if (
    max <= 0 ||
    !Number.isFinite(velocity) ||
    velocity === 0 ||
    (position >= max && velocity > 0) ||
    (position <= -max && velocity < 0)
  ) {
    return;
  }
  owner.set(token);
  translation.set(
    withDecay({ velocity, deceleration, clamp: [-max, max] }, () => {
      // Cancellation callbacks from an earlier release cannot clear a newer one.
      if (owner.get() === token) {
        owner.set(0);
      }
    }),
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
  const deceleration = options.deceleration;
  const ownerX = useSharedValue(0);
  const ownerY = useSharedValue(0);
  const sequence = useSharedValue(0);

  const stop = useCallback(() => {
    'worklet';
    stopAxis(translateX, ownerX);
    stopAxis(translateY, ownerY);
  }, [ownerX, ownerY, translateX, translateY]);

  const start = useCallback(
    (velocityX: number, velocityY: number) => {
      'worklet';
      if (!enabled || scale.get() <= 1) {
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
      startAxis(translateX, ownerX, token, maxTranslateX, velocityX, deceleration);
      startAxis(translateY, ownerY, token, maxTranslateY, velocityY, deceleration);
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
    ],
  );

  useAnimatedReaction(
    () => [scale.get(), rotation.get(), contentWidth.get(), contentHeight.get()],
    (current, previous) => {
      if (previous && current.some((value, index) => value !== previous[index])) {
        stop();
      }
    },
    [stop],
  );

  useEffect(() => {
    // Invalidation runs on the UI thread, atomically with animation ownership.
    scheduleOnUI(stop);
  }, [enabled, width, height, stop]);

  useEffect(() => () => scheduleOnUI(stop), [stop]);

  return { startPanInertia: start, stopPanInertia: stop };
}
