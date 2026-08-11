import React from 'react';
import ReactDOM from 'react-dom/client';
import DashboardApp from './DashboardApp.tsx';
import { DashboardErrorBoundary } from './DashboardErrorBoundary.tsx';
import { createInboxRuntime } from '../../features/inbox/runtime';
import { createTabImportRuntime } from '../../features/tab-import';
import { createReadingLogRuntime } from '../../features/reading-log';
import { createSettingsRuntime } from '../../features/settings/runtime';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Dashboard root element was not found.');
}

const tabImportRuntime = createTabImportRuntime();
const inboxRuntime = createInboxRuntime();
const readingLogRuntime = createReadingLogRuntime();
const settingsRuntime = createSettingsRuntime();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DashboardErrorBoundary>
      <DashboardApp
        tabImportServices={tabImportRuntime.services}
        inboxServices={inboxRuntime.services}
        readingLogServices={readingLogRuntime.services}
        settingsServices={settingsRuntime.services}
      />
    </DashboardErrorBoundary>
  </React.StrictMode>,
);
