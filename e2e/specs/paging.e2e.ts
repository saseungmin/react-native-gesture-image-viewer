import { expect } from '@wdio/globals';

import { swipe } from '../helpers/gestures.js';
import { byTestId, openViewer } from '../helpers/viewer.js';

describe('Native horizontal paging', () => {
  it('swipes to the next image and back', async () => {
    await openViewer();
    await swipe('left');
    await expect(byTestId('e2e-page')).toHaveText('2/3');
    await expect(byTestId('e2e-ready')).toHaveText('ready');
    await swipe('right');
    await expect(byTestId('e2e-page')).toHaveText('1/3');
    await expect(byTestId('e2e-ready')).toHaveText('ready');
  });
});
