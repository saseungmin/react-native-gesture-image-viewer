import { cleanup, render } from '@testing-library/react-native';
import { forwardRef, memo, useImperativeHandle, type ReactElement } from 'react';
import { Text, View } from 'react-native';

const mockPruneItemDimensionsRegistry = jest.fn();
const mockResolveItemDimensions = jest.fn();

jest.mock('../itemDimensions', () => {
  const actual = jest.requireActual('../itemDimensions');

  return {
    ...actual,
    pruneItemDimensionsRegistry: (
      ...args: Parameters<typeof actual.pruneItemDimensionsRegistry>
    ) => {
      mockPruneItemDimensionsRegistry(...args);

      return actual.pruneItemDimensionsRegistry(...args);
    },
    resolveItemDimensions: (...args: Parameters<typeof actual.resolveItemDimensions>) => {
      mockResolveItemDimensions(...args);

      return actual.resolveItemDimensions(...args);
    },
  };
});

import { GestureViewer } from '../GestureViewer';

type Item = { id: string; width: number; height: number };

type TestListHandle = {
  scrollToIndex: (params: { animated: boolean; index: number }) => void;
};

type TestListProps = {
  data?: readonly Item[];
  renderItem?: (info: { item: Item; index: number; target?: string }) => ReactElement | null;
};

const TestList = memo(
  forwardRef<TestListHandle, TestListProps>(function TestList(props, ref) {
    useImperativeHandle(ref, () => ({ scrollToIndex: jest.fn() }), []);

    return (
      <View>
        {props.data?.map((item, index) => (
          <View key={item.id}>{props.renderItem?.({ item, index })}</View>
        ))}
      </View>
    );
  }),
);

function renderItem(item: Item, index: number) {
  return <Text>{`${index}:${item.id}`}</Text>;
}

describe('item dimensions lifecycle', () => {
  afterEach(async () => {
    await cleanup();
    mockPruneItemDimensionsRegistry.mockClear();
    mockResolveItemDimensions.mockClear();
  });

  it('does not prune on same-length rerenders but prunes on length changes', async () => {
    const first = { id: 'first', width: 393, height: 616 };
    const second = { id: 'second', width: 320, height: 480 };
    const data = [first, second];

    const { rerender } = await render(
      <GestureViewer
        data={data}
        getItemDimensions={(item) => ({ width: item.width, height: item.height })}
        height={480}
        id="dimensions-lifecycle"
        ListComponent={TestList}
        renderItem={renderItem}
        width={320}
      />,
    );

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(1);
    expect(mockPruneItemDimensionsRegistry).toHaveBeenLastCalledWith(expect.any(Map), 2);

    await rerender(
      <GestureViewer
        data={data}
        getItemDimensions={(item) => ({ width: item.width + 1, height: item.height + 1 })}
        height={481}
        id="dimensions-lifecycle"
        ListComponent={TestList}
        renderItem={renderItem}
        width={321}
      />,
    );

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(1);

    await rerender(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={(item) => ({ width: item.width, height: item.height })}
        height={481}
        id="dimensions-lifecycle"
        ListComponent={TestList}
        renderItem={renderItem}
        width={321}
      />,
    );

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(1);

    await rerender(
      <GestureViewer
        data={[first]}
        getItemDimensions={(item) => ({ width: item.width, height: item.height })}
        height={481}
        id="dimensions-lifecycle"
        ListComponent={TestList}
        renderItem={renderItem}
        width={321}
      />,
    );

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(2);
    expect(mockPruneItemDimensionsRegistry).toHaveBeenLastCalledWith(expect.any(Map), 1);
  });

  it('uses the current stable-key resolver after object items are recreated', async () => {
    const firstItem = { id: 'photo', width: 393, height: 616 };
    const recreatedItem = { id: 'photo', width: 393, height: 616 };
    const firstGetItemKey = jest.fn((item: Item) => item.id);
    const nextGetItemKey = jest.fn((item: Item) => item.id);
    const { rerender } = await render(
      <GestureViewer
        data={[firstItem]}
        getItemKey={firstGetItemKey}
        height={480}
        id="item-key-lifecycle"
        ListComponent={TestList}
        renderItem={renderItem}
        width={320}
      />,
    );

    mockResolveItemDimensions.mockClear();

    await rerender(
      <GestureViewer
        data={[recreatedItem]}
        getItemKey={nextGetItemKey}
        height={480}
        id="item-key-lifecycle"
        ListComponent={TestList}
        renderItem={renderItem}
        width={320}
      />,
    );

    expect(mockResolveItemDimensions).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [recreatedItem],
        getItemKey: nextGetItemKey,
        index: 0,
      }),
    );
  });
});
