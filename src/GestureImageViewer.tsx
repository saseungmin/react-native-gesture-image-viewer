import { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { GestureImageViewerProps } from './types';
import { useGestureImageViewer } from './useGestureImageViewer';

const WebPagingFix = () => {
  if (Platform.OS !== 'web') {
    return null;
  }

  return <style>{`[data-paging-enabled-fix] > div > div > div {height: 100%;}`}</style>;
};

export function GestureImageViewer<T = any>({
  data,
  renderImage,
  renderContainer,
  ListComponent = FlatList,
  width: customWidth,
  listProps,
  backdropStyle: backdropStyleProps,
  containerStyle,
  initialIndex = 0,
  ...props
}: GestureImageViewerProps<T>) {
  const { width: screenWidth } = useWindowDimensions();

  const width = customWidth || screenWidth;

  const {
    currentIndex,
    flatListRef,
    isZoomed,
    dismissGesture,
    zoomGesture,
    onMomentumScrollEnd,
    animatedStyle,
    backdropStyle,
  } = useGestureImageViewer({
    data,
    width,
    initialIndex,
    ...props,
  });

  const renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      const isActive = index === currentIndex;

      return (
        <Animated.View
          style={[
            {
              width,
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
            isActive && animatedStyle,
          ]}
        >
          {renderImage(item, index)}
        </Animated.View>
      );
    },
    [width, renderImage, animatedStyle, currentIndex],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const keyExtractor = useCallback((item: T, index: number) => `image-${index}-${item}`, []);

  const gesture = useMemo(() => {
    return Gesture.Race(dismissGesture, zoomGesture);
  }, [zoomGesture, dismissGesture]);

  const listComponent = (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={[styles.container, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <View style={styles.content}>
            <ListComponent
              ref={flatListRef}
              data={data}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              scrollEnabled={!isZoomed}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialIndex}
              windowSize={3}
              maxToRenderPerBatch={3}
              removeClippedSubviews={true}
              // NOTE - https://github.com/necolas/react-native-web/issues/1299
              {...(Platform.OS === 'web' && { dataSet: { 'paging-enabled-fix': true } })}
              {...listProps}
            />
          </View>
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
