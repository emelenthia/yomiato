import { browser } from 'wxt/browser';
import { BrowserGateway, type BrowserApi } from './browser-gateway';

export function createWxtBrowserGateway(): BrowserGateway {
  return new BrowserGateway(browser as unknown as BrowserApi);
}
