import { useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { cancelAnimation, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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
  width,
}: UseGestureViewerPagingOptions) {
  const visualPage = useSharedValue(initialPage);
  const pagingStartPage = useSharedValue(initialPage);
  const pagingAnimationActive = useSharedValue(false);
  const pagingGestureActive = useSharedValue(false);
  const pageTransitionLocked = useSharedValue(false);
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
  }, [pagingAnimationActive, pagingGestureActive]);

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

  const horizontalPagingGesture = useMemo(() => {
    const canSwipe =
      horizontalSwipeEnabled &&
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
            scheduleOnRN(setPageTransitioning, false);
          }
        }),
      );
    };
    const releasePagingForPinch = () => {
      'worklet';
      if (!pagingGestureActive.get()) {
        return;
      }

      cancelAnimation(visualPage);
      pagingAnimationActive.set(false);
      pagingGestureActive.set(false);
      pageTransitionLocked.set(false);
      visualPage.set(withSpring(centerVirtualIndex, PAGE_SPRING_CONFIG));
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
    visualPage,
    width,
  ]);

  return {
    animateToVirtualPage,
    cancelPagingInteraction,
    horizontalPagingGesture,
    isPageTransitioningRef,
    pageTransitionLocked,
    snapToVirtualPage,
    visualPage,
  };
}
