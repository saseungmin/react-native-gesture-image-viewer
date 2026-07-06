import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type View, useWindowDimensions } from 'react-native';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
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
import { enableNativeTapGestures } from './platformTapGestures';
import {
  type NavigationOptions,
  clampIndex,
  createRenderWindow,
  getLogicalIndex,
  getPageStride,
  getVirtualIndexForLogicalIndex,
  normalizePageSpacing,
  normalizeWindowSize,
  resolveNavigation,
  shouldRunNavigationDuringTransition,
} from './renderWindow';
import type { GestureViewerProps, TriggerRect } from './types';
import { useWebClickHandler } from './useWebClickHandler';
import { useWebSingleTapTimer } from './useWebSingleTapTimer';
import { createBoundsConstraint } from './utils';
import { getDismissDistance, shouldDismissByDirection } from './utils/dismiss';
import { applyTapZoomAtPoint } from './utils/tapZoom';
import { calculateFocalPointTranslation, shouldAcceptFocalPoint } from './utils/zoom';

const PAGE_TRANSITION_CONFIG = {
  duration: 240,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

const PAGE_SPRING_CONFIG = {
  damping: 35,
  energyThreshold: 6e-9,
  mass: 1,
  overshootClamping: false,
  stiffness: 360,
};

const SWIPE_THRESHOLD_RATIO = 0.25;
const SWIPE_VELOCITY_THRESHOLD = 800;
const EDGE_RESISTANCE = 0.35;

const isValidTriggerRect = (rect: TriggerRect | null): rect is TriggerRect => {
  return !!rect && rect.width > 0 && rect.height > 0;
};

type UseGestureViewerProps<ItemT> = Omit<
  GestureViewerProps<ItemT>,
  'renderItem' | 'renderContainer' | 'containerStyle' | 'backdropStyle'
>;

export const useGestureViewer = <ItemT>({
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
  pageSpacing = 0,
  windowSize = 3,
  height: customHeight,
  id = 'default',
  onDismissStart,
  triggerAnimation,
  autoPlay = false,
  autoPlayInterval = 3000,
}: UseGestureViewerProps<ItemT>) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = customWidth || screenWidth;
  const height = customHeight || screenHeight;
  const dataLength = data?.length || 0;
  const normalizedPageSpacing = normalizePageSpacing(pageSpacing);
  const normalizedWindowSize = normalizeWindowSize(windowSize);
  const pageStride = getPageStride(width, normalizedPageSpacing);
  const initialCurrentIndex = clampIndex(initialIndex, dataLength);

  const dismissGestureRef = useRef<GestureType>(undefined);

  const [isZoomed, setIsZoomed] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [shouldStartTriggerAnimation, setShouldStartTriggerAnimation] = useState(false);
  const [manager, setManager] = useState<GestureViewerManager | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex);
  const [centerVirtualIndex, setCenterVirtualIndex] = useState(initialCurrentIndex);
  const [activeTriggerNode, setActiveTriggerNode] = useState<View | null>(() =>
    registry.getActiveTriggerNode(id),
  );
  const [isTriggerOpening, setIsTriggerOpening] = useState(
    () => !!registry.getActiveTriggerNode(id),
  );

  const triggerRectRef = useRef<TriggerRect | null>(null);
  const pendingIndexRef = useRef(initialCurrentIndex);
  const currentIndexRef = useRef(initialCurrentIndex);
  const centerVirtualIndexRef = useRef(initialCurrentIndex);
  const previousInitialIndexRef = useRef(initialIndex);
  const onAnimationCompleteRef = useRef(triggerAnimation?.onAnimationComplete);
  const onSingleTapRef = useRef(onSingleTap);
  const dataRef = useRef(data);
  const dataLengthRef = useRef(dataLength);
  const enableLoopRef = useRef(enableLoop);
  const managerRef = useRef(manager);
  const isTransitioningRef = useRef(false);
  const isZoomedRef = useRef(isZoomed);
  const isRotatedRef = useRef(isRotated);
  const isPinchingRef = useRef(isPinching);

  const initialTranslateY = useSharedValue(0);
  const initialTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const triggerScale = useSharedValue(1);
  const triggerTranslateX = useSharedValue(0);
  const triggerTranslateY = useSharedValue(0);
  const triggerOpacity = useSharedValue(activeTriggerNode ? 0 : 1);

  const visualPage = useSharedValue(initialCurrentIndex);
  const pagingStartPage = useSharedValue(initialCurrentIndex);
  const pagingAnimationActive = useSharedValue(false);
  const pagingGestureActive = useSharedValue(false);
  const pageTransitionLocked = useSharedValue(false);
  const hasZoomChangeListeners = useSharedValue(false);
  const hasRotationChangeListeners = useSharedValue(false);

  const lastFocalX = useSharedValue(0);
  const lastFocalY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const hasActiveFocal = useSharedValue(false);
  const { clearPendingWebSingleTap, scheduleWebSingleTap } = useWebSingleTapTimer();

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

  const renderCurrentIndex = clampIndex(currentIndex, dataLength);
  const renderCenterVirtualIndex =
    getVirtualIndexForLogicalIndex(
      renderCurrentIndex,
      centerVirtualIndex,
      dataLength,
      enableLoop,
    ) ?? renderCurrentIndex;

  const fullRenderWindowSlots = createRenderWindow({
    centerVirtualIndex: renderCenterVirtualIndex,
    data,
    enableLoop,
    windowSize: normalizedWindowSize,
  });
  const renderWindowSlots = isTriggerOpening
    ? fullRenderWindowSlots.filter((slot) => slot.virtualIndex === renderCenterVirtualIndex)
    : fullRenderWindowSlots;

  const constrainTranslation = useMemo(
    () => createBoundsConstraint({ height, width }),
    [width, height],
  );

  const setTransitioning = useCallback(
    (nextTransitioning: boolean) => {
      isTransitioningRef.current = nextTransitioning;
      pageTransitionLocked.set(nextTransitioning);

      if (nextTransitioning) {
        clearPendingWebSingleTap();
      }
    },
    [clearPendingWebSingleTap, pageTransitionLocked],
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

  const commitCurrentIndex = useCallback((nextIndex: number) => {
    pendingIndexRef.current = nextIndex;
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    managerRef.current?.notifyStateChange();
  }, []);

  const commitVirtualIndex = useCallback(
    (nextVirtualIndex: number) => {
      const nextLogicalIndex = getLogicalIndex(
        nextVirtualIndex,
        dataLengthRef.current,
        enableLoopRef.current,
      );

      setTransitioning(false);

      if (nextLogicalIndex === null) {
        return;
      }

      centerVirtualIndexRef.current = nextVirtualIndex;
      setCenterVirtualIndex(nextVirtualIndex);
      commitCurrentIndex(nextLogicalIndex);
    },
    [commitCurrentIndex, setTransitioning],
  );

  const navigateToIndex = useCallback(
    (targetIndex: number, options?: NavigationOptions, preferredDirection?: -1 | 1) => {
      const resolution = resolveNavigation({
        currentIndex: currentIndexRef.current,
        dataLength: dataLengthRef.current,
        enableLoop: enableLoopRef.current,
        preferredDirection,
        targetIndex,
      });

      if (resolution.kind === 'noop') {
        return;
      }

      if (isTransitioningRef.current && !shouldRunNavigationDuringTransition(resolution, options)) {
        return;
      }

      const targetVirtualIndex =
        resolution.kind === 'step'
          ? centerVirtualIndexRef.current + resolution.direction
          : getVirtualIndexForLogicalIndex(
              resolution.targetIndex,
              centerVirtualIndexRef.current,
              dataLengthRef.current,
              enableLoopRef.current,
            );

      if (targetVirtualIndex === null) {
        return;
      }

      resetTransformState();
      pagingAnimationActive.set(false);
      cancelAnimation(visualPage);

      if (resolution.kind !== 'step' || options?.animated === false) {
        visualPage.set(targetVirtualIndex);
        commitVirtualIndex(targetVirtualIndex);
        return;
      }

      setTransitioning(true);
      visualPage.set(
        withTiming(targetVirtualIndex, PAGE_TRANSITION_CONFIG, (finished) => {
          if (finished) {
            scheduleOnRN(commitVirtualIndex, targetVirtualIndex);
            return;
          }

          scheduleOnRN(setTransitioning, false);
        }),
      );
    },
    [commitVirtualIndex, pagingAnimationActive, resetTransformState, setTransitioning, visualPage],
  );

  const navigateByDirection = useCallback(
    (direction: -1 | 1) => {
      const currentDataLength = dataLengthRef.current;

      if (currentDataLength <= 0) {
        return;
      }

      const nextIndex = currentIndexRef.current + direction;

      if (nextIndex >= 0 && nextIndex < currentDataLength) {
        navigateToIndex(nextIndex, undefined, direction);
        return;
      }

      if (!enableLoopRef.current || currentDataLength <= 1) {
        return;
      }

      navigateToIndex(direction === 1 ? 0 : currentDataLength - 1, undefined, direction);
    },
    [navigateToIndex],
  );

  const navigateToNext = useCallback(() => {
    navigateByDirection(1);
  }, [navigateByDirection]);

  const navigateToPrevious = useCallback(() => {
    navigateByDirection(-1);
  }, [navigateByDirection]);

  const emitZoomChange = useCallback((currentScale: number, prevScale: number | null) => {
    managerRef.current?.emitZoomChange(currentScale, prevScale);
  }, []);

  const emitRotationChange = useCallback((currentRotation: number, prevRotation: number | null) => {
    managerRef.current?.emitRotationChange(currentRotation, prevRotation);
  }, []);

  const finishTriggerOpening = useCallback(() => {
    setIsTriggerOpening(false);
    onAnimationCompleteRef.current?.();
  }, []);

  useAnimatedReaction(
    () => scale.get(),
    (currentScale, previousScale) => {
      if (currentScale !== previousScale && hasZoomChangeListeners.get()) {
        scheduleOnRN(emitZoomChange, currentScale, previousScale);
      }

      const currentIsZoomed = currentScale > 1;
      const previousIsZoomed = (previousScale ?? 1) > 1;

      if (previousScale === null || currentIsZoomed !== previousIsZoomed) {
        scheduleOnRN(setIsZoomed, currentIsZoomed);
      }
    },
  );

  useAnimatedReaction(
    () => rotation.get(),
    (currentRotation, previousRotation) => {
      if (currentRotation !== previousRotation && hasRotationChangeListeners.get()) {
        scheduleOnRN(emitRotationChange, currentRotation, previousRotation);
      }

      const currentIsRotated = currentRotation % 360 !== 0;
      const previousIsRotated = (previousRotation ?? 0) % 360 !== 0;

      if (previousRotation === null || currentIsRotated !== previousIsRotated) {
        scheduleOnRN(setIsRotated, currentIsRotated);
      }
    },
  );

  useEffect(() => {
    return registry.subscribeToManager(id, (managerInstance) => {
      managerRef.current = managerInstance;
      setManager(managerInstance);
    });
  }, [id]);

  useEffect(() => {
    return registry.subscribeToActiveTrigger(id, setActiveTriggerNode);
  }, [id]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  useEffect(() => {
    isRotatedRef.current = isRotated;
  }, [isRotated]);

  useEffect(() => {
    isPinchingRef.current = isPinching;
  }, [isPinching]);

  useEffect(() => {
    onSingleTapRef.current = onSingleTap;
  }, [onSingleTap]);

  useEffect(() => {
    onAnimationCompleteRef.current = triggerAnimation?.onAnimationComplete;
  }, [triggerAnimation?.onAnimationComplete]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setWidth(width);
    manager.setHeight(height);
    manager.setZoomSharedValues(scale, translateX, translateY, maxZoomScale);
    manager.setRotation(rotation);
  }, [height, manager, maxZoomScale, rotation, scale, translateX, translateY, width]);

  useEffect(() => {
    if (!manager) {
      hasZoomChangeListeners.set(false);
      hasRotationChangeListeners.set(false);
      return;
    }

    return manager.subscribeToEventListenerPresence((eventType, hasListeners) => {
      if (eventType === 'zoomChange') {
        hasZoomChangeListeners.set(hasListeners);
        return;
      }

      if (eventType === 'rotationChange') {
        hasRotationChangeListeners.set(hasListeners);
      }
    });
  }, [hasRotationChangeListeners, hasZoomChangeListeners, manager]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setStateReader(() => ({
      currentIndex: currentIndexRef.current,
      totalCount: dataLengthRef.current,
    }));
    manager.notifyStateChange();

    return () => {
      manager.setStateReader(null);
    };
  }, [manager]);

  useEffect(() => {
    if (!manager) {
      return;
    }

    manager.setNavigationAdapter({
      goToIndex: navigateToIndex,
      goToNext: navigateToNext,
      goToPrevious: navigateToPrevious,
    });

    return () => {
      manager.setNavigationAdapter(null);
    };
  }, [manager, navigateToIndex, navigateToNext, navigateToPrevious]);

  useLayoutEffect(() => {
    const initialIndexChanged = previousInitialIndexRef.current !== initialIndex;
    previousInitialIndexRef.current = initialIndex;
    dataLengthRef.current = dataLength;
    enableLoopRef.current = enableLoop;

    const nextIndex = initialIndexChanged
      ? clampIndex(initialIndex, dataLength)
      : clampIndex(currentIndexRef.current, dataLength);

    const nextVirtualIndex =
      getVirtualIndexForLogicalIndex(
        nextIndex,
        centerVirtualIndexRef.current,
        dataLength,
        enableLoop,
      ) ?? nextIndex;

    const previousIndex = currentIndexRef.current;
    const previousVirtualIndex = centerVirtualIndexRef.current;
    const shouldSyncVirtualPage =
      isTransitioningRef.current || previousVirtualIndex !== nextVirtualIndex;
    const shouldResetTransform =
      initialIndexChanged || previousIndex !== nextIndex || shouldSyncVirtualPage;

    if (shouldSyncVirtualPage) {
      cancelAnimation(visualPage);
      setTransitioning(false);
      visualPage.set(nextVirtualIndex);
      centerVirtualIndexRef.current = nextVirtualIndex;
      setCenterVirtualIndex(nextVirtualIndex);
    }

    if (previousIndex !== nextIndex) {
      commitCurrentIndex(nextIndex);
    } else {
      managerRef.current?.notifyStateChange();
    }

    if (shouldResetTransform) {
      resetTransformState();
    }
  }, [
    commitCurrentIndex,
    dataLength,
    enableLoop,
    initialIndex,
    resetTransformState,
    setTransitioning,
    visualPage,
  ]);

  useEffect(() => {
    return () => {
      triggerRectRef.current = null;
      clearPendingWebSingleTap();
    };
  }, [clearPendingWebSingleTap]);

  useEffect(() => {
    if (
      !autoPlay ||
      dataLength <= 1 ||
      isTriggerOpening ||
      isZoomed ||
      isRotated ||
      isPinching ||
      (!enableLoop && currentIndex >= dataLength - 1)
    ) {
      return;
    }

    const interval = Math.max(250, Math.floor(autoPlayInterval || 0));

    if (!Number.isFinite(interval)) {
      return;
    }

    const timer = setInterval(() => {
      if (
        isTransitioningRef.current ||
        isZoomedRef.current ||
        isRotatedRef.current ||
        isPinchingRef.current
      ) {
        return;
      }

      const nextIndex =
        currentIndexRef.current >= dataLengthRef.current - 1
          ? enableLoopRef.current
            ? 0
            : null
          : currentIndexRef.current + 1;

      if (nextIndex === null) {
        return;
      }

      navigateToIndex(nextIndex);
    }, interval);

    return () => clearInterval(timer);
  }, [
    autoPlay,
    autoPlayInterval,
    currentIndex,
    dataLength,
    enableLoop,
    isPinching,
    isRotated,
    isTriggerOpening,
    isZoomed,
    navigateToIndex,
  ]);

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
            scheduleOnRN(finishTriggerOpening);
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
    finishTriggerOpening,
  ]);

  useEffect(() => {
    if (!activeTriggerNode) {
      return;
    }

    if (typeof activeTriggerNode.measure !== 'function') {
      setIsTriggerOpening(false);
      triggerOpacity.set(1);
      registry.clearActiveTriggerNode(id);
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
        setIsTriggerOpening(false);
        triggerOpacity.set(1);
        registry.clearActiveTriggerNode(id);
        return;
      }

      triggerRectRef.current = nextTriggerRect;
      triggerOpacity.set(0);
      setShouldStartTriggerAnimation(true);
      registry.clearActiveTriggerNode(id);
    });
  }, [activeTriggerNode, id, triggerOpacity]);

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
    if (isTransitioningRef.current) {
      return;
    }

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
  }, [animateDismissToRect, dismissWithoutTrigger, id, onDismissStart]);

  const dismissGesture = useMemo(() => {
    const canDismiss = !isTriggerOpening && !isZoomed && dismissOptions.enabled;

    return Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .activeCursor('grabbing')
      .activeOffsetY([-10, 10])
      .failOffsetX([-10, 10])
      .withRef(dismissGestureRef)
      .enabled(canDismiss)
      .onUpdate((event) => {
        if (pageTransitionLocked.get()) {
          return;
        }

        translateY.set(event.translationY / dismissOptions.resistance);
      })
      .onEnd((event) => {
        if (pageTransitionLocked.get()) {
          translateY.set(withSpring(0, PAGE_SPRING_CONFIG));
          return;
        }

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

        translateY.set(withSpring(0, PAGE_SPRING_CONFIG));
      });
  }, [translateY, dismissOptions, handleDismiss, isTriggerOpening, isZoomed, pageTransitionLocked]);

  const horizontalPagingGesture = useMemo(() => {
    const canSwipe =
      enableHorizontalSwipe &&
      dataLength > 1 &&
      !isTriggerOpening &&
      !isZoomed &&
      !isRotated &&
      !isPinching &&
      pageStride > 0;
    const settleToCenter = () => {
      'worklet';
      pagingAnimationActive.set(true);
      visualPage.set(
        withSpring(centerVirtualIndex, PAGE_SPRING_CONFIG, (finished) => {
          pagingAnimationActive.set(false);
          if (finished) {
            scheduleOnRN(setTransitioning, false);
          }
        }),
      );
    };

    return Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .activeCursor('grabbing')
      .activeOffsetX([-10, 10])
      .failOffsetY([-10, 10])
      .enabled(canSwipe)
      .onStart(() => {
        if (pageTransitionLocked.get()) {
          return;
        }

        // Pan enters BEGAN for ordinary taps, so lock paging only after swipe activation.
        cancelAnimation(visualPage);
        pagingAnimationActive.set(false);
        pagingGestureActive.set(true);
        pageTransitionLocked.set(true);
        pagingStartPage.set(visualPage.get());
        scheduleOnRN(setTransitioning, true);
      })
      .onUpdate((event) => {
        if (!pagingGestureActive.get()) {
          return;
        }

        const dragPageDelta = -event.translationX / pageStride;
        const basePage = pagingStartPage.get();
        let nextPage = basePage + dragPageDelta;

        if (!enableLoop) {
          if (currentIndex === 0 && nextPage < centerVirtualIndex) {
            nextPage = centerVirtualIndex + (nextPage - centerVirtualIndex) * EDGE_RESISTANCE;
          }

          if (currentIndex === dataLength - 1 && nextPage > centerVirtualIndex) {
            nextPage = centerVirtualIndex + (nextPage - centerVirtualIndex) * EDGE_RESISTANCE;
          }
        }

        visualPage.set(nextPage);
      })
      .onEnd((event) => {
        if (!pagingGestureActive.get()) {
          return;
        }

        pagingGestureActive.set(false);

        const passedLeftThreshold =
          -event.translationX > width * SWIPE_THRESHOLD_RATIO ||
          event.velocityX < -SWIPE_VELOCITY_THRESHOLD;
        const passedRightThreshold =
          event.translationX > width * SWIPE_THRESHOLD_RATIO ||
          event.velocityX > SWIPE_VELOCITY_THRESHOLD;
        const direction = passedLeftThreshold ? 1 : passedRightThreshold ? -1 : 0;

        if (direction === 0) {
          settleToCenter();
          return;
        }

        const nextIndex = currentIndex + direction;
        const canMove =
          enableLoop ||
          (direction === 1 && nextIndex < dataLength) ||
          (direction === -1 && nextIndex >= 0);

        if (!canMove) {
          settleToCenter();
          return;
        }

        const targetVirtualIndex = centerVirtualIndex + direction;

        pagingAnimationActive.set(true);
        visualPage.set(
          withTiming(targetVirtualIndex, PAGE_TRANSITION_CONFIG, (finished) => {
            pagingAnimationActive.set(false);
            if (finished) {
              scheduleOnRN(commitVirtualIndex, targetVirtualIndex);
              return;
            }

            scheduleOnRN(setTransitioning, false);
          }),
        );
      })
      .onFinalize(() => {
        if (pagingAnimationActive.get()) {
          return;
        }

        if (!pagingGestureActive.get()) {
          return;
        }

        pagingGestureActive.set(false);

        if (Math.abs(visualPage.get() - centerVirtualIndex) > 0.001) {
          settleToCenter();
          return;
        }

        scheduleOnRN(setTransitioning, false);
      });
  }, [
    centerVirtualIndex,
    commitVirtualIndex,
    currentIndex,
    dataLength,
    enableHorizontalSwipe,
    enableLoop,
    isTriggerOpening,
    isPinching,
    isRotated,
    isZoomed,
    pagingAnimationActive,
    pagingGestureActive,
    pageTransitionLocked,
    pageStride,
    pagingStartPage,
    setTransitioning,
    visualPage,
    width,
  ]);

  const zoomPinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(enablePinchZoom)
        .onTouchesDown((event) => {
          if (pageTransitionLocked.get()) {
            return;
          }

          if (event.numberOfTouches === 2) {
            scheduleOnRN(setIsPinching, true);
          }
        })
        .onStart((event) => {
          if (pageTransitionLocked.get()) {
            return;
          }

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
          if (pageTransitionLocked.get()) {
            return;
          }

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
          if (pageTransitionLocked.get()) {
            return;
          }

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
      pageTransitionLocked,
    ],
  );

  const zoomPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enablePanWhenZoomed && isZoomed)
        .activeCursor('grabbing')
        .averageTouches(true)
        .onBegin(() => {
          if (pageTransitionLocked.get()) {
            return;
          }

          initialTranslateX.set(translateX.get());
          initialTranslateY.set(translateY.get());
        })
        .onUpdate((event) => {
          if (pageTransitionLocked.get()) {
            return;
          }

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
      pageTransitionLocked,
    ],
  );

  const getCurrentTapTarget = useCallback((): { index: number; item: ItemT } | null => {
    const index = pendingIndexRef.current;
    const item = dataRef.current[index];

    if (index < 0 || index >= dataRef.current.length || item === undefined) {
      return null;
    }

    return { index, item };
  }, []);

  const isWebInteractionLocked = useCallback(
    () => isTransitioningRef.current || pageTransitionLocked.get(),
    [pageTransitionLocked],
  );

  const emitSingleTap = useCallback(
    (x: number, y: number, index?: number, item?: ItemT) => {
      if (isTransitioningRef.current) {
        return;
      }

      const target =
        item === undefined || index === undefined ? getCurrentTapTarget() : { index, item };

      if (!target) {
        return;
      }

      const { index: targetIndex, item: targetItem } = target;

      if (targetIndex < 0) {
        return;
      }

      managerRef.current?.emitTap({ kind: 'single', x, y, index: targetIndex });
      onSingleTapRef.current?.({ x, y, index: targetIndex, item: targetItem });
    },
    [getCurrentTapTarget],
  );

  const singleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enableNativeTapGestures)
        .numberOfTaps(1)
        .onEnd((event, success) => {
          if (!success || pageTransitionLocked.get()) {
            return;
          }

          scheduleOnRN(emitSingleTap, event.x, event.y);
        }),
    [emitSingleTap, pageTransitionLocked],
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enableDoubleTapZoom && enableNativeTapGestures)
        .numberOfTaps(2)
        .onEnd((event) => {
          if (pageTransitionLocked.get()) {
            return;
          }

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
    [
      enableDoubleTapZoom,
      height,
      maxZoomScale,
      pageTransitionLocked,
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

  const onWebClick = useWebClickHandler({
    clearPendingWebSingleTap,
    emitSingleTap,
    enableDoubleTapZoom,
    getCurrentTapTarget,
    height,
    maxZoomScale,
    scale,
    scheduleWebSingleTap,
    isInteractionLocked: isWebInteractionLocked,
    translateX,
    translateY,
    width,
  });

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

  return {
    animatedStyle,
    backdropStyle,
    centerVirtualIndex: renderCenterVirtualIndex,
    currentIndex: renderCurrentIndex,
    dataLength,
    dismissGesture,
    handleDismiss,
    horizontalPagingGesture,
    isPinching,
    isRotated,
    isZoomed,
    onWebClick,
    pageStride,
    renderWindowSlots,
    visualPage,
    zoomGesture,
  };
};
