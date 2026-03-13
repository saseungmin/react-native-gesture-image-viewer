---
'react-native-gesture-image-viewer': patch
---

fix(ios): prevent ScrollView from stealing dismiss gesture in carousels

On iOS, horizontal paging ScrollView with 4+ items would steal touch ownership, preventing the vertical dismiss gesture from activating.  
Fixed by wrapping ScrollView with Gesture.Native() and requireExternalGestureToFail to ensure the dismiss gesture resolves before ScrollView claims the touch.
