import { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { ScheduleWebSingleTap } from './useWebSingleTapTimer';
import { applyTapZoomAtPoint } from './utils/tapZoom';

export type WebTapTarget<ItemT> = {
  index: number;
  item: ItemT;
};

export type WebClickEvent = {
  clientX: number;
  clientY: number;
  currentTarget: {
    getBoundingClientRect: () => {
      left: number;
      top: number;
    };
  };
  detail: number;
};

export type WebClickHandler = (event: WebClickEvent) => void;

export type EmitSingleTap<ItemT> = (x: number, y: number, tapTarget?: WebTapTarget<ItemT>) => void;

export type WebClickHandlerConfig<ItemT> = {
  clearPendingWebSingleTap: () => void;
  contentHeight: SharedValue<number>;
  contentWidth: SharedValue<number>;
  emitSingleTap: EmitSingleTap<ItemT>;
  enableDoubleTapZoom: boolean;
  getCurrentTapTarget: () => WebTapTarget<ItemT> | null;
  height: number;
  isInteractionLocked: () => boolean;
  maxZoomScale: number;
  scale: SharedValue<number>;
  scheduleWebSingleTap: ScheduleWebSingleTap;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  width: number;
};

export function createWebClickHandler<ItemT>({
  clearPendingWebSingleTap,
  contentHeight,
  contentWidth,
  emitSingleTap,
  enableDoubleTapZoom,
  getCurrentTapTarget,
  height,
  isInteractionLocked,
  maxZoomScale,
  scale,
  scheduleWebSingleTap,
  translateX,
  translateY,
  width,
}: WebClickHandlerConfig<ItemT>): WebClickHandler {
  return (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isInteractionLocked()) {
      clearPendingWebSingleTap();
      return;
    }

    const tapTarget = getCurrentTapTarget();

    if (!tapTarget) {
      return;
    }

    if (!enableDoubleTapZoom) {
      emitSingleTap(x, y, tapTarget);
      return;
    }

    if (event.detail === 2) {
      clearPendingWebSingleTap();
      applyTapZoomAtPoint({
        contentHeight: contentHeight.get(),
        contentWidth: contentWidth.get(),
        x,
        y,
        width,
        height,
        maxZoomScale,
        scale,
        translateX,
        translateY,
      });
      return;
    }

    if (event.detail === 1) {
      scheduleWebSingleTap(() => {
        emitSingleTap(x, y, tapTarget);
      });
    }
  };
}

export function useWebClickHandler<ItemT>({
  clearPendingWebSingleTap,
  contentHeight,
  contentWidth,
  emitSingleTap,
  enableDoubleTapZoom,
  getCurrentTapTarget,
  height,
  isInteractionLocked,
  maxZoomScale,
  scale,
  scheduleWebSingleTap,
  translateX,
  translateY,
  width,
}: WebClickHandlerConfig<ItemT>): WebClickHandler {
  return useMemo(
    () =>
      createWebClickHandler({
        clearPendingWebSingleTap,
        contentHeight,
        contentWidth,
        emitSingleTap,
        enableDoubleTapZoom,
        getCurrentTapTarget,
        height,
        isInteractionLocked,
        maxZoomScale,
        scale,
        scheduleWebSingleTap,
        translateX,
        translateY,
        width,
      }),
    [
      clearPendingWebSingleTap,
      contentHeight,
      contentWidth,
      emitSingleTap,
      enableDoubleTapZoom,
      getCurrentTapTarget,
      height,
      isInteractionLocked,
      maxZoomScale,
      scale,
      scheduleWebSingleTap,
      translateX,
      translateY,
      width,
    ],
  );
}
