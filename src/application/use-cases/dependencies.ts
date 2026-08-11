import type {
  Clock,
  IdGenerator,
  RepositorySet,
  RepositoryTransaction,
} from '../../domain/ports';

export interface UseCaseDependencies {
  repositories: RepositorySet;
  transaction: RepositoryTransaction;
  clock: Clock;
  idGenerator: IdGenerator;
  appVersion?: string;
}

export function createUseCaseDependencies(
  dependencies: UseCaseDependencies,
): UseCaseDependencies {
  return dependencies;
}
