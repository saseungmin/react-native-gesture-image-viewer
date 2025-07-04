import { FlatList as RNFlatList, ScrollView as RNScrollView } from 'react-native';
import { FlatList as GestureFlatList, ScrollView as GestureScrollView } from 'react-native-gesture-handler';

export const isScrollViewLike = (component: any): component is typeof RNScrollView => {
  return component === RNScrollView || component === GestureScrollView;
};

export const isFlatListLike = (component: any): component is typeof RNFlatList => {
  try {
    const FlashList = require('@shopify/flash-list')?.FlashList;

    if (FlashList && component === FlashList) {
      return true;
    }
  } catch {
    // do nothing
  }

  if (component === RNFlatList || component === GestureFlatList) {
    return true;
  }

  return component?.name === 'FlashList';
};
