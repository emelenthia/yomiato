import type { DataSummary } from '../dto';
import type { UseCaseDependencies } from './dependencies';

export class GetDataSummary {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(): Promise<DataSummary> {
    const { repositories } = this.dependencies;
    const [pages, inboxItems, readingEntries, dismissalEntries, settings] =
      await Promise.all([
        repositories.pages.count(),
        repositories.inboxItems.count(),
        repositories.readingEntries.count(),
        repositories.dismissalEntries.count(),
        repositories.settings.count(),
      ]);

    return {
      schemaVersion: 1,
      pages,
      inboxItems,
      readingEntries,
      dismissalEntries,
      settings,
    };
  }
}
