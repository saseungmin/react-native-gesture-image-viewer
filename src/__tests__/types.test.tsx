import { FlatList, Text } from 'react-native';

import type {
  GestureViewerItemDimensions,
  GestureViewerItemDimensionsResolver,
  GestureViewerItemKeyResolver,
  GestureViewerProps,
} from '../types';

type Photo = {
  id: string;
  width?: number;
  height?: number;
};

const externalDimensions = new Map<string, GestureViewerItemDimensions>([
  ['remote://one', { height: 616, width: 393 }],
]);

describe('public item dimensions types', () => {
  it('allow string items to resolve dimensions from an external map', () => {
    const getStringItemDimensions: GestureViewerItemDimensionsResolver<string> = (item) =>
      externalDimensions.get(item);
    const props: GestureViewerProps<string, typeof FlatList> = {
      data: ['remote://one'],
      getItemDimensions: getStringItemDimensions,
      ListComponent: FlatList,
      renderItem: (item) => <Text>{item}</Text>,
    };

    expect(props.getItemDimensions?.('remote://one', 0)).toEqual({
      height: 616,
      width: 393,
    });
  });

  it('allow optional item dimensions to fall back until a type guard succeeds', () => {
    const getPhotoDimensions: GestureViewerItemDimensionsResolver<Photo> = (item) => {
      if (item.width === undefined || item.height === undefined) {
        return undefined;
      }

      return {
        height: item.height,
        width: item.width,
      };
    };
    const props: GestureViewerProps<Photo, typeof FlatList> = {
      data: [{ id: 'unknown' }],
      getItemDimensions: getPhotoDimensions,
      ListComponent: FlatList,
      renderItem: (item, _index, { isActive }) => (
        <Text>{`${item.id}:${isActive ? 'active' : 'inactive'}`}</Text>
      ),
    };

    expect(props.getItemDimensions?.({ id: 'unknown' }, 0)).toBeUndefined();
  });

  it('allow stable keys for recreated object items with runtime dimensions', () => {
    const getItemKey: GestureViewerItemKeyResolver<Photo> = (item) => item.id;
    const props: GestureViewerProps<Photo, typeof FlatList> = {
      data: [{ id: 'photo' }],
      getItemKey,
      ListComponent: FlatList,
      renderItem: (item) => <Text>{item.id}</Text>,
    };

    expect(props.getItemKey?.({ id: 'photo' }, 0)).toBe('photo');
  });

  it('keep render callbacks valid when consumers only read the active flag', () => {
    const renderItem: GestureViewerProps<Photo, typeof FlatList>['renderItem'] = (
      _item,
      _index,
      { isActive },
    ) => <Text>{isActive ? 'active' : 'inactive'}</Text>;

    expect(
      renderItem({ id: 'photo' }, 0, { isActive: true, setItemDimensions: jest.fn() }),
    ).toEqual(expect.any(Object));
  });
});
