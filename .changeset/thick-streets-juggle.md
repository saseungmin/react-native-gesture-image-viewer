---
"react-native-gesture-image-viewer": minor
---

refactor: migrated from deprecated `runOnJS` to `scheduleOnRN` for react-native-worklets 0.5.0+

### What changed

- Replaced all `runOnJS` calls with `scheduleOnRN` as `runOnJS` is deprecated in react-native-worklets 0.5.0
- Updated peer dependency from `react-native-worklets: "*"` to `react-native-worklets: ">=0.5.0"`
- Updated Minimum Requirements in v2 documentation

### Migration

If you're using react-native-worklets < 0.5.0, you'll need to upgrade to 0.5.0 or higher.

### Reference

- [react-native-worklets 0.5.0 release notes](https://github.com/software-mansion/react-native-reanimated/releases/tag/worklets-0.5.0)
- [react-native-worklets documentation](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnJS/)
