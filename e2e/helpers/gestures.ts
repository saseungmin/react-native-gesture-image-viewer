import { browser } from '@wdio/globals';

import { byTestId } from './viewer.js';

async function viewport() {
  const element = await byTestId('e2e-viewer');
  const { x, y } = await element.getLocation();
  const { width, height } = await element.getSize();
  return { element, x, y, width, height };
}

export async function pinch(direction: 'in' | 'out') {
  const { element, x, y, width, height } = await viewport();
  if (browser.isAndroid) {
    await browser.execute(
      direction === 'out' ? 'mobile: pinchOpenGesture' : 'mobile: pinchCloseGesture',
      {
        left: Math.round(x + width * 0.15),
        top: Math.round(y + height * 0.3),
        width: Math.round(width * 0.7),
        height: Math.round(height * 0.4),
        percent: 0.7,
        speed: 600,
      },
    );
  } else {
    await browser.execute('mobile: pinch', {
      elementId: element.elementId,
      scale: direction === 'out' ? 2 : 0.5,
      velocity: direction === 'out' ? 1 : -1,
    });
  }
}

export async function swipe(direction: 'left' | 'right') {
  const { x, y, width, height } = await viewport();
  // W3C touch actions make the same relative path and duration explicit on both OSes.
  const start = direction === 'left' ? 0.8 : 0.2;
  const end = direction === 'left' ? 0.2 : 0.8;
  try {
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: Math.round(x + width * start),
            y: Math.round(y + height * 0.5),
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          {
            type: 'pointerMove',
            duration: 400,
            x: Math.round(x + width * end),
            y: Math.round(y + height * 0.5),
          },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
  } finally {
    await browser.releaseActions();
  }
}
