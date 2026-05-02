import type { SharedValue } from 'react-native-reanimated';
import { Easing, withTiming } from 'react-native-reanimated';

export const applyTapZoomAtPoint = ({
  x,
  y,
  width,
  height,
  maxZoomScale,
  scale,
  translateX,
  translateY,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  maxZoomScale: number;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) => {
  'worklet';

  const nextScale = scale.get() > 1 ? 1 : maxZoomScale;
  const timingConfig = {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  };

  if (nextScale > 1) {
    const centerX = x - width / 2;
    const centerY = y - height / 2;

    // NOTE 확대로 밀려난 거리만큼 반대로 이동해서 탭 지점을 제자리에 유지
    translateX.set(withTiming(-centerX * (nextScale - 1), timingConfig));
    translateY.set(withTiming(-centerY * (nextScale - 1), timingConfig));
  } else {
    translateX.set(withTiming(0, timingConfig));
    translateY.set(withTiming(0, timingConfig));
  }

  scale.set(withTiming(nextScale, timingConfig));
};
