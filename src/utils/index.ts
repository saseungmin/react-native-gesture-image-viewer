import {
  FlatList as RNFlatList,
  ScrollView as RNScrollView,
  type PlatformOSType,
} from 'react-native';
import {
  FlatList as GestureFlatList,
  ScrollView as GestureScrollView,
} from 'react-native-gesture-handler';

import type { FlatListComponent, ScrollViewComponent } from '../types';

import { FlashList } from './FlashList';

export const isScrollViewLike = (
  component: React.ComponentType<any>,
): component is ScrollViewComponent =>
  component === RNScrollView || component === GestureScrollView;

export const isFlatListLike = (
  component: React.ComponentType<any>,
): component is FlatListComponent<any> => {
  if (component === RNFlatList || component === GestureFlatList || isFlashListLike(component)) {
    return true;
  }

  return false;
};

export const isFlashListLike = (component: React.ComponentType<any>): boolean => {
  if (FlashList && component === FlashList) {
    return true;
  }

  return component?.displayName === 'FlashList' || component?.name === 'FlashList';
};

/**
 * iOS needs the extra Native gesture wrapper so the dismiss pan can resolve before the scrollable claims touches.
 * We intentionally skip Android because the same require-to-fail relation regressed horizontal paging there,
 * and we also avoid wrapping RNGH-provided scrollables to prevent double-applying Gesture.Native() to components that already participate in RNGH.
 */
export const shouldUseNativeScrollGesture = (
  platformOS: PlatformOSType,
  component: React.ComponentType<any>,
): boolean => {
  return platformOS === 'ios' && component !== GestureScrollView && component !== GestureFlatList;
};

export const clampIndex = (index: number | undefined, dataLength: number): number => {
  if (dataLength <= 0) {
    return 0;
  }

  const candidateIndex = index ?? 0;

  if (!Number.isFinite(candidateIndex)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(candidateIndex), 0), dataLength - 1);
};

const isValidDimension = (value: number): boolean => {
  'worklet';

  return Number.isFinite(value) && value > 0;
};

const clampTranslation = (value: number, max: number): number => {
  'worklet';

  if (max <= 0) {
    return 0;
  }

  const clamped = Math.max(-max, Math.min(max, value));

  return clamped === 0 ? 0 : clamped;
};

export const clampTranslationToBounds = ({
  width,
  height,
  contentWidth,
  contentHeight,
  scale,
  translateX,
  translateY,
}: {
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  translateX: number;
  translateY: number;
  scale: number;
}) => {
  'worklet';

  if (scale <= 1) {
    return {
      translateX,
      translateY,
    };
  }

  const baseContentWidth =
    contentWidth !== undefined && isValidDimension(contentWidth) ? contentWidth : width;
  const baseContentHeight =
    contentHeight !== undefined && isValidDimension(contentHeight) ? contentHeight : height;

  const maxTranslateX = Math.max(0, (baseContentWidth * scale - width) / 2);
  const maxTranslateY = Math.max(0, (baseContentHeight * scale - height) / 2);

  return {
    translateX: clampTranslation(translateX, maxTranslateX),
    translateY: clampTranslation(translateY, maxTranslateY),
  };
};

export const createLoopData = <T>(data: T[], enableLoop: boolean): T[] => {
  if (!enableLoop || data.length <= 1) {
    return data;
  }

  const lastItem = data.at(-1);
  const firstItem = data[0];

  if (lastItem === undefined || firstItem === undefined) {
    return data;
  }

  return [lastItem, ...data, firstItem];
};

export const getLoopPhysicalIndex = (
  logicalIndex: number,
  dataLength: number,
  enableLoop: boolean,
): number => (enableLoop && dataLength > 1 ? logicalIndex + 1 : logicalIndex);

export const getLoopAdjustedIndex = (
  scrollIndex: number,
  originalDataLength: number,
  enableLoop: boolean,
): { realIndex: number; needsJump: boolean; jumpToIndex?: number } => {
  if (!enableLoop || originalDataLength <= 1) {
    return { needsJump: false, realIndex: scrollIndex };
  }

  if (scrollIndex === 0) {
    return {
      jumpToIndex: originalDataLength,
      needsJump: true,
      realIndex: originalDataLength - 1,
    };
  } else if (scrollIndex === originalDataLength + 1) {
    return {
      jumpToIndex: 1,
      needsJump: true,
      realIndex: 0,
    };
  }

  return { needsJump: false, realIndex: scrollIndex - 1 };
};

export const createScrollAction = (listRef: any, width: number) => ({
  scrollTo: (index: number, animated: boolean) => {
    if (listRef?.scrollToIndex) {
      listRef.scrollToIndex({ animated, index });
    } else if (listRef?.scrollTo) {
      listRef.scrollTo({ animated, x: index * width });
    }
  },
});
