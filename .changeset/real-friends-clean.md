---
"react-native-gesture-image-viewer": minor
---

feat: add customizable `width` and `height` props to `GestureViewer`

- Add `height` prop to enable custom viewer height
- Remove `useSnap` restriction for `width` customization
- Allow custom `width` in both snap and paging modes
- Maintain backward compatibility with screen dimensions as defaults
- Improve flexibility for different layout requirements

Example:

```tsx
<GestureViewer
  width={400}
  height={600}
/>
```
