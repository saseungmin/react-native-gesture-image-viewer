import { useCallback, useEffect } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import type {
  UseGestureViewerPagingArgs,
  UseGestureViewerPagingResult,
} from './useGestureViewerPaging.types';
import { getLoopAdjustedIndex } from './utils';

export function useGestureViewerPaging({
  autoPlay,
  autoPlayInterval,
  currentIndex,
  dataLength,
  enableHorizontalSwipe,
  enableLoop,
  isRotated,
  isZoomed,
  itemSpacing,
  manager,
  scrollTo,
  syncCurrentIndex,
  width,
}: UseGestureViewerPagingArgs): UseGestureViewerPagingResult {
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
  }, [
    autoPlay,
    autoPlayInterval,
    currentIndex,
    dataLength,
    enableLoop,
    isRotated,
    isZoomed,
    manager,
  ]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enableHorizontalSwipe) {
        return;
      }

      const { contentOffset } = event.nativeEvent;
      const scrollIndex = Math.round(contentOffset.x / (width + itemSpacing));

      const isLoopHandled = manager?.handleMomentumScrollEnd(scrollIndex);

      if (isLoopHandled) {
        return;
      }

      const { realIndex, needsJump, jumpToIndex } = getLoopAdjustedIndex(
        scrollIndex,
        dataLength,
        enableLoop,
      );

      if (needsJump && jumpToIndex !== undefined) {
        scrollTo(jumpToIndex, false);
      }

      syncCurrentIndex(realIndex);
    },
    [
      dataLength,
      enableHorizontalSwipe,
      enableLoop,
      itemSpacing,
      manager,
      scrollTo,
      syncCurrentIndex,
      width,
    ],
  );

  const onScrollBeginDrag = useCallback(() => {
    manager?.handleScrollBeginDrag();
  }, [manager]);

  return {
    onMomentumScrollEnd,
    onScroll: undefined,
    onScrollBeginDrag,
    onWebDoubleClick: undefined,
  };
}
