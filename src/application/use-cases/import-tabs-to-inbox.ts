import type {
  ImportTab,
  ImportTabsToInboxOutput,
  TabImportItemResult,
} from '../dto';
import type { UseCaseDependencies } from './dependencies';
import { CapturePageToInbox } from './capture-page-to-inbox';
import { isApplicationError } from './helpers';

export class ImportTabsToInbox {
  private readonly capturePageToInbox: CapturePageToInbox;

  constructor(private readonly dependencies: UseCaseDependencies) {
    this.capturePageToInbox = new CapturePageToInbox(dependencies);
  }

  async execute(
    input: ReadonlyArray<ImportTab> | { tabs: ReadonlyArray<ImportTab> },
  ): Promise<ImportTabsToInboxOutput> {
    const tabs = 'tabs' in input ? input.tabs : input;
    const results: TabImportItemResult[] = [];

    for (const tab of tabs) {
      try {
        await this.capturePageToInbox.execute({
          url: tab.url,
          title: tab.title,
          source: 'tab-import',
        });
        results.push({ tab, outcome: 'added' });
      } catch (error) {
        const errorCode = isApplicationError(error)
          ? error.code
          : 'STORAGE_FAILURE';
        const outcome =
          errorCode === 'ALREADY_IN_INBOX'
            ? 'duplicate'
            : errorCode === 'UNSUPPORTED_URL' || errorCode === 'URL_TOO_LONG'
              ? 'unsupported'
              : 'failed';
        results.push({ tab, outcome, errorCode });
      }
    }

    return {
      added: results.filter((result) => result.outcome === 'added').length,
      duplicate: results.filter((result) => result.outcome === 'duplicate')
        .length,
      unsupported: results.filter((result) => result.outcome === 'unsupported')
        .length,
      failed: results.filter((result) => result.outcome === 'failed').length,
      results,
    };
  }
}
