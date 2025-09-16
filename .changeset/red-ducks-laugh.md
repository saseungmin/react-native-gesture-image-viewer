---
"react-native-gesture-image-viewer": patch
---

fix(GestureViewer): resolve item visibility in FlashList v2 due to estimatedItemSize removal

- Explicitly set item height to screenHeight for FlashList v2 compatibility
- Fixes issue where items were not visible without explicit height
- [FlashList v2](https://shopify.github.io/flash-list/docs/v2-changes#deprecated) no longer supports `estimatedItemSize`, causing height: '100%' to not render correctly. Added explicit screen dimensions while maintaining v1 compatibility.
- Fix conditional rendering of list optimization props
