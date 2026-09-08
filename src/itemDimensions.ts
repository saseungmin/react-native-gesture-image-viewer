import type { GestureViewerItemDimensions, GestureViewerItemDimensionsResolver } from './types';

type Entry<ItemT> = Readonly<{ item: ItemT; dimensions: GestureViewerItemDimensions }>;
export type ItemDimensionsRegistry<ItemT> = Map<number, Entry<ItemT>>;

export const isValidItemDimensions = (
  dimensions: GestureViewerItemDimensions | undefined,
): dimensions is GestureViewerItemDimensions =>
  !!dimensions &&
  Number.isFinite(dimensions.width) &&
  Number.isFinite(dimensions.height) &&
  dimensions.width > 0 &&
  dimensions.height > 0;

export const pruneItemDimensionsRegistry = <ItemT>(
  registry: ItemDimensionsRegistry<ItemT>,
  data: readonly ItemT[],
) => {
  for (const [index, entry] of registry) {
    if (index < 0 || index >= data.length || !Object.is(data[index], entry.item)) {
      registry.delete(index);
    }
  }
};

export const resolveItemDimensions = <ItemT>({
  data,
  getItemDimensions,
  index,
  registry,
}: {
  data: readonly ItemT[];
  getItemDimensions?: GestureViewerItemDimensionsResolver<ItemT>;
  index: number;
  registry: ItemDimensionsRegistry<ItemT>;
}): GestureViewerItemDimensions | undefined => {
  if (index < 0 || index >= data.length) {
    return undefined;
  }

  const item = data[index] as ItemT;
  const entry = registry.get(index);

  if (entry && Object.is(entry.item, item) && isValidItemDimensions(entry.dimensions)) {
    return entry.dimensions;
  }

  const resolved = getItemDimensions?.(item, index);
  return isValidItemDimensions(resolved) ? resolved : undefined;
};

export const registerItemDimensions = <ItemT>({
  data,
  dimensions,
  index,
  item,
  registry,
}: {
  data: readonly ItemT[];
  dimensions: GestureViewerItemDimensions;
  index: number;
  item: ItemT;
  registry: ItemDimensionsRegistry<ItemT>;
}): 'ignored' | 'unchanged' | 'updated' => {
  if (
    index < 0 ||
    index >= data.length ||
    !Object.is(data[index], item) ||
    !isValidItemDimensions(dimensions)
  ) {
    return 'ignored';
  }

  const entry = registry.get(index);

  if (
    entry &&
    Object.is(entry.item, item) &&
    entry.dimensions.width === dimensions.width &&
    entry.dimensions.height === dimensions.height
  ) {
    return 'unchanged';
  }

  registry.set(index, { item, dimensions: { height: dimensions.height, width: dimensions.width } });
  return 'updated';
};
