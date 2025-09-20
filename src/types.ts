import type React from 'react';
import type { FlatList as RNFlatList, ScrollView as RNScrollView, StyleProp, ViewStyle } from 'react-native';
import type { FlatList as GHFlatList, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import type { WithTimingConfig } from 'react-native-reanimated';

export type FlatListComponent = typeof RNFlatList | typeof GHFlatList;
export type ScrollViewComponent = typeof RNScrollView | typeof GHScrollView;

type GetComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

type ConditionalListProps<LC> = LC extends FlatListComponent
  ? React.ComponentProps<LC>
  : LC extends ScrollViewComponent
    ? React.ComponentProps<LC>
    : GetComponentProps<LC>;

export type TriggerRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface TriggerAnimationConfig extends WithTimingConfig {
  /**
   * Animation duration in milliseconds
   * @defaultValue 300
   */
  duration?: WithTimingConfig['duration'];
  /**
   * Animation easing function
   * @defaultValue Easing.bezier(0.25, 0.1, 0.25, 1.0)
   */
  easing?: WithTimingConfig['easing'];
  /**
   * Callback function called after animation completion
   */
  onAnimationComplete?: () => void;
}

export interface GestureViewerProps<T = any, LC = typeof RNScrollView> {
  /**
   * When you want to efficiently manage multiple `GestureViewer` instances, you can use the `id` prop to use multiple `GestureViewer` components.
   * @remarks `GestureViewer` automatically removes instances from memory when components are unmounted, so no manual memory management is required.
   * @defaultValue 'default'
   */
  id?: string;
  /**
   * The data to display in the `GestureViewer`.
   */
  data: T[];
  /**
   * The index of the item to display in the `GestureViewer` when the component is mounted.
   * @defaultValue 0
   */
  initialIndex?: number;
  /**
   * A callback function that is called when the `GestureViewer` is dismissed.
   */
  onDismiss?: () => void;
  /**
   * A callback function that is called when the dismiss interaction starts.
   * @remarks Useful to hide external UI (e.g., headers, buttons) while the dismiss gesture/animation is in progress.
   */
  onDismissStart?: () => void;
  /**
   * A callback function that is called to render the item.
   */
  renderItem: (item: T, index: number) => React.ReactElement;
  /**
   * A callback function that is called to render the container.
   * @remarks Useful for composing additional UI (e.g., close button, toolbars) around the viewer.
   * The second argument provides control helpers such as `dismiss()` to close the viewer.
   *
   * @param children - The viewer content to be rendered inside your container.
   * @param helpers - Control helpers for the viewer. Currently includes `dismiss()`.
   * @returns A React element that wraps and renders the provided `children`.
   */
  renderContainer?: (children: React.ReactElement, helpers: { dismiss: () => void }) => React.ReactElement;
  /**
   * Support for any list component like `ScrollView`, `FlatList`, `FlashList` through the `ListComponent` prop.
   */
  ListComponent: LC;
  /**
   * The width of the `GestureViewer`.
   * @remarks If you don't set this prop, the width of the `GestureViewer` will be the same as the width of the screen.
   * @defaultValue screen width
   */
  width?: number;
  /**
   * The height of the `GestureViewer`.
   * @remarks If you don't set this prop, the height of the `GestureViewer` will be the same as the height of the screen.
   * @defaultValue screen height
   */
  height?: number;
  /**
   * The props to pass to the list component.
   * @remarks The `listProps` provides **type inference based on the selected list component**, ensuring accurate autocompletion and type safety in your IDE.
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
   * Dismiss gesture options. Calls `onDismiss` function when swiping down.
   * @remarks Useful for closing modals with downward swipe gestures.
   */
  dismiss?: {
    /**
     * When `false`, dismiss gesture is disabled.
     * @defaultValue true
     */
    enabled?: boolean;
    /**
     * `threshold` controls when `onDismiss` is called by applying a threshold value during vertical gestures.
     * @defaultValue 80
     */
    threshold?: number;
    /**
     * `resistance` controls the range of vertical movement by applying resistance during dismiss gestures.
     * @defaultValue 2
     */
    resistance?: number;
    /**
     * By default, the background `opacity` gradually decreases from 1 to 0 during downward swipe gestures.
     * @remarks When `false`, this animation is disabled.
     * @defaultValue true
     */
    fadeBackdrop?: boolean;
  };
  /**
   * Controls left/right swipe gestures.
   * @remarks When `false`, horizontal gestures are disabled.
   * @defaultValue true
   */
  enableHorizontalSwipe?: boolean;
  /**
   * Only works when zoom is active, allows moving item position when zoomed.
   * @remarks When `false`, gesture movement is disabled during zoom.
   * @defaultValue true
   */
  enablePanWhenZoomed?: boolean;
  /**
   * Controls two-finger pinch gestures.
   * @remarks When `false`, two-finger zoom gestures are disabled.
   * @defaultValue true
   */
  enablePinchZoom?: boolean;
  /**
   * Controls double-tap zoom gestures.
   * @remarks When `false`, double-tap zoom gestures are disabled.
   * @defaultValue true
   */
  enableDoubleTapZoom?: boolean;
  /**
   * Enables infinite loop navigation.
   * @defaultValue false
   */
  enableLoop?: boolean;
  /**
   * Enables snap scrolling mode.
   *
   * @remarks
   * **`false` (default)**: Paging mode (`pagingEnabled: true`)
   * - Scrolls by full screen size increments
   *
   * **`true`**: Snap mode (`snapToInterval` auto-calculated)
   * - `snapToInterval` is automatically calculated based on `width` and `itemSpacing` values
   * - Use this option when you need item spacing
   * @defaultValue false
   *
   */
  enableSnapMode?: boolean;
  /**
   * The spacing between items in pixels.
   * @remarks Only applied when `enableSnapMode` is `true`.
   * @defaultValue 0
   */
  itemSpacing?: number;
  /**
   * The maximum zoom scale.
   * @defaultValue 2
   */
  maxZoomScale?: number;
  /**
   * Trigger-based animation settings
   * @remarks You can customize animation duration, easing, and system reduce-motion behavior.
   *
   * @example
   * ```tsx
   * <GestureViewer
   *   triggerAnimation={{
   *     duration: 250,
   *     easing: Easing.out(Easing.cubic),
   *     reduceMotion: 'system',
   *     onAnimationComplete: () => {
   *       console.log('Animation complete');
   *     },
   *   }}
   * />
   * ```
   */
  triggerAnimation?: TriggerAnimationConfig;
}

/**
 * Supported rotation angles in degrees.
 */
export type RotationAngle = 0 | 90 | 180 | 270 | 360;

/**
 * Controller for managing gesture-based image/content viewer interactions.
 * Provides navigation, zoom, and rotation capabilities with state management.
 */
export type GestureViewerController = {
  /**
   * Navigates to the specified index in the viewer.
   * Updates the currentIndex in the controller state.
   *
   * @param index - The target index (must be between 0 and totalCount - 1)
   * @throws Will throw an error if index is out of bounds
   *
   * @example
   * ```typescript
   * const { totalCount } = useGestureViewerState();
   *
   * controller.goToIndex(0); // Go to first item
   * controller.goToIndex(totalCount - 1); // Go to last item
   * ```
   */
  goToIndex: (index: number) => void;

  /**
   * Navigates to the previous item in the sequence.
   * If already at the first item, behavior depends on implementation (may wrap or do nothing).
   * Updates currentIndex in the controller state.
   */
  goToPrevious: () => void;

  /**
   * Navigates to the next item in the sequence.
   * If already at the last item, behavior depends on implementation (may wrap or do nothing).
   * Updates currentIndex in the controller state.
   */
  goToNext: () => void;

  /**
   * Zooms in by the specified multiplier.
   *
   * @param multiplier - The zoom multiplier (0.01 - 1.0). Higher values zoom in more.
   * @defaultValue 0.25
   *
   * @example
   * ```typescript
   * controller.zoomIn(); // Zoom in by 25%
   * controller.zoomIn(0.5); // Zoom in by 50%
   * ```
   */
  zoomIn: (multiplier?: number) => void;

  /**
   * Zooms out by the specified multiplier.
   *
   * @param multiplier - The zoom multiplier (0.01 - 1.0). Higher values zoom out more.
   * @defaultValue 0.25
   *
   * @example
   * ```typescript
   * controller.zoomOut(); // Zoom out by 25%
   * controller.zoomOut(0.1); // Zoom out by 10%
   * ```
   */
  zoomOut: (multiplier?: number) => void;

  /**
   * Resets the zoom level to the specified scale.
   *
   * @param scale - The scale to reset to (1.0 = original size)
   * @defaultValue 1.0
   *
   * @example
   * ```typescript
   * controller.resetZoom(); // Reset to original size
   * controller.resetZoom(0.5); // Reset to 50% of original size
   * ```
   */
  resetZoom: (scale?: number) => void;

  /**
   * Rotates the content by the specified angle.
   *
   * @param angle - Rotation angle in degrees. Must be one of: 0, 90, 180, 270, 360
   * @param clockwise - Direction of rotation when angle is not 0 or 360
   * @defaultValue angle: `90`, clockwise: `true`
   *
   * @remarks
   * - Angle 0 or 360 resets rotation regardless of clockwise parameter
   * - The clockwise parameter only affects rotation when angle is 90, 180, or 270
   * - Rotation is cumulative and affects the current orientation
   *
   * @example
   * ```typescript
   * controller.rotate(); // Rotate 90 degrees clockwise
   * controller.rotate(0); // Reset rotation
   * controller.rotate(90, false); // Rotate 90 degrees counter-clockwise
   * controller.rotate(180); // Rotate 180 degrees (clockwise by default)
   * controller.rotate(270, false); // Rotate 270 degrees counter-clockwise
   * controller.rotate(360); // Reset rotation (same as 0)
   * ```
   */
  rotate: (angle?: RotationAngle, clockwise?: boolean) => void;
};

/**
 * State information for the gesture viewer controller.
 * Contains read-only properties that reflect the current state.
 */
export type GestureViewerState = {
  /**
   * The current index of the active item in the viewer.
   *
   * @remarks
   * This value is automatically updated when navigation methods are called.
   *
   * @example
   * ```typescript
   * console.log(`Currently viewing item ${currentIndex + 1} of ${totalCount}`);
   * ```
   */
  readonly currentIndex: number;

  /**
   * The total number of items available in the viewer.
   *
   * @remarks
   * This value determines the valid range for currentIndex (0 to totalCount - 1).
   *
   * @example
   * ```typescript
   * const hasNext = currentIndex < totalCount - 1;
   * const hasPrevious = currentIndex > 0;
   * ```
   */
  readonly totalCount: number;
};

export type GestureViewerEventType = 'zoomChange' | 'rotationChange';

export type GestureViewerEventData = {
  zoomChange: { scale: number; previousScale: number | null };
  rotationChange: { rotation: number; previousRotation: number | null };
};

export type GestureViewerEventCallback<T extends GestureViewerEventType> = (data: GestureViewerEventData[T]) => void;
