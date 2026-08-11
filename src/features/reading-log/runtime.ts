import {
  DeleteReadingEntry,
  ListReadingLog,
  RecordReread,
  UpdateReadingEntry,
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
import type { ReadingLogServices } from './reading-log-services';

export interface ReadingLogRuntime {
  database: YomiatoDatabase;
  services: ReadingLogServices;
}

export function createReadingLogRuntime(): ReadingLogRuntime {
  const database = createYomiatoDatabase();
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
      browser: createWxtBrowserGateway(),
      listReadingLog: new ListReadingLog(dependencies),
      updateReadingEntry: new UpdateReadingEntry(dependencies),
      recordReread: new RecordReread(dependencies),
      deleteReadingEntry: new DeleteReadingEntry(dependencies),
    },
  };
}
