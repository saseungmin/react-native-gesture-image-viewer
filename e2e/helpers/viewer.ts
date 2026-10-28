import { $, browser, expect } from '@wdio/globals';

export const appId = 'gestureimageviewer.example';

export function byTestId(id: string) {
  return $(
    browser.isAndroid ? `android=new UiSelector().resourceId(${JSON.stringify(id)})` : `~${id}`,
  );
}

export async function openViewer(index = 0) {
  await browser.terminateApp(appId);
  await browser.activateApp(appId);
  await expect(byTestId('e2e-home')).toBeDisplayed();
  await byTestId(`e2e-open-${index}`).click();
  await expect(byTestId('e2e-ready')).toHaveText('ready');
  await expect(byTestId('e2e-page')).toHaveText(`${index + 1}/3`);
}

export async function readScale() {
  return Number(await byTestId('e2e-scale').getText());
}
