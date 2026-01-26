---
"react-native-gesture-image-viewer": patch
---

fix: prevent image jump when lifting one finger during pinch zoom

- Fixed an issue where the image would abruptly snap/jump when lifting one finger during a two-finger pinch-to-zoom gesture.
- The image now maintains its position when transitioning from two fingers to one finger.

Related issue: [#134](https://github.com/saseungmin/react-native-gesture-image-viewer/issues/134)
