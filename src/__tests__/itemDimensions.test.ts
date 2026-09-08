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

  it('prefers valid runtime registration, ignores invalid input, and dedupes equal values', () => {
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

  it('prunes replaced or removed entries while rejecting late stale callbacks', () => {
    const replaced = { id: 'replaced' };
    const retained = { id: 'retained' };
    const next = { id: 'next' };
    const registry: ItemDimensionsRegistry<Item> = new Map();

    registerItemDimensions({
      data: [replaced, retained],
      dimensions: dimensions(100, 200),
      index: 0,
      item: replaced,
      registry,
    });
    registerItemDimensions({
      data: [replaced, retained],
      dimensions: dimensions(200, 100),
      index: 1,
      item: retained,
      registry,
    });

    pruneItemDimensionsRegistry(registry, [next, retained]);

    expect(registry.size).toBe(1);
    expect(registry.get(1)?.item).toBe(retained);
    expect(
      registerItemDimensions({
        data: [next, retained],
        dimensions: dimensions(100, 200),
        index: 0,
        item: replaced,
        registry,
      }),
    ).toBe(false);
    expect(registry.size).toBe(1);
  });

  it('maps loop sentinels to their canonical logical items', () => {
    expect(getLoopAdjustedIndex(0, 2, true).realIndex).toBe(1);
    expect(getLoopAdjustedIndex(3, 2, true).realIndex).toBe(0);
  });
});
