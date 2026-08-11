import type { CompleteInboxItemInput, CompleteInboxItemOutput } from '../dto';
import type { ReadingEntry } from '../../domain/entities';
import { validateCompletion } from '../../domain/services/completion';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';
import { getPageOrThrow, nowIso } from './helpers';

export class CompleteInboxItem {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(
    input: CompleteInboxItemInput,
  ): Promise<CompleteInboxItemOutput> {
    const completion = validateCompletion(input);
    const completedAt = nowIso(this.dependencies);

    return this.dependencies.transaction.run(async (repositories) => {
      const inboxItem = await repositories.inboxItems.getById(
        input.inboxItemId,
      );
      if (!inboxItem) {
        throw new ApplicationError('INBOX_ITEM_NOT_FOUND');
      }

      const page = await getPageOrThrow(repositories, inboxItem.pageId);
      const readingEntry: ReadingEntry = {
        id: this.dependencies.idGenerator.generate(),
        pageId: page.id,
        reflection: completion.reflection,
        reflectionType: completion.reflectionType,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      };
      await repositories.readingEntries.add(readingEntry);
      await repositories.inboxItems.deleteById(inboxItem.id);

      return { page, readingEntry };
    });
  }
}
