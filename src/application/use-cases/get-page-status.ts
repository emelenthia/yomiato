import type { GetPageStatusOutput } from '../dto';
import { parseAndNormalizeUrl } from '../../domain/values/url';
import type { UseCaseDependencies } from './dependencies';

export class GetPageStatus {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(url: string): Promise<GetPageStatusOutput> {
    const { normalizedUrl } = parseAndNormalizeUrl(url);
    const page =
      await this.dependencies.repositories.pages.getByNormalizedUrl(
        normalizedUrl,
      );

    if (!page) {
      return {
        page: undefined,
        normalizedUrl,
        inboxItem: undefined,
        readingEntryCount: 0,
      };
    }

    return {
      page,
      normalizedUrl,
      inboxItem: await this.dependencies.repositories.inboxItems.getByPageId(
        page.id,
      ),
      readingEntryCount: (
        await this.dependencies.repositories.readingEntries.listByPageId(
          page.id,
        )
      ).length,
    };
  }
}
