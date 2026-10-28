import { browser, expect } from '@wdio/globals';

import { pinch } from '../helpers/gestures.js';
import { byTestId, openViewer, readScale } from '../helpers/viewer.js';

describe('Native two-finger pinch', () => {
  it('zooms in and then out without changing the active image', async () => {
    await openViewer();
    await expect(byTestId('e2e-scale')).toHaveText('1.000');
    await pinch('out');
    await browser.waitUntil(async () => (await readScale()) > 1.2, {
      timeoutMsg: 'A native pinch-open must increase the scale above 1.2.',
    });
    const zoomedScale = await readScale();
    await expect(byTestId('e2e-page')).toHaveText('1/3');
    await pinch('in');
    await browser.waitUntil(
      async () => {
        const scale = await readScale();
        return scale >= 0.99 && scale < zoomedScale - 0.1;
      },
      { timeoutMsg: 'A native pinch-close must reduce the scale and respect the minimum.' },
    );
    await expect(byTestId('e2e-page')).toHaveText('1/3');
  });
});
