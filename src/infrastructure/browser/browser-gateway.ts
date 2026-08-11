import { isSupportedUrl } from '../../domain/values/url';

export interface BrowserTabRecord {
  id?: number;
  url?: string;
  title?: string;
}

export interface BrowserTabInfo {
  id: number;
  url: string;
  title: string;
}

export type UnsupportedTabReason =
  'MISSING_ID' | 'MISSING_URL' | 'MISSING_TITLE' | 'UNSUPPORTED_URL';

export interface UnsupportedTabInfo {
  id?: number;
  url?: string;
  title?: string;
  reason: UnsupportedTabReason;
}

export type TabInspection =
  | { outcome: 'supported'; tab: BrowserTabInfo }
  | { outcome: 'unsupported'; tab: UnsupportedTabInfo };

export type ActiveTabResult =
  TabInspection | { outcome: 'unavailable'; reason: 'NO_ACTIVE_TAB' };

export interface BrowserTabsApi {
  query(queryInfo: {
    active?: boolean;
    lastFocusedWindow?: boolean;
  }): Promise<ReadonlyArray<BrowserTabRecord>>;
  create(createProperties: { url: string }): Promise<unknown>;
}

export interface BrowserPermissionsApi {
  contains(permission: {
    permissions: ReadonlyArray<string>;
  }): Promise<boolean>;
  request(permission: { permissions: ReadonlyArray<string> }): Promise<boolean>;
}

export interface BrowserRuntimeApi {
  getURL(path: string): string;
  getManifest(): { version?: string };
}

export interface DashboardOpenOptions {
  view?: string;
  url?: string;
  title?: string;
}

export interface BrowserApi {
  tabs: BrowserTabsApi;
  permissions: BrowserPermissionsApi;
  runtime: BrowserRuntimeApi;
}

export const BROWSER_GATEWAY_ERROR_CODES = [
  'PERMISSION_DENIED',
  'UNSUPPORTED_URL',
  'BROWSER_API_FAILURE',
  'DOWNLOAD_FAILURE',
  'FILE_READ_FAILURE',
] as const;

export type BrowserGatewayErrorCode =
  (typeof BROWSER_GATEWAY_ERROR_CODES)[number];

export class BrowserGatewayError extends Error {
  readonly code: BrowserGatewayErrorCode;

  constructor(code: BrowserGatewayErrorCode, cause?: unknown) {
    super(code, { cause });
    this.name = 'BrowserGatewayError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unsupportedTab(
  tab: BrowserTabRecord,
  reason: UnsupportedTabReason,
): TabInspection {
  return {
    outcome: 'unsupported',
    tab: {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      reason,
    },
  };
}

function inspectTab(tab: BrowserTabRecord): TabInspection {
  if (typeof tab.id !== 'number') {
    return unsupportedTab(tab, 'MISSING_ID');
  }

  if (typeof tab.url !== 'string' || tab.url.trim() === '') {
    return unsupportedTab(tab, 'MISSING_URL');
  }

  if (typeof tab.title !== 'string') {
    return unsupportedTab(tab, 'MISSING_TITLE');
  }

  if (!isSupportedUrl(tab.url)) {
    return unsupportedTab(tab, 'UNSUPPORTED_URL');
  }

  return {
    outcome: 'supported',
    tab: { id: tab.id, url: tab.url, title: tab.title },
  };
}

function browserApiFailure(error: unknown): BrowserGatewayError {
  return error instanceof BrowserGatewayError
    ? error
    : new BrowserGatewayError('BROWSER_API_FAILURE', error);
}

export class BrowserGateway {
  constructor(private readonly api: BrowserApi) {}

  async getActiveTab(): Promise<ActiveTabResult> {
    try {
      const tabs = await this.api.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      const activeTab = tabs[0];

      return activeTab
        ? inspectTab(activeTab)
        : { outcome: 'unavailable', reason: 'NO_ACTIVE_TAB' };
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  async listCurrentWindowTabs(): Promise<ReadonlyArray<TabInspection>> {
    try {
      const tabs = await this.api.tabs.query({ lastFocusedWindow: true });
      return tabs.map(inspectTab);
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  async hasTabsPermission(): Promise<boolean> {
    try {
      return await this.api.permissions.contains({ permissions: ['tabs'] });
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  async requestTabsPermission(): Promise<void> {
    try {
      const granted = await this.api.permissions.request({
        permissions: ['tabs'],
      });

      if (!granted) {
        throw new BrowserGatewayError('PERMISSION_DENIED');
      }
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  async openDashboard(options?: DashboardOpenOptions): Promise<void> {
    try {
      const dashboardUrl = new URL(this.api.runtime.getURL('dashboard.html'));

      if (options?.view) {
        dashboardUrl.searchParams.set('view', options.view);
      }

      if (options?.url) {
        if (!isSupportedUrl(options.url)) {
          throw new BrowserGatewayError('UNSUPPORTED_URL');
        }

        dashboardUrl.searchParams.set('url', options.url);
      }

      if (options?.title !== undefined) {
        dashboardUrl.searchParams.set('title', options.title);
      }

      await this.api.tabs.create({
        url: dashboardUrl.toString(),
      });
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  async openSavedUrl(url: string): Promise<void> {
    if (!isSupportedUrl(url)) {
      throw new BrowserGatewayError('UNSUPPORTED_URL');
    }

    try {
      await this.api.tabs.create({ url });
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  getAppVersion(): string {
    try {
      const version = this.api.runtime.getManifest().version;
      if (!version) {
        throw new BrowserGatewayError('BROWSER_API_FAILURE');
      }

      return version;
    } catch (error) {
      throw browserApiFailure(error);
    }
  }

  downloadJson(json: string, filename = 'yomiato-backup.json'): void {
    let objectUrl: string | undefined;
    let anchor: HTMLAnchorElement | undefined;

    try {
      objectUrl = URL.createObjectURL(
        new Blob([json], { type: 'application/json;charset=utf-8' }),
      );
      anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      anchor?.remove();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      throw new BrowserGatewayError('DOWNLOAD_FAILURE', error);
    }
  }

  async readFile(file: File): Promise<string> {
    try {
      if (!isRecord(file) || typeof file.text !== 'function') {
        throw new BrowserGatewayError('FILE_READ_FAILURE');
      }

      return await file.text();
    } catch (error) {
      if (error instanceof BrowserGatewayError) {
        throw error;
      }

      throw new BrowserGatewayError('FILE_READ_FAILURE', error);
    }
  }
}
