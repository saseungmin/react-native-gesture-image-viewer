import { Easing } from 'react-native-reanimated';

export const PAGE_TRANSITION_CONFIG = {
  duration: 240,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const PAGE_SPRING_CONFIG = {
  damping: 35,
  energyThreshold: 6e-9,
  mass: 1,
  overshootClamping: false,
  stiffness: 360,
};

export const SWIPE_THRESHOLD_RATIO = 0.25;
export const SWIPE_VELOCITY_THRESHOLD = 800;
export const EDGE_RESISTANCE = 0.35;
