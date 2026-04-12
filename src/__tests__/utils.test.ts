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
