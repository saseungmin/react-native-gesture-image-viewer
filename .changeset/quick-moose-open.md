---
"react-native-gesture-image-viewer": patch
---

fix(android): prevent image jump when lifting finger during pinch zoom

Filter out sudden focal point changes when a finger is lifted during pinch-to-zoom gesture.  
This prevents the image from snapping to the remaining finger's position.

- Add lastFocalX/lastFocalY shared values to track focal point
- Filter focal point changes exceeding 50px threshold
- Maintain smooth zoom behavior while preventing jump artifacts

Related issue: [#134](https://github.com/saseungmin/react-native-gesture-image-viewer/issues/134)
