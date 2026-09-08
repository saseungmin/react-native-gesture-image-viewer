import { useCallback, useEffect, useMemo, type ReactElement } from 'react';
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
import type {
  GestureViewerItemDimensions,
  GestureViewerProps,
  GestureViewerRenderItemInfo,
} from './types';
import { useGestureViewer } from './useGestureViewer';
import {
  createLoopData,
  isFlashListLike,
  isFlatListLike,
  isScrollViewLike,
  shouldUseNativeScrollGesture,
} from './utils';
import WebPagingFixStyle from './WebPagingFixStyle';

type GestureViewerItemCellProps<ItemT> = {
  item: ItemT;
  index: number;
  isActive: boolean;
  renderItem: (item: ItemT, index: number, info: GestureViewerRenderItemInfo) => ReactElement;
  setItemDimensions: (index: number, item: ItemT, dimensions: GestureViewerItemDimensions) => void;
};

function GestureViewerItemCell<ItemT>({
  item,
  index,
  isActive,
  renderItem,
  setItemDimensions,
}: GestureViewerItemCellProps<ItemT>) {
  const registerItemDimensions = useCallback(
    (dimensions: GestureViewerItemDimensions) => {
      setItemDimensions(index, item, dimensions);
    },
    [index, item, setItemDimensions],
  );

  return renderItem(item, index, {
    isActive,
    setItemDimensions: registerItemDimensions,
  });
}

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

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const width = customWidth || screenWidth;
  const height = customHeight || screenHeight;

  const loopData = useMemo(() => createLoopData(data, enableLoop), [data, enableLoop]);

  const isScrollView = isScrollViewLike(Component);
  const isFlashList = isFlashListLike(Component);

  const {
    activeListIndex,
    listRef,
    isZoomed,
    isRotated,
    isPinching,
    dismissGesture,
    zoomGesture,
    nativeScrollGesture,
    onWebClick,
    onMomentumScrollEnd,
    onScroll,
    onScrollBeginDrag,
    animatedStyle,
    backdropStyle,
    handleDismiss,
    setItemDimensions,
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
    ({ item, index, target }: { item: ItemT; index: number; target?: string }) => {
      const isFlashListCell = !isFlashList || target === undefined || target === 'Cell';

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
          <GestureViewerItemCell
            index={index}
            isActive={index === activeListIndex && isFlashListCell}
            item={item}
            renderItem={renderItemProp}
            setItemDimensions={setItemDimensions}
          />
        </View>
      );
    },
    [
      activeListIndex,
      width,
      itemSpacing,
      renderItemProp,
      keyExtractor,
      isScrollView,
      isFlashList,
      height,
      setItemDimensions,
    ],
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
    registry.createManager(id);

    return () => registry.deleteManager(id);
  }, [id]);

  const commonProps = useMemo(
    () =>
      ({
        horizontal: true,
        scrollEnabled: !isZoomed && !isRotated && !isPinching,
        showsHorizontalScrollIndicator: false,
        onMomentumScrollEnd,
        onScroll,
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
      onScroll,
      onScrollBeginDrag,
      enableSnapMode,
    ],
  );

  const control = useMemo(() => ({ dismiss: handleDismiss }), [handleDismiss]);

  const shouldWrapScrollableWithNativeGesture = shouldUseNativeScrollGesture(
    Platform.OS,
    Component,
  );

  const maybeWrapWithNativeScrollGesture = useCallback(
    (children: React.ReactNode) => {
      if (!shouldWrapScrollableWithNativeGesture) {
        return children;
      }

      return <GestureDetector gesture={nativeScrollGesture}>{children}</GestureDetector>;
    },
    [nativeScrollGesture, shouldWrapScrollableWithNativeGesture],
  );

  const listComponent = (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={[{ width, height }, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <Animated.View
            style={[styles.content, animatedStyle]}
            {...(Platform.OS === 'web' && {
              onClick: onWebClick,
            })}
            {...(Platform.OS === 'web' &&
              isFlashList && { dataSet: { 'flash-list-paging-enabled-fix': true } })}
          >
            {isScrollView
              ? maybeWrapWithNativeScrollGesture(
                  <Component ref={listRef} {...commonProps} {...listProps}>
                    {loopData.map((item, index) => renderItem({ item, index }))}
                  </Component>,
                )
              : isFlatListLike(Component) &&
                maybeWrapWithNativeScrollGesture(
                  <Component
                    ref={listRef}
                    {...commonProps}
                    data={loopData}
                    renderItem={renderItem}
                    initialScrollIndex={
                      enableLoop && data.length > 1 ? initialIndex + 1 : initialIndex
                    }
                    keyExtractor={keyExtractor}
                    {...(isFlashList
                      ? // NOTE - Deprecated estimatedItemSize for FlashList V2 (https://shopify.github.io/flash-list/docs/v2-changes#deprecated)
                        { estimatedItemSize: width + itemSpacing }
                      : { windowSize: 3, maxToRenderPerBatch: 3, getItemLayout })}
                    // NOTE - https://github.com/necolas/react-native-web/issues/1299
                    {...(Platform.OS === 'web' &&
                      isFlatListLike(Component) && {
                        dataSet: { 'flat-list-paging-enabled-fix': true },
                      })}
                    {...listProps}
                  />,
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
