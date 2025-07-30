---
"react-native-gesture-image-viewer": patch
---

refactor(loop): replace timeout with event-driven loop animation

- Remove hardcoded 300ms timeout dependency
- Use onMomentumScrollEnd for accurate animation completion detection
- Implement callback-based approach for better timing control
- Handle user scroll interruption during loop transitions
