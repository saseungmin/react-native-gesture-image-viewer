---
'react-native-gesture-image-viewer': patch
---

Prevent adjacent images from bleeding into the active page when pinch zoom takes over after horizontal paging.

Page slots now clip their contents, and an interrupted horizontal swipe snaps back to the committed page before pinch zoom updates transforms.
