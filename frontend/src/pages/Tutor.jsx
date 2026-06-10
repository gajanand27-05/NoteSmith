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
  Divider,
  Stack,
  Chip
} from '@mui/material';
import { School as TutorIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { tutorExplain } from '../api';

const Tutor = () => {
  const [concept, setConcept] = useState('');
  const [level, setLevel] = useState('school');
  const [pdfId, setPdfId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    if (!concept.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await tutorExplain(concept, level, pdfId || null);
      setResult(response.data);
    } catch (error) {
      console.error("Tutor explanation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const levels = [
    { value: 'kid', label: 'Explain like I am 5' },
    { value: 'school', label: 'School Level' },
    { value: 'high_school', label: 'High School' },
    { value: 'college', label: 'College Level' },
    { value: 'engineering', label: 'Engineering/Professional' },
    { value: 'interview', label: 'Interview Ready' }
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Personal AI Tutor</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Deep-dive into any concept from your notes at the perfect depth level.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <TextField 
          fullWidth
          label="What concept do you want to learn?"
          placeholder="e.g. Backpropagation, Photosynthesis, Thermodynamics"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="level-label">Depth Level</InputLabel>
            <Select
              labelId="level-label"
              value={level}
              label="Depth Level"
              onChange={(e) => setLevel(e.target.value)}
            >
              {levels.map(l => (
                <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }}>
            <PdfSelector value={pdfId} onChange={setPdfId} label="Use Context from PDF (Optional)" />
          </Box>
        </Stack>

        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TutorIcon />}
          onClick={handleExplain}
          disabled={!concept.trim() || loading}
        >
          {loading ? 'Asking Tutor...' : 'Explain to Me'}
        </Button>
      </Paper>

      {result && (
        <Paper sx={{ p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5">{result.concept}</Typography>
            <Chip label={levels.find(l => l.value === result.level)?.label} color="primary" variant="outlined" />
          </Stack>
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="h6" gutterBottom color="primary">Explanation</Typography>
          <Box className="markdown-content" sx={{ mb: 4 }}>
            <ReactMarkdown>{result.explanation}</ReactMarkdown>
          </Box>

          {result.example && (
            <>
              <Typography variant="h6" gutterBottom color="secondary">Example</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fffcf5' }}>
                <ReactMarkdown>{result.example}</ReactMarkdown>
              </Paper>
            </>
          )}

          {result.follow_ups && result.follow_ups.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Follow-up Questions:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {result.follow_ups.map((q, i) => (
                  <Chip key={i} label={q} onClick={() => { setConcept(q); handleExplain(); }} sx={{ mb: 1 }} />
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Tutor;
