---
'react-native-gesture-image-viewer': minor
---

Add opt-in `panInertia` for zoomed images. Enable default momentum with `true`, or pass `{ enabled: true, deceleration }` to tune it. Inertia respects content bounds and reduced-motion preferences, and stops when a new interaction takes over. Existing behavior is unchanged when omitted.
