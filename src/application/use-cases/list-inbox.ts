import type { InboxListItem } from '../dto';
import type { UseCaseDependencies } from './dependencies';

export class ListInbox {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(search = ''): Promise<ReadonlyArray<InboxListItem>> {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const [inboxItems, pages] = await Promise.all([
      this.dependencies.repositories.inboxItems.list(),
      this.dependencies.repositories.pages.list(),
    ]);
    const pageMap = new Map(pages.map((page) => [page.id, page]));
    const items: InboxListItem[] = [];

    for (const inboxItem of inboxItems) {
      const page = pageMap.get(inboxItem.pageId);
      if (!page) {
        continue;
      }

      const searchable =
        `${page.title}\n${page.originalUrl}`.toLocaleLowerCase();
      if (!normalizedSearch || searchable.includes(normalizedSearch)) {
        items.push({ page, inboxItem });
      }
    }

    return items.sort((left, right) => {
      const addedAt = right.inboxItem.addedAt.localeCompare(
        left.inboxItem.addedAt,
      );
      return addedAt !== 0
        ? addedAt
        : right.inboxItem.id.localeCompare(left.inboxItem.id);
    });
  }
}
