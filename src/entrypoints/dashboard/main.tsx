import React from 'react';
import ReactDOM from 'react-dom/client';
import DashboardApp from './DashboardApp.tsx';
import { DashboardErrorBoundary } from './DashboardErrorBoundary.tsx';
import { createInboxRuntime } from '../../features/inbox/runtime';
import { createTabImportRuntime } from '../../features/tab-import';
import { createReadingLogRuntime } from '../../features/reading-log';
import { createSettingsRuntime } from '../../features/settings/runtime';
import { createYomiatoDatabase } from '../../infrastructure/db';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Dashboard root element was not found.');
}

const database = createYomiatoDatabase();
const tabImportRuntime = createTabImportRuntime(database);
const inboxRuntime = createInboxRuntime(database);
const readingLogRuntime = createReadingLogRuntime(database);
const settingsRuntime = createSettingsRuntime(database);

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
