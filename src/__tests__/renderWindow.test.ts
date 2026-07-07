import {
  clampIndex,
  createRenderWindow,
  getLogicalIndex,
  getPageStride,
  getVirtualIndexForLogicalIndex,
  normalizePageSpacing,
  normalizeWindowSize,
  resolveNavigation,
  shouldRunNavigationDuringTransition,
} from '../renderWindow';

describe('render window normalization', () => {
  it('normalizes window size to an odd value of at least 3', () => {
    expect(normalizeWindowSize()).toBe(3);
    expect(normalizeWindowSize(1)).toBe(3);
    expect(normalizeWindowSize(3)).toBe(3);
    expect(normalizeWindowSize(4)).toBe(5);
    expect(normalizeWindowSize(Number.NaN)).toBe(3);
  });

  it('normalizes page spacing and computes stride separately from viewport width', () => {
    expect(normalizePageSpacing()).toBe(0);
    expect(normalizePageSpacing(-10)).toBe(0);
    expect(normalizePageSpacing(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizePageSpacing(16)).toBe(16);
    expect(getPageStride(320, 24)).toBe(344);
  });

  it('clamps indexes against the current data length', () => {
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(2, 5)).toBe(2);
    expect(clampIndex(99, 5)).toBe(4);
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe('render window slot mapping', () => {
  const data = ['a', 'b', 'c', 'd'];

  it('renders previous, current, and next items around the center in non-loop mode', () => {
    const slots = createRenderWindow({
      centerVirtualIndex: 2,
      data,
      enableLoop: false,
      windowSize: 3,
    });

    expect(slots.map((slot) => slot.logicalIndex)).toEqual([1, 2, 3]);
    expect(slots.map((slot) => slot.slotKey)).toEqual(['slot-1', 'slot-2', 'slot-3']);
  });

  it('omits out-of-range edge slots in non-loop mode', () => {
    expect(
      createRenderWindow({
        centerVirtualIndex: 0,
        data,
        enableLoop: false,
        windowSize: 3,
      }).map((slot) => slot.logicalIndex),
    ).toEqual([0, 1]);

    expect(
      createRenderWindow({
        centerVirtualIndex: 3,
        data,
        enableLoop: false,
        windowSize: 3,
      }).map((slot) => slot.logicalIndex),
    ).toEqual([2, 3]);
  });

  it('wraps loop edges and allows repeated logical items for small data sets', () => {
    expect(
      createRenderWindow({
        centerVirtualIndex: 0,
        data,
        enableLoop: true,
        windowSize: 3,
      }).map((slot) => slot.logicalIndex),
    ).toEqual([3, 0, 1]);

    expect(
      createRenderWindow({
        centerVirtualIndex: 0,
        data: ['a', 'b'],
        enableLoop: true,
        windowSize: 5,
      }).map((slot) => slot.logicalIndex),
    ).toEqual([0, 1, 0, 1, 0]);
  });

  it('renders only the center slot for a single looped item', () => {
    const slots = createRenderWindow({
      centerVirtualIndex: 4,
      data: ['a'],
      enableLoop: true,
      windowSize: 5,
    });

    expect(slots).toEqual([
      {
        item: 'a',
        logicalIndex: 0,
        slotKey: 'slot-4',
        virtualIndex: 4,
      },
    ]);
  });

  it('keeps explicit undefined items in dense data arrays', () => {
    const slots = createRenderWindow<string | undefined>({
      centerVirtualIndex: 0,
      data: [undefined, 'b'],
      enableLoop: false,
      windowSize: 3,
    });

    expect(slots.map((slot) => slot.item)).toEqual([undefined, 'b']);
  });

  it('keeps the same virtual page key when the center advances', () => {
    const initialSlots = createRenderWindow({
      centerVirtualIndex: 0,
      data,
      enableLoop: false,
      windowSize: 3,
    });
    const nextSlots = createRenderWindow({
      centerVirtualIndex: 1,
      data,
      enableLoop: false,
      windowSize: 3,
    });

    expect(initialSlots.find((slot) => slot.virtualIndex === 1)?.slotKey).toBe(
      nextSlots.find((slot) => slot.virtualIndex === 1)?.slotKey,
    );
  });

  it('maps virtual indexes to logical indexes by mode', () => {
    expect(getLogicalIndex(-1, 4, false)).toBeNull();
    expect(getLogicalIndex(-1, 4, true)).toBe(3);
    expect(getLogicalIndex(4, 4, true)).toBe(0);
  });

  it('finds the nearest loop virtual index for a logical target', () => {
    expect(getVirtualIndexForLogicalIndex(0, 3, 4, true)).toBe(4);
    expect(getVirtualIndexForLogicalIndex(3, 0, 4, true)).toBe(-1);
    expect(getVirtualIndexForLogicalIndex(2, 0, 4, false)).toBe(2);
  });
});

describe('navigation resolution', () => {
  it('classifies adjacent and non-adjacent navigation', () => {
    expect(
      resolveNavigation({ currentIndex: 1, dataLength: 5, enableLoop: false, targetIndex: 2 }),
    ).toEqual({ direction: 1, kind: 'step', targetIndex: 2 });

    expect(
      resolveNavigation({ currentIndex: 2, dataLength: 5, enableLoop: false, targetIndex: 1 }),
    ).toEqual({ direction: -1, kind: 'step', targetIndex: 1 });

    expect(
      resolveNavigation({ currentIndex: 0, dataLength: 5, enableLoop: false, targetIndex: 4 }),
    ).toEqual({ kind: 'jump', targetIndex: 4 });
  });

  it('classifies loop edge navigation as adjacent steps', () => {
    expect(
      resolveNavigation({ currentIndex: 3, dataLength: 4, enableLoop: true, targetIndex: 0 }),
    ).toEqual({ direction: 1, kind: 'step', targetIndex: 0 });

    expect(
      resolveNavigation({ currentIndex: 0, dataLength: 4, enableLoop: true, targetIndex: 3 }),
    ).toEqual({ direction: -1, kind: 'step', targetIndex: 3 });
  });

  it('uses forward direction as the default two-item loop tie-breaker', () => {
    expect(
      resolveNavigation({ currentIndex: 1, dataLength: 2, enableLoop: true, targetIndex: 0 }),
    ).toEqual({ direction: 1, kind: 'step', targetIndex: 0 });

    expect(
      resolveNavigation({ currentIndex: 0, dataLength: 2, enableLoop: true, targetIndex: 1 }),
    ).toEqual({ direction: 1, kind: 'step', targetIndex: 1 });
  });

  it('honors preferred directions for two-item loop controls', () => {
    expect(
      resolveNavigation({
        currentIndex: 1,
        dataLength: 2,
        enableLoop: true,
        preferredDirection: -1,
        targetIndex: 0,
      }),
    ).toEqual({ direction: -1, kind: 'step', targetIndex: 0 });

    expect(
      resolveNavigation({
        currentIndex: 0,
        dataLength: 2,
        enableLoop: true,
        preferredDirection: -1,
        targetIndex: 1,
      }),
    ).toEqual({ direction: -1, kind: 'step', targetIndex: 1 });

    expect(
      resolveNavigation({
        currentIndex: 1,
        dataLength: 2,
        enableLoop: true,
        preferredDirection: 1,
        targetIndex: 0,
      }),
    ).toEqual({ direction: 1, kind: 'step', targetIndex: 0 });
  });

  it('no-ops empty, same-index, and out-of-range targets', () => {
    expect(
      resolveNavigation({ currentIndex: 0, dataLength: 0, enableLoop: true, targetIndex: 0 }),
    ).toEqual({ kind: 'noop' });

    expect(
      resolveNavigation({ currentIndex: 2, dataLength: 4, enableLoop: true, targetIndex: 2 }),
    ).toEqual({ kind: 'noop' });

    expect(
      resolveNavigation({ currentIndex: 2, dataLength: 4, enableLoop: true, targetIndex: 4 }),
    ).toEqual({ kind: 'noop' });
  });

  it('allows immediate rebase navigation during an active transition', () => {
    expect(shouldRunNavigationDuringTransition({ kind: 'jump', targetIndex: 4 })).toBe(true);
    expect(
      shouldRunNavigationDuringTransition(
        { direction: 1, kind: 'step', targetIndex: 2 },
        { animated: false },
      ),
    ).toBe(true);
    expect(
      shouldRunNavigationDuringTransition({ direction: 1, kind: 'step', targetIndex: 2 }),
    ).toBe(false);
    expect(shouldRunNavigationDuringTransition({ kind: 'noop' })).toBe(false);
  });
});
