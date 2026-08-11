import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BrowserGateway,
  BrowserGatewayError,
  type BrowserApi,
  type BrowserTabRecord,
} from '../src/infrastructure/browser';

function createApi(tabs: ReadonlyArray<BrowserTabRecord> = []): BrowserApi & {
  tabs: {
    query: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  permissions: {
    contains: ReturnType<typeof vi.fn>;
    request: ReturnType<typeof vi.fn>;
  };
  runtime: {
    getURL: ReturnType<typeof vi.fn>;
    getManifest: ReturnType<typeof vi.fn>;
  };
} {
  return {
    tabs: {
      query: vi.fn().mockResolvedValue(tabs),
      create: vi.fn().mockResolvedValue({}),
    },
    permissions: {
      contains: vi.fn().mockResolvedValue(true),
      request: vi.fn().mockResolvedValue(true),
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      getManifest: vi.fn(() => ({ version: '1.2.3' })),
    },
  };
}

describe('BrowserGateway', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('active tabのid、URL、titleを取得する', async () => {
    const api = createApi([
      { id: 7, url: 'https://example.com/article', title: '記事' },
    ]);
    const gateway = new BrowserGateway(api);

    await expect(gateway.getActiveTab()).resolves.toEqual({
      outcome: 'supported',
      tab: { id: 7, url: 'https://example.com/article', title: '記事' },
    });
    expect(api.tabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true,
    });
  });

  it('active tabがない場合はunavailableを返す', async () => {
    const gateway = new BrowserGateway(createApi());

    await expect(gateway.getActiveTab()).resolves.toEqual({
      outcome: 'unavailable',
      reason: 'NO_ACTIVE_TAB',
    });
  });

  it('URL、title、対応schemeが欠落したタブをunsupportedとして返す', async () => {
    const api = createApi([
      {
        id: 1,
        title: 'URLなし',
        favIconUrl: 'https://example.com/favicon.ico',
        windowId: 4,
      } as BrowserTabRecord,
      { id: 2, url: 'https://example.com' },
      { id: 3, url: 'chrome://settings', title: '設定' },
    ]);
    const gateway = new BrowserGateway(api);

    await expect(gateway.listCurrentWindowTabs()).resolves.toEqual([
      {
        outcome: 'unsupported',
        tab: { id: 1, title: 'URLなし', reason: 'MISSING_URL' },
      },
      {
        outcome: 'unsupported',
        tab: { id: 2, url: 'https://example.com', reason: 'MISSING_TITLE' },
      },
      {
        outcome: 'unsupported',
        tab: {
          id: 3,
          url: 'chrome://settings',
          title: '設定',
          reason: 'UNSUPPORTED_URL',
        },
      },
    ]);
  });

  it('tabs queryの例外を型付きエラーへ変換する', async () => {
    const api = createApi();
    api.tabs.query.mockRejectedValue(new Error('query failed'));
    const gateway = new BrowserGateway(api);

    await expect(gateway.listCurrentWindowTabs()).rejects.toMatchObject({
      name: 'BrowserGatewayError',
      code: 'BROWSER_API_FAILURE',
    });
  });

  it('権限APIの例外をBROWSER_API_FAILUREへ変換する', async () => {
    const api = createApi();
    api.permissions.contains.mockRejectedValue(new Error('contains failed'));
    api.permissions.request.mockRejectedValue(new Error('request failed'));
    const gateway = new BrowserGateway(api);

    await expect(gateway.hasTabsPermission()).rejects.toMatchObject({
      code: 'BROWSER_API_FAILURE',
    });
    await expect(gateway.requestTabsPermission()).rejects.toMatchObject({
      code: 'BROWSER_API_FAILURE',
    });
  });

  it('tabs権限の確認と要求を行い、拒否をPERMISSION_DENIEDにする', async () => {
    const api = createApi();
    api.permissions.contains.mockResolvedValue(false);
    api.permissions.request.mockResolvedValue(false);
    const gateway = new BrowserGateway(api);

    await expect(gateway.hasTabsPermission()).resolves.toBe(false);
    await expect(gateway.requestTabsPermission()).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(api.permissions.request).toHaveBeenCalledWith({
      permissions: ['tabs'],
    });
  });

  it('Dashboardと保存済みURLを新しいタブで開く', async () => {
    const api = createApi();
    const gateway = new BrowserGateway(api);

    await gateway.openDashboard();
    await gateway.openSavedUrl('https://example.com/saved');

    expect(api.tabs.create).toHaveBeenNthCalledWith(1, {
      url: 'chrome-extension://test/dashboard.html',
    });
    expect(api.tabs.create).toHaveBeenNthCalledWith(2, {
      url: 'https://example.com/saved',
    });
  });

  it('読了入力用DashboardへURLとタイトルをエンコードして開く', async () => {
    const api = createApi();
    const gateway = new BrowserGateway(api);

    await gateway.openDashboard({
      view: 'complete',
      url: 'https://example.com/article?query=日本語',
      title: '記事のタイトル',
    });

    expect(api.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test/dashboard.html?view=complete&url=https%3A%2F%2Fexample.com%2Farticle%3Fquery%3D%E6%97%A5%E6%9C%AC%E8%AA%9E&title=%E8%A8%98%E4%BA%8B%E3%81%AE%E3%82%BF%E3%82%A4%E3%83%88%E3%83%AB',
    });
  });

  it('tabs.createの例外をBROWSER_API_FAILUREへ変換する', async () => {
    const api = createApi();
    api.tabs.create.mockRejectedValue(new Error('create failed'));
    const gateway = new BrowserGateway(api);

    await expect(gateway.openDashboard()).rejects.toMatchObject({
      code: 'BROWSER_API_FAILURE',
    });
    await expect(
      gateway.openSavedUrl('https://example.com/saved'),
    ).rejects.toMatchObject({ code: 'BROWSER_API_FAILURE' });
  });

  it('対応外URLを開かずにエラーにする', async () => {
    const api = createApi();
    const gateway = new BrowserGateway(api);

    await expect(gateway.openSavedUrl('chrome://settings')).rejects.toEqual(
      expect.objectContaining({ code: 'UNSUPPORTED_URL' }),
    );
    expect(api.tabs.create).not.toHaveBeenCalled();
  });

  it('app versionをManifestから取得する', () => {
    const gateway = new BrowserGateway(createApi());

    expect(gateway.getAppVersion()).toBe('1.2.3');
  });

  it('runtime.getManifestの例外をBROWSER_API_FAILUREへ変換する', () => {
    const api = createApi();
    api.runtime.getManifest.mockImplementation(() => {
      throw new Error('manifest failed');
    });
    const gateway = new BrowserGateway(api);

    expect(() => gateway.getAppVersion()).toThrow(
      expect.objectContaining({ code: 'BROWSER_API_FAILURE' }),
    );
  });

  it('JSON Blobを通常のリンクダウンロードとして保存する', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const gateway = new BrowserGateway(createApi());

    gateway.downloadJson('{"pages":[]}', 'backup.json');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(document.querySelector('a[download="backup.json"]')).toBeNull();

    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('Fileから文字列を読み込む', async () => {
    const file = {
      text: vi.fn().mockResolvedValue('{"pages":[]}'),
    } as unknown as File;
    const gateway = new BrowserGateway(createApi());

    await expect(gateway.readFile(file)).resolves.toBe('{"pages":[]}');
    expect(file.text).toHaveBeenCalledOnce();
  });

  it('File読み込み例外をFILE_READ_FAILUREにする', async () => {
    const file = {
      text: vi.fn().mockRejectedValue(new Error('read failed')),
    } as unknown as File;
    const gateway = new BrowserGateway(createApi());

    await expect(gateway.readFile(file)).rejects.toEqual(
      expect.objectContaining({ code: 'FILE_READ_FAILURE' }),
    );
    expect(gateway).toBeInstanceOf(BrowserGateway);
  });

  it('BrowserGatewayErrorをそのまま保持する', () => {
    const error = new BrowserGatewayError('PERMISSION_DENIED');

    expect(error.code).toBe('PERMISSION_DENIED');
  });
});
