import type { ReadingEntry } from '../../domain/entities';
import { validateCompletion } from '../../domain/services/completion';
import type { RecordRereadInput } from '../dto';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';
import { getPageOrThrow, nowIso } from './helpers';

export class RecordReread {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(input: RecordRereadInput): Promise<ReadingEntry> {
    const completion = validateCompletion(input);
    const completedAt = nowIso(this.dependencies);

    return this.dependencies.transaction.run(async (repositories) => {
      let pageId = input.pageId;
      if (!pageId && input.readingEntryId) {
        const previousEntry = await repositories.readingEntries.getById(
          input.readingEntryId,
        );
        if (!previousEntry) {
          throw new ApplicationError('READING_ENTRY_NOT_FOUND');
        }
        pageId = previousEntry.pageId;
      }
      if (!pageId) {
        throw new ApplicationError('INVALID_INPUT');
      }

      const page = await getPageOrThrow(repositories, pageId);
      const entry: ReadingEntry = {
        id: this.dependencies.idGenerator.generate(),
        pageId: page.id,
        reflection: completion.reflection,
        reflectionType: completion.reflectionType,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      };
      await repositories.readingEntries.add(entry);
      return entry;
    });
  }
}
