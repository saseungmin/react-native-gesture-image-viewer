import { describe, expect, it } from '@jest/globals';

import { getWebAutoPlayTargetPhysicalIndex, resolveWebScrollFinalState } from '../utils/webScroll';

describe('web scroll settling', () => {
  it('wraps from the first page to the last page when loop is enabled', () => {
    expect(
      resolveWebScrollFinalState({
        dataLength: 5,
        enableLoop: true,
        lastSettledPhysicalIndex: 1,
        offsetX: 0,
        pageWidth: 100,
      }),
    ).toEqual({
      logicalIndex: 4,
      rawPhysicalIndex: 0,
      settledPhysicalIndex: 5,
    });
  });

  it('wraps from the last page to the first page when loop is enabled', () => {
    expect(
      resolveWebScrollFinalState({
        dataLength: 5,
        enableLoop: true,
        lastSettledPhysicalIndex: 5,
        offsetX: 600,
        pageWidth: 100,
      }),
    ).toEqual({
      logicalIndex: 0,
      rawPhysicalIndex: 6,
      settledPhysicalIndex: 1,
    });
  });

  it('treats a FlashList-style jump from the first page to the loop tail as a wrap to the last page', () => {
    expect(
      resolveWebScrollFinalState({
        dataLength: 5,
        enableLoop: true,
        lastSettledPhysicalIndex: 1,
        offsetX: 500,
        pageWidth: 100,
      }),
    ).toEqual({
      logicalIndex: 4,
      rawPhysicalIndex: 5,
      settledPhysicalIndex: 5,
    });
  });

  it('treats a FlashList-style jump from the last page to the loop head as a wrap to the first page', () => {
    expect(
      resolveWebScrollFinalState({
        dataLength: 5,
        enableLoop: true,
        lastSettledPhysicalIndex: 5,
        offsetX: 100,
        pageWidth: 100,
      }),
    ).toEqual({
      logicalIndex: 0,
      rawPhysicalIndex: 1,
      settledPhysicalIndex: 1,
    });
  });
  it('does not settle on an intermediate raw page when the last observed raw page has already changed', () => {
    const firstPass = resolveWebScrollFinalState({
      dataLength: 5,
      enableLoop: false,
      lastSettledPhysicalIndex: 1,
      offsetX: 200,
      pageWidth: 100,
    });

    expect(firstPass).toEqual({
      logicalIndex: 2,
      rawPhysicalIndex: 2,
      settledPhysicalIndex: 2,
    });
  });
  it('keeps non-loop web paging aligned to the browser-settled logical page', () => {
    expect(
      resolveWebScrollFinalState({
        dataLength: 5,
        enableLoop: false,
        lastSettledPhysicalIndex: 1,
        offsetX: 400,
        pageWidth: 100,
      }),
    ).toEqual({
      logicalIndex: 4,
      rawPhysicalIndex: 4,
      settledPhysicalIndex: 4,
    });
  });

  it('calculates the next autoplay target for looped web paging', () => {
    expect(
      getWebAutoPlayTargetPhysicalIndex({
        currentIndex: 3,
        dataLength: 5,
        enableLoop: true,
      }),
    ).toBe(5);

    expect(
      getWebAutoPlayTargetPhysicalIndex({
        currentIndex: 4,
        dataLength: 5,
        enableLoop: true,
      }),
    ).toBe(6);
  });
});
