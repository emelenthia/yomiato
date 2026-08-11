import type { Table } from 'dexie';
import type { PageRepository } from '../../../domain/ports';
import type {
  DismissalEntry,
  InboxItem,
  Page,
  ReadingEntry,
} from '../../../domain/entities';
import type { DismissalEntryId, PageId } from '../../../shared/types/ids';

export class DexiePageRepository implements PageRepository {
  constructor(
    private readonly table: Table<Page, PageId>,
    private readonly inboxItems: Table<InboxItem, string>,
    private readonly readingEntries: Table<ReadingEntry, string>,
    private readonly dismissalEntries: Table<DismissalEntry, DismissalEntryId>,
  ) {}

  getById(id: PageId): Promise<Page | undefined> {
    return this.table.get(id);
  }

  getByNormalizedUrl(normalizedUrl: string): Promise<Page | undefined> {
    return this.table.where('normalizedUrl').equals(normalizedUrl).first();
  }

  list(): Promise<ReadonlyArray<Page>> {
    return this.table.toArray();
  }

  async add(page: Page): Promise<void> {
    await this.table.add(page);
  }

  async update(page: Page): Promise<void> {
    await this.table.put(page);
  }

  async deleteById(id: PageId): Promise<void> {
    await this.table.delete(id);
  }

  async isReferenced(id: PageId): Promise<boolean> {
    if (await this.inboxItems.where('pageId').equals(id).count()) {
      return true;
    }

    if (await this.readingEntries.where('pageId').equals(id).count()) {
      return true;
    }

    return (await this.dismissalEntries.where('pageId').equals(id).count()) > 0;
  }

  count(): Promise<number> {
    return this.table.count();
  }
}
