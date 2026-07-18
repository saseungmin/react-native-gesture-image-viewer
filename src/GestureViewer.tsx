import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  type AnimatedStyle,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { registry } from './GestureViewerRegistry';
import { getWebContentProps } from './getWebContentProps';
import type { RenderWindowSlot } from './renderWindow';
import type { GestureViewerProps } from './types';
import { useGestureViewer } from './useGestureViewer';

type RenderWindowSlotViewProps<ItemT> = {
  animatedStyle: AnimatedStyle<ViewStyle>;
  height: number;
  isActive: boolean;
  pageStride: number;
  renderItem: GestureViewerProps<ItemT>['renderItem'];
  slot: RenderWindowSlot<ItemT>;
  visualPage: SharedValue<number>;
  width: number;
};

function RenderWindowSlotView<ItemT>({
  animatedStyle,
  height,
  isActive,
  pageStride,
  renderItem,
  slot,
  visualPage,
  width,
}: RenderWindowSlotViewProps<ItemT>) {
  const slotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (slot.virtualIndex - visualPage.get()) * pageStride }],
  }));

  return (
    <Animated.View
      style={[
        styles.slot,
        {
          height,
          width,
        },
        slotAnimatedStyle,
      ]}
    >
      <Animated.View style={[styles.page, isActive && animatedStyle]}>
        <View style={[styles.item, { height, width }]}>
          {renderItem(slot.item, slot.logicalIndex, { isActive })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function GestureViewer<ItemT>({
  id = 'default',
  data,
  renderItem,
  renderContainer,
  width: customWidth,
  height: customHeight,
  backdropStyle: backdropStyleProps,
  containerStyle,
  initialIndex = 0,
  pageSpacing = 0,
  windowSize = 3,
  enableLoop = false,
  ...props
}: GestureViewerProps<ItemT>) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const width = customWidth || screenWidth;
  const height = customHeight || screenHeight;

  const {
    animatedStyle,
    backdropStyle,
    centerVirtualIndex,
    dismissGesture,
    handleDismiss,
    horizontalPagingGesture,
    onWebClick,
    pageStride,
    renderWindowSlots,
    visualPage,
    zoomGesture,
  } = useGestureViewer({
    id,
    data,
    width,
    height,
    initialIndex,
    pageSpacing,
    windowSize,
    enableLoop,
    ...props,
  });

  const gesture = useMemo(() => {
    return Gesture.Race(dismissGesture, horizontalPagingGesture, zoomGesture);
  }, [dismissGesture, horizontalPagingGesture, zoomGesture]);

  useEffect(() => {
    registry.createManager(id);

    return () => registry.deleteManager(id);
  }, [id]);

  const control = useMemo(() => ({ dismiss: handleDismiss }), [handleDismiss]);
  const webContentProps = getWebContentProps(onWebClick);

  const viewer = (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={[styles.container, { height, width }, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <Animated.View style={styles.content} {...webContentProps}>
            {renderWindowSlots.map((slot) => (
              <RenderWindowSlotView
                animatedStyle={animatedStyle}
                height={height}
                isActive={slot.virtualIndex === centerVirtualIndex}
                key={slot.slotKey}
                pageStride={pageStride}
                renderItem={renderItem}
                slot={slot}
                visualPage={visualPage}
                width={width}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );

  return renderContainer ? renderContainer(viewer, control) : viewer;
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  container: {
    overflow: 'hidden',
  },
  content: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flex: 1,
  },
  slot: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
