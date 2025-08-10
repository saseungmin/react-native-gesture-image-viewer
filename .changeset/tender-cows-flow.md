---
"react-native-gesture-image-viewer": patch
---

fix: remove key prop from list item children for better performance

- Remove key prop from View children when using FlatList/FlashList
- Keep key prop only for ScrollView children
- Improves FlashList performance by allowing proper item reuse
- Follows FlashList official performance guidelines

Refs: https://shopify.github.io/flash-list/docs/fundamentals/performance#remove-key-prop
