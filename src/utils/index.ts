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

export const createBoundsConstraint =
  ({ width, height }: { width: number; height: number }) =>
  ({
    scale,
    translateX,
    translateY,
  }: {
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

    const maxTranslateX = (width * scale - width) / 2;
    const maxTranslateY = (height * scale - height) / 2;

    return {
      translateX: Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX)),
      translateY: Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY)),
    };
  };

export const createLoopData = <T>(dataRef: React.RefObject<T[]>, enableLoop: boolean): T[] => {
  const data = dataRef.current;

  if (!enableLoop || !data?.length || data.length <= 1) {
    return data;
  }

  const lastItem = data.at(-1);
  const firstItem = data[0];

  if (lastItem === undefined || firstItem === undefined) {
    return data;
  }

  return [lastItem, ...data, firstItem];
};

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
