import type {
  GestureViewerItemDimensions,
  GestureViewerItemDimensionsResolver,
  GestureViewerItemKey,
  GestureViewerItemKeyResolver,
} from './types';

type ItemDimensionsRegistryEntry<ItemT> = Readonly<{
  item: ItemT;
  itemKey?: GestureViewerItemKey;
  dimensions: GestureViewerItemDimensions;
}>;

export type ItemDimensionsRegistry<ItemT> = Map<number, ItemDimensionsRegistryEntry<ItemT>>;

export const isValidItemDimensions = (
  dimensions: GestureViewerItemDimensions | null | undefined,
): dimensions is GestureViewerItemDimensions => {
  return (
    dimensions !== null &&
    dimensions !== undefined &&
    Number.isFinite(dimensions.width) &&
    Number.isFinite(dimensions.height) &&
    dimensions.width > 0 &&
    dimensions.height > 0
  );
};

const resolveItemKey = <ItemT>(
  getItemKey: GestureViewerItemKeyResolver<ItemT> | undefined,
  item: ItemT,
  index: number,
): GestureViewerItemKey | undefined => {
  const itemKey = getItemKey?.(item, index);

  if (typeof itemKey === 'string') {
    return itemKey;
  }

  return typeof itemKey === 'number' && Number.isFinite(itemKey) ? itemKey : undefined;
};

const doesEntryMatchItem = <ItemT>(
  entry: ItemDimensionsRegistryEntry<ItemT>,
  item: ItemT,
  itemKey: GestureViewerItemKey | undefined,
): boolean => {
  if (itemKey !== undefined && entry.itemKey !== undefined) {
    return entry.itemKey === itemKey;
  }

  return Object.is(entry.item, item);
};

export const pruneItemDimensionsRegistry = <ItemT>(
  registry: ItemDimensionsRegistry<ItemT>,
  dataLength: number,
): void => {
  for (const index of registry.keys()) {
    if (index < 0 || index >= dataLength) {
      registry.delete(index);
    }
  }
};

export const resolveItemDimensions = <ItemT>({
  registry,
  data,
  index,
  getItemDimensions,
  getItemKey,
}: {
  registry: ItemDimensionsRegistry<ItemT>;
  data: readonly ItemT[];
  index: number;
  getItemDimensions?: GestureViewerItemDimensionsResolver<ItemT>;
  getItemKey?: GestureViewerItemKeyResolver<ItemT>;
}): GestureViewerItemDimensions | undefined => {
  if (index < 0 || index >= data.length) {
    return undefined;
  }

  const item = data[index] as ItemT;
  const registered = registry.get(index);
  const itemKey = registered ? resolveItemKey(getItemKey, item, index) : undefined;

  if (
    registered &&
    doesEntryMatchItem(registered, item, itemKey) &&
    isValidItemDimensions(registered.dimensions)
  ) {
    return registered.dimensions;
  }

  const resolved = getItemDimensions?.(item, index);

  if (isValidItemDimensions(resolved)) {
    return resolved;
  }

  return undefined;
};

export const registerItemDimensions = <ItemT>({
  registry,
  data,
  index,
  item,
  dimensions,
  getItemKey,
}: {
  registry: ItemDimensionsRegistry<ItemT>;
  data: readonly ItemT[];
  index: number;
  item: ItemT;
  dimensions: GestureViewerItemDimensions;
  getItemKey?: GestureViewerItemKeyResolver<ItemT>;
}): boolean => {
  if (index < 0 || index >= data.length || !isValidItemDimensions(dimensions)) {
    return false;
  }

  const currentItem = data[index] as ItemT;
  const currentItemKey = resolveItemKey(getItemKey, currentItem, index);
  const reportedItemKey = Object.is(currentItem, item)
    ? currentItemKey
    : resolveItemKey(getItemKey, item, index);
  const hasMatchingKey =
    currentItemKey !== undefined &&
    reportedItemKey !== undefined &&
    currentItemKey === reportedItemKey;

  if (!Object.is(currentItem, item) && !hasMatchingKey) {
    return false;
  }

  const registered = registry.get(index);

  if (
    registered &&
    doesEntryMatchItem(registered, currentItem, currentItemKey) &&
    registered.dimensions.width === dimensions.width &&
    registered.dimensions.height === dimensions.height
  ) {
    return false;
  }

  registry.set(index, {
    item: currentItem,
    itemKey: currentItemKey,
    dimensions: {
      height: dimensions.height,
      width: dimensions.width,
    },
  });

  return true;
};
