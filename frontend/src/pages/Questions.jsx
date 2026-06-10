import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  CircularProgress,
  TextField,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import { HelpOutline as QuestionsIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { generateQuestions } from '../api';

const Questions = () => {
  const [pdfId, setPdfId] = useState('');
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

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Exam Questions</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Generate exam-style questions based on your notes.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} />
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
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
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QuestionsIcon />}
          onClick={handleGenerate}
          disabled={!pdfId || loading}
        >
          {loading ? 'Generating Questions...' : 'Generate Questions'}
        </Button>
      </Paper>

      {questions.length > 0 && (
        <Stack spacing={3}>
          {questions.map((q, idx) => (
            <Card key={idx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Typography variant="h6" color="primary">Question {q.number}</Typography>
                  <Chip label={`${q.marks} Marks`} color="secondary" variant="outlined" />
                </Stack>
                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  {q.question}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Expected Answer:</Typography>
                <Box className="markdown-content">
                  <ReactMarkdown>{q.answer}</ReactMarkdown>
                </Box>
                {q.topic && (
                  <Chip label={`Topic: ${q.topic}`} size="small" sx={{ mt: 2 }} />
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default Questions;
