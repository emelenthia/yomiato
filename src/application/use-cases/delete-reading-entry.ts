import type { ReadingEntry } from '../../domain/entities';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';
import { deletePageIfUnreferenced } from './helpers';

export interface DeleteReadingEntryOutput {
  deletedReadingEntry: ReadingEntry;
  deletedPage: boolean;
}

export class DeleteReadingEntry {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(
    input: string | { readingEntryId: string },
  ): Promise<DeleteReadingEntryOutput> {
    const readingEntryId =
      typeof input === 'string' ? input : input.readingEntryId;

    return this.dependencies.transaction.run(async (repositories) => {
      const entry = await repositories.readingEntries.getById(readingEntryId);
      if (!entry) {
        throw new ApplicationError('READING_ENTRY_NOT_FOUND');
      }

      const page = await repositories.pages.getById(entry.pageId);
      await repositories.readingEntries.deleteById(entry.id);
      const deletedPage = page
        ? await deletePageIfUnreferenced(repositories, page)
        : undefined;

      return {
        deletedReadingEntry: entry,
        deletedPage: deletedPage !== undefined,
      };
    });
  }
}
