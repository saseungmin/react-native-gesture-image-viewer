import { render, screen } from '@testing-library/react-native';
import React, { forwardRef, useImperativeHandle } from 'react';
import { Text, View } from 'react-native';

import { GestureViewer } from '../GestureViewer';
import { INITIAL_SCROLL_IDLE_TIMEOUT_MS } from '../scheduleInitialScroll';

type IdleTestGlobal = typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type TestListHandle = {
  scrollToIndex: (params: { animated: boolean; index: number }) => void;
};

type TestListProps = {
  data?: readonly string[];
  renderItem?: (info: { item: string; index: number }) => React.ReactElement | null;
};

const idleGlobal = globalThis as IdleTestGlobal;
const originalRequestIdleCallback = idleGlobal.requestIdleCallback;
const originalCancelIdleCallback = idleGlobal.cancelIdleCallback;
const scrollToIndex = jest.fn<
  ReturnType<TestListHandle['scrollToIndex']>,
  Parameters<TestListHandle['scrollToIndex']>
>();

const TestFlashList = forwardRef<TestListHandle, TestListProps>(function TestFlashList(
  { data, renderItem },
  ref,
) {
  useImperativeHandle(ref, () => ({ scrollToIndex }), []);

  return (
    <View>
      {data?.map((item, index) => (
        <View key={item}>{renderItem?.({ item, index })}</View>
      ))}
    </View>
  );
});

TestFlashList.displayName = 'FlashList';

const restoreIdleCallbacks = () => {
  if (originalRequestIdleCallback) {
    idleGlobal.requestIdleCallback = originalRequestIdleCallback;
  } else {
    delete idleGlobal.requestIdleCallback;
  }

  if (originalCancelIdleCallback) {
    idleGlobal.cancelIdleCallback = originalCancelIdleCallback;
  } else {
    delete idleGlobal.cancelIdleCallback;
  }
};

describe('useGestureViewer initial scroll scheduling', () => {
  beforeEach(() => {
    scrollToIndex.mockClear();
  });

  afterEach(() => {
    restoreIdleCallbacks();
  });

  it('schedules one non-animated initial scroll after rendering the viewer list', async () => {
    idleGlobal.requestIdleCallback = jest.fn((callback: () => void) => {
      callback();
      return 10;
    });
    idleGlobal.cancelIdleCallback = jest.fn();

    await render(
      <GestureViewer
        data={['first', 'second', 'third']}
        height={480}
        initialIndex={2}
        ListComponent={TestFlashList}
        renderItem={(item) => <Text>{item}</Text>}
        width={320}
      />,
    );

    expect(screen.getByText('third')).toBeTruthy();
    expect(idleGlobal.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: INITIAL_SCROLL_IDLE_TIMEOUT_MS,
    });
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).toHaveBeenCalledWith({
      animated: false,
      index: 2,
    });
  });

  it('scrolls to the initial page when the data length changes', async () => {
    idleGlobal.requestIdleCallback = jest.fn((callback: () => void) => {
      callback();
      return 10;
    });
    idleGlobal.cancelIdleCallback = jest.fn();

    const renderItem = (item: string) => <Text>{item}</Text>;
    const { rerender } = await render(
      <GestureViewer
        data={['first', 'second', 'third']}
        height={480}
        ListComponent={TestFlashList}
        renderItem={renderItem}
        width={320}
      />,
    );

    expect(scrollToIndex).not.toHaveBeenCalled();

    await rerender(
      <GestureViewer
        data={['first', 'second', 'third']}
        height={480}
        ListComponent={TestFlashList}
        renderItem={renderItem}
        width={400}
      />,
    );

    expect(scrollToIndex).not.toHaveBeenCalled();

    await rerender(
      <GestureViewer
        data={['first', 'second', 'third', 'fourth']}
        height={480}
        ListComponent={TestFlashList}
        renderItem={renderItem}
        width={400}
      />,
    );

    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).toHaveBeenCalledWith({
      animated: false,
      index: 0,
    });

    await rerender(
      <GestureViewer
        data={[]}
        height={480}
        ListComponent={TestFlashList}
        renderItem={renderItem}
        width={400}
      />,
    );

    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });
});
