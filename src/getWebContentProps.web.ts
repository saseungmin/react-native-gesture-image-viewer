import type { WebClickHandler } from './useWebClickHandler';

export function getWebContentProps(onWebClick: WebClickHandler) {
  return { onClick: onWebClick };
}
