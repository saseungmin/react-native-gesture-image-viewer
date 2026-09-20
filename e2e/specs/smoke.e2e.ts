import { expect } from '@wdio/globals';

import { byTestId, openViewer } from '../helpers/viewer.js';

describe('Standalone example app', () => {
  it('opens a loaded image and closes the viewer', async () => {
    await openViewer();
    await expect(byTestId('e2e-current-image')).toBeDisplayed();
    await expect(byTestId('e2e-page')).toHaveText(
      process.env.E2E_NEGATIVE_CONTROL === '1' ? '99/3' : '1/3',
    );
    await byTestId('e2e-close').click();
    await expect(byTestId('e2e-viewer')).not.toExist();
    await expect(byTestId('e2e-home')).toBeDisplayed();
  });
});
