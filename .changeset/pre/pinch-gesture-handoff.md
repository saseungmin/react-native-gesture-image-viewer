---
'react-native-gesture-image-viewer': patch
---

Fix gesture conflicts between pinch zoom, one-finger drags, and single taps.

When a second finger is added during swipe-to-dismiss, horizontal paging, or panning a zoomed image, pinch zoom now takes control. Any interrupted dismiss movement resets before zooming begins.

Single-tap callbacks are no longer triggered after pinching, swiping, or dragging. Native taps now allow at most 10 points of movement to avoid treating an attempted drag as a tap.
