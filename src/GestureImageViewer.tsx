import { useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { registry } from './ImageViewerRegistry';
import type { GestureImageViewerProps } from './types';
import { useGestureImageViewer } from './useGestureImageViewer';

const WebPagingFix = () => {
  if (Platform.OS !== 'web') {
    return null;
  }

  return <style>{`[data-paging-enabled-fix] > div > div > div {height: 100%;}`}</style>;
};

export function GestureImageViewer<T = any>({
  id = 'default',
  data,
  renderImage,
  renderContainer,
  ListComponent = FlatList,
  width: customWidth,
  listProps,
  backdropStyle: backdropStyleProps,
  containerStyle,
  initialIndex = 0,
  itemSpacing = 0,
  ...props
}: GestureImageViewerProps<T>) {
  const { width: screenWidth } = useWindowDimensions();

  const width = customWidth || screenWidth;

  const { flatListRef, isZoomed, dismissGesture, zoomGesture, onMomentumScrollEnd, animatedStyle, backdropStyle } =
    useGestureImageViewer({
      id,
      data,
      width,
      initialIndex,
      itemSpacing,
      ...props,
    });

  const renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return (
        <View
          style={[
            {
              width: width,
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: itemSpacing / 2,
            },
          ]}
        >
          {renderImage(item, index)}
        </View>
      );
    },
    [width, itemSpacing, renderImage],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: width + itemSpacing,
      offset: (width + itemSpacing) * index,
      index,
    }),
    [width, itemSpacing],
  );

  const keyExtractor = useCallback((item: T, index: number) => `image-${index}-${item}`, []);

  const gesture = useMemo(() => {
    return Gesture.Race(dismissGesture, zoomGesture);
  }, [zoomGesture, dismissGesture]);

  useEffect(() => {
    registry.createManager(id);

    return () => registry.deleteManager(id);
  }, [id]);

  const listComponent = (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={[styles.container, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <Animated.View style={[styles.content, animatedStyle]}>
            <ListComponent
              ref={flatListRef}
              data={data}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              scrollEnabled={!isZoomed}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialIndex}
              windowSize={3}
              maxToRenderPerBatch={3}
              removeClippedSubviews
              snapToInterval={width + itemSpacing}
              estimatedItemSize={width + itemSpacing}
              snapToAlignment="center"
              decelerationRate="fast"
              scrollEventThrottle={16}
              // NOTE - https://github.com/necolas/react-native-web/issues/1299
              {...(Platform.OS === 'web' && { dataSet: { 'paging-enabled-fix': true } })}
              {...listProps}
            />
          </Animated.View>
          <WebPagingFix />
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
