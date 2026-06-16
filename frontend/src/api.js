import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const healthCheck = () => api.get('/health');
export const getOllamaStatus = () => api.get('/ollama/status');

export const listPdfs = () => api.get('/pdfs');
export const getPdf = (pdfId) => api.get(`/pdfs/${pdfId}`);
export const uploadPdf = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/pdfs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadPdfWithProgress = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/pdfs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const deletePdf = (pdfId) => api.delete(`/pdfs/${pdfId}`);

export const getSummary = (pdfId, length = 'medium') => 
  api.post('/summarize', { pdf_id: pdfId, length });

export const askQuestion = (pdfId, question) => 
  api.post('/qa', { pdf_id: pdfId, question });

export const askQuestionStream = async (pdfId, question, { onToken, onSources, onDone, onError }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/qa/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_id: pdfId, question }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Q&A failed' }));
      onError(err.detail || 'Q&A failed');
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') onToken(data.token);
          else if (data.type === 'sources') onSources(data.sources || []);
          else if (data.type === 'done') onDone(data.mastery || null);
        } catch { /* skip malformed */ }
      }
    }
    // Process remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.type === 'token') onToken(data.token);
        else if (data.type === 'sources') onSources(data.sources || []);
        else if (data.type === 'done') onDone(data.mastery || null);
      } catch { /* skip */ }
    }
  } catch (e) {
    onError(e.message);
  }
};

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

export const getDashboardStats = () => api.get('/dashboard/overall');
export const getStudyLoopStatus = () => api.get('/loop/status');
export const getStudyPlan = (pdfId = null, limit = 10) =>
  api.get('/study-plan/plan', { params: { pdf_id: pdfId || undefined, limit } });
export const getWeeklyIntel = () => api.get('/intel/weekly');

// Mastery tracking
export const recordMasteryEvent = (pdfId, eventType, correct = null, score = null, topicId = null, metadata = null) =>
  api.post('/mastery/event', { pdf_id: pdfId, event_type: eventType, correct, score, topic_id: topicId, metadata });
export const getPdfMastery = (pdfId) => api.get(`/mastery/${pdfId}`);
export const getMasterySummary = () => api.get('/mastery/summary/all');
export const getWeakTopics = () => api.get('/mastery/weak/all');
export const getRecommendations = () => api.get('/mastery/recommendations/all');
export const submitQuizAnswer = (pdfId, questionNumber, correct, topicId = null) =>
  api.post('/quiz/submit', { pdf_id: pdfId, question_number: questionNumber, correct, topic_id: topicId });
export const reviewFlashcard = (pdfId, cardNumber, correct, confidence = null, topicId = null) =>
  api.post('/flashcards/review', { pdf_id: pdfId, card_number: cardNumber, correct, confidence, topic_id: topicId });

export const getMasteryReport = () => api.get('/reports/mastery', { responseType: 'text' });
export const getWeeklyReport = () => api.get('/reports/weekly', { responseType: 'text' });
export const getFullReport = () => api.get('/reports/full', { responseType: 'text' });

export default api;
