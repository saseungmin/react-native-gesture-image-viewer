import { clampTranslationToBounds } from '../utils';
import { getTapZoomTarget } from '../utils/tapZoom';
import { calculateFocalPointTranslation, shouldAcceptFocalPoint } from '../utils/zoom';

describe('content-aware bounds', () => {
  it('clamps fitted content edges symmetrically and centers undersized axes', () => {
    const bound = (translateX: number, translateY: number, scale: number) =>
      clampTranslationToBounds({
        contentHeight: 616,
        contentWidth: 393,
        height: 852,
        scale,
        translateX,
        translateY,
        width: 393,
      });
    expect(bound(426, 426, 2)).toEqual({
      translateX: 196.5,
      translateY: 190,
    });
    expect(bound(-426, -426, 2)).toEqual({
      translateX: -196.5,
      translateY: -190,
    });
    expect(bound(20, 118, 1.2)).toEqual({
      translateX: 20,
      translateY: 0,
    });
  });

  it('clamps extreme taps and falls back to viewport bounds', () => {
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
    ).toEqual({ scale: 2, translateX: 0, translateY: -190 });
    expect(
      getTapZoomTarget({ height: 852, maxZoomScale: 2, scale: 1, width: 393, x: 196.5, y: 852 }),
    ).toEqual({ scale: 2, translateX: 0, translateY: -426 });
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
