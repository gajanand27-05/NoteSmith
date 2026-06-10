import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
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

// Placeholder components for other routes
const Placeholder = ({ name }) => (
  <div>
    <h2>{name}</h2>
    <p>This page is currently under development.</p>
  </div>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="summarize" element={<Summarize />} />
            <Route path="qa" element={<QA />} />
            <Route path="questions" element={<Questions />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="study-loop" element={<StudyLoop />} />
            <Route path="tutor" element={<Tutor />} />
            <Route path="paper-analyzer" element={<PaperAnalyzer />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
