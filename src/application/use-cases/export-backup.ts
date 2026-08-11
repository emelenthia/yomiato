import type { ExportBackupOutput } from '../dto';
import type { UseCaseDependencies } from './dependencies';
import { assertRepositoriesIntegrity } from './backup-schema';
import { nowIso } from './helpers';

export class ExportBackup {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(): Promise<ExportBackupOutput> {
    const { repositories } = this.dependencies;
    await assertRepositoriesIntegrity(repositories);
    const backup = {
      formatName: 'yomiato-backup' as const,
      schemaVersion: 1 as const,
      appVersion: this.dependencies.appVersion ?? '0.0.0',
      exportedAt: nowIso(this.dependencies),
      pages: await repositories.pages.list(),
      inboxItems: await repositories.inboxItems.list(),
      readingEntries: await repositories.readingEntries.list(),
      dismissalEntries: await repositories.dismissalEntries.list(),
      settings: await repositories.settings.list(),
    };

    return {
      backup,
      json: JSON.stringify(backup, null, 2),
    };
  }
}
