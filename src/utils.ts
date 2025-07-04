import { FlatList as RNFlatList, ScrollView as RNScrollView } from 'react-native';
import { FlatList as GestureFlatList, ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import type { FlatListComponent, ScrollViewComponent } from './types';

export const isScrollViewLike = (component: any): component is ScrollViewComponent => {
  return component === RNScrollView || component === GestureScrollView;
};

export const isFlatListLike = (component: any): component is FlatListComponent => {
  if (component === RNFlatList || component === GestureFlatList || isFlashListLike(component)) {
    return true;
  }

  return false;
};

export const isFlashListLike = (component: any): component is any => {
  try {
    const FlashList = require('@shopify/flash-list')?.FlashList;

    if (FlashList && component === FlashList) {
      return true;
    }
  } catch {
    // do nothing
  }

  return component?.name === 'FlashList';
};
