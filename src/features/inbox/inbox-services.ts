import type {
  CompleteInboxItem,
  DeleteInboxItem,
  DismissInboxItem,
  ListInbox,
} from '../../application/use-cases';
import type { BrowserGateway } from '../../infrastructure/browser';

export interface InboxServices {
  browser: Pick<BrowserGateway, 'openSavedUrl'>;
  listInbox: Pick<ListInbox, 'execute'>;
  completeInboxItem: Pick<CompleteInboxItem, 'execute'>;
  dismissInboxItem: Pick<DismissInboxItem, 'execute'>;
  deleteInboxItem: Pick<DeleteInboxItem, 'execute'>;
}
