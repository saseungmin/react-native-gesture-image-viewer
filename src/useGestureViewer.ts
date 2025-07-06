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
import type GestureViewerManager from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';
import type { GestureViewerProps } from './types';

type UseGestureViewerProps<T = any> = Omit<
  GestureViewerProps<T>,
  'renderItem' | 'renderContainer' | 'ListComponent' | 'listProps' | 'containerStyle' | 'backdropStyle'
>;

export const useGestureViewer = <T = any>({
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
  itemSpacing = 0,
  useSnap = false,
  id = 'default',
}: UseGestureViewerProps<T>) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = useSnap ? customWidth || screenWidth : screenWidth;

  const [isZoomed, setIsZoomed] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [manager, setManager] = useState<GestureViewerManager | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const initialTranslateY = useSharedValue(0);
  const initialTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const backdropOpacity = useSharedValue(1);

  const listRef = useRef<any>(null);

  const dataLength = data?.length || 0;

  const constrainToBounds = useCallback(
    (translateX: number, translateY: number, scale: number) => {
      'worklet';
      if (scale <= 1) {
        return {
          x: translateX,
          y: translateY,
        };
      }

      const maxTranslateX = (width * scale - width) / 2;
      const maxTranslateY = (screenHeight * scale - screenHeight) / 2;

      return {
        x: Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX)),
        y: Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY)),
      };
    },
    [width, screenHeight],
  );

  useAnimatedReaction(
    () => scale.value,
    (currentScale) => {
      runOnJS(setIsZoomed)(currentScale > 1);
    },
  );

  useEffect(() => {
    const handleManagerChange = (manager: GestureViewerManager | null) => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      setManager(manager);

      if (manager) {
        setCurrentIndex(manager.getState().currentIndex);
        unsubscribeRef.current = manager.subscribe((state) => {
          setCurrentIndex(state.currentIndex);
        });
        return;
      }

      setCurrentIndex(0);
    };

    const unsubscribeFromRegistry = registry.subscribeToManager(id, handleManagerChange);

    return () => {
      unsubscribeFromRegistry();
      unsubscribeRef.current?.();
    };
  }, [id]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setDataLength(dataLength);
    manager.setEnableSwipeGesture(enableSwipeGesture);
    manager.setCurrentIndex(initialIndex);
    manager.setWidth(width + itemSpacing);
    manager.notifyStateChange();
  }, [dataLength, enableSwipeGesture, initialIndex, manager, width, itemSpacing]);

  useEffect(() => {
    if (!manager || !listRef.current) {
      return;
    }

    manager.setListRef(listRef.current);
  }, [manager]);

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    translateY.value = 0;
    translateX.value = 0;
    scale.value = 1;
    backdropOpacity.value = 1;
    startScale.value = 1;

    if (initialIndex <= 0 || !listRef.current) {
      return;
    }

    const runAfterInteractions = InteractionManager.runAfterInteractions(() => {
      if (listRef.current.scrollToIndex) {
        listRef.current.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      } else if (listRef.current.scrollTo) {
        listRef.current.scrollTo({
          x: initialIndex * (width + itemSpacing),
          animated: false,
        });
      }
    });

    return () => {
      runAfterInteractions?.cancel();
    };
  }, [initialIndex, translateY, backdropOpacity, translateX, scale, startScale, width, itemSpacing]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableSwipeGesture) {
        return;
      }

      const contentOffset = event.nativeEvent.contentOffset;
      const newIndex = Math.round(contentOffset.x / (width + itemSpacing));

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < dataLength) {
        if (manager) {
          manager.setCurrentIndex(newIndex);
          setCurrentIndex(newIndex);
          manager.notifyStateChange();
        }

        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        initialTranslateX.value = withTiming(0);
        initialTranslateY.value = withTiming(0);
        startScale.value = withTiming(1);
        scale.value = withTiming(1);
      }
    },
    [
      manager,
      currentIndex,
      dataLength,
      width,
      itemSpacing,
      enableSwipeGesture,
      translateX,
      translateY,
      scale,
      initialTranslateX,
      initialTranslateY,
      startScale,
    ],
  );

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
        initialTranslateX.value = translateX.value;
        initialTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        const newScale = startScale.value * event.scale;

        const deltaScale = newScale - startScale.value;
        const centerX = event.focalX - width / 2;
        const centerY = event.focalY - screenHeight / 2;

        scale.value = newScale;
        // NOTE 새로운 이동값 = 기존 이동값 - (중심점 거리 × 스케일 변화량) / 원래 스케일 (중심점이 화면 중심에서 멀수록, 확대 배율이 클수록 더 많이 이동)
        const newTranslateX = initialTranslateX.value - (centerX * deltaScale) / startScale.value;
        const newTranslateY = initialTranslateY.value - (centerY * deltaScale) / startScale.value;

        const constrained = constrainToBounds(newTranslateX, newTranslateY, newScale);

        if (newScale <= 1) {
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          return;
        }

        translateX.value = constrained.x;
        translateY.value = constrained.y;
      })
      .onEnd(() => {
        if (scale.value > maxZoomScale) {
          scale.value = withTiming(maxZoomScale, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });

          const constrained = constrainToBounds(translateX.value, translateY.value, maxZoomScale);

          translateX.value = withTiming(constrained.x);
          translateY.value = withTiming(constrained.y);

          return;
        }

        if (scale.value < 1) {
          scale.value = withTiming(1, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          initialTranslateX.value = withTiming(0);
          initialTranslateY.value = withTiming(0);
          return;
        }

        const finalConstrained = constrainToBounds(translateX.value, translateY.value, scale.value);
        translateX.value = withTiming(finalConstrained.x);
        translateY.value = withTiming(finalConstrained.y);
      });
  }, [
    scale,
    enableZoomGesture,
    maxZoomScale,
    translateX,
    translateY,
    startScale,
    initialTranslateX,
    initialTranslateY,
    width,
    screenHeight,
    constrainToBounds,
  ]);

  const zoomPanGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enableZoomPanGesture && isZoomed)
      .averageTouches(true)
      .onBegin(() => {
        initialTranslateX.value = translateX.value;
        initialTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        if (scale.value > 1) {
          const newTranslateX = initialTranslateX.value + event.translationX;
          const newTranslateY = initialTranslateY.value + event.translationY;

          const constrained = constrainToBounds(newTranslateX, newTranslateY, scale.value);

          translateX.value = constrained.x;
          translateY.value = constrained.y;
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
    constrainToBounds,
  ]);

  const doubleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .enabled(enableDoubleTapGesture)
      .numberOfTaps(2)
      .onEnd((event) => {
        const nextScale = scale.value > 1 ? 1 : maxZoomScale;

        if (nextScale > 1) {
          const centerX = event.x - width / 2;
          const centerY = event.y - screenHeight / 2;

          // NOTE 확대로 밀려난 거리만큼 반대로 이동해서 탭 지점을 제자리에 유지
          translateX.value = withTiming(-centerX * (nextScale - 1), {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
          translateY.value = withTiming(-centerY * (nextScale - 1), {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
        } else {
          translateX.value = withTiming(0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
          translateY.value = withTiming(0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });
        }

        scale.value = withTiming(nextScale, {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });
      });
  }, [scale, enableDoubleTapGesture, maxZoomScale, translateX, translateY, width, screenHeight]);

  const zoomGesture = useMemo(() => {
    return Gesture.Race(zoomPinchGesture, Gesture.Exclusive(zoomPanGesture, doubleTapGesture));
  }, [zoomPinchGesture, zoomPanGesture, doubleTapGesture]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }, { translateX: translateX.value }, { scale: scale.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    if (!animateBackdrop || scale.value !== 1) {
      return { opacity: 1 };
    }

    const opacity = interpolate(translateY.value, [0, 200], [1, 0], 'clamp');

    return { opacity };
  }, [animateBackdrop]);

  return {
    currentIndex,
    dataLength,
    translateY,
    listRef,
    isZoomed,

    dismissGesture,
    zoomGesture,

    onMomentumScrollEnd,

    animatedStyle,
    backdropStyle,
  };
};
