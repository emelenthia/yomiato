import type { ReadingLogItem } from '../dto';
import type { UseCaseDependencies } from './dependencies';
import { SearchReadingLog } from './search-reading-log';

export class ListReadingLog {
  private readonly searchReadingLog: SearchReadingLog;

  constructor(dependencies: UseCaseDependencies) {
    this.searchReadingLog = new SearchReadingLog(dependencies);
  }

  execute(search = ''): Promise<ReadonlyArray<ReadingLogItem>> {
    return this.searchReadingLog.execute(search);
  }
}
