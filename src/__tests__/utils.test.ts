import {
  FlatList as GestureFlatList,
  ScrollView as GestureScrollView,
} from 'react-native-gesture-handler';

import {
  clampIndex,
  clampTranslationToBounds,
  getLoopPhysicalIndex,
  shouldUseNativeScrollGesture,
} from '../utils';
import { getTapZoomTarget } from '../utils/tapZoom';
import { calculateFocalPointTranslation, shouldAcceptFocalPoint } from '../utils/zoom';

function PlainScrollView() {
  return null;
}

function PlainFlatList() {
  return null;
}

describe('clampIndex', () => {
  it('normalizes initial indexes against the current data length', () => {
    expect(clampIndex(2, 3)).toBe(2);
    expect(clampIndex(9, 3)).toBe(2);
    expect(clampIndex(-2, 3)).toBe(0);
    expect(clampIndex(1.8, 3)).toBe(1);
    expect(clampIndex(Number.NaN, 3)).toBe(0);
    expect(clampIndex(Number.POSITIVE_INFINITY, 3)).toBe(0);
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe('getLoopPhysicalIndex', () => {
  it('maps logical indexes only when loop sentinels exist', () => {
    expect(getLoopPhysicalIndex(0, 3, false)).toBe(0);
    expect(getLoopPhysicalIndex(2, 3, true)).toBe(3);
    expect(getLoopPhysicalIndex(0, 1, true)).toBe(0);
  });
});

describe('shouldUseNativeScrollGesture', () => {
  it('enables the native scroll workaround for non-RNGH scrollables on iOS', () => {
    expect(shouldUseNativeScrollGesture('ios', PlainScrollView)).toBe(true);
    expect(shouldUseNativeScrollGesture('ios', PlainFlatList)).toBe(true);
  });

  it('disables the workaround on Android', () => {
    expect(shouldUseNativeScrollGesture('android', PlainScrollView)).toBe(false);
    expect(shouldUseNativeScrollGesture('android', PlainFlatList)).toBe(false);
  });

  it('does not double-apply the workaround to RNGH scrollables', () => {
    expect(shouldUseNativeScrollGesture('ios', GestureScrollView)).toBe(false);
    expect(shouldUseNativeScrollGesture('ios', GestureFlatList)).toBe(false);
  });
});

describe('clampTranslationToBounds', () => {
  it('preserves translation below or at scale one', () => {
    expect(
      clampTranslationToBounds({
        height: 852,
        scale: 1,
        translateX: 999,
        translateY: -999,
        width: 393,
      }),
    ).toEqual({
      translateX: 999,
      translateY: -999,
    });
  });

  it('clamps contain-fitted content to its actual edge', () => {
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: 2,
        translateX: 0,
        translateY: 426,
        width: 393,
      }),
    ).toEqual({
      translateX: 0,
      translateY: 190,
    });
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: 2,
        translateX: 0,
        translateY: -426,
        width: 393,
      }),
    ).toEqual({
      translateX: 0,
      translateY: -190,
    });
  });

  it('keeps an axis centered while scaled content is still smaller than the viewport', () => {
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: 1.2,
        translateX: 20,
        translateY: 118,
        width: 393,
      }),
    ).toEqual({
      translateX: 20,
      translateY: 0,
    });
  });

  it('keeps the letterboxed axis centered through the scale threshold', () => {
    const thresholdScale = 852 / 616;

    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: thresholdScale - 0.001,
        translateX: 0,
        translateY: 20,
        width: 393,
      }).translateY,
    ).toBe(0);
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: thresholdScale,
        translateX: 0,
        translateY: 20,
        width: 393,
      }).translateY,
    ).toBe(0);
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: thresholdScale + 0.001,
        translateX: 0,
        translateY: 20,
        width: 393,
      }).translateY,
    ).toBeCloseTo(0.308, 3);
  });

  it('keeps in-range values and clamps both edges symmetrically', () => {
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: 3,
        translateX: 30,
        translateY: 400,
        width: 393,
      }),
    ).toEqual({
      translateX: 30,
      translateY: 400,
    });
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: 3,
        translateX: 900,
        translateY: 900,
        width: 393,
      }),
    ).toEqual({
      translateX: 393,
      translateY: 498,
    });
    expect(
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale: 3,
        translateX: -900,
        translateY: -900,
        width: 393,
      }),
    ).toEqual({
      translateX: -393,
      translateY: -498,
    });
  });

  it('falls back to viewport-cell bounds when content dimensions are missing or invalid', () => {
    expect(
      clampTranslationToBounds({
        contentHeight: 0,
        contentWidth: Number.NaN,
        height: 852,
        scale: 2,
        translateX: 999,
        translateY: 999,
        width: 393,
      }),
    ).toEqual({
      translateX: 196.5,
      translateY: 426,
    });
  });
});

describe('getTapZoomTarget', () => {
  it('keeps existing callers on the viewport-cell fallback', () => {
    expect(
      getTapZoomTarget({
        height: 852,
        maxZoomScale: 2,
        scale: 1,
        width: 393,
        x: 196.5,
        y: 852,
      }),
    ).toEqual({
      scale: 2,
      translateX: 0,
      translateY: -426,
    });
  });

  it('clamps double-tap zoom targets to content-aware bounds', () => {
    expect(
      getTapZoomTarget({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        maxZoomScale: 2,
        scale: 1,
        width: 393,
        x: 196.5,
        y: 852,
      }),
    ).toEqual({
      scale: 2,
      translateX: 0,
      translateY: -190,
    });
  });

  it('keeps tap zoom centered on an axis until scaled content fills the viewport', () => {
    expect(
      getTapZoomTarget({
        contentHeight: 221,
        contentWidth: 393,
        height: 852,
        maxZoomScale: 2,
        scale: 1,
        width: 393,
        x: 196.5,
        y: 852,
      }),
    ).toEqual({
      scale: 2,
      translateX: 0,
      translateY: 0,
    });
  });

  it('resets tap zoom back to centered scale one', () => {
    expect(
      getTapZoomTarget({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        maxZoomScale: 2,
        scale: 2,
        width: 393,
        x: 196.5,
        y: 852,
      }),
    ).toEqual({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  });
});

describe('calculateFocalPointTranslation', () => {
  it('keeps translation unchanged when zooming around the viewer center', () => {
    expect(
      calculateFocalPointTranslation({
        currentFocalX: 200,
        currentFocalY: 400,
        height: 800,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        nextScale: 2,
        startFocalX: 200,
        startFocalY: 400,
        width: 400,
      }),
    ).toEqual({ translateX: 0, translateY: 0 });
  });

  it('anchors horizontal edge focal points during zoom', () => {
    expect(
      calculateFocalPointTranslation({
        currentFocalX: 50,
        currentFocalY: 400,
        height: 800,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        nextScale: 2,
        startFocalX: 50,
        startFocalY: 400,
        width: 400,
      }).translateX,
    ).toBe(150);

    expect(
      calculateFocalPointTranslation({
        currentFocalX: 350,
        currentFocalY: 400,
        height: 800,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        nextScale: 2,
        startFocalX: 350,
        startFocalY: 400,
        width: 400,
      }).translateX,
    ).toBe(-150);
  });

  it('anchors vertical edge focal points during zoom', () => {
    expect(
      calculateFocalPointTranslation({
        currentFocalX: 200,
        currentFocalY: 100,
        height: 800,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        nextScale: 2,
        startFocalX: 200,
        startFocalY: 100,
        width: 400,
      }).translateY,
    ).toBe(300);

    expect(
      calculateFocalPointTranslation({
        currentFocalX: 200,
        currentFocalY: 700,
        height: 800,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        nextScale: 2,
        startFocalX: 200,
        startFocalY: 700,
        width: 400,
      }).translateY,
    ).toBe(-300);
  });

  it('scales previous translation from an existing zoom state', () => {
    expect(
      calculateFocalPointTranslation({
        currentFocalX: 350,
        currentFocalY: 700,
        height: 800,
        initialScale: 2,
        initialTranslateX: 20,
        initialTranslateY: -40,
        nextScale: 3,
        startFocalX: 350,
        startFocalY: 700,
        width: 400,
      }),
    ).toEqual({ translateX: -45, translateY: -210 });
  });

  it('follows movement of the two-finger midpoint while scaling', () => {
    expect(
      calculateFocalPointTranslation({
        currentFocalX: 230,
        currentFocalY: 430,
        height: 800,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        nextScale: 2,
        startFocalX: 200,
        startFocalY: 400,
        width: 400,
      }),
    ).toEqual({ translateX: 30, translateY: 30 });
  });
});

describe('shouldAcceptFocalPoint', () => {
  it('always accepts the first active focal point sample', () => {
    expect(
      shouldAcceptFocalPoint({
        focalX: 350,
        focalY: 700,
        hasActiveFocal: false,
        lastFocalX: 0,
        lastFocalY: 0,
        threshold: 50,
      }),
    ).toBe(true);
  });

  it('keeps rejecting large focal jumps after active focal initialization', () => {
    expect(
      shouldAcceptFocalPoint({
        focalX: 350,
        focalY: 700,
        hasActiveFocal: true,
        lastFocalX: 0,
        lastFocalY: 0,
        threshold: 50,
      }),
    ).toBe(false);
  });
});
