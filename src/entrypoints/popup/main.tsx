import React from 'react';
import ReactDOM from 'react-dom/client';
import { createPopupRuntime } from '../../features/capture';
import PopupApp from './PopupApp.tsx';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root element was not found.');
}

const runtime = createPopupRuntime();

void runtime.database
  .open()
  .then(() => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <PopupApp services={runtime} />
      </React.StrictMode>,
    );
  })
  .catch(() => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <PopupApp initializationError="保存領域を準備できませんでした。" />
      </React.StrictMode>,
    );
  });
