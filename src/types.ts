import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export interface GestureImageViewerProps<T = any> {
  data: T[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  onDismiss?: () => void;
  renderImage: (item: T, index: number) => React.ReactElement;
  renderContainer?: (children: React.ReactElement) => React.ReactElement;
  ListComponent?: any; // FlatList, FlashList 등
  width?: number;
  dismissThreshold?: number;
  swipeThreshold?: number;
  velocityThreshold?: number;
  enableDismissGesture?: boolean;
  enableSwipeGesture?: boolean;
  resistance?: number;
  listProps?: any; // FlatList, FlashList에 전달할 추가 props
  backdropStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  animateBackdrop?: boolean;
  enableZoomPanGesture?: boolean;
  enableZoomGesture?: boolean;
  enableDoubleTapGesture?: boolean;
  maxZoomScale?: number;
}

export interface GestureState {
  currentIndex: number;
  translateY: SharedValue<number>;
  isGestureActive: boolean;
  lockDirection: 'horizontal' | 'vertical' | null;
}
