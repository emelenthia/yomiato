import {
  GetPageStatus,
  ImportTabsToInbox,
  createUseCaseDependencies,
} from '../../application/use-cases';
import { createCryptoIdGenerator, createSystemClock } from '../../domain/ports';
import { createWxtBrowserGateway } from '../../infrastructure/browser';
import {
  createDexieRepositorySet,
  createYomiatoDatabase,
  DexieRepositoryTransaction,
  DexieSchemaVersionProvider,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import type { TabImportServices } from './tab-import-services';

export interface TabImportRuntime {
  database: YomiatoDatabase;
  services: TabImportServices;
}

export function createTabImportRuntime(): TabImportRuntime {
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
    services: {
      browser,
      getPageStatus: new GetPageStatus(dependencies),
      importTabsToInbox: new ImportTabsToInbox(dependencies),
    },
  };
}
