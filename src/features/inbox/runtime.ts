import {
  CompleteInboxItem,
  DeleteInboxItem,
  DismissInboxItem,
  ListInbox,
} from '../../application/use-cases';
import { createWxtBrowserGateway } from '../../infrastructure/browser';
import {
  createYomiatoDatabase,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import { createFeatureUseCaseDependencies } from '../runtime/application-dependencies';
import type { InboxServices } from './inbox-services';

export interface InboxRuntime {
  database: YomiatoDatabase;
  services: InboxServices;
}

export function createInboxRuntime(
  database = createYomiatoDatabase(),
): InboxRuntime {
  const dependencies = createFeatureUseCaseDependencies(database);

  return {
    database,
    services: {
      browser: createWxtBrowserGateway(),
      listInbox: new ListInbox(dependencies),
      completeInboxItem: new CompleteInboxItem(dependencies),
      dismissInboxItem: new DismissInboxItem(dependencies),
      deleteInboxItem: new DeleteInboxItem(dependencies),
    },
  };
}
