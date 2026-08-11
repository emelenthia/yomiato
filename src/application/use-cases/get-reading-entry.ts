import type { GetReadingEntryOutput } from '../dto';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';

export class GetReadingEntry {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(
    input: string | { readingEntryId: string },
  ): Promise<GetReadingEntryOutput> {
    const readingEntryId =
      typeof input === 'string' ? input : input.readingEntryId;
    const readingEntry =
      await this.dependencies.repositories.readingEntries.getById(
        readingEntryId,
      );
    if (!readingEntry) {
      throw new ApplicationError('READING_ENTRY_NOT_FOUND');
    }

    const page = await this.dependencies.repositories.pages.getById(
      readingEntry.pageId,
    );
    if (!page) {
      throw new ApplicationError('PAGE_NOT_FOUND');
    }

    return { page, readingEntry };
  }
}
