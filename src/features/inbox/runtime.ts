import {
  CompleteInboxItem,
  DeleteInboxItem,
  DismissInboxItem,
  ListInbox,
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
import type { InboxServices } from './inbox-services';

export interface InboxRuntime {
  database: YomiatoDatabase;
  services: InboxServices;
}

export function createInboxRuntime(): InboxRuntime {
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
      listInbox: new ListInbox(dependencies),
      completeInboxItem: new CompleteInboxItem(dependencies),
      dismissInboxItem: new DismissInboxItem(dependencies),
      deleteInboxItem: new DeleteInboxItem(dependencies),
    },
  };
}
