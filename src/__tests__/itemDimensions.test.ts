import {
  pruneItemDimensionsRegistry,
  registerItemDimensions,
  resolveItemDimensions,
  type ItemDimensionsRegistry,
} from '../itemDimensions';
import { getLoopAdjustedIndex } from '../utils';

type Item = { id: string };

const dimensions = (width: number, height: number) => ({ height, width });

describe('item dimensions registry', () => {
  it('uses valid external-map getter dimensions and returns undefined for the viewer fallback', () => {
    const first = { id: 'first' };
    const second = { id: 'second' };
    const externalDimensions = new Map<Item, { width: number; height: number }>([
      [first, dimensions(393, 616)],
    ]);
    const getItemDimensions = jest.fn((item: Item) => externalDimensions.get(item));
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      resolveItemDimensions({
        data: [first, second],
        getItemDimensions,
        index: 0,
        registry,
      }),
    ).toEqual(dimensions(393, 616));
    expect(getItemDimensions).toHaveBeenLastCalledWith(first, 0);

    expect(
      resolveItemDimensions({
        data: [first, second],
        getItemDimensions,
        index: 1,
        registry,
      }),
    ).toBeUndefined();
    expect(getItemDimensions).toHaveBeenLastCalledWith(second, 1);
  });

  it('prefers same-item runtime registration, ignores invalid input, and dedupes equal values', () => {
    const item = { id: 'active' };
    const data = [item];
    const registry: ItemDimensionsRegistry<Item> = new Map();
    const getItemDimensions = jest.fn(() => dimensions(100, 100));

    expect(
      registerItemDimensions({
        data,
        dimensions: { height: 0, width: Number.NaN },
        index: 0,
        item,
        registry,
      }),
    ).toBe(false);
    expect(registry.size).toBe(0);

    expect(
      registerItemDimensions({
        data,
        dimensions: dimensions(393, 616),
        index: 0,
        item,
        registry,
      }),
    ).toBe(true);
    const registered = registry.get(0);

    expect(
      registerItemDimensions({
        data,
        dimensions: dimensions(393, 616),
        index: 0,
        item,
        registry,
      }),
    ).toBe(false);
    expect(registry.get(0)).toBe(registered);
    expect(resolveItemDimensions({ data, getItemDimensions, index: 0, registry })).toEqual(
      dimensions(393, 616),
    );
    expect(getItemDimensions).not.toHaveBeenCalled();
  });

  it('keeps the last valid registration when a later callback reports invalid dimensions', () => {
    const item = { id: 'active' };
    const data = [item];
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      registerItemDimensions({
        data,
        dimensions: dimensions(393, 616),
        index: 0,
        item,
        registry,
      }),
    ).toBe(true);
    expect(
      registerItemDimensions({
        data,
        dimensions: { height: Number.POSITIVE_INFINITY, width: 393 },
        index: 0,
        item,
        registry,
      }),
    ).toBe(false);

    expect(resolveItemDimensions({ data, index: 0, registry })).toEqual(dimensions(393, 616));
  });

  it('keeps inactive dimensions isolated from the active item', () => {
    const active = { id: 'active' };
    const inactive = { id: 'inactive' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    registerItemDimensions({
      data: [active, inactive],
      dimensions: dimensions(200, 400),
      index: 1,
      item: inactive,
      registry,
    });

    expect(registry.get(1)?.dimensions).toEqual(dimensions(200, 400));

    expect(
      resolveItemDimensions({
        data: [active, inactive],
        getItemDimensions: () => dimensions(100, 300),
        index: 0,
        registry,
      }),
    ).toEqual(dimensions(100, 300));
  });

  it('prefers current getter dimensions over a stale slot cache', () => {
    const replaced = { id: 'replaced' };
    const next = { id: 'next' };
    const registry: ItemDimensionsRegistry<Item> = new Map();
    const getItemDimensions = jest.fn(() => dimensions(300, 400));

    registerItemDimensions({
      data: [replaced],
      dimensions: dimensions(100, 200),
      index: 0,
      item: replaced,
      registry,
    });

    pruneItemDimensionsRegistry(registry, 1);

    expect(registry.size).toBe(1);
    expect(resolveItemDimensions({ data: [next], getItemDimensions, index: 0, registry })).toEqual(
      dimensions(300, 400),
    );
    expect(getItemDimensions).toHaveBeenCalledWith(next, 0);
    expect(
      registerItemDimensions({
        data: [next],
        dimensions: dimensions(100, 200),
        index: 0,
        item: replaced,
        registry,
      }),
    ).toBe(false);
    expect(registry.get(0)?.dimensions).toEqual(dimensions(100, 200));
    expect(
      registerItemDimensions({
        data: [next],
        dimensions: dimensions(300, 400),
        index: 0,
        item: next,
        registry,
      }),
    ).toBe(true);
    expect(resolveItemDimensions({ data: [next], getItemDimensions, index: 0, registry })).toEqual(
      dimensions(300, 400),
    );
  });

  it('uses the last-known slot cache for a recreated item when the getter is missing', () => {
    const item = { id: 'item' };
    const recreatedItem = { id: 'item' };
    const registry: ItemDimensionsRegistry<Item> = new Map();
    const getItemDimensions = jest.fn(() => undefined);

    registerItemDimensions({
      data: [item],
      dimensions: dimensions(100, 200),
      index: 0,
      item,
      registry,
    });

    pruneItemDimensionsRegistry(registry, 1);

    expect(registry.has(0)).toBe(true);
    expect(
      resolveItemDimensions({ data: [recreatedItem], getItemDimensions, index: 0, registry }),
    ).toEqual(dimensions(100, 200));
    expect(getItemDimensions).toHaveBeenCalledWith(recreatedItem, 0);
  });

  it('prunes only out-of-range cached indexes', () => {
    const first = { id: 'first' };
    const second = { id: 'second' };
    const third = { id: 'third' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    registerItemDimensions({
      data: [first, second, third],
      dimensions: dimensions(100, 200),
      index: 0,
      item: first,
      registry,
    });
    registerItemDimensions({
      data: [first, second, third],
      dimensions: dimensions(200, 100),
      index: 2,
      item: third,
      registry,
    });

    pruneItemDimensionsRegistry(registry, 2);

    expect(registry.has(0)).toBe(true);
    expect(registry.has(2)).toBe(false);
  });

  it('treats null resolver values and null runtime reports as missing dimensions', () => {
    const item = { id: 'active' };
    const data = [item];
    const registry: ItemDimensionsRegistry<Item> = new Map();

    expect(
      resolveItemDimensions({
        data,
        getItemDimensions: () => null as never,
        index: 0,
        registry,
      }),
    ).toBeUndefined();
    expect(
      registerItemDimensions({
        data,
        dimensions: null as never,
        index: 0,
        item,
        registry,
      }),
    ).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('maps loop sentinels to their canonical logical items', () => {
    expect(getLoopAdjustedIndex(0, 2, true).realIndex).toBe(1);
    expect(getLoopAdjustedIndex(3, 2, true).realIndex).toBe(0);
  });
});
