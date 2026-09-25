import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

// Webfonts load without blocking first paint (see index.html). A stylesheet
// link added from here is allowed by the CSP, unlike an inline onload handler.
const fonts = document.querySelector<HTMLLinkElement>('link[rel="preload"][as="style"]');
if (fonts) {
  const sheet = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: fonts.href });
  document.head.appendChild(sheet);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
