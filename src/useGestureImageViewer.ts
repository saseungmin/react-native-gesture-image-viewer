import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
  enableZoomGesture = true,
  enableDoubleTapGesture = true,
  enableZoomPanGesture = true,
  maxZoomScale = 2,
}: UseGestureImageViewerProps<T>) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = customWidth || screenWidth;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const initialTranslateY = useSharedValue(0);
  const initialTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const backdropOpacity = useSharedValue(1);

  const flatListRef = useRef<any>(null);

  const dataLength = data?.length || 0;

  useAnimatedReaction(
    () => scale.value,
    (currentScale) => {
      runOnJS(setIsZoomed)(currentScale > 1);
    },
  );

  // 초기 위치 설정
  useEffect(() => {
    setCurrentIndex(initialIndex);
    translateY.value = 0;
    translateX.value = 0;
    scale.value = 1;
    backdropOpacity.value = 1;
    startScale.value = 1;

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
  }, [initialIndex, translateY, backdropOpacity, translateX, scale, startScale]);

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
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        initialTranslateX.value = withTiming(0);
        initialTranslateY.value = withTiming(0);
        startScale.value = withTiming(1);
        scale.value = withTiming(1);
      }
    },
    [
      currentIndex,
      dataLength,
      width,
      enableSwipeGesture,
      translateX,
      translateY,
      scale,
      initialTranslateX,
      initialTranslateY,
      startScale,
    ],
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

  const dismissGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .activeOffsetY([-10, 10])
      .failOffsetX([-10, 10])
      .enabled(!isZoomed)
      .onUpdate((event) => {
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
  }, [translateY, dismissThreshold, enableDismissGesture, onDismiss, resistance, isZoomed]);

  const zoomPinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .enabled(enableZoomGesture)
      .onBegin(() => {
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = startScale.value * event.scale;
      })
      .onEnd(() => {
        if (scale.value > maxZoomScale) {
          scale.value = withTiming(maxZoomScale, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
          return;
        }

        if (scale.value < 1) {
          scale.value = withTiming(1, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
        }
      });
  }, [scale, enableZoomGesture, maxZoomScale, translateX, translateY, startScale]);

  const zoomPanGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enableZoomPanGesture && isZoomed)
      .onBegin(() => {
        initialTranslateX.value = translateX.value;
        initialTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        'worklet';

        if (scale.value > 1) {
          const maxTranslateX = (width * scale.value - width) / 2;
          const maxTranslateY = (screenHeight * scale.value - screenHeight) / 2;

          translateX.value = Math.max(
            -maxTranslateX,
            Math.min(maxTranslateX, initialTranslateX.value + event.translationX),
          );
          translateY.value = Math.max(
            -maxTranslateY,
            Math.min(maxTranslateY, initialTranslateY.value + event.translationY),
          );
        }
      });
  }, [
    translateX,
    translateY,
    enableZoomPanGesture,
    isZoomed,
    scale,
    initialTranslateX,
    initialTranslateY,
    width,
    screenHeight,
  ]);

  const doubleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .enabled(enableDoubleTapGesture)
      .numberOfTaps(2)
      .onEnd(() => {
        const nextScale = scale.value > 1 ? 1 : maxZoomScale;

        translateX.value = withTiming(0, {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });

        scale.value = withTiming(nextScale, {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });
      });
  }, [scale, enableDoubleTapGesture, maxZoomScale, translateX, translateY]);

  const zoomGesture = useMemo(() => {
    return Gesture.Simultaneous(zoomPinchGesture, zoomPanGesture, doubleTapGesture);
  }, [zoomPinchGesture, zoomPanGesture, doubleTapGesture]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }, { translateX: translateX.value }, { scale: scale.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    if (!animateBackdrop || scale.value > 1) {
      return { opacity: 1 };
    }

    const opacity = interpolate(translateY.value, [0, 200], [1, 0], 'clamp');

    return { opacity };
  }, [animateBackdrop]);

  return {
    // State
    currentIndex,
    dataLength,
    translateY,
    flatListRef,
    isZoomed,

    // Actions
    goToPrevious,
    goToNext,
    goToIndex,

    // Gesture
    dismissGesture,
    zoomGesture,

    // FlatList handlers
    onMomentumScrollEnd,

    // Animated styles
    animatedStyle,
    backdropStyle,
  };
};
