import {
  createUseCaseDependencies,
  type UseCaseDependencies,
} from '../../application/use-cases';
import { createCryptoIdGenerator, createSystemClock } from '../../domain/ports';
import {
  createDexieRepositorySet,
  DexieRepositoryTransaction,
  DexieSchemaVersionProvider,
  type YomiatoDatabase,
} from '../../infrastructure/db';

export function createFeatureUseCaseDependencies(
  database: YomiatoDatabase,
  appVersion?: string,
): UseCaseDependencies {
  return createUseCaseDependencies({
    repositories: createDexieRepositorySet(database),
    transaction: new DexieRepositoryTransaction(database),
    clock: createSystemClock(),
    idGenerator: createCryptoIdGenerator(),
    schemaVersionProvider: new DexieSchemaVersionProvider(database),
    appVersion,
  });
}
