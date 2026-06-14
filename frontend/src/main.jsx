import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { PageSkeleton } from './components/LoadingSkeleton.jsx';

const RootFallback = () => (
  <div style={{ padding: 24 }}>
    <PageSkeleton />
  </div>
);

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Suspense fallback={<RootFallback />}>
      <App />
    </Suspense>
  </ErrorBoundary>,
);
