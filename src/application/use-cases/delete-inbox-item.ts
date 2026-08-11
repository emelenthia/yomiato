import type { DeleteInboxItemOutput } from '../dto';
import type { UseCaseDependencies } from './dependencies';
import { deletePageIfUnreferenced, getPageOrThrow } from './helpers';
import { ApplicationError } from '../errors';

export class DeleteInboxItem {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(
    input: string | { inboxItemId: string },
  ): Promise<DeleteInboxItemOutput> {
    const inboxItemId = typeof input === 'string' ? input : input.inboxItemId;

    return this.dependencies.transaction.run(async (repositories) => {
      const inboxItem = await repositories.inboxItems.getById(inboxItemId);
      if (!inboxItem) {
        throw new ApplicationError('INBOX_ITEM_NOT_FOUND');
      }

      const page = await getPageOrThrow(repositories, inboxItem.pageId);
      await repositories.inboxItems.deleteById(inboxItem.id);
      const deletedPage = await deletePageIfUnreferenced(repositories, page);

      return { deletedInboxItem: inboxItem, deletedPage };
    });
  }
}
