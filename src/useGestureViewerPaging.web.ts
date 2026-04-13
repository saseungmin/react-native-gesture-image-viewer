import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import type {
  UseGestureViewerPagingArgs,
  UseGestureViewerPagingResult,
} from './useGestureViewerPaging.types';
import { applyTapZoomAtPoint } from './utils/tapZoom';
import {
  getWebAutoPlayTargetPhysicalIndex,
  getWebScrollPhysicalIndex,
  resolveWebScrollFinalState,
} from './utils/webScroll';

type WebScrollActor = 'idle' | 'user' | 'autoplay';

type WebScrollRuntime = {
  actor: WebScrollActor;
  isAutoplayPausedByUser: boolean;
  lastSettledPhysicalIndex: number;
  latestOffsetX: number;
  latestRawPhysicalIndex: number;
  lastProgrammaticScrollVersion: number;
  settleTimer: ReturnType<typeof setTimeout> | null;
  resumeAutoplayTimer: ReturnType<typeof setTimeout> | null;
};

export function useGestureViewerPaging({
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
  syncPendingIndex,
  translateX,
  translateY,
  width,
}: UseGestureViewerPagingArgs): UseGestureViewerPagingResult {
  const webScrollRuntimeRef = useRef<WebScrollRuntime>({
    actor: 'idle',
    isAutoplayPausedByUser: false,
    lastSettledPhysicalIndex: adjustedInitialIndex,
    latestOffsetX: adjustedInitialIndex * (width + itemSpacing),
    latestRawPhysicalIndex: adjustedInitialIndex,
    lastProgrammaticScrollVersion: 0,
    settleTimer: null,
    resumeAutoplayTimer: null,
  });

  const clearWebSettleTimer = useCallback(() => {
    const runtime = webScrollRuntimeRef.current;

    if (runtime.settleTimer) {
      clearTimeout(runtime.settleTimer);
      runtime.settleTimer = null;
    }
  }, []);

  const clearWebAutoplayResumeTimer = useCallback(() => {
    const runtime = webScrollRuntimeRef.current;

    if (runtime.resumeAutoplayTimer) {
      clearTimeout(runtime.resumeAutoplayTimer);
      runtime.resumeAutoplayTimer = null;
    }
  }, []);

  const scheduleWebAutoplayResume = useCallback(() => {
    const runtime = webScrollRuntimeRef.current;

    clearWebAutoplayResumeTimer();
    runtime.resumeAutoplayTimer = setTimeout(() => {
      runtime.isAutoplayPausedByUser = false;
      runtime.resumeAutoplayTimer = null;
    }, 800);
  }, [clearWebAutoplayResumeTimer]);

  const pauseWebAutoplayWithoutPagingInteraction = useCallback(() => {
    const runtime = webScrollRuntimeRef.current;

    runtime.isAutoplayPausedByUser = true;
    runtime.actor = 'idle';
    clearWebAutoplayResumeTimer();
  }, [clearWebAutoplayResumeTimer]);

  const beginWebUserInteraction = useCallback(
    (force = false) => {
      const runtime = webScrollRuntimeRef.current;

      if (!force && runtime.actor === 'autoplay') {
        return;
      }

      runtime.actor = 'user';
      runtime.isAutoplayPausedByUser = true;
      clearWebAutoplayResumeTimer();
    },
    [clearWebAutoplayResumeTimer],
  );

  const beginWebAutoplayScroll = useCallback(() => {
    const runtime = webScrollRuntimeRef.current;

    runtime.actor = 'autoplay';
    runtime.isAutoplayPausedByUser = false;
    runtime.lastProgrammaticScrollVersion = manager?.getProgrammaticScrollVersion() ?? 0;
    clearWebAutoplayResumeTimer();
  }, [clearWebAutoplayResumeTimer, manager]);

  const syncProgrammaticActorFromManager = useCallback(() => {
    const runtime = webScrollRuntimeRef.current;
    const nextVersion = manager?.getProgrammaticScrollVersion() ?? 0;

    if (nextVersion === runtime.lastProgrammaticScrollVersion) {
      return;
    }

    runtime.actor = 'autoplay';
    runtime.isAutoplayPausedByUser = false;
    runtime.lastProgrammaticScrollVersion = nextVersion;
    clearWebAutoplayResumeTimer();
  }, [clearWebAutoplayResumeTimer, manager]);

  const finalizeWebScroll = useCallback(
    (offsetX: number, source: 'scroll' | 'momentum' = 'scroll') => {
      if (!enableHorizontalSwipe || dataLength <= 0) {
        return;
      }

      const runtime = webScrollRuntimeRef.current;
      const settledByActor = runtime.actor;

      clearWebSettleTimer();
      runtime.latestOffsetX = offsetX;

      const settledState = resolveWebScrollFinalState({
        dataLength,
        enableLoop,
        lastSettledPhysicalIndex: runtime.lastSettledPhysicalIndex,
        offsetX,
        pageWidth: width + itemSpacing,
      });

      if (!settledState) {
        return;
      }

      const { logicalIndex, rawPhysicalIndex, settledPhysicalIndex } = settledState;

      if (source === 'scroll' && runtime.latestRawPhysicalIndex !== rawPhysicalIndex) {
        return;
      }

      if (rawPhysicalIndex !== settledPhysicalIndex) {
        const crossedLoopBoundary =
          enableLoop &&
          dataLength > 1 &&
          (rawPhysicalIndex === 0 || rawPhysicalIndex === dataLength + 1);

        scrollTo(settledPhysicalIndex, !crossedLoopBoundary);
      }

      runtime.lastSettledPhysicalIndex = settledPhysicalIndex;
      runtime.latestOffsetX = settledPhysicalIndex * (width + itemSpacing);
      runtime.actor = 'idle';
      manager?.cancelPendingLoopTransition();
      syncCurrentIndex(logicalIndex);

      if (settledByActor === 'user') {
        scheduleWebAutoplayResume();
      }
    },
    [
      clearWebSettleTimer,
      dataLength,
      enableHorizontalSwipe,
      enableLoop,
      itemSpacing,
      manager,
      scheduleWebAutoplayResume,
      scrollTo,
      syncCurrentIndex,
      width,
    ],
  );

  const scheduleWebScrollSettle = useCallback(
    (offsetX: number) => {
      const runtime = webScrollRuntimeRef.current;

      runtime.latestOffsetX = offsetX;
      runtime.latestRawPhysicalIndex = getWebScrollPhysicalIndex(offsetX, width + itemSpacing);
      clearWebSettleTimer();
      runtime.settleTimer = setTimeout(() => {
        finalizeWebScroll(runtime.latestOffsetX, 'scroll');
      }, 180);
    },
    [clearWebSettleTimer, finalizeWebScroll, itemSpacing, width],
  );

  useEffect(() => {
    const runtime = webScrollRuntimeRef.current;

    runtime.actor = 'idle';
    runtime.isAutoplayPausedByUser = false;
    runtime.lastSettledPhysicalIndex = adjustedInitialIndex;
    runtime.latestOffsetX = adjustedInitialIndex * (width + itemSpacing);
    runtime.latestRawPhysicalIndex = adjustedInitialIndex;
    runtime.lastProgrammaticScrollVersion = manager?.getProgrammaticScrollVersion() ?? 0;
    clearWebSettleTimer();
    clearWebAutoplayResumeTimer();
  }, [
    adjustedInitialIndex,
    clearWebAutoplayResumeTimer,
    clearWebSettleTimer,
    itemSpacing,
    manager,
    width,
  ]);

  useEffect(() => {
    return () => {
      clearWebSettleTimer();
      clearWebAutoplayResumeTimer();
    };
  }, [clearWebAutoplayResumeTimer, clearWebSettleTimer]);

  useEffect(() => {
    if (
      !autoPlay ||
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

      const runtime = webScrollRuntimeRef.current;

      if (runtime.actor !== 'idle' || runtime.isAutoplayPausedByUser || runtime.settleTimer) {
        return;
      }

      const targetPhysicalIndex = getWebAutoPlayTargetPhysicalIndex({
        currentIndex,
        dataLength,
        enableLoop,
      });

      if (targetPhysicalIndex === null) {
        return;
      }

      beginWebAutoplayScroll();
      runtime.latestOffsetX = targetPhysicalIndex * (width + itemSpacing);
      scrollTo(targetPhysicalIndex, true);
      scheduleWebScrollSettle(runtime.latestOffsetX);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    autoPlay,
    autoPlayInterval,
    beginWebAutoplayScroll,
    currentIndex,
    dataLength,
    enableLoop,
    isRotated,
    isZoomed,
    itemSpacing,
    scheduleWebScrollSettle,
    scrollTo,
    width,
  ]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableHorizontalSwipe) {
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const runtime = webScrollRuntimeRef.current;
      const pendingState = resolveWebScrollFinalState({
        dataLength,
        enableLoop,
        lastSettledPhysicalIndex: runtime.lastSettledPhysicalIndex,
        offsetX,
        pageWidth: width + itemSpacing,
      });

      if (pendingState) {
        syncPendingIndex(pendingState.logicalIndex);
      }

      syncProgrammaticActorFromManager();
      beginWebUserInteraction();
      scheduleWebScrollSettle(offsetX);
    },
    [
      beginWebUserInteraction,
      dataLength,
      enableHorizontalSwipe,
      enableLoop,
      itemSpacing,
      scheduleWebScrollSettle,
      syncPendingIndex,
      syncProgrammaticActorFromManager,
      width,
    ],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableHorizontalSwipe) {
        return;
      }

      finalizeWebScroll(event.nativeEvent.contentOffset.x, 'momentum');
    },
    [enableHorizontalSwipe, finalizeWebScroll],
  );

  const onScrollBeginDrag = useCallback(() => {
    beginWebUserInteraction(true);
    clearWebSettleTimer();
    manager?.handleScrollBeginDrag();
  }, [beginWebUserInteraction, clearWebSettleTimer, manager]);

  const onWebDoubleClick = useCallback(
    (event: any) => {
      if (!enableDoubleTapZoom || event?.nativeEvent?.detail !== 2) {
        return;
      }

      pauseWebAutoplayWithoutPagingInteraction();
      scheduleWebAutoplayResume();

      const nativeEvent = event?.nativeEvent;
      const eventTarget = event?.currentTarget ?? nativeEvent?.currentTarget ?? nativeEvent?.target;
      let locationX = nativeEvent?.locationX;
      let locationY = nativeEvent?.locationY;

      if (
        (!Number.isFinite(locationX) || !Number.isFinite(locationY)) &&
        typeof eventTarget?.getBoundingClientRect === 'function' &&
        Number.isFinite(nativeEvent?.clientX) &&
        Number.isFinite(nativeEvent?.clientY)
      ) {
        const rect = eventTarget.getBoundingClientRect();

        locationX = nativeEvent.clientX - rect.left;
        locationY = nativeEvent.clientY - rect.top;
      }

      applyTapZoomAtPoint({
        x: Number.isFinite(locationX) ? locationX : width / 2,
        y: Number.isFinite(locationY) ? locationY : height / 2,
        width,
        height,
        maxZoomScale,
        scale,
        translateX,
        translateY,
      });
    },
    [
      enableDoubleTapZoom,
      height,
      maxZoomScale,
      pauseWebAutoplayWithoutPagingInteraction,
      scheduleWebAutoplayResume,
      scale,
      translateX,
      translateY,
      width,
    ],
  );

  return {
    onMomentumScrollEnd,
    onScroll,
    onScrollBeginDrag,
    onWebDoubleClick,
  };
}
