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
import { getTranslationBounds } from './translationBounds';

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

export const resolveGeometrySyncTranslationMode = (
  previousIndex: number | null,
  nextIndex: number,
  scale: number,
): 'constrain' | 'none' | 'reset' => {
  if (previousIndex !== null && previousIndex !== nextIndex) {
    return 'reset';
  }

  return scale > 1 ? 'constrain' : 'none';
};

const clampTranslation = (value: number, max: number, overflow = 0): number => {
  'worklet';
  if (max <= 0) {
    return 0;
  }
  // While holding a rubber-band, retain only the overshoot captured at touch-down.
  const min = -max + Math.min(0, overflow);
  const upper = max + Math.max(0, overflow);
  const result = Math.max(min, Math.min(upper, value));
  return result === 0 ? 0 : result;
};

export const clampTranslationToBounds = ({
  width,
  height,
  contentWidth,
  contentHeight,
  scale,
  translateX,
  translateY,
  overflowX = 0,
  overflowY = 0,
}: {
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  translateX: number;
  translateY: number;
  scale: number;
  overflowX?: number;
  overflowY?: number;
}) => {
  'worklet';

  if (scale <= 1) {
    return {
      translateX,
      translateY,
    };
  }

  const { maxTranslateX, maxTranslateY } = getTranslationBounds({
    width,
    height,
    contentWidth,
    contentHeight,
    scale,
  });

  return {
    translateX: clampTranslation(translateX, maxTranslateX, overflowX),
    translateY: clampTranslation(translateY, maxTranslateY, overflowY),
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
