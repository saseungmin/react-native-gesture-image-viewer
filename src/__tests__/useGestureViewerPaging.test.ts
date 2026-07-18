import { act, renderHook } from '@testing-library/react-native';

import { PAGE_TRANSITION_CONFIG } from '../gestureViewerAnimation';
import { useGestureViewerPaging } from '../useGestureViewerPaging';

const createPagingOptions = ({
  clearPendingWebSingleTap = jest.fn(),
  commitVirtualIndexOnly = jest.fn(),
}: {
  clearPendingWebSingleTap?: jest.Mock;
  commitVirtualIndexOnly?: jest.Mock;
} = {}) => ({
  centerVirtualIndex: 0,
  clearPendingWebSingleTap,
  commitVirtualIndexOnly,
  currentIndex: 0,
  dataLength: 4,
  enableHorizontalSwipe: true,
  enableLoop: false,
  initialPage: 0,
  isPinching: false,
  isRotated: false,
  isTriggerOpening: false,
  isZoomed: false,
  pageStride: 320,
  width: 320,
});

describe('useGestureViewerPaging commands', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('snaps to a virtual page and clears transition state immediately', async () => {
    const clearPendingWebSingleTap = jest.fn();
    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(
        createPagingOptions({
          clearPendingWebSingleTap,
          commitVirtualIndexOnly,
        }),
      ),
    );

    await act(async () => {
      result.current.snapToVirtualPage(2);
    });

    expect(result.current.visualPage.get()).toBe(2);
    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(2);
    expect(result.current.isPageTransitioningRef.current).toBe(false);
    expect(result.current.pageTransitionLocked.get()).toBe(false);
    expect(clearPendingWebSingleTap).toHaveBeenCalledTimes(1);
  });

  it('animates to a virtual page and clears transition state on finish', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(
        createPagingOptions({
          commitVirtualIndexOnly,
        }),
      ),
    );

    await act(async () => {
      result.current.animateToVirtualPage(3);
    });

    expect(result.current.isPageTransitioningRef.current).toBe(true);
    expect(result.current.pageTransitionLocked.get()).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(PAGE_TRANSITION_CONFIG.duration);
    });

    expect(result.current.visualPage.get()).toBe(3);
    expect(commitVirtualIndexOnly).toHaveBeenCalledWith(3);
    expect(result.current.isPageTransitioningRef.current).toBe(false);
    expect(result.current.pageTransitionLocked.get()).toBe(false);
  });

  it('cancels an active paging animation without committing a target', async () => {
    jest.useFakeTimers();

    const commitVirtualIndexOnly = jest.fn();
    const { result } = await renderHook(() =>
      useGestureViewerPaging(
        createPagingOptions({
          commitVirtualIndexOnly,
        }),
      ),
    );

    await act(async () => {
      result.current.animateToVirtualPage(3);
    });

    await act(async () => {
      result.current.cancelPagingInteraction();
    });

    expect(commitVirtualIndexOnly).not.toHaveBeenCalled();
    expect(result.current.isPageTransitioningRef.current).toBe(false);
    expect(result.current.pageTransitionLocked.get()).toBe(false);
  });
});
