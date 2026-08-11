import type {
  GetPageStatus,
  ImportTabsToInbox,
} from '../../application/use-cases';
import type { ImportTab } from '../../application/dto';
import type {
  BrowserGateway,
  BrowserTabInfo,
  TabInspection,
} from '../../infrastructure/browser';

export interface TabImportServices {
  browser: Pick<
    BrowserGateway,
    'hasTabsPermission' | 'requestTabsPermission' | 'listCurrentWindowTabs'
  >;
  getPageStatus: Pick<GetPageStatus, 'execute'>;
  importTabsToInbox: Pick<ImportTabsToInbox, 'execute'>;
}

export interface TabImportCandidate {
  tab: BrowserTabInfo;
  siteName: string;
  normalizedUrl: string;
  isInInbox: boolean;
  isInputDuplicate: boolean;
}

export interface TabImportInspection {
  supported: ReadonlyArray<TabImportCandidate>;
  unsupported: ReadonlyArray<
    Extract<TabInspection, { outcome: 'unsupported' }>
  >;
}

export async function inspectCurrentWindowTabs(
  services: TabImportServices,
  inspections: ReadonlyArray<TabInspection>,
): Promise<TabImportInspection> {
  const supportedInspections = inspections.filter(
    (
      inspection,
    ): inspection is Extract<TabInspection, { outcome: 'supported' }> =>
      inspection.outcome === 'supported',
  );
  const statuses = await Promise.all(
    supportedInspections.map((inspection) =>
      services.getPageStatus.execute(inspection.tab.url),
    ),
  );
  const seenNormalizedUrls = new Set<string>();

  return {
    supported: supportedInspections.map((inspection, index) => {
      const status = statuses.at(index);
      if (!status) {
        throw new Error('タブの登録状態を取得できませんでした。');
      }

      const isInputDuplicate = seenNormalizedUrls.has(status.normalizedUrl);
      seenNormalizedUrls.add(status.normalizedUrl);

      return {
        tab: inspection.tab,
        siteName: new URL(inspection.tab.url).hostname.toLowerCase(),
        normalizedUrl: status.normalizedUrl,
        isInInbox: Boolean(status.inboxItem),
        isInputDuplicate,
      };
    }),
    unsupported: inspections.filter(
      (
        inspection,
      ): inspection is Extract<TabInspection, { outcome: 'unsupported' }> =>
        inspection.outcome === 'unsupported',
    ),
  };
}

export function toImportTab(candidate: TabImportCandidate): ImportTab {
  return { url: candidate.tab.url, title: candidate.tab.title };
}
