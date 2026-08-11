import type { RepositorySet } from '../../../domain/ports';
import { YomiatoDatabase } from '../schema';
import { DexieDismissalEntryRepository } from './dismissal-entry-repository';
import { DexieInboxItemRepository } from './inbox-item-repository';
import { DexiePageRepository } from './page-repository';
import { DexieReadingEntryRepository } from './reading-entry-repository';
import { DexieSettingRepository } from './setting-repository';

export function createDexieRepositorySet(db: YomiatoDatabase): RepositorySet {
  return {
    pages: new DexiePageRepository(
      db.pages,
      db.inboxItems,
      db.readingEntries,
      db.dismissalEntries,
    ),
    inboxItems: new DexieInboxItemRepository(db.inboxItems),
    readingEntries: new DexieReadingEntryRepository(db.readingEntries),
    dismissalEntries: new DexieDismissalEntryRepository(db.dismissalEntries),
    settings: new DexieSettingRepository(db.settings),
  };
}
