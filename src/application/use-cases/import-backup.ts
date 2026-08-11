import type { BackupPreview } from '../dto';
import type { UseCaseDependencies } from './dependencies';
import { parseBackup, toBackupPreview } from './backup-schema';

export class ImportBackup {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  preview(input: string | unknown): BackupPreview {
    return toBackupPreview(parseBackup(input));
  }

  async execute(input: string | unknown): Promise<BackupPreview> {
    const backup = parseBackup(input);

    await this.dependencies.transaction.run(async (repositories) => {
      const [pages, inboxItems, readingEntries, dismissalEntries, settings] =
        await Promise.all([
          repositories.pages.list(),
          repositories.inboxItems.list(),
          repositories.readingEntries.list(),
          repositories.dismissalEntries.list(),
          repositories.settings.list(),
        ]);

      await Promise.all([
        ...pages.map((page) => repositories.pages.deleteById(page.id)),
        ...inboxItems.map((item) =>
          repositories.inboxItems.deleteById(item.id),
        ),
        ...readingEntries.map((entry) =>
          repositories.readingEntries.deleteById(entry.id),
        ),
        ...dismissalEntries.map((entry) =>
          repositories.dismissalEntries.deleteById(entry.id),
        ),
        ...settings.map((setting) =>
          repositories.settings.deleteByKey(setting.key),
        ),
      ]);

      await Promise.all(
        backup.pages.map((page) => repositories.pages.add(page)),
      );
      await Promise.all(
        backup.inboxItems.map((item) => repositories.inboxItems.add(item)),
      );
      await Promise.all(
        backup.readingEntries.map((entry) =>
          repositories.readingEntries.add(entry),
        ),
      );
      await Promise.all(
        backup.dismissalEntries.map((entry) =>
          repositories.dismissalEntries.add(entry),
        ),
      );
      await Promise.all(
        backup.settings.map((setting) => repositories.settings.put(setting)),
      );
    });

    return toBackupPreview(backup);
  }
}
