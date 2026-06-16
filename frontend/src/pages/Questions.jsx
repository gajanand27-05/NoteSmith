import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, TextField, Card, CardContent, Divider, Chip, Stack, Tooltip,
} from '@mui/material';
import {
  Help as QuestionsIcon, ContentCopy as CopyIcon,
  Download as DownloadIcon, Quiz as QuizIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { generateQuestions } from '../api';

const Questions = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [marks, setMarks] = useState(5);
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!pdfId) return;
    setLoading(true);
    setQuestions([]);
    try {
      const response = await generateQuestions(pdfId, marks, count);
      setQuestions(response.data.questions);
    } catch (error) {
      console.error("Question generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    const text = questions.map((q) =>
      `Question ${q.number} (${q.marks} marks)\n${q.question}\n\nAnswer:\n${q.answer}\n${q.topic ? `\nTopic: ${q.topic}` : ''}\n---\n`
    ).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleExportMarkdown = () => {
    const markdown = `# Exam Questions\n\n${questions.map((q) =>
      `## Question ${q.number} (${q.marks} marks)\n\n${q.question}\n\n**Expected Answer:**\n\n${q.answer}${q.topic ? `\n\n*Topic: ${q.topic}*` : ''}`
    ).join('\n\n---\n\n')}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-${pdfId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateQuiz = () => {
    navigate('/quiz', { state: { pdfId } });
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Exam Questions</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Generate exam-style questions based on your notes.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="marks-label">Question Type (Marks)</InputLabel>
            <Select
              labelId="marks-label"
              value={marks}
              label="Question Type (Marks)"
              onChange={(e) => setMarks(e.target.value)}
            >
              <MenuItem value={2}>2 Marks (Short Answer)</MenuItem>
              <MenuItem value={5}>5 Marks (Medium Answer)</MenuItem>
              <MenuItem value={10}>10 Marks (Detailed Essay)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Number of Questions"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 15 }}
          />
        </Stack>
        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 2 }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QuestionsIcon />}
          onClick={handleGenerate}
          disabled={!pdfId || loading}
        >
          {loading ? 'Generating Questions...' : 'Generate Questions'}
        </Button>
      </Paper>

      {questions.length > 0 && (
        <>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 2 }}>
            <Tooltip title="Copy All">
              <Button size="small" variant="outlined" startIcon={<CopyIcon sx={{ fontSize: 16 }} />} onClick={handleCopyAll}>
                Copy All
              </Button>
            </Tooltip>
            <Tooltip title="Export as Markdown">
              <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />} onClick={handleExportMarkdown}>
                Export
              </Button>
            </Tooltip>
            <Button size="small" variant="contained" startIcon={<QuizIcon sx={{ fontSize: 16 }} />} onClick={handleGenerateQuiz}>
              Generate Quiz
            </Button>
          </Stack>
          <Stack spacing={3}>
            {questions.map((q, idx) => (
              <Card key={idx}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Typography variant="h6" color="primary">Question {q.number}</Typography>
                    <Chip label={`${q.marks} Marks`} color="secondary" variant="outlined" />
                  </Stack>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>{q.question}</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Expected Answer:</Typography>
                  <Box className="markdown-content">
                    <ReactMarkdown>{q.answer}</ReactMarkdown>
                  </Box>
                  {q.topic && <Chip label={`Topic: ${q.topic}`} size="small" sx={{ mt: 2 }} />}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
};

export default Questions;