import {
  ClearAllData,
  ExportBackup,
  GetDataSummary,
  ImportBackup,
} from '../../application/use-cases';
import { createWxtBrowserGateway } from '../../infrastructure/browser';
import {
  createYomiatoDatabase,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import { createFeatureUseCaseDependencies } from '../runtime/application-dependencies';
import type { SettingsServices } from './settings-services';

export interface SettingsRuntime {
  database: YomiatoDatabase;
  services: SettingsServices;
}

export function createSettingsRuntime(
  database = createYomiatoDatabase(),
): SettingsRuntime {
  const browser = createWxtBrowserGateway();
  const dependencies = createFeatureUseCaseDependencies(
    database,
    browser.getAppVersion(),
  );

  return {
    database,
    services: {
      browser,
      clearAllData: new ClearAllData(dependencies),
      exportBackup: new ExportBackup(dependencies),
      getDataSummary: new GetDataSummary(dependencies),
      importBackup: new ImportBackup(dependencies),
    },
  };
}
