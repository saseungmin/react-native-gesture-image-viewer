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
});
