import type { ReadingEntry } from '../../domain/entities';
import { validateCompletion } from '../../domain/services/completion';
import type { UpdateReadingEntryInput } from '../dto';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';
import { nowIso } from './helpers';

export class UpdateReadingEntry {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(input: UpdateReadingEntryInput): Promise<ReadingEntry> {
    const completion = validateCompletion(input);
    const updatedAt = nowIso(this.dependencies);

    return this.dependencies.transaction.run(async (repositories) => {
      const entry = await repositories.readingEntries.getById(
        input.readingEntryId,
      );
      if (!entry) {
        throw new ApplicationError('READING_ENTRY_NOT_FOUND');
      }

      const updatedEntry: ReadingEntry = {
        ...entry,
        reflection: completion.reflection,
        reflectionType: completion.reflectionType,
        updatedAt,
      };
      await repositories.readingEntries.update(updatedEntry);
      return updatedEntry;
    });
  }
}
