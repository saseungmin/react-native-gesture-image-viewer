import type { ReactElement } from 'react';
import { Children, cloneElement, isValidElement, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { registry } from './GestureViewerRegistry';

/**
 * Minimal contract for a pressable child's props.
 * The child must optionally accept an `onPress` handler.
 */
type WithOnPress = { onPress?: (...args: unknown[]) => void };

/**
 * Props for `GestureTrigger`.
 *
 * @typeParam T - The child's props type. Must include an optional `onPress` handler.
 *
 * @property id - Optional identifier to associate this trigger with a `GestureViewer`.
 * @property index - Optional item index used to align dismiss animations with the current viewer index.
 * @property children - A single React element whose props include `onPress` (e.g., `Pressable`, `Touchable*`).
 * @property onPress - Optional handler invoked after the child's own `onPress`.
 */
export type GestureTriggerProps<T extends WithOnPress> = {
  id?: string;
  index?: number;
  children: ReactElement<T>;
  onPress?: (...args: unknown[]) => void;
};

/**
 * Wraps a pressable child element and registers its native view as a trigger for `GestureViewer`.
 *
 * @remarks
 * Behavior on press:
 * - Registers the child's native node as the active trigger under the given `id`.
 * - Invokes the child's own `onPress` first (if provided).
 * - Invokes the `onPress` passed to `GestureTrigger` next (if provided).
 *
 * When `index` is provided, the trigger is also registered by item index while mounted,
 * allowing dismiss animations to target the currently visible item instead of only the opening trigger.
 *
 * Type parameters:
 * - `T` — The child's props type. Must include an optional `onPress` handler, ensuring the child is pressable.
 *
 * Props:
 * - `id` — Optional identifier to associate this trigger with a `GestureViewer`. Defaults to `"default"`.
 * - `index` — Optional item index used to support dismiss animations back to the current item trigger.
 * - `children` — A single React element whose props include `onPress` (e.g., `Pressable`, `Touchable*`, custom button).
 * - `onPress` — Optional handler invoked after the child's `onPress`. Receives the same arguments as the child's handler.
 *
 * Notes:
 * - If neither the child nor this component provides `onPress`, a dev warning is logged and nothing happens on press.
 * - Only a single child is allowed; wrap lists using `React.Children.map` when needed.
 *
 * Example:
 * ```tsx
 * <GestureTrigger id="gallery" index={index} onPress={() => openModal(index)}>
 *   <Pressable style={styles.thumb}>
 *     <Image source={{ uri }} style={styles.thumbImage} />
 *   </Pressable>
 * </GestureTrigger>
 * ```
 */
export function GestureTrigger<T extends WithOnPress>({
  id = 'default',
  index,
  children,
  onPress,
}: GestureTriggerProps<T>) {
  const ref = useRef<View | null>(null);

  const handleRef = useCallback(
    (node: View | null) => {
      ref.current = node;

      if (index === undefined) {
        return;
      }

      if (node) {
        registry.setIndexedTriggerNode(id, index, node);
        return;
      }

      registry.clearIndexedTriggerNode(id, index);
    },
    [id, index],
  );

  const wrapped = useMemo(() => {
    const child = Children.only(children);

    if (!isValidElement(child)) {
      return children;
    }

    const originalOnPress = child.props?.onPress;

    const handlePress = (...args: unknown[]) => {
      registry.setActiveTriggerNode(id, ref.current);
      originalOnPress?.(...args);
      onPress?.(...args);

      if (__DEV__ && !originalOnPress && !onPress) {
        console.warn(
          '[GestureTrigger] No onPress found on child or props. Nothing will happen on press.',
        );
      }
    };

    return cloneElement(child, {
      ...child.props,
      onPress: handlePress,
    });
  }, [id, onPress, children]);

  return (
    <View ref={handleRef} collapsable={false}>
      {wrapped}
    </View>
  );
}
