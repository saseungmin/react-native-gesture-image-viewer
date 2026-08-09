import { Gesture, type ComposedGesture, type GestureType } from 'react-native-gesture-handler';

type GestureViewerGestures = {
  dismissGesture: GestureType;
  horizontalPagingGesture: GestureType;
  zoomGesture: ComposedGesture;
  zoomPinchGesture: GestureType;
};

export function composeGestureViewerGestures({
  dismissGesture,
  horizontalPagingGesture,
  zoomGesture,
  zoomPinchGesture,
}: GestureViewerGestures): ComposedGesture {
  return Gesture.Simultaneous(
    zoomPinchGesture,
    Gesture.Race(dismissGesture, horizontalPagingGesture, zoomGesture),
  );
}
