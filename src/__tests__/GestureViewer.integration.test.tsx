import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { Text, type View } from 'react-native';

import { GestureViewer } from '../GestureViewer';
import { registry } from '../GestureViewerRegistry';
import type { GestureViewerController } from '../types';
import { useGestureViewerController } from '../useGestureViewerController';
import { useGestureViewerState } from '../useGestureViewerState';

type MockWebTapTarget = {
  index: number;
  item: unknown;
};

type MockWebClickHandlerConfig = {
  emitSingleTap: (x: number, y: number, index?: number, item?: unknown) => void;
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

type HarnessProps = {
  autoPlay?: boolean;
  autoPlayInterval?: number;
  data?: Array<string | undefined>;
  enableHorizontalSwipe?: boolean;
  enableLoop?: boolean;
  initialIndex?: number;
  onSingleTap?: (event: { x: number; y: number; index: number; item: string | undefined }) => void;
  viewerId: string;
};

function Harness({
  autoPlay = false,
  autoPlayInterval,
  data: viewerData = data,
  enableHorizontalSwipe = true,
  enableLoop = false,
  initialIndex = 0,
  onSingleTap,
  viewerId,
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
        enableHorizontalSwipe={enableHorizontalSwipe}
        enableLoop={enableLoop}
        height={240}
        id={viewerId}
        initialIndex={initialIndex}
        onSingleTap={onSingleTap}
        renderItem={(item, index) => <Text testID={`${viewerId}-item-${index}`}>{item}</Text>}
        width={320}
      />
    </>
  );
}

function getController() {
  if (!controller) {
    throw new Error('GestureViewer controller was not registered');
  }

  return controller;
}

async function expectState(
  rendered: Awaited<ReturnType<typeof render>>,
  viewerId: string,
  state: string,
) {
  await waitFor(() => {
    const children = rendered.getByTestId(`${viewerId}-state`).props.children;
    const stateText = Array.isArray(children) ? children.join('') : children;

    expect(stateText).toBe(state);
  });
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
      <Harness enableHorizontalSwipe={false} viewerId="controller-locked-swipe" />,
    );

    await expectState(rendered, 'controller-locked-swipe', '0/4');

    await act(async () => {
      getController().goToIndex(2, { animated: false });
    });

    await expectState(rendered, 'controller-locked-swipe', '2/4');

    expect(rendered.getByText('second')).toBeTruthy();
    expect(rendered.getByText('third')).toBeTruthy();
    expect(rendered.getByText('fourth')).toBeTruthy();
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
