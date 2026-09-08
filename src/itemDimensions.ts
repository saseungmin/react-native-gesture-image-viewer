import type { GestureViewerItemDimensions, GestureViewerItemDimensionsResolver } from './types';

type ItemDimensionsRegistryEntry<ItemT> = Readonly<{
  item: ItemT;
  dimensions: GestureViewerItemDimensions;
}>;

export type ItemDimensionsRegistry<ItemT> = Map<number, ItemDimensionsRegistryEntry<ItemT>>;

export const isValidItemDimensions = (
  dimensions: GestureViewerItemDimensions | undefined,
): dimensions is GestureViewerItemDimensions => {
  return (
    dimensions !== undefined &&
    Number.isFinite(dimensions.width) &&
    Number.isFinite(dimensions.height) &&
    dimensions.width > 0 &&
    dimensions.height > 0
  );
};

export const pruneItemDimensionsRegistry = <ItemT>(
  registry: ItemDimensionsRegistry<ItemT>,
  data: readonly ItemT[],
): void => {
  for (const [index, entry] of registry) {
    if (index < 0 || index >= data.length || !Object.is(data[index], entry.item)) {
      registry.delete(index);
    }
  }
};

export const resolveItemDimensions = <ItemT>({
  registry,
  data,
  index,
  getItemDimensions,
}: {
  registry: ItemDimensionsRegistry<ItemT>;
  data: readonly ItemT[];
  index: number;
  getItemDimensions?: GestureViewerItemDimensionsResolver<ItemT>;
}): GestureViewerItemDimensions | undefined => {
  if (index < 0 || index >= data.length) {
    return undefined;
  }

  const item = data[index] as ItemT;
  const registered = registry.get(index);

  if (
    registered &&
    Object.is(registered.item, item) &&
    isValidItemDimensions(registered.dimensions)
  ) {
    return registered.dimensions;
  }

  const resolved = getItemDimensions?.(item, index);

  return isValidItemDimensions(resolved) ? resolved : undefined;
};

export const registerItemDimensions = <ItemT>({
  registry,
  data,
  index,
  item,
  dimensions,
}: {
  registry: ItemDimensionsRegistry<ItemT>;
  data: readonly ItemT[];
  index: number;
  item: ItemT;
  dimensions: GestureViewerItemDimensions;
}): boolean => {
  if (
    index < 0 ||
    index >= data.length ||
    !Object.is(data[index], item) ||
    !isValidItemDimensions(dimensions)
  ) {
    return false;
  }

  const registered = registry.get(index);

  if (
    registered &&
    Object.is(registered.item, item) &&
    registered.dimensions.width === dimensions.width &&
    registered.dimensions.height === dimensions.height
  ) {
    return false;
  }

  registry.set(index, {
    item,
    dimensions: {
      height: dimensions.height,
      width: dimensions.width,
    },
  });

  return true;
};
