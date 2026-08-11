import { CapturePageToInbox, GetPageStatus } from '../../application/use-cases';
import {
  createWxtBrowserGateway,
  type BrowserGateway,
} from '../../infrastructure/browser';
import {
  createYomiatoDatabase,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import { createFeatureUseCaseDependencies } from '../runtime/application-dependencies';
import type { PopupServices } from './popup-services';

export interface PopupRuntime extends PopupServices {
  database: YomiatoDatabase;
  browser: BrowserGateway;
}

export function createPopupRuntime(): PopupRuntime {
  const database = createYomiatoDatabase();
  const browser = createWxtBrowserGateway();
  const dependencies = createFeatureUseCaseDependencies(database);

  return {
    database,
    browser,
    capturePageToInbox: new CapturePageToInbox(dependencies),
    getPageStatus: new GetPageStatus(dependencies),
  };
}
