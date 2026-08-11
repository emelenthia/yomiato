import { chromium, expect, test as base } from '@playwright/test';
import type { BrowserContext, Page, TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');

export interface FixtureTab {
  id: number;
  url: string;
  title: string;
}

async function launchExtensionContext(profilePath: string) {
  if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
    throw new Error(
      'ビルド済み拡張がありません。npm run buildを先に実行してください。',
    );
  }

  return chromium.launchPersistentContext(profilePath, {
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? chromium.executablePath(),
    args: [
      '--headless=new',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    viewport: { width: 1280, height: 900 },
  });
}

export async function getExtensionId(context: BrowserContext): Promise<string> {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  return new URL(serviceWorker.url()).hostname;
}

function fixturePageHtml(title: string): string {
  return `<!doctype html>
<html lang="ja">
  <head><meta charset="utf-8"><title>${title}</title></head>
  <body><main><h1>${title}</h1><p>よみあとE2E用の一般Webページです。</p></main></body>
</html>`;
}

export async function openFixturePage(
  context: BrowserContext,
  pathName: string,
  title: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.route('http://127.0.0.1:4173/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: fixturePageHtml(title),
    }),
  );
  await page.goto(`http://127.0.0.1:4173${pathName}`);
  await expect(page).toHaveTitle(title);
  return page;
}

async function installActiveTabMock(
  page: Page,
  tab: FixtureTab,
): Promise<void> {
  await page.addInitScript((activeTab) => {
    const chromeApi = (
      globalThis as unknown as {
        chrome: { tabs: { query: () => Promise<ReadonlyArray<FixtureTab>> } };
      }
    ).chrome;
    chromeApi.tabs.query = async () => [activeTab];
  }, tab);
}

export function installTabsMock(
  page: Page,
  tabs: ReadonlyArray<FixtureTab>,
): Promise<void> {
  return page
    .addInitScript((tabRecords) => {
      const chromeApi = (
        globalThis as unknown as {
          chrome: {
            tabs: { query: () => Promise<ReadonlyArray<FixtureTab>> };
            permissions: {
              contains: () => Promise<boolean>;
              request: () => Promise<boolean>;
            };
          };
        }
      ).chrome;
      chromeApi.tabs.query = async () => tabRecords;
      chromeApi.permissions.contains = async () => false;
      chromeApi.permissions.request = async () => true;
    }, tabs)
    .then(() => undefined);
}

export async function openPopup(
  context: BrowserContext,
  extensionId: string,
  activeTab: FixtureTab,
): Promise<Page> {
  const popup = await context.newPage();
  await installActiveTabMock(popup, activeTab);
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(
    popup.getByRole('heading', { name: activeTab.title }),
  ).toBeVisible();
  return popup;
}

export async function openDashboard(
  context: BrowserContext,
  extensionId: string,
  options?: { view?: string; tabs?: ReadonlyArray<FixtureTab> },
): Promise<Page> {
  const dashboard = await context.newPage();
  if (options?.tabs) {
    await installTabsMock(dashboard, options.tabs);
  }

  const url = new URL(`chrome-extension://${extensionId}/dashboard.html`);
  if (options?.view) {
    url.searchParams.set('view', options.view);
  }
  await dashboard.goto(url.toString());
  await expect(dashboard.locator('.dashboard-shell')).toBeVisible();
  return dashboard;
}

export async function createExtensionContext(
  testInfo: TestInfo,
  profileName: string,
): Promise<BrowserContext> {
  return launchExtensionContext(testInfo.outputPath(profileName));
}

export const test = base.extend<{
  extensionContext: BrowserContext;
  extensionId: string;
}>({
  extensionContext: async ({}, provide, testInfo) => {
    const context = await launchExtensionContext(
      testInfo.outputPath('profile'),
    );
    try {
      await provide(context);
    } finally {
      await context.close();
    }
  },
  extensionId: async ({ extensionContext }, provide) => {
    await provide(await getExtensionId(extensionContext));
  },
});

export { expect };
