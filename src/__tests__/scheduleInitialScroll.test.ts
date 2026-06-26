import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { INITIAL_SCROLL_IDLE_TIMEOUT_MS, scheduleInitialScroll } from '../scheduleInitialScroll';

type IdleTestGlobal = typeof globalThis & {
  requestIdleCallback?: (
    this: IdleTestGlobal,
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (this: IdleTestGlobal, handle: number) => void;
};

const idleGlobal = globalThis as IdleTestGlobal;
const originalRequestIdleCallback = idleGlobal.requestIdleCallback;
const originalCancelIdleCallback = idleGlobal.cancelIdleCallback;

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

describe('scheduleInitialScroll', () => {
  afterEach(() => {
    restoreIdleCallbacks();
    jest.useRealTimers();
  });

  it('uses requestIdleCallback when scheduling and cancellation are available', () => {
    const callback = jest.fn();
    const requestIdleCallback = jest.fn((scheduledCallback: () => void) => {
      scheduledCallback();
      return 7;
    });
    const cancelIdleCallback = jest.fn();

    idleGlobal.requestIdleCallback = requestIdleCallback;
    idleGlobal.cancelIdleCallback = cancelIdleCallback;

    const cleanup = scheduleInitialScroll(callback);

    expect(requestIdleCallback).toHaveBeenCalledWith(callback, {
      timeout: INITIAL_SCROLL_IDLE_TIMEOUT_MS,
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cancelIdleCallback).not.toHaveBeenCalled();

    cleanup();

    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it('binds idle callbacks to the scheduler global', () => {
    const callback = jest.fn();
    const requestIdleCallback = jest.fn(function (
      this: IdleTestGlobal,
      scheduledCallback: () => void,
    ) {
      expect(this).toBe(idleGlobal);
      scheduledCallback();
      return 7;
    });
    const cancelIdleCallback = jest.fn(function (this: IdleTestGlobal) {
      expect(this).toBe(idleGlobal);
    });

    idleGlobal.requestIdleCallback = requestIdleCallback;
    idleGlobal.cancelIdleCallback = cancelIdleCallback;

    const cleanup = scheduleInitialScroll(callback);
    cleanup();

    expect(requestIdleCallback.mock.contexts[0]).toBe(idleGlobal);
    expect(cancelIdleCallback.mock.contexts[0]).toBe(idleGlobal);
  });

  it('falls back to timeout scheduling when idle cancellation is unavailable', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    const requestIdleCallback = jest.fn(() => 7);

    idleGlobal.requestIdleCallback = requestIdleCallback;
    delete idleGlobal.cancelIdleCallback;

    const cleanup = scheduleInitialScroll(callback);

    expect(requestIdleCallback).not.toHaveBeenCalled();

    cleanup();
    jest.runOnlyPendingTimers();

    expect(callback).not.toHaveBeenCalled();
  });

  it('falls back to timeout scheduling when requestIdleCallback is unavailable', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    const cancelIdleCallback = jest.fn();

    delete idleGlobal.requestIdleCallback;
    idleGlobal.cancelIdleCallback = cancelIdleCallback;

    scheduleInitialScroll(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(cancelIdleCallback).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('falls back to timeout scheduling when both idle callbacks are unavailable', () => {
    jest.useFakeTimers();

    const callback = jest.fn();

    delete idleGlobal.requestIdleCallback;
    delete idleGlobal.cancelIdleCallback;

    scheduleInitialScroll(callback);

    jest.runOnlyPendingTimers();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
