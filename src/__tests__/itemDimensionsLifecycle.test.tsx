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
    pruneItemDimensionsRegistry: (registry: unknown, data: unknown) => {
      mockPruneItemDimensionsRegistry(registry, data);
      return actual.pruneItemDimensionsRegistry(registry, data);
    },
    resolveItemDimensions: (options: unknown) => {
      mockResolveItemDimensions(options);
      return actual.resolveItemDimensions(options);
    },
  };
});

const stableData = ['first', 'second'];

const renderItem: GestureViewerProps<string>['renderItem'] = (item) => <Text>{item}</Text>;

describe('item dimensions lifecycle', () => {
  beforeEach(() => {
    mockPruneItemDimensionsRegistry.mockClear();
    mockResolveItemDimensions.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('prunes registered dimensions only when the committed data identity changes', async () => {
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

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(1);

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

    await act(async () => {
      await rendered.rerender(
        <GestureViewer
          data={[...stableData]}
          getItemDimensions={nextGetter}
          height={240}
          id="dimensions-lifecycle"
          renderItem={renderItem}
          width={360}
        />,
      );
    });

    expect(mockPruneItemDimensionsRegistry).toHaveBeenCalledTimes(2);
    expect(mockResolveItemDimensions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: stableData,
        getItemDimensions: nextGetter,
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
