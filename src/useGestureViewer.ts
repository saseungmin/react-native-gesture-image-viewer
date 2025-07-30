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
import { createBoundsConstraint, createScrollAction, getLoopAdjustedIndex } from './utils';

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
  enableLoop = false,
  maxZoomScale = 2,
  itemSpacing = 0,
  useSnap = false,
  id = 'default',
}: UseGestureViewerProps<T>) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = useSnap ? customWidth || screenWidth : screenWidth;

  const [isZoomed, setIsZoomed] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
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
  const rotation = useSharedValue(0);

  const listRef = useRef<any>(null);

  const dataLength = data?.length || 0;

  const adjustedInitialIndex = useMemo(() => {
    if (enableLoop && data.length > 1) {
      return initialIndex + 1;
    }

    return initialIndex;
  }, [enableLoop, data.length, initialIndex]);

  const constrainTranslation = useMemo(
    () => createBoundsConstraint({ width, height: screenHeight }),
    [width, screenHeight],
  );

  const scrollTo = useCallback(
    (index: number, animated: boolean) => {
      const scrollAction = createScrollAction(listRef.current, width + itemSpacing);

      return scrollAction.scrollTo(index, animated);
    },
    [width, itemSpacing],
  );

  const emitZoomChange = useCallback(
    (currentScale: number, prevScale: number | null) => {
      manager?.emitZoomChange(currentScale, prevScale);
    },
    [manager],
  );

  const emitRotationChange = useCallback(
    (currentRotation: number, prevRotation: number | null) => {
      manager?.emitRotationChange(currentRotation, prevRotation);
    },
    [manager],
  );

  useAnimatedReaction(
    () => scale.value,
    (currentScale, previousScale) => {
      if (manager && currentScale !== previousScale) {
        runOnJS(emitZoomChange)(currentScale, previousScale);
      }

      runOnJS(setIsZoomed)(currentScale > 1);
    },
  );

  useAnimatedReaction(
    () => rotation.value,
    (currentRotation, previousRotation) => {
      if (manager && currentRotation !== previousRotation) {
        runOnJS(emitRotationChange)(currentRotation, previousRotation);
      }

      runOnJS(setIsRotated)(currentRotation % 360 !== 0);
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
    manager.setHeight(screenHeight);
    manager.setZoomSharedValues(scale, translateX, translateY, maxZoomScale);
    manager.setRotation(rotation);
    manager.setEnableLoop(enableLoop);
    manager.notifyStateChange();
  }, [
    dataLength,
    enableSwipeGesture,
    initialIndex,
    manager,
    width,
    itemSpacing,
    maxZoomScale,
    enableLoop,
    scale,
    screenHeight,
    translateX,
    translateY,
    rotation,
  ]);

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
    rotation.value = 0;

    if (adjustedInitialIndex <= 0 || !listRef.current) {
      return;
    }

    const runAfterInteractions = InteractionManager.runAfterInteractions(() => {
      scrollTo(adjustedInitialIndex, false);
    });

    return () => {
      runAfterInteractions?.cancel();
    };
  }, [adjustedInitialIndex, translateY, backdropOpacity, translateX, scale, startScale, rotation, scrollTo]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableSwipeGesture) {
        return;
      }

      const contentOffset = event.nativeEvent.contentOffset;
      const scrollIndex = Math.round(contentOffset.x / (width + itemSpacing));

      const isLoopHandled = manager?.handleMomentumScrollEnd(scrollIndex);

      if (isLoopHandled) {
        return;
      }

      const { realIndex, needsJump, jumpToIndex } = getLoopAdjustedIndex(scrollIndex, dataLength, enableLoop);

      if (needsJump && jumpToIndex !== undefined) {
        scrollTo(jumpToIndex, false);
      }

      if (realIndex !== currentIndex && realIndex >= 0 && realIndex < dataLength) {
        if (manager) {
          manager.setCurrentIndex(realIndex);
          setCurrentIndex(realIndex);
          manager.notifyStateChange();
        }

        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        initialTranslateX.value = withTiming(0);
        initialTranslateY.value = withTiming(0);
        startScale.value = withTiming(1);
        scale.value = withTiming(1);
        rotation.value = 0;
      }
    },
    [
      scrollTo,
      manager,
      currentIndex,
      dataLength,
      width,
      itemSpacing,
      enableSwipeGesture,
      enableLoop,
      translateX,
      translateY,
      scale,
      initialTranslateX,
      initialTranslateY,
      startScale,
      rotation,
    ],
  );

  const dismissGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .activeCursor('grabbing')
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

        scale.value = newScale;

        if (newScale <= 1) {
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          return;
        }

        const deltaScale = newScale - startScale.value;
        const centerX = event.focalX - width / 2;
        const centerY = event.focalY - screenHeight / 2;

        // NOTE 새로운 이동값 = 기존 이동값 - (중심점 거리 × 스케일 변화량) / 원래 스케일 (중심점이 화면 중심에서 멀수록, 확대 배율이 클수록 더 많이 이동)
        const newTranslateX = initialTranslateX.value - (centerX * deltaScale) / startScale.value;
        const newTranslateY = initialTranslateY.value - (centerY * deltaScale) / startScale.value;

        const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } = constrainTranslation({
          translateX: newTranslateX,
          translateY: newTranslateY,
          scale: newScale,
        });

        translateX.value = constrainedTranslateX;
        translateY.value = constrainedTranslateY;
      })
      .onEnd(() => {
        if (scale.value > maxZoomScale) {
          scale.value = withTiming(maxZoomScale, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          });

          const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } = constrainTranslation({
            translateX: translateX.value,
            translateY: translateY.value,
            scale: maxZoomScale,
          });

          translateX.value = withTiming(constrainedTranslateX);
          translateY.value = withTiming(constrainedTranslateY);

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

        const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } = constrainTranslation({
          translateX: translateX.value,
          translateY: translateY.value,
          scale: scale.value,
        });

        translateX.value = withTiming(constrainedTranslateX);
        translateY.value = withTiming(constrainedTranslateY);
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
    constrainTranslation,
  ]);

  const zoomPanGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enableZoomPanGesture && isZoomed)
      .activeCursor('grabbing')
      .averageTouches(true)
      .onBegin(() => {
        initialTranslateX.value = translateX.value;
        initialTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        if (scale.value > 1) {
          const newTranslateX = initialTranslateX.value + event.translationX;
          const newTranslateY = initialTranslateY.value + event.translationY;

          const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } = constrainTranslation({
            translateX: newTranslateX,
            translateY: newTranslateY,
            scale: scale.value,
          });

          translateX.value = constrainedTranslateX;
          translateY.value = constrainedTranslateY;
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
    constrainTranslation,
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
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    if (!animateBackdrop || scale.value !== 1) {
      return { opacity: 1 };
    }

    const opacity = interpolate(translateY.value, [0, 200], [1, 0], 'clamp');

    return { opacity };
  }, [animateBackdrop]);

  const onScrollBeginDrag = useCallback(() => {
    manager?.handleScrollBeginDrag();
  }, [manager]);

  return {
    currentIndex,
    dataLength,
    translateY,
    listRef,
    isZoomed,
    isRotated,
    dismissGesture,
    zoomGesture,

    onMomentumScrollEnd,
    onScrollBeginDrag,

    animatedStyle,
    backdropStyle,
  };
};
