---
"react-native-gesture-image-viewer": patch
---

chore(docs): replace `@remark` with `@remarks` per TSDoc spec

- TSDoc specifies the tag name as `@remarks` (not `@remark`).
- This aligns our comments with the spec and improves tooling support.
- No runtime behavior changes.
- Ref: https://tsdoc.org/pages/tags/remarks/
