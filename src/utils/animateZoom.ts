import { type SharedValue, type WithTimingConfig, withTiming } from 'react-native-reanimated';

import { clampTranslationToBounds } from '.';

// Keep translation and scale timing together, then reconcile against geometry that
// may have changed during the animation (for example, a concurrent rotation).
export const animateZoom = ({
  width,
  height,
  viewportSize,
  contentWidth,
  contentHeight,
  rotation,
  scale,
  translateX,
  translateY,
  target,
  config,
}: {
  width: number;
  height: number;
  viewportSize?: SharedValue<{ width: number; height: number }> | null;
  contentWidth?: SharedValue<number> | null;
  contentHeight?: SharedValue<number> | null;
  rotation?: SharedValue<number> | null;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  target: { scale: number; translateX: number; translateY: number };
  config?: WithTimingConfig;
}) => {
  'worklet';

  const constrained = clampTranslationToBounds({
    width,
    height,
    contentWidth: contentWidth?.get(),
    contentHeight: contentHeight?.get(),
    rotation: rotation?.get(),
    ...target,
  });
  translateX.set(withTiming(target.scale <= 1 ? 0 : constrained.translateX, config));
  translateY.set(withTiming(target.scale <= 1 ? 0 : constrained.translateY, config));
  // Register scale last so the final translations are available to its completion callback.
  scale.set(
    withTiming(target.scale, config, (finished) => {
      if (!finished || scale.get() <= 1) return;
      const currentX = translateX.get();
      const currentY = translateY.get();
      const final = clampTranslationToBounds({
        ...(viewportSize?.get() ?? { width, height }),
        contentWidth: contentWidth?.get(),
        contentHeight: contentHeight?.get(),
        rotation: rotation?.get(),
        scale: scale.get(),
        translateX: currentX,
        translateY: currentY,
      });
      if (final.translateX !== currentX) translateX.set(final.translateX);
      if (final.translateY !== currentY) translateY.set(final.translateY);
    }),
  );
};
