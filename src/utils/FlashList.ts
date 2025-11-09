export let FlashList: any = null;

try {
  FlashList = require('@shopify/flash-list').FlashList;
} catch {
  FlashList = null;
}
