import type React from 'react';
import type { FlatList as RNFlatList, ScrollView as RNScrollView, StyleProp, ViewStyle } from 'react-native';
import type { FlatList as GHFlatList, ScrollView as GHScrollView } from 'react-native-gesture-handler';

export type FlatListComponent = typeof RNFlatList | typeof GHFlatList;
export type ScrollViewComponent = typeof RNScrollView | typeof GHScrollView;

type GetComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

type ConditionalListProps<LC> = LC extends FlatListComponent
  ? React.ComponentProps<LC>
  : LC extends ScrollViewComponent
    ? React.ComponentProps<LC>
    : GetComponentProps<LC>;

export interface GestureViewerProps<T = any, LC = typeof RNFlatList> {
  /**
   * @description When you want to efficiently manage multiple `GestureViewer` instances, you can use the `id` prop to use multiple `GestureViewer` components. `GestureViewer` automatically removes instances from memory when components are unmounted, so no manual memory management is required.
   * @default 'default'
   */
  id?: string;
  /**
   * @description The data to display in the `GestureViewer`.
   */
  data: T[];
  /**
   * @description The index of the item to display in the `GestureViewer` when the component is mounted.
   * @default 0
   */
  initialIndex?: number;
  /**
   * @description A callback function that is called when the index of the item changes.
   */
  onIndexChange?: (index: number) => void;
  /**
   * @description A callback function that is called when the `GestureViewer` is dismissed.
   */
  onDismiss?: () => void;
  /**
   * @description A callback function that is called to render the item.
   */
  renderItem: (item: T, index: number) => React.ReactElement;
  /**
   * @description A callback function that is called to render the container.
   */
  renderContainer?: (children: React.ReactElement) => React.ReactElement;
  /**
   * @description Support for any list component like `ScrollView`, `FlatList`, `FlashList` through the `ListComponent` prop.
   */
  ListComponent: LC;
  /**
   * @description The width of the `GestureViewer`. If you don't set this prop, the width of the `GestureViewer` will be the same as the width of the screen.
   * @default screen width
   */
  width?: number;
  /**
   * @description `dismissThreshold` controls when `onDismiss` is called by applying a threshold value during vertical gestures.
   * @default 80
   */
  dismissThreshold?: number;
  // swipeThreshold?: number;
  // velocityThreshold?: number;
  /**
   * @description Calls `onDismiss` function when swiping down. Useful for closing modals with downward swipe gestures.
   * @default true
   */
  enableDismissGesture?: boolean;
  /**
   * @description Controls left/right swipe gestures. When `false`, horizontal gestures are disabled.
   * @default true
   */
  enableSwipeGesture?: boolean;
  /**
   * @description `resistance` controls the range of vertical movement by applying resistance during vertical gestures.
   * @default 2
   */
  resistance?: number;
  /**
   * @description The props to pass to the list component. The `listProps` provides **type inference based on the selected list component**, ensuring accurate autocompletion and type safety in your IDE.
   */
  listProps?: Partial<ConditionalListProps<LC>>;
  /**
   * @description The style of the backdrop.
   */
  backdropStyle?: StyleProp<ViewStyle>;
  /**
   * @description The style of the container.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * @description By default, the background `opacity` gradually decreases from 1 to 0 during downward swipe gestures. When `false`, this animation is disabled.
   * @default true
   */
  animateBackdrop?: boolean;
  /**
   * @description Only works when zoom is active, allows moving item position when zoomed. When `false`, gesture movement is disabled during zoom.
   * @default true
   */
  enableZoomPanGesture?: boolean;
  /**
   * @description Controls two-finger pinch gestures. When `false`, two-finger zoom gestures are disabled.
   * @default true
   */
  enableZoomGesture?: boolean;
  /**
   * @description Controls double-tap zoom gestures. When `false`, double-tap zoom gestures are disabled.
   * @default true
   */
  enableDoubleTapGesture?: boolean;
  /**
   * @description The maximum zoom scale.
   * @default 2
   */
  maxZoomScale?: number;
  /**
   * @description The spacing between items.
   * @default 0
   */
  itemSpacing?: number;
}
