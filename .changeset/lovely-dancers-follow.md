---
"react-native-gesture-image-viewer": patch
---

fix: resolve Metro bundler error for optional FlashList dependency (cherry pick)

- Separate optional library imports into dedicated file
- Fix "Requiring unknown module" error when FlashList is not installed
