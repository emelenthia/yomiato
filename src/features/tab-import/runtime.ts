import { GetPageStatus, ImportTabsToInbox } from '../../application/use-cases';
import { createWxtBrowserGateway } from '../../infrastructure/browser';
import {
  createYomiatoDatabase,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import { createFeatureUseCaseDependencies } from '../runtime/application-dependencies';
import type { TabImportServices } from './tab-import-services';

export interface TabImportRuntime {
  database: YomiatoDatabase;
  services: TabImportServices;
}

export function createTabImportRuntime(
  database = createYomiatoDatabase(),
): TabImportRuntime {
  const browser = createWxtBrowserGateway();
  const dependencies = createFeatureUseCaseDependencies(database);

  return {
    database,
    services: {
      browser,
      getPageStatus: new GetPageStatus(dependencies),
      importTabsToInbox: new ImportTabsToInbox(dependencies),
    },
  };
}
