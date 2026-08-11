import {
  ClearAllData,
  ExportBackup,
  GetDataSummary,
  ImportBackup,
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
import type { SettingsServices } from './settings-services';

export interface SettingsRuntime {
  database: YomiatoDatabase;
  services: SettingsServices;
}

export function createSettingsRuntime(): SettingsRuntime {
  const database = createYomiatoDatabase();
  const browser = createWxtBrowserGateway();
  const dependencies = createUseCaseDependencies({
    repositories: createDexieRepositorySet(database),
    transaction: new DexieRepositoryTransaction(database),
    clock: createSystemClock(),
    idGenerator: createCryptoIdGenerator(),
    schemaVersionProvider: new DexieSchemaVersionProvider(database),
    appVersion: browser.getAppVersion(),
  });

  return {
    database,
    services: {
      browser,
      clearAllData: new ClearAllData(dependencies),
      exportBackup: new ExportBackup(dependencies),
      getDataSummary: new GetDataSummary(dependencies),
      importBackup: new ImportBackup(dependencies),
    },
  };
}
