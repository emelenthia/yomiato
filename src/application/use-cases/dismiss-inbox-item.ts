import type { DismissInboxItemInput, DismissInboxItemOutput } from '../dto';
import type { DismissalEntry } from '../../domain/entities';
import { normalizeDismissalReason } from '../../shared/utils/text';
import { ApplicationError } from '../errors';
import type { UseCaseDependencies } from './dependencies';
import { getPageOrThrow, nowIso } from './helpers';

export class DismissInboxItem {
  constructor(private readonly dependencies: UseCaseDependencies) {}

  async execute(input: DismissInboxItemInput): Promise<DismissInboxItemOutput> {
    const reason = normalizeDismissalReason(input.reason);
    const dismissedAt = nowIso(this.dependencies);

    return this.dependencies.transaction.run(async (repositories) => {
      const inboxItem = await repositories.inboxItems.getById(
        input.inboxItemId,
      );
      if (!inboxItem) {
        throw new ApplicationError('INBOX_ITEM_NOT_FOUND');
      }

      const page = await getPageOrThrow(repositories, inboxItem.pageId);
      const dismissalEntry: DismissalEntry = {
        id: this.dependencies.idGenerator.generate(),
        pageId: page.id,
        reason,
        dismissedAt,
      };
      await repositories.dismissalEntries.add(dismissalEntry);
      await repositories.inboxItems.deleteById(inboxItem.id);

      return { page, dismissalEntry };
    });
  }
}
