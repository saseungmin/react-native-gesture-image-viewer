import {
  applyHorizontalEdgeResistance,
  canMoveHorizontalPage,
  resolveHorizontalPagingTarget,
  resolveHorizontalSwipeDirection,
} from '../gestureViewerPaging';

describe('horizontal paging swipe direction', () => {
  const width = 400;
  const thresholdRatio = 0.25;
  const velocityThreshold = 800;

  it('resolves left swipes only beyond the translation or velocity thresholds', () => {
    expect(resolveHorizontalSwipeDirection(-101, 0, width, thresholdRatio, velocityThreshold)).toBe(
      1,
    );
    expect(resolveHorizontalSwipeDirection(-100, 0, width, thresholdRatio, velocityThreshold)).toBe(
      0,
    );
    expect(resolveHorizontalSwipeDirection(0, -801, width, thresholdRatio, velocityThreshold)).toBe(
      1,
    );
    expect(resolveHorizontalSwipeDirection(0, -800, width, thresholdRatio, velocityThreshold)).toBe(
      0,
    );
  });

  it('resolves right swipes only beyond the translation or velocity thresholds', () => {
    expect(resolveHorizontalSwipeDirection(101, 0, width, thresholdRatio, velocityThreshold)).toBe(
      -1,
    );
    expect(resolveHorizontalSwipeDirection(100, 0, width, thresholdRatio, velocityThreshold)).toBe(
      0,
    );
    expect(resolveHorizontalSwipeDirection(0, 801, width, thresholdRatio, velocityThreshold)).toBe(
      -1,
    );
    expect(resolveHorizontalSwipeDirection(0, 800, width, thresholdRatio, velocityThreshold)).toBe(
      0,
    );
  });

  it('returns no direction when no threshold passes', () => {
    expect(resolveHorizontalSwipeDirection(24, 200, width, thresholdRatio, velocityThreshold)).toBe(
      0,
    );
  });
});

describe('horizontal paging edge resistance', () => {
  const resistance = 0.35;

  it('dampens movement before the first non-loop item', () => {
    expect(applyHorizontalEdgeResistance(4, 0, 4, 5, false, resistance)).toBeCloseTo(4.65);
  });

  it('dampens movement after the last non-loop item', () => {
    expect(applyHorizontalEdgeResistance(6, 3, 4, 5, false, resistance)).toBeCloseTo(5.35);
  });

  it('keeps the raw page in loop mode', () => {
    expect(applyHorizontalEdgeResistance(4, 0, 4, 5, true, resistance)).toBe(4);
    expect(applyHorizontalEdgeResistance(6, 3, 4, 5, true, resistance)).toBe(6);
  });

  it('stays centered for single-item data', () => {
    expect(applyHorizontalEdgeResistance(4, 0, 1, 5, false, resistance)).toBe(5);
    expect(applyHorizontalEdgeResistance(6, 0, 1, 5, true, resistance)).toBe(5);
  });
});

describe('horizontal paging movement permission', () => {
  it('permits ordinary adjacent non-loop movement', () => {
    expect(canMoveHorizontalPage(1, 4, 1, false)).toBe(true);
    expect(canMoveHorizontalPage(2, 4, -1, false)).toBe(true);
  });

  it('rejects blocked non-loop edge movement', () => {
    expect(canMoveHorizontalPage(0, 4, -1, false)).toBe(false);
    expect(canMoveHorizontalPage(3, 4, 1, false)).toBe(false);
  });

  it('permits loop edge movement when more than one item exists', () => {
    expect(canMoveHorizontalPage(0, 4, -1, true)).toBe(true);
    expect(canMoveHorizontalPage(3, 4, 1, true)).toBe(true);
  });

  it('rejects no-op and single-item movement', () => {
    expect(canMoveHorizontalPage(1, 4, 0, true)).toBe(false);
    expect(canMoveHorizontalPage(0, 1, 1, true)).toBe(false);
    expect(canMoveHorizontalPage(0, 1, -1, false)).toBe(false);
  });
});

describe('horizontal paging target resolution', () => {
  it('settles to center when no direction is chosen', () => {
    expect(resolveHorizontalPagingTarget(5, 1, 4, 0, false)).toEqual({ kind: 'settle' });
  });

  it('returns the adjacent target virtual index when movement is allowed', () => {
    expect(resolveHorizontalPagingTarget(5, 1, 4, 1, false)).toEqual({
      kind: 'move',
      targetVirtualIndex: 6,
    });
    expect(resolveHorizontalPagingTarget(5, 1, 4, -1, false)).toEqual({
      kind: 'move',
      targetVirtualIndex: 4,
    });
  });

  it('settles when movement is blocked', () => {
    expect(resolveHorizontalPagingTarget(5, 0, 4, -1, false)).toEqual({ kind: 'settle' });
    expect(resolveHorizontalPagingTarget(5, 3, 4, 1, false)).toEqual({ kind: 'settle' });
  });

  it('settles for single-item data', () => {
    expect(resolveHorizontalPagingTarget(5, 0, 1, 1, true)).toEqual({ kind: 'settle' });
  });

  it('returns loop targets at logical edges', () => {
    expect(resolveHorizontalPagingTarget(5, 0, 4, -1, true)).toEqual({
      kind: 'move',
      targetVirtualIndex: 4,
    });
    expect(resolveHorizontalPagingTarget(5, 3, 4, 1, true)).toEqual({
      kind: 'move',
      targetVirtualIndex: 6,
    });
  });
});
