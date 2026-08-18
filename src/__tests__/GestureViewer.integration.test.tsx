import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text, type View } from 'react-native';

import { GestureViewer } from '../GestureViewer';
import { PAGE_TRANSITION_CONFIG } from '../gestureViewerAnimation';
import { registry } from '../GestureViewerRegistry';
import type { GestureViewerController, GestureViewerProps } from '../types';
import { useGestureViewerController } from '../useGestureViewerController';
import { useGestureViewerState } from '../useGestureViewerState';

type MockWebTapTarget = {
  index: number;
  item: unknown;
};

type MockWebClickHandlerConfig = {
  emitSingleTap: (x: number, y: number, tapTarget?: MockWebTapTarget) => void;
  getCurrentTapTarget: () => MockWebTapTarget | null;
};

const mockClearPendingWebSingleTap = jest.fn();
const mockScheduleWebSingleTap = jest.fn();
const mockWebClickHandler = jest.fn();
let mockWebClickHandlerConfig: MockWebClickHandlerConfig | null = null;

jest.mock('../useWebSingleTapTimer', () => ({
  useWebSingleTapTimer: () => ({
    clearPendingWebSingleTap: mockClearPendingWebSingleTap,
    scheduleWebSingleTap: mockScheduleWebSingleTap,
  }),
}));

jest.mock('../useWebClickHandler', () => ({
  useWebClickHandler: (config: MockWebClickHandlerConfig) => {
    mockWebClickHandlerConfig = config;
    return mockWebClickHandler;
  },
}));

const data = ['first', 'second', 'third', 'fourth'];

let controller: GestureViewerController | null = null;

type RenderedGestureViewer = Awaited<ReturnType<typeof render>>;
type ActiveState = 'active' | 'inactive';

type HarnessProps = {
  autoPlay?: boolean;
  autoPlayInterval?: number;
  data?: Array<string | undefined>;
  enableLoop?: boolean;
  horizontalSwipe?: GestureViewerProps<string | undefined>['horizontalSwipe'];
  initialIndex?: number;
  onSingleTap?: (event: { x: number; y: number; index: number; item: string | undefined }) => void;
  renderItem?: GestureViewerProps<string | undefined>['renderItem'];
  viewerId: string;
  windowSize?: number;
};

function Harness({
  autoPlay = false,
  autoPlayInterval,
  data: viewerData = data,
  enableLoop = false,
  horizontalSwipe,
  initialIndex = 0,
  onSingleTap,
  renderItem,
  viewerId,
  windowSize,
}: HarnessProps) {
  controller = useGestureViewerController(viewerId);
  const state = useGestureViewerState(viewerId);

  return (
    <>
      <Text testID={`${viewerId}-state`}>
        {state.currentIndex}/{state.totalCount}
      </Text>
      <GestureViewer
        autoPlay={autoPlay}
        autoPlayInterval={autoPlayInterval}
        data={viewerData}
        enableLoop={enableLoop}
        height={240}
        horizontalSwipe={horizontalSwipe}
        id={viewerId}
        initialIndex={initialIndex}
        onSingleTap={onSingleTap}
        renderItem={
          renderItem ?? ((item, index) => <Text testID={`${viewerId}-item-${index}`}>{item}</Text>)
        }
        width={320}
        windowSize={windowSize}
      />
    </>
  );
}

function createActiveStateRenderer(
  viewerId: string,
): GestureViewerProps<string | undefined>['renderItem'] {
  return (item, index, { isActive }) => (
    <>
      <Text>{item}</Text>
      <Text testID={`${viewerId}-active-${index}`}>{isActive ? 'active' : 'inactive'}</Text>
    </>
  );
}

function getController() {
  if (!controller) {
    throw new Error('GestureViewer controller was not registered');
  }

  return controller;
}

async function expectState(rendered: RenderedGestureViewer, viewerId: string, state: string) {
  await waitFor(() => {
    const children = rendered.getByTestId(`${viewerId}-state`).props.children;
    const stateText = Array.isArray(children) ? children.join('') : children;

    expect(stateText).toBe(state);
  });
}

function expectActiveState(
  rendered: RenderedGestureViewer,
  viewerId: string,
  index: number,
  activeState: ActiveState,
): void {
  expect(rendered.getByTestId(`${viewerId}-active-${index}`).props.children).toBe(activeState);
}

function expectActiveSlotCounts(
  rendered: RenderedGestureViewer,
  viewerId: string,
  index: number,
  expectedCounts: Record<ActiveState, number>,
): void {
  const slots = rendered.getAllByTestId(`${viewerId}-active-${index}`);

  expect(slots).toHaveLength(expectedCounts.active + expectedCounts.inactive);
  expect(slots.filter((slot) => slot.props.children === 'active')).toHaveLength(
    expectedCounts.active,
  );
  expect(slots.filter((slot) => slot.props.children === 'inactive')).toHaveLength(
    expectedCounts.inactive,
  );
}

describe('GestureViewer render-window integration', () => {
  afterEach(() => {
    cleanup();
    controller = null;
    mockClearPendingWebSingleTap.mockClear();
    mockScheduleWebSingleTap.mockClear();
    mockWebClickHandler.mockClear();
    mockWebClickHandlerConfig = null;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('mounts only the adjacent render-window slots around the current item', async () => {
    const rendered = await render(<Harness initialIndex={2} viewerId="window-center" />);

    await expectState(rendered, 'window-center', '2/4');

    expect(rendered.getByText('second')).toBeTruthy();
    expect(rendered.getByText('third')).toBeTruthy();
    expect(rendered.getByText('fourth')).toBeTruthy();
    expect(rendered.queryByText('first')).toBeNull();
  });

  it('clips every render-window slot so zoomed neighbors cannot bleed into the active page', async () => {
    const rendered = await render(<Harness initialIndex={1} viewerId="slot-clip" />);

    await expectState(rendered, 'slot-clip', '1/4');

    [0, 1, 2].forEach((index) => {
      const item = rendered.getByTestId(`slot-clip-item-${index}`);
      const slotView = item.parent?.parent?.parent;

      expect(slotView).not.toBeNull();
      expect(StyleSheet.flatten(slotView?.props.style)?.overflow).toBe('hidden');
    });
  });

  it('provides active state for the committed render-window slot', async () => {
    const viewerId = 'active-state';
    const rendered = await render(
      <Harness
        initialIndex={1}
        renderItem={createActiveStateRenderer(viewerId)}
        viewerId={viewerId}
      />,
    );

    await expectState(rendered, viewerId, '1/4');

    expectActiveState(rendered, viewerId, 0, 'inactive');
    expectActiveState(rendered, viewerId, 1, 'active');
    expectActiveState(rendered, viewerId, 2, 'inactive');

    await act(async () => {
      getController().goToIndex(2, { animated: false });
    });

    await expectState(rendered, viewerId, '2/4');

    expectActiveState(rendered, viewerId, 1, 'inactive');
    expectActiveState(rendered, viewerId, 2, 'active');
    expectActiveState(rendered, viewerId, 3, 'inactive');
  });

  it('keeps the current item active until animated navigation commits', async () => {
    jest.useFakeTimers();

    const viewerId = 'active-state-transition';
    const rendered = await render(
      <Harness
        initialIndex={1}
        renderItem={createActiveStateRenderer(viewerId)}
        viewerId={viewerId}
      />,
    );

    await expectState(rendered, viewerId, '1/4');

    await act(async () => {
      getController().goToNext();
    });

    expectActiveState(rendered, viewerId, 1, 'active');
    expectActiveState(rendered, viewerId, 2, 'inactive');

    await act(async () => {
      jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration);
    });

    await expectState(rendered, viewerId, '2/4');

    expectActiveState(rendered, viewerId, 1, 'inactive');
    expectActiveState(rendered, viewerId, 2, 'active');
  });

  it('keeps exactly one virtual slot active when loop mode repeats a logical item', async () => {
    const viewerId = 'active-state-loop';
    const rendered = await render(
      <Harness
        data={['first', 'second']}
        enableLoop
        renderItem={createActiveStateRenderer(viewerId)}
        viewerId={viewerId}
        windowSize={5}
      />,
    );

    await expectState(rendered, viewerId, '0/2');

    expectActiveSlotCounts(rendered, viewerId, 0, { active: 1, inactive: 2 });
    expectActiveSlotCounts(rendered, viewerId, 1, { active: 0, inactive: 2 });
  });

  it('renders no active slot for empty data and one active slot for a single item', async () => {
    const viewerId = 'active-state-data-size';
    const renderItem = jest.fn(createActiveStateRenderer(viewerId));
    const rendered = await render(
      <Harness data={[]} renderItem={renderItem} viewerId={viewerId} />,
    );

    await expectState(rendered, viewerId, '0/0');
    expect(renderItem).not.toHaveBeenCalled();

    await act(async () => {
      await rendered.rerender(
        <Harness data={['only']} renderItem={renderItem} viewerId={viewerId} />,
      );
    });

    await expectState(rendered, viewerId, '0/1');
    expectActiveState(rendered, viewerId, 0, 'active');
  });

  it('updates state and render-window slots through immediate controller navigation', async () => {
    const rendered = await render(<Harness viewerId="controller-jump" />);

    await expectState(rendered, 'controller-jump', '0/4');

    await act(async () => {
      getController().goToIndex(3, { animated: false });
    });

    await expectState(rendered, 'controller-jump', '3/4');

    expect(rendered.getByText('third')).toBeTruthy();
    expect(rendered.getByText('fourth')).toBeTruthy();
    expect(rendered.queryByText('first')).toBeNull();
    expect(rendered.queryByText('second')).toBeNull();
  });

  it('clears pending web single taps before immediate controller navigation', async () => {
    const rendered = await render(<Harness viewerId="controller-jump-clear-tap" />);

    await expectState(rendered, 'controller-jump-clear-tap', '0/4');

    mockClearPendingWebSingleTap.mockClear();

    await act(async () => {
      getController().goToIndex(3, { animated: false });
    });

    expect(mockClearPendingWebSingleTap).toHaveBeenCalledTimes(1);
    await expectState(rendered, 'controller-jump-clear-tap', '3/4');
  });

  it('keeps controller navigation available when horizontal swipe is disabled', async () => {
    const rendered = await render(
      <Harness
        horizontalSwipe={{ enabled: false }}
        initialIndex={1}
        viewerId="controller-locked-swipe"
      />,
    );

    await expectState(rendered, 'controller-locked-swipe', '1/4');

    await act(async () => {
      getController().goToPrevious();
    });

    await expectState(rendered, 'controller-locked-swipe', '0/4');

    await act(async () => {
      getController().goToNext();
    });

    await expectState(rendered, 'controller-locked-swipe', '1/4');

    await act(async () => {
      getController().goToIndex(2, { animated: false });
    });

    await expectState(rendered, 'controller-locked-swipe', '2/4');

    expect(rendered.getByText('second')).toBeTruthy();
    expect(rendered.getByText('third')).toBeTruthy();
    expect(rendered.getByText('fourth')).toBeTruthy();
  });

  it('keeps autoplay available when horizontal swipe is disabled', async () => {
    jest.useFakeTimers();

    const viewerId = 'autoplay-locked-swipe';

    const rendered = await render(
      <Harness
        autoPlay
        autoPlayInterval={1000}
        data={['first', 'second']}
        horizontalSwipe={{ enabled: false }}
        renderItem={createActiveStateRenderer(viewerId)}
        viewerId={viewerId}
      />,
    );

    await expectState(rendered, viewerId, '0/2');
    expectActiveState(rendered, viewerId, 0, 'active');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration);
    });

    await expectState(rendered, viewerId, '1/2');
    expectActiveState(rendered, viewerId, 0, 'inactive');
    expectActiveState(rendered, viewerId, 1, 'active');
  });

  it('preserves tap events for explicit undefined items', async () => {
    const onSingleTap = jest.fn();

    const rendered = await render(
      <Harness data={[undefined]} onSingleTap={onSingleTap} viewerId="undefined-tap-target" />,
    );

    await expectState(rendered, 'undefined-tap-target', '0/1');

    expect(mockWebClickHandlerConfig?.getCurrentTapTarget()).toEqual({
      index: 0,
      item: undefined,
    });

    await act(async () => {
      mockWebClickHandlerConfig?.emitSingleTap(20, 30);
    });

    expect(onSingleTap).toHaveBeenCalledWith({
      x: 20,
      y: 30,
      index: 0,
      item: undefined,
    });
  });

  it('does not autoplay while trigger opening is still measuring', async () => {
    jest.useFakeTimers();

    const viewerId = 'autoplay-trigger-opening';
    const triggerNode = { measure: jest.fn() } as unknown as View;

    registry.setActiveTriggerNode(viewerId, triggerNode);

    const rendered = await render(
      <Harness
        autoPlay
        autoPlayInterval={250}
        data={['first', 'second']}
        enableLoop
        viewerId={viewerId}
      />,
    );

    await expectState(rendered, viewerId, '0/2');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await expectState(rendered, viewerId, '0/2');
    expect(triggerNode.measure).toHaveBeenCalledTimes(1);
  });

  it('does not autoplay while a mounted viewer starts a trigger opening', async () => {
    jest.useFakeTimers();

    const viewerId = 'mounted-trigger-opening';
    const triggerNode = { measure: jest.fn() } as unknown as View;

    const rendered = await render(
      <Harness
        autoPlay
        autoPlayInterval={250}
        data={['first', 'second']}
        enableLoop
        viewerId={viewerId}
      />,
    );

    await expectState(rendered, viewerId, '0/2');

    await act(async () => {
      registry.setActiveTriggerNode(viewerId, triggerNode);
    });

    await waitFor(() => {
      expect(triggerNode.measure).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await expectState(rendered, viewerId, '0/2');
  });

  it('rebases loop edge navigation onto the nearest virtual page', async () => {
    const rendered = await render(<Harness enableLoop initialIndex={3} viewerId="loop-edge" />);

    await expectState(rendered, 'loop-edge', '3/4');

    await act(async () => {
      getController().goToIndex(0, { animated: false });
    });

    await expectState(rendered, 'loop-edge', '0/4');

    expect(rendered.getByText('fourth')).toBeTruthy();
    expect(rendered.getByText('first')).toBeTruthy();
    expect(rendered.getByText('second')).toBeTruthy();
    expect(rendered.queryByText('third')).toBeNull();
  });

  it('clamps and keeps content mounted when data shrinks below the current index', async () => {
    const rendered = await render(<Harness initialIndex={3} viewerId="data-shrink" />);

    await expectState(rendered, 'data-shrink', '3/4');
    expect(rendered.getByText('fourth')).toBeTruthy();

    await act(async () => {
      await rendered.rerender(<Harness data={['first']} initialIndex={3} viewerId="data-shrink" />);
    });

    await expectState(rendered, 'data-shrink', '0/1');
    expect(rendered.getByText('first')).toBeTruthy();
    expect(rendered.queryByText('second')).toBeNull();
    expect(rendered.queryByText('third')).toBeNull();
    expect(rendered.queryByText('fourth')).toBeNull();
  });

  it('applies initialIndex when data arrives after an empty mount', async () => {
    const rendered = await render(
      <Harness data={[]} initialIndex={2} viewerId="delayed-initial-index" />,
    );

    await expectState(rendered, 'delayed-initial-index', '0/0');

    await act(async () => {
      await rendered.rerender(
        <Harness data={data} initialIndex={2} viewerId="delayed-initial-index" />,
      );
    });

    await expectState(rendered, 'delayed-initial-index', '2/4');
    expect(rendered.getByText('second')).toBeTruthy();
    expect(rendered.getByText('third')).toBeTruthy();
    expect(rendered.getByText('fourth')).toBeTruthy();
    expect(rendered.queryByText('first')).toBeNull();
  });

  it('reapplies initialIndex when data is cleared and repopulated', async () => {
    const rendered = await render(
      <Harness data={data} initialIndex={2} viewerId="reloaded-initial-index" />,
    );

    await expectState(rendered, 'reloaded-initial-index', '2/4');
    expect(rendered.getByText('third')).toBeTruthy();

    await act(async () => {
      await rendered.rerender(
        <Harness data={[]} initialIndex={2} viewerId="reloaded-initial-index" />,
      );
    });

    await expectState(rendered, 'reloaded-initial-index', '0/0');
    expect(rendered.queryByText('third')).toBeNull();

    await act(async () => {
      await rendered.rerender(
        <Harness data={data} initialIndex={2} viewerId="reloaded-initial-index" />,
      );
    });

    await expectState(rendered, 'reloaded-initial-index', '2/4');
    expect(rendered.getByText('second')).toBeTruthy();
    expect(rendered.getByText('third')).toBeTruthy();
    expect(rendered.getByText('fourth')).toBeTruthy();
    expect(rendered.queryByText('first')).toBeNull();
  });

  it('keeps initialIndex pending when it changes before data arrives', async () => {
    const rendered = await render(
      <Harness data={[]} initialIndex={0} viewerId="pending-initial-index" />,
    );

    await expectState(rendered, 'pending-initial-index', '0/0');

    await act(async () => {
      await rendered.rerender(
        <Harness data={[]} initialIndex={2} viewerId="pending-initial-index" />,
      );
    });

    await expectState(rendered, 'pending-initial-index', '0/0');

    await act(async () => {
      await rendered.rerender(
        <Harness data={data} initialIndex={2} viewerId="pending-initial-index" />,
      );
    });

    await expectState(rendered, 'pending-initial-index', '2/4');
    expect(rendered.getByText('third')).toBeTruthy();
  });
});
