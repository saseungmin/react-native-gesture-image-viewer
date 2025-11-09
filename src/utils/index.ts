import { FlatList as RNFlatList, ScrollView as RNScrollView } from 'react-native';
import { FlatList as GestureFlatList, ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import type { FlatListComponent, ScrollViewComponent } from '../types';
import { FlashList } from './FlashList';

export const isScrollViewLike = (component: React.ComponentType<any>): component is ScrollViewComponent => {
  return component === RNScrollView || component === GestureScrollView;
};

export const isFlatListLike = (component: React.ComponentType<any>): component is FlatListComponent<any> => {
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

export const createBoundsConstraint =
  ({ width, height }: { width: number; height: number }) =>
  ({ scale, translateX, translateY }: { translateX: number; translateY: number; scale: number }) => {
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

  const lastItem = data[data.length - 1];
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
    return { realIndex: scrollIndex, needsJump: false };
  }

  if (scrollIndex === 0) {
    return {
      realIndex: originalDataLength - 1,
      needsJump: true,
      jumpToIndex: originalDataLength,
    };
  } else if (scrollIndex === originalDataLength + 1) {
    return {
      realIndex: 0,
      needsJump: true,
      jumpToIndex: 1,
    };
  }

  return { realIndex: scrollIndex - 1, needsJump: false };
};

export const createScrollAction = (listRef: any, width: number) => ({
  scrollTo: (index: number, animated: boolean) => {
    if (listRef?.scrollToIndex) {
      listRef.scrollToIndex({ index, animated });
    } else if (listRef?.scrollTo) {
      listRef.scrollTo({ x: index * width, animated });
    }
  },
});
