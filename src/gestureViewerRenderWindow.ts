import {
  type RenderWindowSlot,
  clampIndex,
  createRenderWindow,
  getVirtualIndexForLogicalIndex,
  normalizeWindowSize,
} from './renderWindow';

export type GestureViewerRenderWindowState<ItemT> = {
  centerVirtualIndex: number;
  currentIndex: number;
  slots: RenderWindowSlot<ItemT>[];
};

export function resolveGestureViewerRenderWindow<ItemT>({
  centerVirtualIndex,
  currentIndex,
  data,
  enableLoop,
  isTriggerOpening,
  windowSize,
}: {
  centerVirtualIndex: number;
  currentIndex: number;
  data: ItemT[];
  enableLoop: boolean;
  isTriggerOpening: boolean;
  windowSize?: number;
}): GestureViewerRenderWindowState<ItemT> {
  const dataLength = data.length;
  const normalizedWindowSize = normalizeWindowSize(windowSize);
  const renderCurrentIndex = clampIndex(currentIndex, dataLength);
  const renderCenterVirtualIndex =
    getVirtualIndexForLogicalIndex(
      renderCurrentIndex,
      centerVirtualIndex,
      dataLength,
      enableLoop,
    ) ?? renderCurrentIndex;

  const fullSlots = createRenderWindow({
    centerVirtualIndex: renderCenterVirtualIndex,
    data,
    enableLoop,
    windowSize: normalizedWindowSize,
  });
  const slots = isTriggerOpening
    ? fullSlots.filter((slot) => slot.virtualIndex === renderCenterVirtualIndex)
    : fullSlots;

  return {
    centerVirtualIndex: renderCenterVirtualIndex,
    currentIndex: renderCurrentIndex,
    slots,
  };
}
