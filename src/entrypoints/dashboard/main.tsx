import React from 'react';
import ReactDOM from 'react-dom/client';
import DashboardApp from './DashboardApp.tsx';
import { DashboardErrorBoundary } from './DashboardErrorBoundary.tsx';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Dashboard root element was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DashboardErrorBoundary>
      <DashboardApp />
    </DashboardErrorBoundary>
  </React.StrictMode>,
);
