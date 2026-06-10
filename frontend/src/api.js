import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const healthCheck = () => api.get('/health');
export const getOllamaStatus = () => api.get('/ollama/status');

export const listPdfs = () => api.get('/pdfs');
export const uploadPdf = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/pdfs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getSummary = (pdfId, length = 'medium') => 
  api.post('/summarize', { pdf_id: pdfId, length });

export const askQuestion = (pdfId, question) => 
  api.post('/qa', { pdf_id: pdfId, question });

export const generateQuestions = (pdfId, marks, count = 5) => 
  api.post('/questions/generate', { pdf_id: pdfId, marks, count });

export const generateFlashcards = (pdfId, count = 20) => 
  api.post('/flashcards/generate', { pdf_id: pdfId, count });

export const generateQuiz = (pdfId, count = 10, difficulty = 'medium') => 
  api.post('/quiz/generate', { pdf_id: pdfId, count, difficulty });

export const tutorExplain = (concept, level, pdfId = null) => 
  api.post('/tutor/explain', { concept, level, pdf_id: pdfId });

export const analyzePapers = (pdfIds, targetYear = 2024) => 
  api.post('/papers/analyze', { pdf_ids: pdfIds, target_year: targetYear });

export const getDashboardStats = () => api.get('/dashboard/stats');
export const getStudyLoopStatus = () => api.get('/loop/status');

export default api;
