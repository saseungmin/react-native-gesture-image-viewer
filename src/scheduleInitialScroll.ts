export const INITIAL_SCROLL_IDLE_TIMEOUT_MS = 100;

type IdleCallbackOptions = {
  timeout?: number;
};

type RequestIdleCallback = (callback: () => void, options?: IdleCallbackOptions) => number;
type CancelIdleCallback = (handle: number) => void;

type IdleSchedulerGlobal = typeof globalThis & {
  requestIdleCallback?: RequestIdleCallback;
  cancelIdleCallback?: CancelIdleCallback;
};

export const scheduleInitialScroll = (callback: () => void): (() => void) => {
  const idleGlobal = globalThis as IdleSchedulerGlobal;
  const { cancelIdleCallback, requestIdleCallback } = idleGlobal;

  if (requestIdleCallback && cancelIdleCallback) {
    const idleCallbackId = requestIdleCallback(callback, {
      timeout: INITIAL_SCROLL_IDLE_TIMEOUT_MS,
    });

    return () => {
      cancelIdleCallback(idleCallbackId);
    };
  }

  const timeoutId = setTimeout(callback, 0);

  return () => {
    clearTimeout(timeoutId);
  };
};
