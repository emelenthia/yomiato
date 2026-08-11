import {
  DeleteReadingEntry,
  ListReadingLog,
  RecordReread,
  UpdateReadingEntry,
} from '../../application/use-cases';
import { createWxtBrowserGateway } from '../../infrastructure/browser';
import {
  createYomiatoDatabase,
  type YomiatoDatabase,
} from '../../infrastructure/db';
import { createFeatureUseCaseDependencies } from '../runtime/application-dependencies';
import type { ReadingLogServices } from './reading-log-services';

export interface ReadingLogRuntime {
  database: YomiatoDatabase;
  services: ReadingLogServices;
}

export function createReadingLogRuntime(
  database = createYomiatoDatabase(),
): ReadingLogRuntime {
  const dependencies = createFeatureUseCaseDependencies(database);

  return {
    database,
    services: {
      browser: createWxtBrowserGateway(),
      listReadingLog: new ListReadingLog(dependencies),
      updateReadingEntry: new UpdateReadingEntry(dependencies),
      recordReread: new RecordReread(dependencies),
      deleteReadingEntry: new DeleteReadingEntry(dependencies),
    },
  };
}
