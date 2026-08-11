import type {
  CompleteCurrentPageInput,
  CompleteCurrentPageOutput,
} from '../dto';
import type { Page, ReadingEntry } from '../../domain/entities';
import { validateCompletion } from '../../domain/services/completion';
import type { UseCaseDependencies } from './dependencies';
import { createPageFromUrl, isConstraintError, nowIso } from './helpers';

export class CompleteCurrentPage {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(
    input: CompleteCurrentPageInput,
  ): Promise<CompleteCurrentPageOutput> {
    validateCompletion(input);

    try {
      return await this.complete(input);
    } catch (error) {
      if (isConstraintError(error)) {
        return this.complete(input);
      }

      throw error;
    }
  }

  private complete(
    input: CompleteCurrentPageInput,
  ): Promise<CompleteCurrentPageOutput> {
    const completion = validateCompletion(input);
    const completedAt = nowIso(this.dependencies);

    return this.dependencies.transaction.run(async (repositories) => {
      const candidate = createPageFromUrl(
        input,
        completedAt,
        this.dependencies.idGenerator.generate(),
      );
      const existingPage = await repositories.pages.getByNormalizedUrl(
        candidate.normalizedUrl,
      );
      const page: Page = existingPage
        ? {
            ...existingPage,
            originalUrl: candidate.originalUrl,
            title: candidate.title,
            siteName: candidate.siteName,
            updatedAt: completedAt,
          }
        : candidate;

      if (existingPage) {
        await repositories.pages.update(page);
      } else {
        await repositories.pages.add(page);
      }

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

      const inboxItem = await repositories.inboxItems.getByPageId(page.id);
      if (inboxItem) {
        await repositories.inboxItems.deleteById(inboxItem.id);
      }

      return { page, readingEntry };
    });
  }
}
