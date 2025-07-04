import type React from 'react';
import type { FlatList as RNFlatList, ScrollView as RNScrollView, StyleProp, ViewStyle } from 'react-native';
import type { FlatList as GHFlatList, ScrollView as GHScrollView } from 'react-native-gesture-handler';

export type FlatListComponent = typeof RNFlatList | typeof GHFlatList;
export type ScrollViewComponent = typeof RNScrollView | typeof GHScrollView;

type GetComponentProps<T> = T extends React.ComponentType<infer P> ? P : any;

type ConditionalListProps<LC> = LC extends FlatListComponent
  ? React.ComponentProps<FlatListComponent>
  : LC extends ScrollViewComponent
    ? React.ComponentProps<ScrollViewComponent>
    : GetComponentProps<LC>;

export interface GestureImageViewerProps<T = any, LC = typeof RNFlatList> {
  id?: string;
  data: T[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  onDismiss?: () => void;
  renderImage: (item: T, index: number) => React.ReactElement;
  renderContainer?: (children: React.ReactElement) => React.ReactElement;
  ListComponent: LC;
  width?: number;
  dismissThreshold?: number;
  // swipeThreshold?: number;
  // velocityThreshold?: number;
  enableDismissGesture?: boolean;
  enableSwipeGesture?: boolean;
  resistance?: number;
  listProps?: Partial<ConditionalListProps<LC>>;
  backdropStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  animateBackdrop?: boolean;
  enableZoomPanGesture?: boolean;
  enableZoomGesture?: boolean;
  enableDoubleTapGesture?: boolean;
  maxZoomScale?: number;
  itemSpacing?: number;
}
