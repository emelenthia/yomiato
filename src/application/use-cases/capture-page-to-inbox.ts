import { ApplicationError } from '../errors';
import type { CapturePageToInboxInput, CapturePageToInboxOutput } from '../dto';
import type { Page } from '../../domain/entities';
import type { UseCaseDependencies } from './dependencies';
import { createPageFromUrl, isConstraintError, nowIso } from './helpers';

export class CapturePageToInbox {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(
    input: CapturePageToInboxInput,
  ): Promise<CapturePageToInboxOutput> {
    try {
      return await this.capture(input);
    } catch (error) {
      if (isConstraintError(error)) {
        return this.capture(input);
      }

      throw error;
    }
  }

  private capture(
    input: CapturePageToInboxInput,
  ): Promise<CapturePageToInboxOutput> {
    const now = nowIso(this.dependencies);

    return this.dependencies.transaction.run(async (repositories) => {
      const candidate = createPageFromUrl(
        input,
        now,
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
            updatedAt: now,
          }
        : candidate;

      if (existingPage) {
        await repositories.pages.update(page);
      } else {
        await repositories.pages.add(page);
      }

      const existingInboxItem = await repositories.inboxItems.getByPageId(
        page.id,
      );
      if (existingInboxItem) {
        throw new ApplicationError('ALREADY_IN_INBOX');
      }

      const inboxItem = {
        id: this.dependencies.idGenerator.generate(),
        pageId: page.id,
        status: 'unread' as const,
        source: input.source,
        addedAt: now,
      };
      await repositories.inboxItems.add(inboxItem);

      return {
        page,
        inboxItem,
        readingEntryCount: (
          await repositories.readingEntries.listByPageId(page.id)
        ).length,
      };
    });
  }
}
