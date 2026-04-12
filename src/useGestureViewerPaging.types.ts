import type { ScrollViewProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type GestureViewerManager from './GestureViewerManager';

export type UseGestureViewerPagingArgs = {
  adjustedInitialIndex: number;
  autoPlay: boolean;
  autoPlayInterval: number;
  currentIndex: number;
  dataLength: number;
  enableDoubleTapZoom: boolean;
  enableHorizontalSwipe: boolean;
  enableLoop: boolean;
  height: number;
  isRotated: boolean;
  isZoomed: boolean;
  itemSpacing: number;
  manager: GestureViewerManager | null;
  maxZoomScale: number;
  scale: SharedValue<number>;
  scrollTo: (index: number, animated: boolean) => void;
  syncCurrentIndex: (nextIndex: number) => void;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  width: number;
};

export type UseGestureViewerPagingResult = {
  onMomentumScrollEnd?: ScrollViewProps['onMomentumScrollEnd'];
  onScroll?: ScrollViewProps['onScroll'];
  onScrollBeginDrag?: ScrollViewProps['onScrollBeginDrag'];
  onWebDoubleClick?: (event: any) => void;
};
