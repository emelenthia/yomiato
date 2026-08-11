import type { Table } from 'dexie';
import type { ReadingEntryRepository } from '../../../domain/ports';
import type { ReadingEntry } from '../../../domain/entities';
import type { PageId, ReadingEntryId } from '../../../shared/types/ids';

export class DexieReadingEntryRepository implements ReadingEntryRepository {
  constructor(private readonly table: Table<ReadingEntry, ReadingEntryId>) {}

  getById(id: ReadingEntryId): Promise<ReadingEntry | undefined> {
    return this.table.get(id);
  }

  listByPageId(pageId: PageId): Promise<ReadonlyArray<ReadingEntry>> {
    return this.table.where('pageId').equals(pageId).toArray();
  }

  list(): Promise<ReadonlyArray<ReadingEntry>> {
    return this.table.toArray();
  }

  async add(entry: ReadingEntry): Promise<void> {
    await this.table.add(entry);
  }

  async update(entry: ReadingEntry): Promise<void> {
    await this.table.put(entry);
  }

  async deleteById(id: ReadingEntryId): Promise<void> {
    await this.table.delete(id);
  }

  count(): Promise<number> {
    return this.table.count();
  }
}
