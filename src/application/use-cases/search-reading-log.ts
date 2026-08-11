import type { ReadingLogItem } from '../dto';
import type { UseCaseDependencies } from './dependencies';

function compareDescending(left: string, right: string): number {
  return right.localeCompare(left);
}

export class SearchReadingLog {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(query = ''): Promise<ReadonlyArray<ReadingLogItem>> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const entries = await this.dependencies.repositories.readingEntries.list();
    const pages = new Map(
      (await this.dependencies.repositories.pages.list()).map((page) => [
        page.id,
        page,
      ]),
    );
    const items: ReadingLogItem[] = [];

    for (const readingEntry of entries) {
      const page = pages.get(readingEntry.pageId);
      if (!page) {
        continue;
      }

      const searchable = [
        page.title,
        page.originalUrl,
        page.siteName,
        readingEntry.reflection,
      ]
        .join('\n')
        .toLocaleLowerCase();
      if (!normalizedQuery || searchable.includes(normalizedQuery)) {
        items.push({ page, readingEntry });
      }
    }

    return items.sort((left, right) => {
      const completedAt = compareDescending(
        left.readingEntry.completedAt,
        right.readingEntry.completedAt,
      );
      if (completedAt !== 0) {
        return completedAt;
      }

      const createdAt = compareDescending(
        left.readingEntry.createdAt,
        right.readingEntry.createdAt,
      );
      return createdAt !== 0
        ? createdAt
        : compareDescending(left.readingEntry.id, right.readingEntry.id);
    });
  }
}
