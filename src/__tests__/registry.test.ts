import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../GestureViewerManager', () => {
  return jest.fn().mockImplementation(() => ({
    cleanUp: jest.fn(),
  }));
});

import { registry } from '../GestureViewerRegistry';

describe('GestureViewerRegistry trigger storage', () => {
  it('stores the active trigger independently from indexed triggers', () => {
    const id = 'registry-active-indexed';
    const activeNode = { kind: 'active' } as never;
    const indexedNode = { kind: 'indexed' } as never;

    registry.createManager(id);
    registry.setActiveTriggerNode(id, activeNode);
    registry.setIndexedTriggerNode(id, 2, indexedNode);

    expect(registry.getActiveTriggerNode(id)).toBe(activeNode);
    expect(registry.getIndexedTriggerNode(id, 2)).toBe(indexedNode);

    registry.deleteManager(id);
  });

  it('notifies active trigger subscribers when the active trigger changes', () => {
    const id = 'registry-active-trigger-subscription';
    const events: Array<unknown> = [];
    const firstNode = { kind: 'first' } as never;
    const secondNode = { kind: 'second' } as never;

    const unsubscribe = registry.subscribeToActiveTrigger(id, (node) => {
      events.push(node);
    });

    registry.setActiveTriggerNode(id, firstNode);
    registry.setActiveTriggerNode(id, secondNode);
    registry.clearActiveTriggerNode(id);
    unsubscribe();

    expect(events).toEqual([null, firstNode, secondNode, null]);
  });

  it('clears indexed triggers by index without affecting other trigger entries', () => {
    const id = 'registry-clear-indexed';
    const firstNode = { kind: 'first' } as never;
    const secondNode = { kind: 'second' } as never;

    registry.createManager(id);
    registry.setIndexedTriggerNode(id, 0, firstNode);
    registry.setIndexedTriggerNode(id, 1, secondNode);

    registry.clearIndexedTriggerNode(id, 0);

    expect(registry.getIndexedTriggerNode(id, 0)).toBeNull();
    expect(registry.getIndexedTriggerNode(id, 1)).toBe(secondNode);

    registry.deleteManager(id);
  });

  it('clears the active trigger but preserves indexed triggers when the manager is deleted', () => {
    const id = 'registry-delete-manager';
    const activeNode = { kind: 'active' } as never;
    const indexedNode = { kind: 'indexed' } as never;

    registry.createManager(id);
    registry.setActiveTriggerNode(id, activeNode);
    registry.setIndexedTriggerNode(id, 4, indexedNode);

    registry.deleteManager(id);

    expect(registry.getActiveTriggerNode(id)).toBeNull();
    expect(registry.getIndexedTriggerNode(id, 4)).toBe(indexedNode);

    registry.clearIndexedTriggerNode(id, 4);
  });
});
