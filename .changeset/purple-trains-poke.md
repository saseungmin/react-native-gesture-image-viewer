---
"react-native-gesture-image-viewer": patch
---

fix: resolve Metro bundler error for optional FlashList dependency

- Separate optional library imports into dedicated file
- Fix "Requiring unknown module" error when FlashList is not installed
- Enable dynamic feature detection without breaking Metro static analysis

[Related issue](https://github.com/saseungmin/react-native-gesture-image-viewer/issues/120)
