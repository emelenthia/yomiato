import type {
  DeleteReadingEntry,
  ListReadingLog,
  RecordReread,
  UpdateReadingEntry,
} from '../../application/use-cases';
import type { BrowserGateway } from '../../infrastructure/browser';

export interface ReadingLogServices {
  browser: Pick<BrowserGateway, 'openSavedUrl'>;
  listReadingLog: Pick<ListReadingLog, 'execute'>;
  updateReadingEntry: Pick<UpdateReadingEntry, 'execute'>;
  recordReread: Pick<RecordReread, 'execute'>;
  deleteReadingEntry: Pick<DeleteReadingEntry, 'execute'>;
}
