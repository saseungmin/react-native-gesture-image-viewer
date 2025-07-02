import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { GestureImageViewerProps } from './types';

type UseGestureImageViewerProps<T = any> = Omit<
  GestureImageViewerProps<T>,
  'renderImage' | 'renderContainer' | 'ListComponent' | 'listProps' | 'containerStyle' | 'backdropStyle'
>;

export const useGestureImageViewer = <T = any>({
  data,
  initialIndex = 0,
  onIndexChange,
  onDismiss,
  width: customWidth,
  dismissThreshold = 80,
  resistance = 2,
  // swipeThreshold = 0.5,
  // velocityThreshold = 200,
  animateBackdrop = true,
  enableDismissGesture = true,
  enableSwipeGesture = true,
}: UseGestureImageViewerProps<T>) => {
  const { width: screenWidth } = useWindowDimensions();
  const width = customWidth || screenWidth;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);

  const flatListRef = useRef<any>(null);

  const dataLength = data?.length || 0;

  // 초기 위치 설정
  useEffect(() => {
    setCurrentIndex(initialIndex);
    translateY.value = 0;
    backdropOpacity.value = 1;

    if (initialIndex <= 0 || !flatListRef.current) {
      return;
    }

    // FlatList 초기 위치 설정
    const runAfterInteractions = InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
    });

    return () => {
      runAfterInteractions?.cancel();
    };
  }, [initialIndex, translateY, backdropOpacity]);

  // 인덱스 변경 알림
  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  // FlatList 스크롤 핸들러
  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableSwipeGesture) {
        return;
      }

      const contentOffset = event.nativeEvent.contentOffset;
      const newIndex = Math.round(contentOffset.x / width);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < dataLength) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, dataLength, width, enableSwipeGesture],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= dataLength || !enableSwipeGesture) {
        return;
      }

      setCurrentIndex(index);
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    },
    [dataLength, enableSwipeGesture],
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  }, [currentIndex, goToIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < dataLength - 1) {
      goToIndex(currentIndex + 1);
    }
  }, [currentIndex, dataLength, goToIndex]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(10)
      .activeOffsetY([-10, 10])
      .failOffsetX([-10, 10])
      .onUpdate((event) => {
        'worklet';

        translateY.value = event.translationY / resistance;
      })
      .onEnd((event) => {
        'worklet';
        if (event.translationY > dismissThreshold && enableDismissGesture && onDismiss) {
          runOnJS(onDismiss)();
          return;
        }

        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      });
  }, [translateY, dismissThreshold, enableDismissGesture, onDismiss, resistance]);

  // 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  }, [translateY]);

  const backdropStyle = useAnimatedStyle(() => {
    if (!animateBackdrop) {
      return { opacity: 1 };
    }

    const opacity = interpolate(translateY.value, [0, 200], [1, 0], 'clamp');

    return { opacity };
  }, [animateBackdrop, translateY]);

  return {
    // State
    currentIndex,
    dataLength,
    translateY,
    flatListRef,

    // Actions
    goToPrevious,
    goToNext,
    goToIndex,

    // Gesture
    panGesture,

    // FlatList handlers
    onMomentumScrollEnd,

    // Animated styles
    animatedStyle,
    backdropStyle,
  };
};
