import { describe, expect, it, jest } from '@jest/globals';

jest.mock('react-native-gesture-handler', () => ({
  FlatList: function GestureFlatList() {
    return null;
  },
  ScrollView: function GestureScrollView() {
    return null;
  },
}));

import {
  FlatList as GestureFlatList,
  ScrollView as GestureScrollView,
} from 'react-native-gesture-handler';

import { shouldUseNativeScrollGesture } from '../utils';
import { calculateFocalPointTranslation, shouldAcceptFocalPoint } from '../utils/zoom';

function PlainScrollView() {
  return null;
}

function PlainFlatList() {
  return null;
}

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
