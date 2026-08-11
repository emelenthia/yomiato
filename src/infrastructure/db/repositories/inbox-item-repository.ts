import type { Table } from 'dexie';
import type { InboxItemRepository } from '../../../domain/ports';
import type { InboxItem } from '../../../domain/entities';
import type { InboxItemId, PageId } from '../../../shared/types/ids';

export class DexieInboxItemRepository implements InboxItemRepository {
  constructor(private readonly table: Table<InboxItem, InboxItemId>) {}

  getById(id: InboxItemId): Promise<InboxItem | undefined> {
    return this.table.get(id);
  }

  getByPageId(pageId: PageId): Promise<InboxItem | undefined> {
    return this.table.where('pageId').equals(pageId).first();
  }

  list(): Promise<ReadonlyArray<InboxItem>> {
    return this.table.toArray();
  }

  async add(item: InboxItem): Promise<void> {
    await this.table.add(item);
  }

  async update(item: InboxItem): Promise<void> {
    await this.table.put(item);
  }

  async deleteById(id: InboxItemId): Promise<void> {
    await this.table.delete(id);
  }

  count(): Promise<number> {
    return this.table.count();
  }
}
