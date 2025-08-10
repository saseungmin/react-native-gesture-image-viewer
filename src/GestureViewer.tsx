import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type FlatList, Platform, type ScrollViewProps, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { registry } from './GestureViewerRegistry';
import type { GestureViewerProps } from './types';
import { useGestureViewer } from './useGestureViewer';
import { createLoopData, isFlashListLike, isFlatListLike, isScrollViewLike } from './utils';
import WebPagingFixStyle from './WebPagingFixStyle';

export function GestureViewer<T = any, LC = typeof FlatList>({
  id = 'default',
  data,
  renderItem: renderItemProp,
  renderContainer,
  ListComponent,
  width: customWidth,
  listProps,
  backdropStyle: backdropStyleProps,
  containerStyle,
  initialIndex = 0,
  itemSpacing = 0,
  useSnap = false,
  enableLoop = false,
  ...props
}: GestureViewerProps<T, LC>) {
  const Component = ListComponent as React.ComponentType<any>;

  const dataRef = useRef(data);
  dataRef.current = data;

  const { width: screenWidth } = useWindowDimensions();

  const width = useSnap ? customWidth || screenWidth : screenWidth;

  const loopData = useMemo(() => createLoopData(dataRef, enableLoop), [enableLoop]);

  const isScrollView = isScrollViewLike(Component);

  const {
    listRef,
    isZoomed,
    isRotated,
    dismissGesture,
    zoomGesture,
    onMomentumScrollEnd,
    onScrollBeginDrag,
    animatedStyle,
    backdropStyle,
  } = useGestureViewer({
    id,
    data,
    width,
    initialIndex,
    itemSpacing,
    useSnap,
    enableLoop,
    ...props,
  });

  const keyExtractor = useCallback(
    (item: T, index: number) => {
      if (enableLoop) {
        return typeof item === 'string' ? `${item}-${index}` : `item-${index}`;
      }

      return typeof item === 'string' ? item : `image-${index}`;
    },
    [enableLoop],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return (
        <View
          key={isScrollView ? keyExtractor(item, index) : undefined}
          style={[
            {
              width,
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: itemSpacing / 2,
            },
          ]}
        >
          {renderItemProp(item, index)}
        </View>
      );
    },
    [width, itemSpacing, renderItemProp, keyExtractor, isScrollView],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, index: number) => ({
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
    registry.createManager(id);

    return () => registry.deleteManager(id);
  }, [id]);

  const commonProps = useMemo(
    () =>
      ({
        horizontal: true,
        scrollEnabled: !isZoomed && !isRotated,
        showsHorizontalScrollIndicator: false,
        onMomentumScrollEnd: onMomentumScrollEnd,
        onScrollBeginDrag,
        ...(useSnap
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
    [width, itemSpacing, isZoomed, isRotated, onMomentumScrollEnd, onScrollBeginDrag, useSnap],
  );

  const listComponent = (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={[styles.container, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <Animated.View
            style={[styles.content, animatedStyle]}
            {...(Platform.OS === 'web' &&
              isFlashListLike(Component) && { dataSet: { 'flash-list-paging-enabled-fix': true } })}
          >
            {isScrollView ? (
              <Component ref={listRef} {...commonProps} {...listProps}>
                {loopData.map((item, index) => renderItem({ item, index }))}
              </Component>
            ) : (
              isFlatListLike(Component) && (
                <Component
                  ref={listRef}
                  {...commonProps}
                  data={loopData}
                  renderItem={renderItem}
                  initialScrollIndex={enableLoop && data.length > 1 ? initialIndex + 1 : initialIndex}
                  keyExtractor={keyExtractor}
                  windowSize={3}
                  maxToRenderPerBatch={3}
                  getItemLayout={getItemLayout}
                  {...(isFlashListLike(Component) && { estimatedItemSize: width + itemSpacing })}
                  // NOTE - https://github.com/necolas/react-native-web/issues/1299
                  {...(Platform.OS === 'web' &&
                    isFlatListLike(Component) && { dataSet: { 'flat-list-paging-enabled-fix': true } })}
                  {...listProps}
                />
              )
            )}
          </Animated.View>
          <WebPagingFixStyle Component={Component} />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );

  return renderContainer ? renderContainer(listComponent) : listComponent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
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
