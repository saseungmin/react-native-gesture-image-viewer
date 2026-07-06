import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { GestureViewer } from '../GestureViewer';
import type { GestureViewerController } from '../types';
import { useGestureViewerController } from '../useGestureViewerController';
import { useGestureViewerState } from '../useGestureViewerState';

const data = ['first', 'second', 'third', 'fourth'];

let controller: GestureViewerController | null = null;

type HarnessProps = {
  data?: string[];
  enableHorizontalSwipe?: boolean;
  enableLoop?: boolean;
  initialIndex?: number;
  viewerId: string;
};

function Harness({
  data: viewerData = data,
  enableHorizontalSwipe = true,
  enableLoop = false,
  initialIndex = 0,
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
        data={viewerData}
        enableHorizontalSwipe={enableHorizontalSwipe}
        enableLoop={enableLoop}
        height={240}
        id={viewerId}
        initialIndex={initialIndex}
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
});
