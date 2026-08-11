import type {
  RepositorySet,
  RepositoryTransaction,
} from '../../../domain/ports';
import { YomiatoDatabase } from '../schema';
import { createDexieRepositorySet } from './repository-set';

export class DexieRepositoryTransaction implements RepositoryTransaction {
  constructor(private readonly db: YomiatoDatabase) {}

  run<T>(operation: (repositories: RepositorySet) => Promise<T>): Promise<T> {
    return this.db.transaction(
      'rw',
      this.db.pages,
      this.db.inboxItems,
      this.db.readingEntries,
      this.db.dismissalEntries,
      this.db.settings,
      () => operation(createDexieRepositorySet(this.db)),
    );
  }
}
