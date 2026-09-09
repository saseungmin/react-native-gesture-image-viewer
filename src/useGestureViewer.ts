import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, type View, useWindowDimensions } from 'react-native';
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
import {
  type ItemDimensionsRegistry,
  pruneItemDimensionsRegistry,
  registerItemDimensions,
  resolveItemDimensions,
} from './itemDimensions';
import { scheduleInitialScroll } from './scheduleInitialScroll';
import type { GestureViewerItemDimensions, GestureViewerProps, TriggerRect } from './types';
import { useGestureViewerPaging } from './useGestureViewerPaging';
import { clampTranslationToBounds, createScrollAction, getLoopAdjustedIndex } from './utils';
import { getDismissDistance, shouldDismissByDirection } from './utils/dismiss';
import { applyTapZoomAtPoint } from './utils/tapZoom';
import { calculateFocalPointTranslation, shouldAcceptFocalPoint } from './utils/zoom';

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

function fitItemDimensions(
  dimensions: GestureViewerItemDimensions | undefined,
  viewport: GestureViewerItemDimensions,
): GestureViewerItemDimensions {
  if (!dimensions) {
    return viewport;
  }

  const fitScale = Math.min(viewport.width / dimensions.width, viewport.height / dimensions.height);

  return {
    width: dimensions.width * fitScale,
    height: dimensions.height * fitScale,
  };
}

export const useGestureViewer = <ItemT, LC>({
  data,
  initialIndex = 0,
  onDismiss,
  onSingleTap,
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
  getItemDimensions,
  getItemKey,
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
  const [activeTriggerNode, setActiveTriggerNode] = useState<View | null>(null);

  const listRef = useRef<any>(null);
  const triggerRectRef = useRef<TriggerRect | null>(null);
  const pendingIndexRef = useRef(initialIndex);
  const onAnimationCompleteRef = useRef(triggerAnimation?.onAnimationComplete);
  const onSingleTapRef = useRef(onSingleTap);
  const dataRef = useRef(data);
  const getItemDimensionsRef = useRef(getItemDimensions);
  const getItemKeyRef = useRef(getItemKey);
  const managerRef = useRef(manager);
  const configuredManagerRef = useRef<GestureViewerManager | null>(null);
  const previousInitialIndexRef = useRef(initialIndex);
  const itemDimensionsRef = useRef<ItemDimensionsRegistry<ItemT>>(new Map());

  const isValidTriggerRect = useCallback((rect: TriggerRect | null): rect is TriggerRect => {
    return !!rect && rect.width > 0 && rect.height > 0;
  }, []);

  const initialTranslateY = useSharedValue(0);
  const initialTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const backdropOpacity = useSharedValue(1);
  const rotation = useSharedValue(0);
  const contentWidth = useSharedValue(width);
  const contentHeight = useSharedValue(height);

  const triggerScale = useSharedValue(1);
  const triggerTranslateX = useSharedValue(0);
  const triggerTranslateY = useSharedValue(0);
  const triggerOpacity = useSharedValue(1);

  const lastFocalX = useSharedValue(0);
  const lastFocalY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const hasActiveFocal = useSharedValue(false);

  const dataLength = data?.length || 0;
  const usesLoopSentinels = enableLoop && dataLength > 1;
  const previousDataLengthRef = useRef(dataLength);
  const previousUsesLoopSentinelsRef = useRef(usesLoopSentinels);
  const viewportRef = useRef({ height, width });
  const loopConfigRef = useRef({ dataLength, enableLoop });
  const activeGeometryRef = useRef<{
    contentHeight: number;
    contentWidth: number;
    height: number;
    width: number;
  } | null>(null);
  const activeGeometryIndexRef = useRef<number | null>(null);

  const syncActiveContentDimensions = useCallback(
    (logicalIndex = pendingIndexRef.current) => {
      const viewport = viewportRef.current;
      const fitted = fitItemDimensions(
        resolveItemDimensions({
          data: dataRef.current,
          getItemDimensions: getItemDimensionsRef.current,
          getItemKey: getItemKeyRef.current,
          index: logicalIndex,
          registry: itemDimensionsRef.current,
        }),
        viewport,
      );
      const nextGeometry = {
        contentHeight: fitted.height,
        contentWidth: fitted.width,
        height: viewport.height,
        width: viewport.width,
      };
      const previousGeometry = activeGeometryRef.current;

      activeGeometryIndexRef.current = logicalIndex;

      if (
        previousGeometry?.contentHeight === nextGeometry.contentHeight &&
        previousGeometry.contentWidth === nextGeometry.contentWidth &&
        previousGeometry.height === nextGeometry.height &&
        previousGeometry.width === nextGeometry.width
      ) {
        return;
      }

      activeGeometryRef.current = nextGeometry;

      if (contentWidth.get() !== fitted.width) {
        contentWidth.set(fitted.width);
      }
      if (contentHeight.get() !== fitted.height) {
        contentHeight.set(fitted.height);
      }

      if (scale.get() > 1) {
        const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
          clampTranslationToBounds({
            contentHeight: fitted.height,
            contentWidth: fitted.width,
            height: viewport.height,
            scale: scale.get(),
            translateX: translateX.get(),
            translateY: translateY.get(),
            width: viewport.width,
          });

        translateX.set(withTiming(constrainedTranslateX));
        translateY.set(withTiming(constrainedTranslateY));
      }
    },
    [contentHeight, contentWidth, scale, translateX, translateY],
  );

  const setItemDimensions = useCallback(
    (listIndex: number, item: ItemT, dimensions: GestureViewerItemDimensions) => {
      const { dataLength: currentDataLength, enableLoop: currentEnableLoop } =
        loopConfigRef.current;
      const logicalIndex =
        currentDataLength <= 0
          ? listIndex
          : getLoopAdjustedIndex(listIndex, currentDataLength, currentEnableLoop).realIndex;
      const didUpdateDimensions = registerItemDimensions({
        data: dataRef.current,
        dimensions,
        getItemKey: getItemKeyRef.current,
        index: logicalIndex,
        item,
        registry: itemDimensionsRef.current,
      });

      if (didUpdateDimensions && logicalIndex === pendingIndexRef.current) {
        syncActiveContentDimensions(logicalIndex);
      }
    },
    [syncActiveContentDimensions],
  );

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
      direction: dismiss?.direction ?? 'down',
      enabled: dismiss?.enabled ?? true,
      fadeBackdrop: dismiss?.fadeBackdrop ?? true,
      resistance: dismiss?.resistance ?? 2,
      threshold: dismiss?.threshold ?? 80,
    }),
    [
      dismiss?.direction,
      dismiss?.enabled,
      dismiss?.threshold,
      dismiss?.resistance,
      dismiss?.fadeBackdrop,
    ],
  );

  const adjustedInitialIndex = usesLoopSentinels ? initialIndex + 1 : initialIndex;

  const constrainTranslation = useCallback(
    ({
      scale: targetScale,
      translateX: targetTranslateX,
      translateY: targetTranslateY,
    }: {
      translateX: number;
      translateY: number;
      scale: number;
    }) => {
      'worklet';

      return clampTranslationToBounds({
        contentHeight: contentHeight.get(),
        contentWidth: contentWidth.get(),
        height,
        scale: targetScale,
        translateX: targetTranslateX,
        translateY: targetTranslateY,
        width,
      });
    },
    [contentHeight, contentWidth, height, width],
  );

  const scrollTo = useCallback(
    (index: number, animated: boolean) => {
      const scrollAction = createScrollAction(listRef.current, width + itemSpacing);

      return scrollAction.scrollTo(index, animated);
    },
    [width, itemSpacing],
  );

  const resetTransformState = useCallback(() => {
    translateX.set(withTiming(0));
    translateY.set(withTiming(0));
    initialTranslateX.set(withTiming(0));
    initialTranslateY.set(withTiming(0));
    startScale.set(withTiming(1));
    scale.set(withTiming(1));
    rotation.set(0);
  }, [initialTranslateX, initialTranslateY, rotation, scale, startScale, translateX, translateY]);

  const syncPendingIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= dataLength) {
        return;
      }

      if (nextIndex === pendingIndexRef.current) {
        return;
      }

      pendingIndexRef.current = nextIndex;
      syncActiveContentDimensions(nextIndex);
    },
    [dataLength, syncActiveContentDimensions],
  );

  const syncCurrentIndex = useCallback(
    (nextIndex: number) => {
      if (!manager || nextIndex < 0 || nextIndex >= dataLength) {
        return;
      }

      pendingIndexRef.current = nextIndex;
      syncActiveContentDimensions(nextIndex);

      const managerCurrentIndex = manager.getState().currentIndex;

      if (nextIndex === managerCurrentIndex) {
        return;
      }

      manager.setCurrentIndex(nextIndex);
      manager.notifyStateChange();
      resetTransformState();
    },
    [dataLength, manager, resetTransformState, syncActiveContentDimensions],
  );

  const emitZoomChange = useCallback((currentScale: number, prevScale: number | null) => {
    managerRef.current?.emitZoomChange(currentScale, prevScale);
  }, []);

  const emitRotationChange = useCallback((currentRotation: number, prevRotation: number | null) => {
    managerRef.current?.emitRotationChange(currentRotation, prevRotation);
  }, []);

  const onAnimationComplete = useCallback(() => {
    onAnimationCompleteRef.current?.();
  }, []);

  useAnimatedReaction(
    () => scale.get(),
    (currentScale, previousScale) => {
      if (currentScale !== previousScale) {
        scheduleOnRN(emitZoomChange, currentScale, previousScale);
      }

      scheduleOnRN(setIsZoomed, currentScale > 1);
    },
  );

  useAnimatedReaction(
    () => rotation.get(),
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
      unsubscribe = managerInstance?.subscribe((state) => {
        pendingIndexRef.current = state.currentIndex;
        setCurrentIndex(state.currentIndex);
      });
    });

    return () => {
      unsubscribeFromRegistry();
      unsubscribe?.();
    };
  }, [id]);

  useEffect(() => {
    return registry.subscribeToActiveTrigger(id, setActiveTriggerNode);
  }, [id]);

  useEffect(() => {
    if (!manager) {
      configuredManagerRef.current = null;
      return;
    }

    const isNewManager = configuredManagerRef.current !== manager;
    const didInitialIndexPropChange = previousInitialIndexRef.current !== initialIndex;
    const didDataLengthChange = previousDataLengthRef.current !== dataLength;
    const didLoopLayoutChange = previousUsesLoopSentinelsRef.current !== usesLoopSentinels;
    const hasValidInitialIndex = initialIndex >= 0 && initialIndex < dataLength;
    const shouldResetForDataLength = didDataLengthChange && hasValidInitialIndex;
    const shouldResetForLoopLayout = didLoopLayoutChange && hasValidInitialIndex;
    const shouldApplyInitialIndex =
      isNewManager ||
      didInitialIndexPropChange ||
      shouldResetForDataLength ||
      shouldResetForLoopLayout;
    const shouldSyncInitialIndex =
      didInitialIndexPropChange ||
      shouldResetForDataLength ||
      shouldResetForLoopLayout ||
      activeGeometryIndexRef.current !== initialIndex;

    manager.setDataLength(dataLength);
    manager.setEnableHorizontalSwipe(enableHorizontalSwipe);
    manager.setPagingStride(width + itemSpacing);
    manager.setViewportWidth(width);
    manager.setHeight(height);
    manager.setZoomSharedValues({
      contentHeight,
      contentWidth,
      maxZoomScale,
      scale,
      translateX,
      translateY,
    });
    manager.setResetTransformCallback(resetTransformState);
    manager.setRotation(rotation);
    manager.setEnableLoop(enableLoop);

    if (shouldApplyInitialIndex) {
      pendingIndexRef.current = initialIndex;
      manager.setCurrentIndex(initialIndex);

      if (shouldSyncInitialIndex) {
        syncActiveContentDimensions(initialIndex);
      }
    }

    configuredManagerRef.current = manager;
    previousInitialIndexRef.current = initialIndex;
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
    contentWidth,
    contentHeight,
    resetTransformState,
    syncActiveContentDimensions,
    translateX,
    translateY,
    rotation,
    usesLoopSentinels,
  ]);

  useEffect(() => {
    if (!manager || !listRef.current) {
      return;
    }

    manager.setListRef(listRef.current);
  }, [manager]);

  useEffect(() => {
    const hasDataLengthChanged = previousDataLengthRef.current !== dataLength;
    const hasLoopLayoutChanged = previousUsesLoopSentinelsRef.current !== usesLoopSentinels;
    const hasValidInitialIndex = initialIndex >= 0 && initialIndex < dataLength;

    previousDataLengthRef.current = dataLength;
    previousUsesLoopSentinelsRef.current = usesLoopSentinels;
    translateY.set(0);
    translateX.set(0);
    scale.set(1);
    backdropOpacity.set(1);
    startScale.set(1);
    rotation.set(0);

    if (
      !hasValidInitialIndex ||
      (!hasDataLengthChanged && !hasLoopLayoutChanged && adjustedInitialIndex <= 0) ||
      !listRef.current
    ) {
      return;
    }

    return scheduleInitialScroll(() => {
      scrollTo(adjustedInitialIndex, false);
    });
  }, [
    adjustedInitialIndex,
    dataLength,
    initialIndex,
    translateY,
    backdropOpacity,
    translateX,
    scale,
    startScale,
    rotation,
    scrollTo,
    usesLoopSentinels,
  ]);

  useEffect(() => {
    onAnimationCompleteRef.current = triggerAnimation?.onAnimationComplete;
  }, [triggerAnimation?.onAnimationComplete]);

  useLayoutEffect(() => {
    // Retained virtualized-cell callbacks read only the most recently committed props.
    dataRef.current = data;
    getItemDimensionsRef.current = getItemDimensions;
    getItemKeyRef.current = getItemKey;
    viewportRef.current = { height, width };
    loopConfigRef.current = { dataLength, enableLoop };
    syncActiveContentDimensions();
  }, [
    data,
    dataLength,
    enableLoop,
    getItemDimensions,
    getItemKey,
    height,
    syncActiveContentDimensions,
    width,
  ]);

  useEffect(() => {
    pruneItemDimensionsRegistry(itemDimensionsRef.current, dataLength);
  }, [dataLength]);

  useEffect(() => {
    managerRef.current = manager;
  }, [manager]);

  useEffect(() => {
    onSingleTapRef.current = onSingleTap;
  }, [onSingleTap]);

  useEffect(() => {
    if (shouldStartTriggerAnimation && triggerRectRef.current) {
      const startX = triggerRectRef.current.x + triggerRectRef.current.width / 2 - width / 2;
      const startY = triggerRectRef.current.y + triggerRectRef.current.height / 2 - height / 2;
      const initialScaleFromTrigger = Math.min(
        triggerRectRef.current.width / width,
        triggerRectRef.current.height / height,
      );

      triggerScale.set(initialScaleFromTrigger);
      triggerTranslateX.set(startX);
      triggerTranslateY.set(startY);
      triggerOpacity.set(0);

      triggerScale.set(
        withTiming(1, animationConfig, (finished) => {
          if (finished) {
            scheduleOnRN(onAnimationComplete);
          }
        }),
      );
      triggerTranslateX.set(withTiming(0, animationConfig));
      triggerTranslateY.set(withTiming(0, animationConfig));
      triggerOpacity.set(
        withTiming(1, {
          duration: animationConfig.duration / 2,
          easing: animationConfig.easing,
          reduceMotion: animationConfig.reduceMotion,
        }),
      );

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
    if (!activeTriggerNode || typeof activeTriggerNode.measure !== 'function') {
      return;
    }

    activeTriggerNode.measure((_x, _y, measuredWidth, measuredHeight, pageX, pageY) => {
      const nextTriggerRect = {
        height: measuredHeight,
        width: measuredWidth,
        x: pageX,
        y: pageY,
      } satisfies TriggerRect;

      if (!isValidTriggerRect(nextTriggerRect)) {
        registry.clearActiveTriggerNode(id);
        return;
      }

      triggerRectRef.current = nextTriggerRect;
      triggerOpacity.set(0);
      setShouldStartTriggerAnimation(true);
      registry.clearActiveTriggerNode(id);
    });
  }, [activeTriggerNode, id, isValidTriggerRect, triggerOpacity]);

  useEffect(() => {
    return () => {
      triggerRectRef.current = null;
    };
  }, []);

  const animateDismissToRect = useCallback(
    (rect: TriggerRect) => {
      const endX = rect.x + rect.width / 2 - width / 2;
      const endY = rect.y + rect.height / 2 - height / 2;
      const endScale = Math.min(rect.width / width, rect.height / height);

      triggerScale.set(withTiming(endScale, animationConfig));
      triggerTranslateX.set(withTiming(endX, animationConfig));
      triggerTranslateY.set(withTiming(endY, animationConfig));
      triggerOpacity.set(
        withTiming(0, animationConfig, (finished) => {
          if (finished && onDismiss) {
            scheduleOnRN(onDismiss);
          }
        }),
      );
    },
    [
      animationConfig,
      height,
      onDismiss,
      triggerOpacity,
      triggerScale,
      triggerTranslateX,
      triggerTranslateY,
      width,
    ],
  );

  const dismissWithoutTrigger = useCallback(() => {
    if (onDismiss) {
      scheduleOnRN(onDismiss);
    }
  }, [onDismiss]);

  const handleDismiss = useCallback(() => {
    onDismissStart?.();

    const dismissTargetIndex = pendingIndexRef.current;
    const indexedTriggerNode = registry.getIndexedTriggerNode(id, dismissTargetIndex);

    if (indexedTriggerNode && typeof indexedTriggerNode.measure === 'function') {
      indexedTriggerNode.measure((_x, _y, measuredWidth, measuredHeight, pageX, pageY) => {
        const currentTriggerRect = {
          height: measuredHeight,
          width: measuredWidth,
          x: pageX,
          y: pageY,
        } satisfies TriggerRect;

        if (isValidTriggerRect(currentTriggerRect)) {
          animateDismissToRect(currentTriggerRect);
          return;
        }

        if (isValidTriggerRect(triggerRectRef.current)) {
          animateDismissToRect(triggerRectRef.current);
          return;
        }

        dismissWithoutTrigger();
      });
      return;
    }

    if (isValidTriggerRect(triggerRectRef.current)) {
      animateDismissToRect(triggerRectRef.current);
      return;
    }

    dismissWithoutTrigger();
  }, [animateDismissToRect, dismissWithoutTrigger, id, isValidTriggerRect, onDismissStart]);

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
        translateY.set(event.translationY / dismissOptions.resistance);
      })
      .onEnd((event) => {
        if (
          canDismiss &&
          shouldDismissByDirection(
            event.translationY,
            dismissOptions.threshold,
            dismissOptions.direction,
          )
        ) {
          scheduleOnRN(handleDismiss);
          return;
        }

        translateY.set(
          withSpring(0, {
            damping: 50,
            energyThreshold: 6e-9,
            mass: 4,
            overshootClamping: false,
            stiffness: 600,
          }),
        );
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
        .onStart((event) => {
          startScale.set(scale.get());
          initialTranslateX.set(translateX.get());
          initialTranslateY.set(translateY.get());
          startFocalX.set(event.focalX);
          startFocalY.set(event.focalY);
          lastFocalX.set(event.focalX);
          lastFocalY.set(event.focalY);
          hasActiveFocal.set(false);
        })
        .onUpdate((event) => {
          const initialScale = startScale.get();
          const newScale = initialScale * event.scale;

          scale.set(newScale);

          if (newScale <= 1) {
            translateX.set(withTiming(0));
            translateY.set(withTiming(0));
            return;
          }

          const threshold = 50;

          if (
            shouldAcceptFocalPoint({
              focalX: event.focalX,
              focalY: event.focalY,
              hasActiveFocal: hasActiveFocal.get(),
              lastFocalX: lastFocalX.get(),
              lastFocalY: lastFocalY.get(),
              threshold,
            })
          ) {
            if (!hasActiveFocal.get()) {
              startFocalX.set(event.focalX);
              startFocalY.set(event.focalY);
            }

            lastFocalX.set(event.focalX);
            lastFocalY.set(event.focalY);
            hasActiveFocal.set(true);
          }

          const nextLastFocalX = lastFocalX.get();
          const nextLastFocalY = lastFocalY.get();

          const { translateX: newTranslateX, translateY: newTranslateY } =
            calculateFocalPointTranslation({
              currentFocalX: nextLastFocalX,
              currentFocalY: nextLastFocalY,
              height,
              initialScale,
              initialTranslateX: initialTranslateX.get(),
              initialTranslateY: initialTranslateY.get(),
              nextScale: newScale,
              startFocalX: startFocalX.get(),
              startFocalY: startFocalY.get(),
              width,
            });

          const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
            constrainTranslation({
              scale: newScale,
              translateX: newTranslateX,
              translateY: newTranslateY,
            });

          translateX.set(constrainedTranslateX);
          translateY.set(constrainedTranslateY);
        })
        .onEnd(() => {
          const currentScale = scale.get();

          if (currentScale > maxZoomScale) {
            scale.set(
              withTiming(maxZoomScale, {
                duration: 300,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              }),
            );

            const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
              constrainTranslation({
                scale: maxZoomScale,
                translateX: translateX.get(),
                translateY: translateY.get(),
              });

            translateX.set(withTiming(constrainedTranslateX));
            translateY.set(withTiming(constrainedTranslateY));

            return;
          }

          if (currentScale < 1) {
            scale.set(
              withTiming(1, {
                duration: 300,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              }),
            );
            translateX.set(withTiming(0));
            translateY.set(withTiming(0));
            initialTranslateX.set(withTiming(0));
            initialTranslateY.set(withTiming(0));
            hasActiveFocal.set(false);
            return;
          }

          const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
            constrainTranslation({
              scale: currentScale,
              translateX: translateX.get(),
              translateY: translateY.get(),
            });

          translateX.set(withTiming(constrainedTranslateX));
          translateY.set(withTiming(constrainedTranslateY));
        })
        .onTouchesUp(() => {
          scheduleOnRN(setIsPinching, false);
        })
        .onFinalize(() => {
          hasActiveFocal.set(false);
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
      startFocalX,
      startFocalY,
      hasActiveFocal,
    ],
  );

  const zoomPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enablePanWhenZoomed && isZoomed)
        .activeCursor('grabbing')
        .averageTouches(true)
        .onBegin(() => {
          initialTranslateX.set(translateX.get());
          initialTranslateY.set(translateY.get());
        })
        .onUpdate((event) => {
          const currentScale = scale.get();

          if (currentScale > 1) {
            const newTranslateX = initialTranslateX.get() + event.translationX;
            const newTranslateY = initialTranslateY.get() + event.translationY;

            const { translateX: constrainedTranslateX, translateY: constrainedTranslateY } =
              constrainTranslation({
                scale: currentScale,
                translateX: newTranslateX,
                translateY: newTranslateY,
              });

            translateX.set(constrainedTranslateX);
            translateY.set(constrainedTranslateY);
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

  const emitSingleTap = useCallback((x: number, y: number) => {
    const index = pendingIndexRef.current;
    const currentData = dataRef.current;

    if (index < 0 || index >= currentData.length) {
      return;
    }

    managerRef.current?.emitTap({ kind: 'single', x, y, index });

    const item = currentData[index];

    if (item === undefined) {
      return;
    }

    onSingleTapRef.current?.({ x, y, index, item });
  }, []);

  const singleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(Platform.OS !== 'web')
        .numberOfTaps(1)
        .onEnd((event, success) => {
          if (!success) {
            return;
          }

          scheduleOnRN(emitSingleTap, event.x, event.y);
        }),
    [emitSingleTap],
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enableDoubleTapZoom && Platform.OS !== 'web')
        .numberOfTaps(2)
        .onEnd((event) => {
          applyTapZoomAtPoint({
            contentHeight: contentHeight.get(),
            contentWidth: contentWidth.get(),
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
    [
      contentHeight,
      contentWidth,
      enableDoubleTapZoom,
      height,
      maxZoomScale,
      scale,
      translateX,
      translateY,
      width,
    ],
  );

  const tapGesture = useMemo(
    () => Gesture.Exclusive(doubleTapGesture, singleTapGesture),
    [doubleTapGesture, singleTapGesture],
  );

  const zoomGesture = useMemo(
    () => Gesture.Race(zoomPinchGesture, Gesture.Exclusive(zoomPanGesture, tapGesture)),
    [zoomPinchGesture, zoomPanGesture, tapGesture],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: triggerOpacity.get(),
    transform: [
      { translateX: triggerTranslateX.get() },
      { translateY: triggerTranslateY.get() },
      { scale: triggerScale.get() },

      { translateY: translateY.get() },
      { translateX: translateX.get() },
      { scale: scale.get() },
      { rotate: `${rotation.get()}deg` },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => {
    const baseOpacity = triggerOpacity.get();

    if (!dismissOptions.fadeBackdrop || scale.get() !== 1) {
      return { opacity: baseOpacity };
    }

    const dismissDistance = getDismissDistance(translateY.get(), dismissOptions.direction);
    const dismissOpacity = interpolate(dismissDistance, [0, 200], [1, 0], 'clamp');

    return { opacity: baseOpacity * dismissOpacity };
  }, [dismissOptions.direction, dismissOptions.fadeBackdrop]);

  const nativeScrollGesture = useMemo(() => {
    return Gesture.Native().requireExternalGestureToFail(dismissGestureRef);
  }, []);

  const { activeListIndex, onMomentumScrollEnd, onScroll, onScrollBeginDrag, onWebClick } =
    useGestureViewerPaging({
      adjustedInitialIndex,
      autoPlay,
      autoPlayInterval,
      contentHeight,
      contentWidth,
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
      onSingleTap: emitSingleTap,
      scale,
      scrollTo,
      syncCurrentIndex,
      syncPendingIndex,
      translateX,
      translateY,
      width,
    });

  return {
    activeListIndex,
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
    onWebClick,
    onMomentumScrollEnd,
    onScroll,

    onScrollBeginDrag,
    setItemDimensions,
    zoomGesture,
  };
};
