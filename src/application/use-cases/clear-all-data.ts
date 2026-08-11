import type { UseCaseDependencies } from './dependencies';

export class ClearAllData {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(): Promise<void> {
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
    });
  }
}
