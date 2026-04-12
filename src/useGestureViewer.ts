import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform, useWindowDimensions } from 'react-native';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
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
import { useGestureViewerPaging } from './useGestureViewerPaging';
import { createBoundsConstraint, createScrollAction } from './utils';
import { applyTapZoomAtPoint } from './utils/tapZoom';

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

  const dismissGestureRef = useRef<GestureType>(undefined);

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

  const lastFocalX = useSharedValue(0);
  const lastFocalY = useSharedValue(0);

  const dataLength = data?.length || 0;

  const animationConfig = useMemo(
    () => ({
      duration: triggerAnimation?.duration ?? 300,
      easing: triggerAnimation?.easing ?? Easing.bezier(0.25, 0.1, 0.25, 1),
      reduceMotion: triggerAnimation?.reduceMotion,
    }),
    [triggerAnimation?.duration, triggerAnimation?.easing, triggerAnimation?.reduceMotion],
  );

  const dismissOptions = useMemo(
    () => ({
      enabled: dismiss?.enabled ?? true,
      fadeBackdrop: dismiss?.fadeBackdrop ?? true,
      resistance: dismiss?.resistance ?? 2,
      threshold: dismiss?.threshold ?? 80,
    }),
    [dismiss?.enabled, dismiss?.threshold, dismiss?.resistance, dismiss?.fadeBackdrop],
  );

  const adjustedInitialIndex = useMemo(() => {
    if (enableLoop && dataLength > 1) {
      return initialIndex + 1;
    }

    return initialIndex;
  }, [enableLoop, dataLength, initialIndex]);

  const constrainTranslation = useMemo(
    () => createBoundsConstraint({ height, width }),
    [width, height],
  );

  const scrollTo = useCallback(
    (index: number, animated: boolean) => {
      const scrollAction = createScrollAction(listRef.current, width + itemSpacing);

      return scrollAction.scrollTo(index, animated);
    },
    [width, itemSpacing],
  );

  const resetTransformState = useCallback(() => {
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    initialTranslateX.value = withTiming(0);
    initialTranslateY.value = withTiming(0);
    startScale.value = withTiming(1);
    scale.value = withTiming(1);
    rotation.value = 0;
  }, [initialTranslateX, initialTranslateY, rotation, scale, startScale, translateX, translateY]);

  const syncCurrentIndex = useCallback(
    (nextIndex: number) => {
      if (!manager || nextIndex < 0 || nextIndex >= dataLength) {
        return;
      }

      const managerCurrentIndex = manager.getState().currentIndex;

      if (nextIndex === managerCurrentIndex) {
        return;
      }

      manager.setCurrentIndex(nextIndex);
      manager.notifyStateChange();
      resetTransformState();
    },
    [dataLength, manager, resetTransformState],
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
    manager.setResetTransformCallback(resetTransformState);
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
    resetTransformState,
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
  }, [
    adjustedInitialIndex,
    translateY,
    backdropOpacity,
    translateX,
    scale,
    startScale,
    rotation,
    scrollTo,
  ]);

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
        triggerRectRef.current = { height, width, x: pageX, y: pageY };
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
      const endScale = Math.min(
        triggerRectRef.current.width / width,
        triggerRectRef.current.height / height,
      );

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

  const dismissGesture = useMemo(() => {
    const canDismiss = !isZoomed && dismissOptions.enabled;

    return Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .activeCursor('grabbing')
      .activeOffsetY([-10, 10])
      .failOffsetX([-10, 10])
      .withRef(dismissGestureRef)
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
          damping: 50,
          energyThreshold: 6e-9,
          mass: 4,
          overshootClamping: false,
          stiffness: 600,
        });
      });
  }, [translateY, dismissOptions, handleDismiss, isZoomed]);

  const zoomPinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(enablePinchZoom)
        .onTouchesDown((event) => {
          if (event.numberOfTouches === 2) {
            scheduleOnRN(setIsPinching, true);
          }
        })
        .onBegin((event) => {
          startScale.value = scale.value;
          initialTranslateX.value = translateX.value;
          initialTranslateY.value = translateY.value;
          lastFocalX.value = event.focalX;
          lastFocalY.value = event.focalY;
        })
        .onUpdate((event) => {
          const newScale = startScale.value * event.scale;

          scale.value = newScale;

          if (newScale <= 1) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            return;
          }

          const focalDeltaX = Math.abs(event.focalX - lastFocalX.value);
          const focalDeltaY = Math.abs(event.focalY - lastFocalY.value);
          const threshold = 50;

          if (focalDeltaX < threshold && focalDeltaY < threshold) {
            lastFocalX.value = event.focalX;
            lastFocalY.value = event.focalY;
          }

          const deltaScale = newScale - startScale.value;
          const centerX = lastFocalX.value - width / 2;
          const centerY = lastFocalY.value - height / 2;

          // NOTE 새로운 이동값 = 기존 이동값 - (중심점 거리 × 스케일 변화량) / 원래 스케일 (중심점이 화면 중심에서 멀수록, 확대 배율이 클수록 더 많이 이동)
          const newTranslateX = initialTranslateX.value - (centerX * deltaScale) / startScale.value;
          const newTranslateY = initialTranslateY.value - (centerY * deltaScale) / startScale.value;

          const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
            constrainTranslation({
              scale: newScale,
              translateX: newTranslateX,
              translateY: newTranslateY,
            });

          translateX.value = constrainedTranslateX;
          translateY.value = constrainedTranslateY;
        })
        .onEnd(() => {
          if (scale.value > maxZoomScale) {
            scale.value = withTiming(maxZoomScale, {
              duration: 300,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            });

            const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
              constrainTranslation({
                scale: maxZoomScale,
                translateX: translateX.value,
                translateY: translateY.value,
              });

            translateX.value = withTiming(constrainedTranslateX);
            translateY.value = withTiming(constrainedTranslateY);

            return;
          }

          if (scale.value < 1) {
            scale.value = withTiming(1, {
              duration: 300,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            });
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            initialTranslateX.value = withTiming(0);
            initialTranslateY.value = withTiming(0);
            return;
          }

          const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
            constrainTranslation({
              scale: scale.value,
              translateX: translateX.value,
              translateY: translateY.value,
            });

          translateX.value = withTiming(constrainedTranslateX);
          translateY.value = withTiming(constrainedTranslateY);
        })
        .onTouchesUp(() => {
          scheduleOnRN(setIsPinching, false);
        })
        .onFinalize(() => {
          scheduleOnRN(setIsPinching, false);
        }),
    [
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
      lastFocalX,
      lastFocalY,
    ],
  );

  const zoomPanGesture = useMemo(
    () =>
      Gesture.Pan()
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

            const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
              constrainTranslation({
                scale: scale.value,
                translateX: newTranslateX,
                translateY: newTranslateY,
              });

            translateX.value = constrainedTranslateX;
            translateY.value = constrainedTranslateY;
          }
        }),
    [
      translateX,
      translateY,
      enablePanWhenZoomed,
      isZoomed,
      scale,
      initialTranslateX,
      initialTranslateY,
      constrainTranslation,
    ],
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enableDoubleTapZoom && Platform.OS !== 'web')
        .numberOfTaps(2)
        .onEnd((event) => {
          applyTapZoomAtPoint({
            x: event.x,
            y: event.y,
            width,
            height,
            maxZoomScale,
            scale,
            translateX,
            translateY,
          });
        }),
    [enableDoubleTapZoom, height, maxZoomScale, scale, translateX, translateY, width],
  );

  const zoomGesture = useMemo(
    () => Gesture.Race(zoomPinchGesture, Gesture.Exclusive(zoomPanGesture, doubleTapGesture)),
    [zoomPinchGesture, zoomPanGesture, doubleTapGesture],
  );

  const animatedStyle = useAnimatedStyle(() => ({
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
  }));

  const backdropStyle = useAnimatedStyle(() => {
    const baseOpacity = triggerOpacity.value;

    if (!dismissOptions.fadeBackdrop || scale.value !== 1) {
      return { opacity: baseOpacity };
    }

    const dismissOpacity = interpolate(translateY.value, [0, 200], [1, 0], 'clamp');

    return { opacity: baseOpacity * dismissOpacity };
  }, [dismissOptions.fadeBackdrop]);

  const nativeScrollGesture = useMemo(() => {
    return Gesture.Native().requireExternalGestureToFail(dismissGestureRef);
  }, []);

  const { onMomentumScrollEnd, onScroll, onScrollBeginDrag, onWebDoubleClick } =
    useGestureViewerPaging({
      adjustedInitialIndex,
      autoPlay,
      autoPlayInterval,
      currentIndex,
      dataLength,
      enableDoubleTapZoom,
      enableHorizontalSwipe,
      enableLoop,
      height,
      isRotated,
      isZoomed,
      itemSpacing,
      manager,
      maxZoomScale,
      scale,
      scrollTo,
      syncCurrentIndex,
      translateX,
      translateY,
      width,
    });

  return {
    animatedStyle,
    backdropStyle,
    dataLength,
    dismissGesture,
    handleDismiss,
    isPinching,
    isRotated,

    isZoomed,
    listRef,
    nativeScrollGesture,
    onWebDoubleClick,
    onMomentumScrollEnd,
    onScroll,

    onScrollBeginDrag,
    zoomGesture,
  };
};
