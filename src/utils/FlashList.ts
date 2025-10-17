// NOTE - Dynamic require to prevent Metro bundler static analysis errors when FlashList is not installed
export let FlashList: any = null;

try {
  FlashList = require('@shopify/flash-list').FlashList;
} catch {
  FlashList = null;
}
