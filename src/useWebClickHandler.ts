import { useCallback } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { ScheduleWebSingleTap } from './useWebSingleTapTimer';

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

export type WebClickHandlerConfig<ItemT> = {
  clearPendingWebSingleTap: () => void;
  emitSingleTap: (x: number, y: number, index?: number, item?: ItemT) => void;
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

export function useWebClickHandler<ItemT>(_config: WebClickHandlerConfig<ItemT>): WebClickHandler {
  return useCallback(() => {}, []);
}
