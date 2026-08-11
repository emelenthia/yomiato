import type { Table } from 'dexie';
import type { SettingRepository } from '../../../domain/ports';
import type { Setting } from '../../../domain/entities';

export class DexieSettingRepository implements SettingRepository {
  constructor(private readonly table: Table<Setting, string>) {}

  getByKey<TValue = unknown>(
    key: string,
  ): Promise<Setting<TValue> | undefined> {
    return this.table.get(key) as Promise<Setting<TValue> | undefined>;
  }

  list(): Promise<ReadonlyArray<Setting>> {
    return this.table.toArray();
  }

  async put<TValue>(setting: Setting<TValue>): Promise<void> {
    await this.table.put(setting);
  }

  async deleteByKey(key: string): Promise<void> {
    await this.table.delete(key);
  }

  count(): Promise<number> {
    return this.table.count();
  }
}
