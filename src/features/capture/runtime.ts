import {
  CapturePageToInbox,
  GetPageStatus,
  createUseCaseDependencies,
} from '../../application/use-cases';
import { createCryptoIdGenerator, createSystemClock } from '../../domain/ports';
import {
  createWxtBrowserGateway,
  type BrowserGateway,
} from '../../infrastructure/browser';
import {
  createDexieRepositorySet,
  createYomiatoDatabase,
  DexieRepositoryTransaction,
  DexieSchemaVersionProvider,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import type { PopupServices } from './popup-services';

export interface PopupRuntime extends PopupServices {
  database: YomiatoDatabase;
  browser: BrowserGateway;
}

export function createPopupRuntime(): PopupRuntime {
  const database = createYomiatoDatabase();
  const browser = createWxtBrowserGateway();
  const dependencies = createUseCaseDependencies({
    repositories: createDexieRepositorySet(database),
    transaction: new DexieRepositoryTransaction(database),
    clock: createSystemClock(),
    idGenerator: createCryptoIdGenerator(),
    schemaVersionProvider: new DexieSchemaVersionProvider(database),
  });

  return {
    database,
    browser,
    capturePageToInbox: new CapturePageToInbox(dependencies),
    getPageStatus: new GetPageStatus(dependencies),
  };
}
