import { Gesture } from 'react-native-gesture-handler';

import { composeGestureViewerGestures } from '../gestureViewerGestures';

describe('composeGestureViewerGestures', () => {
  it('keeps pinch observable while single-pointer gestures remain mutually exclusive', () => {
    const dismissGesture = Gesture.Pan();
    const horizontalPagingGesture = Gesture.Pan();
    const zoomPinchGesture = Gesture.Pinch();
    const zoomPanGesture = Gesture.Pan();
    const tapGesture = Gesture.Tap();
    const zoomGesture = Gesture.Exclusive(zoomPanGesture, tapGesture);

    const gesture = composeGestureViewerGestures({
      dismissGesture,
      horizontalPagingGesture,
      zoomGesture,
      zoomPinchGesture,
    });

    gesture.prepare();

    const singlePointerGestures = [
      dismissGesture,
      horizontalPagingGesture,
      zoomPanGesture,
      tapGesture,
    ];

    expect(zoomPinchGesture.config.simultaneousWith).toEqual(
      expect.arrayContaining(singlePointerGestures),
    );

    singlePointerGestures.forEach((singlePointerGesture) => {
      expect(singlePointerGesture.config.simultaneousWith).toEqual([zoomPinchGesture]);
    });
  });
});
