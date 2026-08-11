import type {
  Clock,
  IdGenerator,
  RepositorySet,
  RepositoryTransaction,
  SchemaVersionProvider,
} from '../../domain/ports';

export interface UseCaseDependencies {
  repositories: RepositorySet;
  transaction: RepositoryTransaction;
  clock: Clock;
  idGenerator: IdGenerator;
  schemaVersionProvider: SchemaVersionProvider;
  appVersion?: string;
}

export function createUseCaseDependencies(
  dependencies: UseCaseDependencies,
): UseCaseDependencies {
  return dependencies;
}
