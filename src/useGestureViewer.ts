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
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type GestureViewerManager from './GestureViewerManager';
import { registry } from './GestureViewerRegistry';
import type { GestureViewerProps, TriggerRect } from './types';
import { createBoundsConstraint, createScrollAction, getLoopAdjustedIndex } from './utils';

type UseGestureViewerProps<ItemT, LC> = Omit<
  GestureViewerProps<ItemT, LC>,
  | 'renderItem'
  | 'renderContainer'
  | 'ListComponent'
  | 'listProps'
  | 'containerStyle'
  | 'backdropStyle'
  | 'enableSnapMode'
>;

export const useGestureViewer = <ItemT, LC>({
  data,
  initialIndex = 0,
  onDismiss,
  width: customWidth,
  dismiss,
  enableDoubleTapZoom = true,
  enablePinchZoom = true,
  enableHorizontalSwipe = true,
  enablePanWhenZoomed = true,
  enableLoop = false,
  maxZoomScale = 2,
  itemSpacing = 0,
  height: customHeight,
  id = 'default',
  onDismissStart,
  triggerAnimation,
  autoPlay = false,
  autoPlayInterval = 3000,
}: UseGestureViewerProps<ItemT, LC>) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = customWidth || screenWidth;
  const height = customHeight || screenHeight;

  const [isZoomed, setIsZoomed] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [shouldStartTriggerAnimation, setShouldStartTriggerAnimation] = useState(false);
  const [manager, setManager] = useState<GestureViewerManager | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const listRef = useRef<any>(null);
  const triggerRectRef = useRef<TriggerRect | null>(null);
  const onAnimationCompleteRef = useRef(triggerAnimation?.onAnimationComplete);

  const initialTranslateY = useSharedValue(0);
  const initialTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const backdropOpacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  const triggerScale = useSharedValue(1);
  const triggerTranslateX = useSharedValue(0);
  const triggerTranslateY = useSharedValue(0);
  const triggerOpacity = useSharedValue(1);

  const dataLength = data?.length || 0;

  const animationConfig = useMemo(
    () => ({
      duration: triggerAnimation?.duration ?? 300,
      easing: triggerAnimation?.easing ?? Easing.bezier(0.25, 0.1, 0.25, 1.0),
      reduceMotion: triggerAnimation?.reduceMotion,
    }),
    [triggerAnimation?.duration, triggerAnimation?.easing, triggerAnimation?.reduceMotion],
  );

  const dismissOptions = useMemo(() => {
    return {
      enabled: dismiss?.enabled ?? true,
      threshold: dismiss?.threshold ?? 80,
      resistance: dismiss?.resistance ?? 2,
      fadeBackdrop: dismiss?.fadeBackdrop ?? true,
    };
  }, [dismiss?.enabled, dismiss?.threshold, dismiss?.resistance, dismiss?.fadeBackdrop]);

  const adjustedInitialIndex = useMemo(() => {
    if (enableLoop && dataLength > 1) {
      return initialIndex + 1;
    }

    return initialIndex;
  }, [enableLoop, dataLength, initialIndex]);

  const constrainTranslation = useMemo(() => createBoundsConstraint({ width, height }), [width, height]);

  const scrollTo = useCallback(
    (index: number, animated: boolean) => {
      const scrollAction = createScrollAction(listRef.current, width + itemSpacing);

      return scrollAction.scrollTo(index, animated);
    },
    [width, itemSpacing],
  );

  const emitZoomChange = useCallback(
    (currentScale: number, prevScale: number | null) => {
      if (manager) {
        manager.emitZoomChange(currentScale, prevScale);
      }
    },
    [manager],
  );

  const emitRotationChange = useCallback(
    (currentRotation: number, prevRotation: number | null) => {
      if (manager) {
        manager.emitRotationChange(currentRotation, prevRotation);
      }
    },
    [manager],
  );

  const onAnimationComplete = useCallback(() => {
    onAnimationCompleteRef.current?.();
  }, []);

  useAnimatedReaction(
    () => scale.value,
    (currentScale, previousScale) => {
      if (currentScale !== previousScale) {
        scheduleOnRN(emitZoomChange, currentScale, previousScale);
      }

      scheduleOnRN(setIsZoomed, currentScale > 1);
    },
  );

  useAnimatedReaction(
    () => rotation.value,
    (currentRotation, previousRotation) => {
      if (currentRotation !== previousRotation) {
        scheduleOnRN(emitRotationChange, currentRotation, previousRotation);
      }

      scheduleOnRN(setIsRotated, currentRotation % 360 !== 0);
    },
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const unsubscribeFromRegistry = registry.subscribeToManager(id, (managerInstance) => {
      setManager(managerInstance);
      unsubscribe = managerInstance?.subscribe((state) => setCurrentIndex(state.currentIndex));
    });

    return () => {
      unsubscribeFromRegistry();
      unsubscribe?.();
    };
  }, [id]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setDataLength(dataLength);
    manager.setEnableHorizontalSwipe(enableHorizontalSwipe);
    manager.setCurrentIndex(initialIndex);
    manager.setWidth(width + itemSpacing);
    manager.setHeight(height);
    manager.setZoomSharedValues(scale, translateX, translateY, maxZoomScale);
    manager.setRotation(rotation);
    manager.setEnableLoop(enableLoop);
    manager.notifyStateChange();
  }, [
    dataLength,
    enableHorizontalSwipe,
    initialIndex,
    manager,
    width,
    itemSpacing,
    maxZoomScale,
    enableLoop,
    scale,
    height,
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

  useEffect(() => {
    if (
      !autoPlay ||
      !manager ||
      dataLength <= 1 ||
      isZoomed ||
      isRotated ||
      (!enableLoop && currentIndex === dataLength - 1)
    ) {
      return;
    }

    const intervalMs = Math.max(250, Math.floor(autoPlayInterval || 0));

    if (!Number.isFinite(intervalMs)) {
      return;
    }

    const interval = setInterval(() => {
      if (isZoomed || isRotated) {
        return;
      }

      manager.goToNext();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, manager, dataLength, currentIndex, enableLoop, isZoomed, isRotated]);

  useEffect(() => {
    onAnimationCompleteRef.current = triggerAnimation?.onAnimationComplete;
  }, [triggerAnimation?.onAnimationComplete]);

  useEffect(() => {
    if (shouldStartTriggerAnimation && triggerRectRef.current) {
      const startX = triggerRectRef.current.x + triggerRectRef.current.width / 2 - width / 2;
      const startY = triggerRectRef.current.y + triggerRectRef.current.height / 2 - height / 2;
      const initialScaleFromTrigger = Math.min(
        triggerRectRef.current.width / width,
        triggerRectRef.current.height / height,
      );

      triggerScale.value = initialScaleFromTrigger;
      triggerTranslateX.value = startX;
      triggerTranslateY.value = startY;
      triggerOpacity.value = 0;

      triggerScale.value = withTiming(1, animationConfig, (finished) => {
        if (finished) {
          scheduleOnRN(onAnimationComplete);
        }
      });
      triggerTranslateX.value = withTiming(0, animationConfig);
      triggerTranslateY.value = withTiming(0, animationConfig);
      triggerOpacity.value = withTiming(1, {
        duration: animationConfig.duration / 2,
        easing: animationConfig.easing,
        reduceMotion: animationConfig.reduceMotion,
      });

      setShouldStartTriggerAnimation(false);
    }
  }, [
    shouldStartTriggerAnimation,
    animationConfig,
    width,
    height,
    triggerOpacity,
    triggerScale,
    triggerTranslateX,
    triggerTranslateY,
    onAnimationComplete,
  ]);

  useEffect(() => {
    const node = registry.getTriggerNode(id);

    if (node && typeof node.measure === 'function') {
      node.measure((_x, _y, width, height, pageX, pageY) => {
        triggerRectRef.current = { x: pageX, y: pageY, width, height };
        triggerOpacity.value = 0;
        setShouldStartTriggerAnimation(true);
        registry.clearTriggerNode(id);
      });
    }

    return () => {
      triggerRectRef.current = null;
    };
  }, [id, triggerOpacity]);

  const handleDismiss = useCallback(() => {
    onDismissStart?.();

    if (triggerRectRef.current) {
      const endX = triggerRectRef.current.x + triggerRectRef.current.width / 2 - width / 2;
      const endY = triggerRectRef.current.y + triggerRectRef.current.height / 2 - height / 2;
      const endScale = Math.min(triggerRectRef.current.width / width, triggerRectRef.current.height / height);

      triggerScale.value = withTiming(endScale, animationConfig);
      triggerTranslateX.value = withTiming(endX, animationConfig);
      triggerTranslateY.value = withTiming(endY, animationConfig);
      triggerOpacity.value = withTiming(0, animationConfig, (finished) => {
        if (finished && onDismiss) {
          scheduleOnRN(onDismiss);
        }
      });
      return;
    }

    if (onDismiss) {
      scheduleOnRN(onDismiss);
    }
  }, [
    animationConfig,
    onDismiss,
    onDismissStart,
    width,
    height,
    triggerTranslateX,
    triggerScale,
    triggerTranslateY,
    triggerOpacity,
  ]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableHorizontalSwipe) {
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

      const currentIndex = manager?.getState()?.currentIndex;

      if (realIndex !== currentIndex && realIndex >= 0 && realIndex < dataLength) {
        if (manager) {
          manager.setCurrentIndex(realIndex);
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
      dataLength,
      width,
      itemSpacing,
      enableHorizontalSwipe,
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
    const canDismiss = !isZoomed && dismissOptions.enabled;

    return Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .activeCursor('grabbing')
      .activeOffsetY([-10, 10])
      .failOffsetX([-10, 10])
      .enabled(canDismiss)
      .onUpdate((event) => {
        translateY.value = event.translationY / dismissOptions.resistance;
      })
      .onEnd((event) => {
        if (canDismiss && event.translationY > dismissOptions.threshold) {
          scheduleOnRN(handleDismiss);
          return;
        }

        translateY.value = withSpring(0, {
          stiffness: 600,
          damping: 50,
          mass: 4,
          overshootClamping: false,
          energyThreshold: 6e-9,
        });
      });
  }, [translateY, dismissOptions, handleDismiss, isZoomed]);

  const zoomPinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .enabled(enablePinchZoom)
      .onTouchesDown((event) => {
        if (event.numberOfTouches === 2) {
          scheduleOnRN(setIsPinching, true);
        }
      })
      .onBegin(() => {
        startScale.value = scale.value;
        initialTranslateX.value = translateX.value;
        initialTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        const newScale = startScale.value * event.scale;

        scale.value = newScale;

        if (event.numberOfPointers !== 2) {
          return;
        }

        if (newScale <= 1) {
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          return;
        }

        const deltaScale = newScale - startScale.value;
        const centerX = event.focalX - width / 2;
        const centerY = event.focalY - height / 2;

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
      })
      .onTouchesUp(() => {
        scheduleOnRN(setIsPinching, false);
      })
      .onFinalize(() => {
        scheduleOnRN(setIsPinching, false);
      });
  }, [
    scale,
    enablePinchZoom,
    maxZoomScale,
    translateX,
    translateY,
    startScale,
    initialTranslateX,
    initialTranslateY,
    width,
    height,
    constrainTranslation,
  ]);

  const zoomPanGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enablePanWhenZoomed && isZoomed)
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
    enablePanWhenZoomed,
    isZoomed,
    scale,
    initialTranslateX,
    initialTranslateY,
    constrainTranslation,
  ]);

  const doubleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .enabled(enableDoubleTapZoom)
      .numberOfTaps(2)
      .onEnd((event) => {
        const nextScale = scale.value > 1 ? 1 : maxZoomScale;

        if (nextScale > 1) {
          const centerX = event.x - width / 2;
          const centerY = event.y - height / 2;

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
  }, [scale, enableDoubleTapZoom, maxZoomScale, translateX, translateY, width, height]);

  const zoomGesture = useMemo(() => {
    return Gesture.Race(zoomPinchGesture, Gesture.Exclusive(zoomPanGesture, doubleTapGesture));
  }, [zoomPinchGesture, zoomPanGesture, doubleTapGesture]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: triggerOpacity.value,
      transform: [
        { translateX: triggerTranslateX.value },
        { translateY: triggerTranslateY.value },
        { scale: triggerScale.value },

        { translateY: translateY.value },
        { translateX: translateX.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const baseOpacity = triggerOpacity.value;

    if (!dismissOptions.fadeBackdrop || scale.value !== 1) {
      return { opacity: baseOpacity };
    }

    const dismissOpacity = interpolate(translateY.value, [0, 200], [1, 0], 'clamp');

    return { opacity: baseOpacity * dismissOpacity };
  }, [dismissOptions.fadeBackdrop]);

  const onScrollBeginDrag = useCallback(() => {
    manager?.handleScrollBeginDrag();
  }, [manager]);

  return {
    dataLength,
    listRef,
    isZoomed,
    isRotated,
    isPinching,
    dismissGesture,
    zoomGesture,

    onMomentumScrollEnd,
    onScrollBeginDrag,
    handleDismiss,

    animatedStyle,
    backdropStyle,
  };
};
