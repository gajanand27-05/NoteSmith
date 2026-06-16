import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ColorModeProvider } from './ColorModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Summarize from './pages/Summarize';
import QA from './pages/QA';
import Questions from './pages/Questions';
import Flashcards from './pages/Flashcards';
import Quiz from './pages/Quiz';
import Tutor from './pages/Tutor';
import PaperAnalyzer from './pages/PaperAnalyzer';
import StudyLoop from './pages/StudyLoop';
import Reports from './pages/Reports';

const RouteBoundary = ({ children }) => (
  <ErrorBoundary key={window.location.pathname}>{children}</ErrorBoundary>
);

function App() {
  return (
    <ColorModeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<RouteBoundary><Dashboard /></RouteBoundary>} />
            <Route path="upload" element={<RouteBoundary><Upload /></RouteBoundary>} />
            <Route path="summarize" element={<RouteBoundary><Summarize /></RouteBoundary>} />
            <Route path="qa" element={<RouteBoundary><QA /></RouteBoundary>} />
            <Route path="questions" element={<RouteBoundary><Questions /></RouteBoundary>} />
            <Route path="flashcards" element={<RouteBoundary><Flashcards /></RouteBoundary>} />
            <Route path="quiz" element={<RouteBoundary><Quiz /></RouteBoundary>} />
            <Route path="study-loop" element={<RouteBoundary><StudyLoop /></RouteBoundary>} />
            <Route path="tutor" element={<RouteBoundary><Tutor /></RouteBoundary>} />
            <Route path="paper-analyzer" element={<RouteBoundary><PaperAnalyzer /></RouteBoundary>} />
            <Route path="reports" element={<RouteBoundary><Reports /></RouteBoundary>} />
          </Route>
        </Routes>
      </Router>
    </ColorModeProvider>
  );
}

export default App;
