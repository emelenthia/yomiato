import type { Table } from 'dexie';
import type { DismissalEntryRepository } from '../../../domain/ports';
import type { DismissalEntry } from '../../../domain/entities';
import type { DismissalEntryId, PageId } from '../../../shared/types/ids';

export class DexieDismissalEntryRepository implements DismissalEntryRepository {
  constructor(
    private readonly table: Table<DismissalEntry, DismissalEntryId>,
  ) {}

  listByPageId(pageId: PageId): Promise<ReadonlyArray<DismissalEntry>> {
    return this.table.where('pageId').equals(pageId).toArray();
  }

  list(): Promise<ReadonlyArray<DismissalEntry>> {
    return this.table.toArray();
  }

  async add(entry: DismissalEntry): Promise<void> {
    await this.table.add(entry);
  }

  async deleteById(id: DismissalEntryId): Promise<void> {
    await this.table.delete(id);
  }

  count(): Promise<number> {
    return this.table.count();
  }
}
