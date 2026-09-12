import { act, cleanup, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { GestureViewer } from '../GestureViewer';
import type { GestureViewerProps } from '../types';

const mockPruneItemDimensionsRegistry = jest.fn();
const mockResolveItemDimensions = jest.fn();

jest.mock('../itemDimensions', () => {
  const actual = jest.requireActual('../itemDimensions');

  return {
    ...actual,
    pruneItemDimensionsRegistry: (registry: unknown, dataLength: unknown) => {
      mockPruneItemDimensionsRegistry(registry, dataLength);
      return actual.pruneItemDimensionsRegistry(registry, dataLength);
    },
    resolveItemDimensions: (options: unknown) => {
      mockResolveItemDimensions(options);
      return actual.resolveItemDimensions(options);
    },
  };
});

const stableData = ['first', 'second'];

const renderItem: GestureViewerProps<string>['renderItem'] = (item) => <Text>{item}</Text>;
const renderObjectItem: GestureViewerProps<{ id: string }>['renderItem'] = (item) => (
  <Text>{item.id}</Text>
);

describe('item dimensions lifecycle', () => {
  beforeEach(() => {
    mockPruneItemDimensionsRegistry.mockClear();
    mockResolveItemDimensions.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('prunes registered dimensions only when the committed data length changes', async () => {
    const initialGetter = jest.fn(() => ({ height: 200, width: 100 }));
    const nextGetter = jest.fn(() => ({ height: 200, width: 100 }));

    const rendered = await render(
      <GestureViewer
        data={stableData}
        getItemDimensions={initialGetter}
        height={240}
        id="dimensions-lifecycle"
        renderItem={renderItem}
        width={320}
      />,
    );

    await act(async () => {
      await rendered.rerender(
        <GestureViewer
          data={stableData}
          getItemDimensions={nextGetter}
          height={240}
          id="dimensions-lifecycle"
          renderItem={renderItem}
          width={360}
        />,
      );
    });

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(1);
    expect(mockPruneItemDimensionsRegistry).toHaveBeenLastCalledWith(expect.any(Map), 2);

    const sameLengthData = [...stableData];

    await act(async () => {
      await rendered.rerender(
        <GestureViewer
          data={sameLengthData}
          getItemDimensions={nextGetter}
          height={240}
          id="dimensions-lifecycle"
          renderItem={renderItem}
          width={360}
        />,
      );
    });

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(1);

    await act(async () => {
      await rendered.rerender(
        <GestureViewer
          data={sameLengthData.slice(0, 1)}
          getItemDimensions={nextGetter}
          height={240}
          id="dimensions-lifecycle"
          renderItem={renderItem}
          width={360}
        />,
      );
    });

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(2);
    expect(mockPruneItemDimensionsRegistry).toHaveBeenLastCalledWith(expect.any(Map), 1);
    expect(mockResolveItemDimensions).toHaveBeenCalledWith(
      expect.objectContaining({
        data: sameLengthData,
        getItemDimensions: nextGetter,
        index: 0,
      }),
    );
  });

  it('syncs with the current getItemKey resolver when data rerenders', async () => {
    const firstData = [{ id: 'first' }];
    const secondData = [{ id: 'second' }];
    const firstGetter = jest.fn(() => ({ height: 100, width: 100 }));
    const secondGetter = jest.fn(() => ({ height: 200, width: 100 }));
    const firstKeyResolver = jest.fn((item: { id: string }) => item.id);
    const secondKeyResolver = jest.fn((item: { id: string }) => item.id);

    const rendered = await render(
      <GestureViewer
        data={firstData}
        getItemDimensions={firstGetter}
        getItemKey={firstKeyResolver}
        height={240}
        id="dimensions-current-key"
        renderItem={renderObjectItem}
        width={320}
      />,
    );

    mockResolveItemDimensions.mockClear();

    await act(async () => {
      await rendered.rerender(
        <GestureViewer
          data={secondData}
          getItemDimensions={secondGetter}
          getItemKey={secondKeyResolver}
          height={360}
          id="dimensions-current-key"
          renderItem={renderObjectItem}
          width={480}
        />,
      );
    });

    expect(mockResolveItemDimensions).toHaveBeenCalledTimes(1);
    expect(mockResolveItemDimensions).toHaveBeenCalledWith(
      expect.objectContaining({
        data: secondData,
        getItemDimensions: secondGetter,
        getItemKey: secondKeyResolver,
        index: 0,
      }),
    );
  });

  it('syncs with current data and getter when data and viewport commit together', async () => {
    const firstData = ['first'];
    const secondData = ['second'];
    const firstGetter = jest.fn(() => ({ height: 100, width: 100 }));
    const secondGetter = jest.fn(() => ({ height: 200, width: 100 }));

    const rendered = await render(
      <GestureViewer
        data={firstData}
        getItemDimensions={firstGetter}
        height={240}
        id="dimensions-combined-commit"
        renderItem={renderItem}
        width={320}
      />,
    );

    mockResolveItemDimensions.mockClear();

    await act(async () => {
      await rendered.rerender(
        <GestureViewer
          data={secondData}
          getItemDimensions={secondGetter}
          height={360}
          id="dimensions-combined-commit"
          renderItem={renderItem}
          width={480}
        />,
      );
    });

    expect(mockResolveItemDimensions).toHaveBeenCalledTimes(1);
    expect(mockResolveItemDimensions).toHaveBeenCalledWith(
      expect.objectContaining({
        data: secondData,
        getItemDimensions: secondGetter,
        index: 0,
      }),
    );
  });
});
