import GestureViewerManager from '../GestureViewerManager';

describe('GestureViewerManager tap events', () => {
  it('emits tap events to tap listeners and supports unsubscribe', () => {
    const manager = new GestureViewerManager();
    const tapListener = jest.fn();
    const zoomListener = jest.fn();

    const unsubscribeTap = manager.addEventListener('tap', tapListener);
    manager.addEventListener('zoomChange', zoomListener);

    manager.emitTap({ kind: 'single', x: 12, y: 34, index: 2 });

    expect(tapListener).toHaveBeenCalledTimes(1);
    expect(tapListener).toHaveBeenCalledWith({ kind: 'single', x: 12, y: 34, index: 2 });
    expect(zoomListener).not.toHaveBeenCalled();

    unsubscribeTap();
    manager.emitTap({ kind: 'single', x: 1, y: 2, index: 0 });

    expect(tapListener).toHaveBeenCalledTimes(1);
  });
});
