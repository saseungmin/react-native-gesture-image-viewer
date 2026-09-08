import {
  pruneItemDimensionsRegistry,
  registerItemDimensions,
  resolveItemDimensions,
  type ItemDimensionsRegistry,
} from '../itemDimensions';

type Item = { id: string };

describe('item dimensions registry', () => {
  it('uses the getter when no runtime dimensions are registered', () => {
    const item = { id: 'item' };
    const registry: ItemDimensionsRegistry<Item> = new Map();
    const getter = jest.fn(() => ({ height: 616, width: 393 }));

    expect(
      registerItemDimensions({
        data: [item],
        dimensions: { height: 0, width: Number.NaN },
        index: 0,
        item,
        registry,
      }),
    ).toBe('ignored');
    expect(
      resolveItemDimensions({ data: [item], getItemDimensions: getter, index: 0, registry }),
    ).toEqual({ height: 616, width: 393 });
  });

  it('prefers same-item runtime dimensions over the getter', () => {
    const item = { id: 'item' };
    const registry: ItemDimensionsRegistry<Item> = new Map();
    const getter = jest.fn(() => ({ height: 616, width: 393 }));

    expect(
      registerItemDimensions({
        data: [item],
        dimensions: { height: 200, width: 100 },
        index: 0,
        item,
        registry,
      }),
    ).toBe('updated');
    expect(
      resolveItemDimensions({ data: [item], getItemDimensions: getter, index: 0, registry }),
    ).toEqual({ height: 200, width: 100 });
  });

  it('prefers current getter dimensions over stale cached dimensions for a replaced item', () => {
    const item = { id: 'item' };
    const replacement = { id: 'replacement' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      registerItemDimensions({
        data: [item],
        dimensions: { height: 200, width: 100 },
        index: 0,
        item,
        registry,
      }),
    ).toBe('updated');

    pruneItemDimensionsRegistry(registry, 1);

    expect(
      resolveItemDimensions({
        data: [replacement],
        getItemDimensions: () => ({ height: 616, width: 393 }),
        index: 0,
        registry,
      }),
    ).toEqual({ height: 616, width: 393 });
  });

  it('uses last-known cached dimensions for a recreated item when the getter is unavailable', () => {
    const item = { id: 'item' };
    const recreatedItem = { id: 'item' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      registerItemDimensions({
        data: [item],
        dimensions: { height: 200, width: 100 },
        index: 0,
        item,
        registry,
      }),
    ).toBe('updated');

    pruneItemDimensionsRegistry(registry, 1);

    expect(registry.size).toBe(1);
    expect(
      resolveItemDimensions({
        data: [recreatedItem],
        getItemDimensions: () => undefined,
        index: 0,
        registry,
      }),
    ).toEqual({ height: 200, width: 100 });
  });

  it('rejects a stale old-item callback and accepts the current replacement item', () => {
    const item = { id: 'item' };
    const replacement = { id: 'replacement' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      registerItemDimensions({
        data: [replacement],
        dimensions: { height: 200, width: 100 },
        index: 0,
        item,
        registry,
      }),
    ).toBe('ignored');
    expect(
      registerItemDimensions({
        data: [replacement],
        dimensions: { height: 240, width: 120 },
        index: 0,
        item: replacement,
        registry,
      }),
    ).toBe('updated');
    expect(
      resolveItemDimensions({
        data: [replacement],
        getItemDimensions: () => ({ height: 616, width: 393 }),
        index: 0,
        registry,
      }),
    ).toEqual({ height: 240, width: 120 });
  });

  it('dedupes valid values and keeps inactive registrations isolated', () => {
    const active = { id: 'active' };
    const inactive = { id: 'inactive' };
    const registry: ItemDimensionsRegistry<Item> = new Map();
    expect(
      registerItemDimensions({
        data: [active, inactive],
        dimensions: { height: 200, width: 100 },
        index: 1,
        item: inactive,
        registry,
      }),
    ).toBe('updated');
    expect(
      registerItemDimensions({
        data: [active, inactive],
        dimensions: { height: 200, width: 100 },
        index: 1,
        item: inactive,
        registry,
      }),
    ).toBe('unchanged');
    expect(
      resolveItemDimensions({
        data: [active, inactive],
        getItemDimensions: () => ({ height: 300, width: 100 }),
        index: 0,
        registry,
      }),
    ).toEqual({ height: 300, width: 100 });
  });

  it('prunes only out-of-range indexes by data length', () => {
    const first = { id: 'first' };
    const second = { id: 'second' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      registerItemDimensions({
        data: [first, second],
        dimensions: { height: 100, width: 100 },
        index: 0,
        item: first,
        registry,
      }),
    ).toBe('updated');
    expect(
      registerItemDimensions({
        data: [first, second],
        dimensions: { height: 200, width: 200 },
        index: 1,
        item: second,
        registry,
      }),
    ).toBe('updated');

    pruneItemDimensionsRegistry(registry, 1);

    expect(registry.has(0)).toBe(true);
    expect(registry.has(1)).toBe(false);
  });
});
