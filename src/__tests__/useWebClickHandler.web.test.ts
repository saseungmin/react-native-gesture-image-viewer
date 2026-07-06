import { createWebClickHandler, type WebClickEvent } from '../useWebClickHandler.web';
import { applyTapZoomAtPoint } from '../utils/tapZoom';

jest.mock('../utils/tapZoom', () => ({
  applyTapZoomAtPoint: jest.fn(),
}));

const createClickEvent = (detail: number): WebClickEvent => ({
  clientX: 30,
  clientY: 40,
  currentTarget: {
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
    }),
  },
  detail,
});

const sharedValue = {
  get: jest.fn(() => 1),
  set: jest.fn(),
} as never;

describe('useWebClickHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels a pending single tap before applying double-tap zoom', () => {
    let pendingSingleTap: (() => void) | null = null;
    const clearPendingWebSingleTap = jest.fn(() => {
      pendingSingleTap = null;
    });
    const emitSingleTap = jest.fn();
    const scheduleWebSingleTap = jest.fn((callback: () => void) => {
      pendingSingleTap = callback;
    });

    const handleClick = createWebClickHandler({
      clearPendingWebSingleTap,
      emitSingleTap,
      enableDoubleTapZoom: true,
      getCurrentTapTarget: () => ({ index: 1, item: 'image-2' }),
      height: 200,
      isInteractionLocked: () => false,
      maxZoomScale: 3,
      scale: sharedValue,
      scheduleWebSingleTap,
      translateX: sharedValue,
      translateY: sharedValue,
      width: 100,
    });

    handleClick(createClickEvent(1));

    expect(scheduleWebSingleTap).toHaveBeenCalledTimes(1);
    expect(pendingSingleTap).toEqual(expect.any(Function));

    handleClick(createClickEvent(2));

    expect(clearPendingWebSingleTap).toHaveBeenCalledTimes(1);
    expect(pendingSingleTap).toBeNull();
    expect(applyTapZoomAtPoint).toHaveBeenCalledTimes(1);
    expect(emitSingleTap).not.toHaveBeenCalled();
  });

  it('resolves scheduled single taps when the timer fires', () => {
    const pendingSingleTapCallbacks: Array<() => void> = [];
    const emitSingleTap = jest.fn();

    const handleClick = createWebClickHandler({
      clearPendingWebSingleTap: jest.fn(),
      emitSingleTap,
      enableDoubleTapZoom: true,
      getCurrentTapTarget: () => ({ index: 1, item: 'image-2' }),
      height: 200,
      isInteractionLocked: () => false,
      maxZoomScale: 3,
      scale: sharedValue,
      scheduleWebSingleTap: jest.fn((callback: () => void) => {
        pendingSingleTapCallbacks.push(callback);
      }),
      translateX: sharedValue,
      translateY: sharedValue,
      width: 100,
    });

    handleClick(createClickEvent(1));

    expect(emitSingleTap).not.toHaveBeenCalled();

    const [pendingSingleTap] = pendingSingleTapCallbacks;

    expect(pendingSingleTap).toEqual(expect.any(Function));

    pendingSingleTap?.();

    expect(emitSingleTap).toHaveBeenCalledWith(20, 20);
    expect(applyTapZoomAtPoint).not.toHaveBeenCalled();
  });

  it('treats web double clicks as single taps when double-tap zoom is disabled', () => {
    const emitSingleTap = jest.fn();
    const scheduleWebSingleTap = jest.fn();

    const handleClick = createWebClickHandler({
      clearPendingWebSingleTap: jest.fn(),
      emitSingleTap,
      enableDoubleTapZoom: false,
      getCurrentTapTarget: () => ({ index: 1, item: 'image-2' }),
      height: 200,
      isInteractionLocked: () => false,
      maxZoomScale: 3,
      scale: sharedValue,
      scheduleWebSingleTap,
      translateX: sharedValue,
      translateY: sharedValue,
      width: 100,
    });

    handleClick(createClickEvent(2));

    expect(emitSingleTap).toHaveBeenCalledWith(20, 20, 1, 'image-2');
    expect(scheduleWebSingleTap).not.toHaveBeenCalled();
    expect(applyTapZoomAtPoint).not.toHaveBeenCalled();
  });

  it('ignores web clicks while page transition is locked', () => {
    const clearPendingWebSingleTap = jest.fn();
    const emitSingleTap = jest.fn();
    const scheduleWebSingleTap = jest.fn();

    const handleClick = createWebClickHandler({
      clearPendingWebSingleTap,
      emitSingleTap,
      enableDoubleTapZoom: true,
      getCurrentTapTarget: () => ({ index: 1, item: 'image-2' }),
      height: 200,
      isInteractionLocked: () => true,
      maxZoomScale: 3,
      scale: sharedValue,
      scheduleWebSingleTap,
      translateX: sharedValue,
      translateY: sharedValue,
      width: 100,
    });

    handleClick(createClickEvent(1));
    handleClick(createClickEvent(2));

    expect(clearPendingWebSingleTap).toHaveBeenCalledTimes(2);
    expect(scheduleWebSingleTap).not.toHaveBeenCalled();
    expect(emitSingleTap).not.toHaveBeenCalled();
    expect(applyTapZoomAtPoint).not.toHaveBeenCalled();
  });
});
