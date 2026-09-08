import {
  pruneItemDimensionsRegistry,
  registerItemDimensions,
  resolveItemDimensions,
  type ItemDimensionsRegistry,
} from '../itemDimensions';

type Item = { id: string };

describe('item dimensions registry', () => {
  it('prefers valid runtime registration, falls back to the getter, and rejects stale items', () => {
    const item = { id: 'item' };
    const replacement = { id: 'replacement' };
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

    pruneItemDimensionsRegistry(registry, [replacement]);
    expect(registry.size).toBe(0);
    expect(
      registerItemDimensions({
        data: [replacement],
        dimensions: { height: 200, width: 100 },
        index: 0,
        item,
        registry,
      }),
    ).toBe('ignored');
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
});
