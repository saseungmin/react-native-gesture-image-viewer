import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  type ScrollViewProps,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { registry } from './GestureViewerRegistry';
import type { GestureViewerProps } from './types';
import { useGestureViewer } from './useGestureViewer';
import { createLoopData, isFlashListLike, isFlatListLike, isScrollViewLike } from './utils';
import WebPagingFixStyle from './WebPagingFixStyle';

export function GestureViewer<ItemT, LC>({
  id = 'default',
  data,
  renderItem: renderItemProp,
  renderContainer,
  ListComponent,
  width: customWidth,
  height: customHeight,
  listProps,
  backdropStyle: backdropStyleProps,
  containerStyle,
  initialIndex = 0,
  itemSpacing = 0,
  enableSnapMode = false,
  enableLoop = false,
  ...props
}: GestureViewerProps<ItemT, LC>) {
  const Component = ListComponent as React.ComponentType<any>;

  const dataRef = useRef(data);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const width = customWidth || screenWidth;
  const height = customHeight || screenHeight;

  const loopData = useMemo(() => createLoopData(dataRef, enableLoop), [enableLoop]);

  const isScrollView = isScrollViewLike(Component);

  const {
    listRef,
    isZoomed,
    isRotated,
    isPinching,
    dismissGesture,
    zoomGesture,
    nativeScrollGesture,
    onMomentumScrollEnd,
    onScrollBeginDrag,
    animatedStyle,
    backdropStyle,
    handleDismiss,
  } = useGestureViewer({
    id,
    data,
    width,
    height,
    initialIndex,
    itemSpacing,
    enableLoop,
    ...props,
  });

  const keyExtractor = useCallback(
    (item: ItemT, index: number) => {
      if (enableLoop) {
        return typeof item === 'string' ? `${item}-${index}` : `item-${index}`;
      }

      return typeof item === 'string' ? item : `image-${index}`;
    },
    [enableLoop],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ItemT; index: number }) => {
      return (
        <View
          key={isScrollView ? keyExtractor(item, index) : undefined}
          style={[
            {
              width,
              height,
              marginHorizontal: itemSpacing / 2,
            },
            styles.item,
          ]}
        >
          {renderItemProp(item, index)}
        </View>
      );
    },
    [width, itemSpacing, renderItemProp, keyExtractor, isScrollView, height],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<ItemT> | null | undefined, index: number) => ({
      length: width + itemSpacing,
      offset: (width + itemSpacing) * index,
      index,
    }),
    [width, itemSpacing],
  );

  const gesture = useMemo(() => {
    return Gesture.Race(dismissGesture, zoomGesture);
  }, [zoomGesture, dismissGesture]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    registry.createManager(id);

    return () => registry.deleteManager(id);
  }, [id]);

  const commonProps = useMemo(
    () =>
      ({
        horizontal: true,
        scrollEnabled: !isZoomed && !isRotated && !isPinching,
        showsHorizontalScrollIndicator: false,
        onMomentumScrollEnd: onMomentumScrollEnd,
        onScrollBeginDrag,
        ...(enableSnapMode
          ? {
              snapToInterval: width + itemSpacing,
              snapToAlignment: 'center',
              decelerationRate: 'fast',
            }
          : {
              pagingEnabled: true,
            }),
        scrollEventThrottle: 16,
        removeClippedSubviews: true,
      }) satisfies ScrollViewProps,
    [
      width,
      itemSpacing,
      isZoomed,
      isRotated,
      isPinching,
      onMomentumScrollEnd,
      onScrollBeginDrag,
      enableSnapMode,
    ],
  );

  const control = useMemo(() => ({ dismiss: handleDismiss }), [handleDismiss]);

  const listComponent = (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={[{ width, height }, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <Animated.View
            style={[styles.content, animatedStyle]}
            {...(Platform.OS === 'web' &&
              isFlashListLike(Component) && { dataSet: { 'flash-list-paging-enabled-fix': true } })}
          >
            {isScrollView ? (
              <GestureDetector gesture={nativeScrollGesture}>
                <Component ref={listRef} {...commonProps} {...listProps}>
                  {loopData.map((item, index) => renderItem({ item, index }))}
                </Component>
              </GestureDetector>
            ) : (
              isFlatListLike(Component) && (
                <GestureDetector gesture={nativeScrollGesture}>
                  <Component
                    ref={listRef}
                    {...commonProps}
                    data={loopData}
                    renderItem={renderItem}
                    initialScrollIndex={
                      enableLoop && data.length > 1 ? initialIndex + 1 : initialIndex
                    }
                    keyExtractor={keyExtractor}
                    {...(isFlashListLike(Component)
                      ? // NOTE - Deprecated estimatedItemSize for FlashList V2 (https://shopify.github.io/flash-list/docs/v2-changes#deprecated)
                        { estimatedItemSize: width + itemSpacing }
                      : { windowSize: 3, maxToRenderPerBatch: 3, getItemLayout })}
                    // NOTE - https://github.com/necolas/react-native-web/issues/1299
                    {...(Platform.OS === 'web' &&
                      isFlatListLike(Component) && {
                        dataSet: { 'flat-list-paging-enabled-fix': true },
                      })}
                    {...listProps}
                  />
                </GestureDetector>
              )
            )}
          </Animated.View>
          <WebPagingFixStyle Component={Component} />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );

  return renderContainer ? renderContainer(listComponent, control) : listComponent;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
});
