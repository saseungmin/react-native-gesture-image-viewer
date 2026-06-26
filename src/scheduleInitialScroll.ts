export const INITIAL_SCROLL_IDLE_TIMEOUT_MS = 100;

type IdleCallbackOptions = {
  timeout?: number;
};

type IdleSchedulerGlobal = typeof globalThis & {
  requestIdleCallback?: (
    this: IdleSchedulerGlobal,
    callback: () => void,
    options?: IdleCallbackOptions,
  ) => number;
  cancelIdleCallback?: (this: IdleSchedulerGlobal, handle: number) => void;
};

export const scheduleInitialScroll = (callback: () => void): (() => void) => {
  const idleGlobal = globalThis as IdleSchedulerGlobal;
  const requestIdleCallback = idleGlobal.requestIdleCallback?.bind(idleGlobal);
  const cancelIdleCallback = idleGlobal.cancelIdleCallback?.bind(idleGlobal);

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
