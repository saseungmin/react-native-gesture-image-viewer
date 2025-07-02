import { useCallback } from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { GestureImageViewerProps } from './types';
import { useGestureImageViewer } from './useGestureImageViewer';

export function GestureImageViewer<T = any>({
  data,
  renderImage,
  renderContainer,
  ListComponent = FlatList,
  width: customWidth,
  listProps,
  backdropStyle: backdropStyleProps,
  containerStyle,
  ...props
}: GestureImageViewerProps<T>) {
  const { width: screenWidth } = useWindowDimensions();

  const width = customWidth || screenWidth;

  const { flatListRef, panGesture, onMomentumScrollEnd, animatedStyle, backdropStyle } = useGestureImageViewer({
    data,
    width,
    ...props,
  });

  const renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return (
        <Animated.View
          style={{
            width,
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {renderImage(item, index)}
        </Animated.View>
      );
    },
    [width, renderImage],
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

  const listComponent = (
    <GestureHandlerRootView>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.container, containerStyle]}>
          <Animated.View style={[styles.background, backdropStyleProps, backdropStyle]} />
          <Animated.View style={[styles.content, animatedStyle]}>
            <ListComponent
              ref={flatListRef}
              data={data}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              getItemLayout={getItemLayout}
              initialScrollIndex={props.initialIndex || 0}
              windowSize={3}
              maxToRenderPerBatch={3}
              removeClippedSubviews={true}
              // NOTE - https://github.com/necolas/react-native-web/issues/1299
              dataSet={{ 'paging-enabled-fix': true }}
              {...listProps}
            />
          </Animated.View>
          {Platform.OS === 'web' && <style>{`[data-paging-enabled-fix] > div > div > div {height: 100%;}`}</style>}
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
