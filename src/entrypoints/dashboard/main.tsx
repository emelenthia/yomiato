import React from 'react';
import ReactDOM from 'react-dom/client';
import DashboardApp from './DashboardApp.tsx';
import { DashboardErrorBoundary } from './DashboardErrorBoundary.tsx';
import { createTabImportRuntime } from '../../features/tab-import';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Dashboard root element was not found.');
}

const tabImportRuntime = createTabImportRuntime();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DashboardErrorBoundary>
      <DashboardApp tabImportServices={tabImportRuntime.services} />
    </DashboardErrorBoundary>
  </React.StrictMode>,
);
