---
"react-native-gesture-image-viewer": patch
---

fix(GestureTrigger): set `collapsable` prop to `false` for stable gesture handling

- Explicitly sets `collapsable` to `false` to prevent the view from being removed from the native hierarchy, ensuring consistent gesture recognition and layout stability.
