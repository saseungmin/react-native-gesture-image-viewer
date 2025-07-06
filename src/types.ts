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
   * When you want to efficiently manage multiple `GestureViewer` instances, you can use the `id` prop to use multiple `GestureViewer` components.
   * @remark `GestureViewer` automatically removes instances from memory when components are unmounted, so no manual memory management is required.
   * @default 'default'
   */
  id?: string;
  /**
   * The data to display in the `GestureViewer`.
   */
  data: T[];
  /**
   * The index of the item to display in the `GestureViewer` when the component is mounted.
   * @default 0
   */
  initialIndex?: number;
  /**
   * A callback function that is called when the index of the item changes.
   */
  onIndexChange?: (index: number) => void;
  /**
   * A callback function that is called when the `GestureViewer` is dismissed.
   */
  onDismiss?: () => void;
  /**
   * A callback function that is called to render the item.
   */
  renderItem: (item: T, index: number) => React.ReactElement;
  /**
   * A callback function that is called to render the container.
   */
  renderContainer?: (children: React.ReactElement) => React.ReactElement;
  /**
   * Support for any list component like `ScrollView`, `FlatList`, `FlashList` through the `ListComponent` prop.
   */
  ListComponent: LC;
  /**
   * The width of the `GestureViewer`.
   * @remark If you don't set this prop, the width of the `GestureViewer` will be the same as the width of the screen.
   * @default screen width
   */
  width?: number;
  /**
   * `dismissThreshold` controls when `onDismiss` is called by applying a threshold value during vertical gestures.
   * @default 80
   */
  dismissThreshold?: number;
  // swipeThreshold?: number;
  // velocityThreshold?: number;
  /**
   * Calls `onDismiss` function when swiping down.
   * @remark Useful for closing modals with downward swipe gestures.
   * @default true
   */
  enableDismissGesture?: boolean;
  /**
   * Controls left/right swipe gestures.
   * @remark When `false`, horizontal gestures are disabled.
   * @default true
   */
  enableSwipeGesture?: boolean;
  /**
   * `resistance` controls the range of vertical movement by applying resistance during vertical gestures.
   * @default 2
   */
  resistance?: number;
  /**
   * The props to pass to the list component.
   * @remark The `listProps` provides **type inference based on the selected list component**, ensuring accurate autocompletion and type safety in your IDE.
   */
  listProps?: Partial<ConditionalListProps<LC>>;
  /**
   * The style of the backdrop.
   */
  backdropStyle?: StyleProp<ViewStyle>;
  /**
   * The style of the container.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * By default, the background `opacity` gradually decreases from 1 to 0 during downward swipe gestures.
   * @remark When `false`, this animation is disabled.
   * @default true
   */
  animateBackdrop?: boolean;
  /**
   * Only works when zoom is active, allows moving item position when zoomed.
   * @remark When `false`, gesture movement is disabled during zoom.
   * @default true
   */
  enableZoomPanGesture?: boolean;
  /**
   * Controls two-finger pinch gestures.
   * @remark When `false`, two-finger zoom gestures are disabled.
   * @default true
   */
  enableZoomGesture?: boolean;
  /**
   * Controls double-tap zoom gestures.
   * @remark When `false`, double-tap zoom gestures are disabled.
   * @default true
   */
  enableDoubleTapGesture?: boolean;
  /**
   * The maximum zoom scale.
   * @default 2
   */
  maxZoomScale?: number;
  /**
   * The spacing between items.
   * @default 0
   */
  itemSpacing?: number;
}
