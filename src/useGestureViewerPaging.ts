import { useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  type SharedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  EDGE_RESISTANCE,
  PAGE_SPRING_CONFIG,
  PAGE_TRANSITION_CONFIG,
} from './gestureViewerAnimation';
import {
  applyHorizontalEdgeResistance,
  resolveHorizontalPagingTarget,
  resolveHorizontalSwipeDirection,
} from './gestureViewerPaging';

type UseGestureViewerPagingOptions = {
  centerVirtualIndex: number;
  clearPendingWebSingleTap: () => void;
  commitVirtualIndexOnly: (targetVirtualIndex: number) => void;
  currentIndex: number;
  dataLength: number;
  enableLoop: boolean;
  horizontalSwipeDistanceThresholdRatio: number;
  horizontalSwipeEnabled: boolean;
  horizontalSwipeVelocityThreshold: number;
  initialPage: number;
  isPinching: boolean;
  isRotated: boolean;
  isTriggerOpening: boolean;
  isZoomed: boolean;
  pageStride: number;
  resetTransformImmediately: () => void;
  suppressNativeTap: SharedValue<boolean>;
  width: number;
};

/**
 * Owns horizontal paging shared values, transition state, and paging commands.
 */
export function useGestureViewerPaging({
  centerVirtualIndex,
  clearPendingWebSingleTap,
  commitVirtualIndexOnly,
  currentIndex,
  dataLength,
  enableLoop,
  horizontalSwipeDistanceThresholdRatio,
  horizontalSwipeEnabled,
  horizontalSwipeVelocityThreshold,
  initialPage,
  isPinching,
  isRotated,
  isTriggerOpening,
  isZoomed,
  pageStride,
  resetTransformImmediately,
  suppressNativeTap,
  width,
}: UseGestureViewerPagingOptions) {
  const visualPage = useSharedValue(initialPage);
  const pagingStartPage = useSharedValue(initialPage);
  const pagingAnimationActive = useSharedValue(false);
  const pagingGestureActive = useSharedValue(false);
  const pageTransitionLocked = useSharedValue(false);
  const edgeHandoffActive = useSharedValue(false);
  const edgeHandoffDistance = useSharedValue(0);
  const isPageTransitioningRef = useRef(false);

  const setPageTransitioning = useCallback(
    (nextTransitioning: boolean) => {
      isPageTransitioningRef.current = nextTransitioning;
      pageTransitionLocked.set(nextTransitioning);

      if (nextTransitioning) {
        clearPendingWebSingleTap();
      }
    },
    [clearPendingWebSingleTap, pageTransitionLocked],
  );

  const clearPagingFlags = useCallback(() => {
    pagingAnimationActive.set(false);
    pagingGestureActive.set(false);
    edgeHandoffActive.set(false);
    edgeHandoffDistance.set(0);
  }, [edgeHandoffActive, edgeHandoffDistance, pagingAnimationActive, pagingGestureActive]);

  const cancelPagingInteraction = useCallback(() => {
    clearPendingWebSingleTap();
    cancelAnimation(visualPage);
    clearPagingFlags();
    setPageTransitioning(false);
  }, [clearPendingWebSingleTap, clearPagingFlags, setPageTransitioning, visualPage]);

  const snapToVirtualPage = useCallback(
    (targetVirtualIndex: number) => {
      clearPendingWebSingleTap();
      cancelAnimation(visualPage);
      clearPagingFlags();
      visualPage.set(targetVirtualIndex);
      commitVirtualIndexOnly(targetVirtualIndex);
      setPageTransitioning(false);
    },
    [
      clearPendingWebSingleTap,
      clearPagingFlags,
      commitVirtualIndexOnly,
      setPageTransitioning,
      visualPage,
    ],
  );

  const completeAnimatedVirtualPage = useCallback(
    (targetVirtualIndex: number) => {
      commitVirtualIndexOnly(targetVirtualIndex);
      setPageTransitioning(false);
    },
    [commitVirtualIndexOnly, setPageTransitioning],
  );

  const cancelAnimatedVirtualPage = useCallback(() => {
    setPageTransitioning(false);
  }, [setPageTransitioning]);

  const animateToVirtualPage = useCallback(
    (targetVirtualIndex: number) => {
      cancelAnimation(visualPage);
      clearPagingFlags();
      pagingAnimationActive.set(true);
      setPageTransitioning(true);
      visualPage.set(
        withTiming(targetVirtualIndex, PAGE_TRANSITION_CONFIG, (finished) => {
          pagingAnimationActive.set(false);

          if (finished) {
            scheduleOnRN(completeAnimatedVirtualPage, targetVirtualIndex);
            return;
          }

          scheduleOnRN(cancelAnimatedVirtualPage);
        }),
      );
    },
    [
      cancelAnimatedVirtualPage,
      clearPagingFlags,
      completeAnimatedVirtualPage,
      pagingAnimationActive,
      setPageTransitioning,
      visualPage,
    ],
  );

  const completeEdgeHandoffPage = useCallback(
    (targetVirtualIndex: number) => {
      // The zoomed item is off screen by now. Reset it before the incoming item
      // becomes active so that item never inherits the outgoing zoom.
      resetTransformImmediately();
      completeAnimatedVirtualPage(targetVirtualIndex);
    },
    [completeAnimatedVirtualPage, resetTransformImmediately],
  );

  const settleToCenter = useCallback(() => {
    'worklet';
    pagingAnimationActive.set(true);
    visualPage.set(
      withSpring(centerVirtualIndex, PAGE_SPRING_CONFIG, (finished) => {
        pagingAnimationActive.set(false);

        if (finished) {
          scheduleOnRN(setPageTransitioning, false);
        }
      }),
    );
  }, [centerVirtualIndex, pagingAnimationActive, setPageTransitioning, visualPage]);

  const canHandOffFromEdge = horizontalSwipeEnabled && dataLength > 1 && pageStride > 0;

  /**
   * Moves the page by the part of a zoomed drag that the item's bounds clamp away.
   * @param distance Signed drag travel past the edge threshold, positive toward the previous item.
   */
  const updateEdgeHandoff = useCallback(
    (distance: number) => {
      'worklet';
      if (!canHandOffFromEdge || pageTransitionLocked.get()) {
        return;
      }

      if (!edgeHandoffActive.get()) {
        if (distance === 0) {
          return;
        }

        cancelAnimation(visualPage);
        pagingAnimationActive.set(false);
        edgeHandoffActive.set(true);
      }

      edgeHandoffDistance.set(distance);
      visualPage.set(
        applyHorizontalEdgeResistance(
          centerVirtualIndex - distance / pageStride,
          currentIndex,
          dataLength,
          centerVirtualIndex,
          enableLoop,
          EDGE_RESISTANCE,
        ),
      );
    },
    [
      canHandOffFromEdge,
      centerVirtualIndex,
      currentIndex,
      dataLength,
      edgeHandoffActive,
      edgeHandoffDistance,
      enableLoop,
      pageStride,
      pageTransitionLocked,
      pagingAnimationActive,
      visualPage,
    ],
  );

  /**
   * Settles or commits an edge handoff with the horizontal swipe thresholds.
   * @returns Whether a handoff was in progress, so the caller can skip horizontal momentum.
   */
  const releaseEdgeHandoff = useCallback(
    (velocityX: number) => {
      'worklet';
      if (!edgeHandoffActive.get()) {
        return false;
      }

      const distance = edgeHandoffDistance.get();
      edgeHandoffActive.set(false);
      edgeHandoffDistance.set(0);

      const direction = resolveHorizontalSwipeDirection(
        distance,
        velocityX,
        width,
        horizontalSwipeDistanceThresholdRatio,
        horizontalSwipeVelocityThreshold,
      );
      // A flick back toward the item must not page the other way.
      const towardHandoff = distance > 0 ? -1 : 1;

      if (distance === 0 || direction !== towardHandoff) {
        settleToCenter();
        return true;
      }

      const pagingTarget = resolveHorizontalPagingTarget(
        centerVirtualIndex,
        currentIndex,
        dataLength,
        direction,
        enableLoop,
      );

      if (pagingTarget.kind === 'settle') {
        settleToCenter();
        return true;
      }

      const targetVirtualIndex = pagingTarget.targetVirtualIndex;

      pageTransitionLocked.set(true);
      scheduleOnRN(setPageTransitioning, true);
      pagingAnimationActive.set(true);
      visualPage.set(
        withTiming(targetVirtualIndex, PAGE_TRANSITION_CONFIG, (finished) => {
          pagingAnimationActive.set(false);

          if (finished) {
            scheduleOnRN(completeEdgeHandoffPage, targetVirtualIndex);
            return;
          }

          scheduleOnRN(cancelAnimatedVirtualPage);
        }),
      );

      return true;
    },
    [
      cancelAnimatedVirtualPage,
      centerVirtualIndex,
      completeEdgeHandoffPage,
      currentIndex,
      dataLength,
      edgeHandoffActive,
      edgeHandoffDistance,
      enableLoop,
      horizontalSwipeDistanceThresholdRatio,
      horizontalSwipeVelocityThreshold,
      pageTransitionLocked,
      pagingAnimationActive,
      setPageTransitioning,
      settleToCenter,
      visualPage,
      width,
    ],
  );

  const cancelEdgeHandoff = useCallback(() => {
    'worklet';
    if (!edgeHandoffActive.get()) {
      return;
    }

    edgeHandoffActive.set(false);
    edgeHandoffDistance.set(0);
    settleToCenter();
  }, [edgeHandoffActive, edgeHandoffDistance, settleToCenter]);

  const horizontalPagingGesture = useMemo(() => {
    const canSwipe =
      horizontalSwipeEnabled &&
      dataLength > 1 &&
      !isTriggerOpening &&
      !isZoomed &&
      !isRotated &&
      !isPinching &&
      pageStride > 0;
    const releasePagingForPinch = () => {
      'worklet';
      if (!pagingGestureActive.get()) {
        return;
      }

      cancelAnimation(visualPage);
      pagingAnimationActive.set(false);
      pagingGestureActive.set(false);
      pageTransitionLocked.set(false);
      visualPage.set(centerVirtualIndex);
      scheduleOnRN(setPageTransitioning, false);
    };

    return Gesture.Pan()
      .minDistance(10)
      .maxPointers(1)
      .averageTouches(true)
      .activeCursor('grabbing')
      .activeOffsetX([-10, 10])
      .failOffsetY([-10, 10])
      .enabled(canSwipe)
      .onTouchesDown((event, stateManager) => {
        if (event.numberOfTouches > 1) {
          suppressNativeTap.set(true);
          releasePagingForPinch();
          stateManager.fail();
        }
      })
      .onStart(() => {
        if (pageTransitionLocked.get()) {
          return;
        }

        // Pan enters BEGAN for ordinary taps, so lock paging only after swipe activation.
        cancelAnimation(visualPage);
        pagingAnimationActive.set(false);
        pagingGestureActive.set(true);
        pagingStartPage.set(visualPage.get());
        suppressNativeTap.set(true);
        scheduleOnRN(setPageTransitioning, true);
      })
      .onUpdate((event) => {
        if (!pagingGestureActive.get()) {
          return;
        }

        const dragPageDelta = -event.translationX / pageStride;
        const basePage = pagingStartPage.get();
        const nextPage = applyHorizontalEdgeResistance(
          basePage + dragPageDelta,
          currentIndex,
          dataLength,
          centerVirtualIndex,
          enableLoop,
          EDGE_RESISTANCE,
        );

        visualPage.set(nextPage);
      })
      .onEnd((event) => {
        if (!pagingGestureActive.get()) {
          return;
        }

        pagingGestureActive.set(false);

        const direction = resolveHorizontalSwipeDirection(
          event.translationX,
          event.velocityX,
          width,
          horizontalSwipeDistanceThresholdRatio,
          horizontalSwipeVelocityThreshold,
        );

        if (direction === 0) {
          settleToCenter();
          return;
        }

        const pagingTarget = resolveHorizontalPagingTarget(
          centerVirtualIndex,
          currentIndex,
          dataLength,
          direction,
          enableLoop,
        );

        if (pagingTarget.kind === 'settle') {
          settleToCenter();
          return;
        }

        const targetVirtualIndex = pagingTarget.targetVirtualIndex;

        pagingAnimationActive.set(true);
        visualPage.set(
          withTiming(targetVirtualIndex, PAGE_TRANSITION_CONFIG, (finished) => {
            pagingAnimationActive.set(false);

            if (finished) {
              scheduleOnRN(completeAnimatedVirtualPage, targetVirtualIndex);
              return;
            }

            scheduleOnRN(cancelAnimatedVirtualPage);
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

        scheduleOnRN(setPageTransitioning, false);
      });
  }, [
    cancelAnimatedVirtualPage,
    centerVirtualIndex,
    completeAnimatedVirtualPage,
    currentIndex,
    dataLength,
    enableLoop,
    horizontalSwipeDistanceThresholdRatio,
    horizontalSwipeEnabled,
    horizontalSwipeVelocityThreshold,
    isTriggerOpening,
    isPinching,
    isRotated,
    isZoomed,
    pageTransitionLocked,
    pageStride,
    pagingAnimationActive,
    pagingGestureActive,
    pagingStartPage,
    setPageTransitioning,
    settleToCenter,
    suppressNativeTap,
    visualPage,
    width,
  ]);

  return {
    animateToVirtualPage,
    cancelEdgeHandoff,
    cancelPagingInteraction,
    horizontalPagingGesture,
    isPageTransitioningRef,
    pageTransitionLocked,
    releaseEdgeHandoff,
    snapToVirtualPage,
    updateEdgeHandoff,
    visualPage,
  };
}
