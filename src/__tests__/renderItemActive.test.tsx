import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
  type RenderResult,
} from '@testing-library/react-native';
import { forwardRef, memo, useImperativeHandle, type ReactElement } from 'react';
import {
  Text,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  View,
} from 'react-native';

import { GestureViewer } from '../GestureViewer';
import { registry } from '../GestureViewerRegistry';

type TestListHandle = {
  scrollToIndex: (params: { animated: boolean; index: number }) => void;
};

type TestListProps = {
  data?: readonly string[];
  extraData?: unknown;
  onMomentumScrollEnd?: ScrollViewProps['onMomentumScrollEnd'];
  onScroll?: ScrollViewProps['onScroll'];
  renderItem?: (info: { item: string; index: number; target?: string }) => ReactElement | null;
  renderMeasurement?: boolean;
  renderStickyHeader?: boolean;
};

const PAGE_WIDTH = 320;
const scrollToIndex = jest.fn<
  ReturnType<TestListHandle['scrollToIndex']>,
  Parameters<TestListHandle['scrollToIndex']>
>();

let latestListProps: TestListProps | null = null;

const TestFlashList = memo(
  forwardRef<TestListHandle, TestListProps>(function TestFlashList(props, ref) {
    latestListProps = props;
    useImperativeHandle(ref, () => ({ scrollToIndex }), []);

    const itemOccurrences = new Map<string, number>();

    return (
      <View>
        {props.data?.map((item, index) => {
          const occurrence = itemOccurrences.get(item) ?? 0;

          itemOccurrences.set(item, occurrence + 1);

          return <View key={`${item}-${occurrence}`}>{props.renderItem?.({ item, index })}</View>;
        })}
        {props.renderMeasurement && props.data?.[0] !== undefined ? (
          <View testID="measurement-render">
            {props.renderItem?.({ item: props.data[0], index: 0, target: 'Measurement' })}
          </View>
        ) : null}
        {props.renderStickyHeader && props.data?.[0] !== undefined ? (
          <View testID="sticky-header-render">
            {props.renderItem?.({ item: props.data[0], index: 0, target: 'StickyHeader' })}
          </View>
        ) : null}
      </View>
    );
  }),
);

TestFlashList.displayName = 'FlashList';

function getListProps(): TestListProps {
  if (!latestListProps) {
    throw new Error('The test list has not rendered');
  }

  return latestListProps;
}

function createScrollEvent(offsetX: number): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: {
      contentOffset: { x: offsetX, y: 0 },
    },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

function ActiveItem({ index, isActive }: { index: number; isActive: boolean }): ReactElement {
  return <Text testID={`active-${index}`}>{isActive ? 'active' : 'inactive'}</Text>;
}

function expectActiveStates(states: Array<'active' | 'inactive'>): void {
  states.forEach((state, index) => {
    expect(screen.getByTestId(`active-${index}`).props.children).toBe(state);
  });
}

async function renderActiveViewer({
  data = ['first', 'second', 'third'],
  enableLoop = false,
  id,
  initialIndex = 0,
}: {
  data?: string[];
  enableLoop?: boolean;
  id: string;
  initialIndex?: number;
}): Promise<RenderResult> {
  return render(
    <GestureViewer
      data={data}
      enableLoop={enableLoop}
      height={480}
      id={id}
      initialIndex={initialIndex}
      ListComponent={TestFlashList}
      renderItem={(_item, index, { isActive }) => <ActiveItem index={index} isActive={isActive} />}
      width={PAGE_WIDTH}
    />,
  );
}

describe('GestureViewer renderItem active state', () => {
  afterEach(async () => {
    await cleanup();
    latestListProps = null;
    scrollToIndex.mockClear();
  });

  it('marks only the initial list cell as active', async () => {
    await renderActiveViewer({ id: 'initial-active', initialIndex: 1 });

    expectActiveStates(['inactive', 'active', 'inactive']);
  });

  it('keeps the current cell active until native momentum settles', async () => {
    await renderActiveViewer({ id: 'native-active' });

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH));
    });

    expectActiveStates(['active', 'inactive', 'inactive']);

    await act(async () => {
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH));
    });

    expectActiveStates(['inactive', 'active', 'inactive']);
  });

  it('waits for programmatic scrolling to settle before activating the target cell', async () => {
    const id = 'programmatic-active';

    await renderActiveViewer({ id });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
    });

    await act(async () => {
      registry.getManager(id)?.goToIndex(2);
    });

    expect(scrollToIndex).toHaveBeenCalledWith({ animated: true, index: 2 });
    expectActiveStates(['active', 'inactive', 'inactive']);

    await act(async () => {
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 2));
    });

    expectActiveStates(['inactive', 'inactive', 'active']);
  });

  it('activates one canonical cell after settling through a loop sentinel', async () => {
    await renderActiveViewer({
      data: ['first', 'second'],
      enableLoop: true,
      id: 'loop-active',
      initialIndex: 1,
    });

    expectActiveStates(['inactive', 'inactive', 'active', 'inactive']);

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH * 3));
    });

    expectActiveStates(['inactive', 'inactive', 'active', 'inactive']);

    await act(async () => {
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 3));
    });

    expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 1 });
    expectActiveStates(['inactive', 'active', 'inactive', 'inactive']);
  });

  it('keeps one cell active during a programmatic loop transition', async () => {
    const id = 'programmatic-loop-active';

    await renderActiveViewer({
      data: ['first', 'second'],
      enableLoop: true,
      id,
      initialIndex: 1,
    });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
    });

    await act(async () => {
      registry.getManager(id)?.goToNext();
    });

    expect(scrollToIndex).toHaveBeenCalledWith({ animated: true, index: 3 });
    expectActiveStates(['inactive', 'inactive', 'active', 'inactive']);

    await act(async () => {
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 3));
    });

    expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 1 });
    expectActiveStates(['inactive', 'active', 'inactive', 'inactive']);
  });

  it('activates the settled cell when a programmatic loop transition stops before a sentinel', async () => {
    const id = 'interrupted-programmatic-loop-active';

    await renderActiveViewer({
      data: ['first', 'second'],
      enableLoop: true,
      id,
    });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
    });

    await act(async () => {
      registry.getManager(id)?.goToPrevious();
    });

    expect(scrollToIndex).toHaveBeenCalledWith({ animated: true, index: 0 });
    expectActiveStates(['inactive', 'active', 'inactive', 'inactive']);

    await act(async () => {
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 2));
    });

    expectActiveStates(['inactive', 'inactive', 'active', 'inactive']);
    expect(registry.getManager(id)?.getState().currentIndex).toBe(1);
  });

  it('keeps FlashList measurement and sticky header renders inactive', async () => {
    await render(
      <GestureViewer
        data={['first', 'second']}
        height={480}
        id="measurement-active"
        ListComponent={TestFlashList}
        listProps={{ renderMeasurement: true, renderStickyHeader: true }}
        renderItem={(_item, index, { isActive }) => (
          <ActiveItem index={index} isActive={isActive} />
        )}
        width={PAGE_WIDTH}
      />,
    );

    const measurement = within(screen.getByTestId('measurement-render'));
    const stickyHeader = within(screen.getByTestId('sticky-header-render'));

    expect(measurement.getByTestId('active-0').props.children).toBe('inactive');
    expect(stickyHeader.getByTestId('active-0').props.children).toBe('inactive');
    expect(screen.getAllByText('active')).toHaveLength(1);
  });

  it('keeps two-argument render callbacks and consumer extraData intact', async () => {
    const extraData = { selected: 'consumer-value' };

    await render(
      <GestureViewer
        data={['first', 'second']}
        height={480}
        id="callback-compatibility"
        ListComponent={TestFlashList}
        listProps={{ extraData }}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(screen.getByText('0:first')).toBeTruthy();
    expect(screen.getByText('1:second')).toBeTruthy();
    expect(getListProps().extraData).toBe(extraData);
  });

  it('resolves initial dimensions with the logical data item and index', async () => {
    const first = 'first';
    const second = 'second';
    const dimensionsByItem = new Map([[first, { height: 616, width: 393 }]]);
    const getItemDimensions = jest.fn((item: string) => dimensionsByItem.get(item));

    await render(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={getItemDimensions}
        height={480}
        id="initial-dimensions"
        initialIndex={1}
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(getItemDimensions).toHaveBeenCalledWith(second, 1);
  });

  it('resolves the canonical logical item when loop mode starts on a sentinel-backed page', async () => {
    const first = 'first';
    const second = 'second';
    const getItemDimensions = jest.fn(() => undefined);

    await render(
      <GestureViewer
        data={[first, second]}
        enableLoop
        getItemDimensions={getItemDimensions}
        height={480}
        id="loop-initial-dimensions"
        initialIndex={1}
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(getItemDimensions).toHaveBeenCalledWith(second, 1);
  });

  it('resyncs dimensions when initialIndex changes to a different aspect ratio', async () => {
    const first = 'first';
    const second = 'second';
    const dimensionsByItem = new Map([
      [first, { height: 616, width: 393 }],
      [second, { height: 320, width: 640 }],
    ]);
    const getItemDimensions = jest.fn((item: string) => dimensionsByItem.get(item));

    const { rerender } = await render(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={getItemDimensions}
        height={480}
        id="initial-index-dimensions"
        initialIndex={0}
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    getItemDimensions.mockClear();

    await rerender(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={getItemDimensions}
        height={480}
        id="initial-index-dimensions"
        initialIndex={1}
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(getItemDimensions).toHaveBeenCalledWith(second, 1);
  });

  it('does not resolve dimensions again while scroll events stay on the same logical item', async () => {
    const first = 'first';
    const second = 'second';
    const dimensionsByItem = new Map([
      [first, { height: 616, width: 393 }],
      [second, { height: 480, width: 320 }],
    ]);
    const getItemDimensions = jest.fn((item: string) => dimensionsByItem.get(item));

    await render(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={getItemDimensions}
        height={480}
        id="pending-dimensions-sync"
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(getItemDimensions).toHaveBeenCalledTimes(1);
    expect(getItemDimensions).toHaveBeenLastCalledWith(first, 0);

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(0));
      getListProps().onScroll?.(createScrollEvent(0));
    });

    expect(getItemDimensions).toHaveBeenCalledTimes(1);

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH));
    });

    expect(getItemDimensions).toHaveBeenCalledTimes(2);
    expect(getItemDimensions).toHaveBeenLastCalledWith(second, 1);

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH));
    });

    expect(getItemDimensions).toHaveBeenCalledTimes(2);
  });

  it('keeps the viewed index when config rerenders with unchanged initialIndex', async () => {
    const id = 'unchanged-initial-index-rerender';
    const first = 'first';
    const second = 'second';
    const dimensionsByItem = new Map([
      [first, { height: 616, width: 393 }],
      [second, { height: 480, width: 320 }],
    ]);
    const getItemDimensions = jest.fn((item: string) => dimensionsByItem.get(item));

    const { rerender } = await render(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={getItemDimensions}
        height={480}
        id={id}
        initialIndex={0}
        ListComponent={TestFlashList}
        maxZoomScale={2}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
    });

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH));
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH));
    });

    expect(registry.getManager(id)?.getState().currentIndex).toBe(1);
    expect(getItemDimensions).toHaveBeenLastCalledWith(second, 1);

    getItemDimensions.mockClear();

    await rerender(
      <GestureViewer
        data={[first, second]}
        getItemDimensions={getItemDimensions}
        height={480}
        id={id}
        initialIndex={0}
        ListComponent={TestFlashList}
        maxZoomScale={3}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(registry.getManager(id)?.getState().currentIndex).toBe(1);

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH));
    });

    expect(registry.getManager(id)?.getState().currentIndex).toBe(1);
    expect(getItemDimensions).not.toHaveBeenCalledWith(first, 0);
  });

  it('resets manager state when a data-length change resets the visible page', async () => {
    const id = 'data-length-reset';
    const { rerender } = await renderActiveViewer({ id });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
    });

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH * 2));
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 2));
    });

    expect(registry.getManager(id)?.getState().currentIndex).toBe(2);
    scrollToIndex.mockClear();

    await rerender(
      <GestureViewer
        data={['first']}
        height={480}
        id={id}
        initialIndex={0}
        ListComponent={TestFlashList}
        renderItem={(_item, index, { isActive }) => (
          <ActiveItem index={index} isActive={isActive} />
        )}
        width={PAGE_WIDTH}
      />,
    );

    await waitFor(() => {
      expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 0 });
    });
    expect(registry.getManager(id)?.getState().currentIndex).toBe(0);
  });

  it('keeps loop reset positions physical while manager state stays logical', async () => {
    const id = 'loop-data-length-reset';
    const { rerender } = await renderActiveViewer({
      data: ['first', 'second'],
      enableLoop: true,
      id,
    });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
      expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 1 });
    });

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH * 2));
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 2));
    });

    expect(registry.getManager(id)?.getState().currentIndex).toBe(1);
    scrollToIndex.mockClear();

    await rerender(
      <GestureViewer
        data={['first', 'second', 'third']}
        enableLoop
        height={480}
        id={id}
        initialIndex={0}
        ListComponent={TestFlashList}
        renderItem={(_item, index, { isActive }) => (
          <ActiveItem index={index} isActive={isActive} />
        )}
        width={PAGE_WIDTH}
      />,
    );

    await waitFor(() => {
      expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 1 });
    });
    expect(registry.getManager(id)?.getState().currentIndex).toBe(0);
  });

  it('resets manager state when loop mode is enabled', async () => {
    const id = 'enable-loop-reset';
    const data = ['first', 'second', 'third'];
    const { rerender } = await renderActiveViewer({ data, id });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
    });

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH * 2));
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 2));
    });

    expect(registry.getManager(id)?.getState().currentIndex).toBe(2);
    scrollToIndex.mockClear();

    await rerender(
      <GestureViewer
        data={data}
        enableLoop
        height={480}
        id={id}
        initialIndex={0}
        ListComponent={TestFlashList}
        renderItem={(_item, index, { isActive }) => (
          <ActiveItem index={index} isActive={isActive} />
        )}
        width={PAGE_WIDTH}
      />,
    );

    await waitFor(() => {
      expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 1 });
    });
    expect(registry.getManager(id)?.getState().currentIndex).toBe(0);
  });

  it('resets the physical and logical indexes when loop mode is disabled', async () => {
    const id = 'disable-loop-reset';
    const data = ['first', 'second', 'third'];
    const { rerender } = await renderActiveViewer({ data, enableLoop: true, id });

    await waitFor(() => {
      expect(registry.getManager(id)).not.toBeNull();
      expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 1 });
    });

    await act(async () => {
      getListProps().onScroll?.(createScrollEvent(PAGE_WIDTH * 3));
      getListProps().onMomentumScrollEnd?.(createScrollEvent(PAGE_WIDTH * 3));
    });

    expect(registry.getManager(id)?.getState().currentIndex).toBe(2);
    scrollToIndex.mockClear();

    await rerender(
      <GestureViewer
        data={data}
        enableLoop={false}
        height={480}
        id={id}
        initialIndex={0}
        ListComponent={TestFlashList}
        renderItem={(_item, index, { isActive }) => (
          <ActiveItem index={index} isActive={isActive} />
        )}
        width={PAGE_WIDTH}
      />,
    );

    await waitFor(() => {
      expect(scrollToIndex).toHaveBeenCalledWith({ animated: false, index: 0 });
    });
    expect(registry.getManager(id)?.getState().currentIndex).toBe(0);
  });

  it('supplies a stable item-bound dimensions setter to render callbacks', async () => {
    const data = ['first', 'second'];
    let firstSetter: ((dimensions: { width: number; height: number }) => void) | undefined;
    let latestFirstSetter: ((dimensions: { width: number; height: number }) => void) | undefined;

    const renderItem = (
      item: string,
      index: number,
      {
        setItemDimensions,
      }: { setItemDimensions: (dimensions: { width: number; height: number }) => void },
    ) => {
      if (index === 0) {
        latestFirstSetter = setItemDimensions;
        firstSetter ??= setItemDimensions;
      }

      return <Text>{`${index}:${item}`}</Text>;
    };

    const { rerender } = await render(
      <GestureViewer
        data={data}
        height={480}
        id="dimensions-setter"
        ListComponent={TestFlashList}
        renderItem={renderItem}
        width={PAGE_WIDTH}
      />,
    );

    expect(firstSetter).toBeDefined();

    await rerender(
      <GestureViewer
        data={data}
        height={480}
        id="dimensions-setter"
        ListComponent={TestFlashList}
        renderItem={(item, index, info) => renderItem(item, index, info)}
        width={PAGE_WIDTH}
      />,
    );

    expect(latestFirstSetter).toBe(firstSetter);

    await act(async () => {
      firstSetter?.({ height: 616, width: 393 });
    });
  });

  it('updates rendered loop data when data identity changes', async () => {
    const { rerender } = await render(
      <GestureViewer
        data={['first', 'second']}
        enableLoop
        height={480}
        id="loop-data-rerender"
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(screen.getByText('1:first')).toBeTruthy();

    await rerender(
      <GestureViewer
        data={['third', 'fourth']}
        enableLoop
        height={480}
        id="loop-data-rerender"
        ListComponent={TestFlashList}
        renderItem={(item, index) => <Text>{`${index}:${item}`}</Text>}
        width={PAGE_WIDTH}
      />,
    );

    expect(screen.getByText('1:third')).toBeTruthy();
    expect(screen.queryByText('1:first')).toBeNull();
  });
});
