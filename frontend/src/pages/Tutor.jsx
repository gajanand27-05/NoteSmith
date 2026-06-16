import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, TextField, Divider, Stack, Chip, Tooltip,
} from '@mui/material';
import {
  School as TutorIcon, Quiz as QuizIcon, Style as FlashIcon,
  Lightbulb as ExampleIcon, ArrowUpward as SimplerIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { tutorExplain, recordMasteryEvent } from '../api';

const LEVELS = [
  { value: 'kid', label: 'Explain like I am 5' },
  { value: 'school', label: 'School Level' },
  { value: 'high_school', label: 'High School' },
  { value: 'college', label: 'College Level' },
  { value: 'engineering', label: 'Engineering/Professional' },
  { value: 'interview', label: 'Interview Ready' },
];

const Tutor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [concept, setConcept] = useState('');
  const [level, setLevel] = useState('school');
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async (opts = {}) => {
    const conceptToUse = opts.concept ?? concept;
    const levelToUse = opts.level ?? level;
    if (!conceptToUse.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await tutorExplain(conceptToUse, levelToUse, pdfId || null);
      const data = response.data;
      if (pdfId) {
        recordMasteryEvent(pdfId, 'TUTOR', null, null, null, { concept: conceptToUse, level: levelToUse }).catch(() => {});
      }
      setResult(data);
      if (opts.concept) setConcept(opts.concept);
      if (opts.level) setLevel(opts.level);
    } catch (error) {
      console.error("Tutor explanation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const currentLevelIndex = LEVELS.findIndex((l) => l.value === level);

  const handleExplainSimpler = () => {
    if (currentLevelIndex > 0) {
      handleExplain({ level: LEVELS[currentLevelIndex - 1].value });
    }
  };

  const handleGiveExample = () => {
    handleExplain({ concept: `Give me a different example of ${concept}` });
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Personal AI Tutor</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Deep-dive into any concept from your notes at the perfect depth level.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          label="What concept do you want to learn?"
          placeholder="e.g. Backpropagation, Photosynthesis, Thermodynamics"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleExplain(); }}
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
              {LEVELS.map((l) => (
                <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }}>
            <PdfSelector value={pdfId} onChange={setPdfId} label="Use Context from PDF (Optional)" />
          </Box>
        </Stack>
        <Button
          variant="contained" fullWidth size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TutorIcon />}
          onClick={handleExplain} disabled={!concept.trim() || loading}
        >
          {loading ? 'Asking Tutor...' : 'Explain to Me'}
        </Button>
      </Paper>

      {result && (
        <Paper sx={{ p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight={700}>{result.concept}</Typography>
            <Chip label={LEVELS.find((l) => l.value === result.level)?.label} color="primary" variant="outlined" />
          </Stack>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" gutterBottom color="primary">Explanation</Typography>
          <Box className="markdown-content" sx={{ mb: 4 }}>
            <ReactMarkdown>{result.explanation}</ReactMarkdown>
          </Box>

          {result.example && (
            <>
              <Typography variant="h6" gutterBottom color="secondary">Example</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(255,252,245,0.4)', mb: 4 }}>
                <ReactMarkdown>{result.example}</ReactMarkdown>
              </Paper>
            </>
          )}

          {/* Action chips */}
          <Divider sx={{ mb: 3 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Actions</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
            <Tooltip title="Request a different example">
              <Chip icon={<ExampleIcon />} label="Give Example" clickable
                onClick={handleGiveExample} sx={{ mb: 1 }} />
            </Tooltip>
            <Tooltip title="Drop one difficulty level">
              <Chip icon={<SimplerIcon />} label="Explain Simpler" clickable
                onClick={handleExplainSimpler} disabled={currentLevelIndex <= 0} sx={{ mb: 1 }} />
            </Tooltip>
            <Tooltip title="Generate a quiz on this document">
              <Chip icon={<QuizIcon />} label="Quiz Me" clickable
                onClick={() => navigate('/quiz', { state: { pdfId: pdfId || result.pdfId } })} sx={{ mb: 1 }} />
            </Tooltip>
            <Tooltip title="Create flashcards for this document">
              <Chip icon={<FlashIcon />} label="Create Flashcards" clickable
                onClick={() => navigate('/flashcards', { state: { pdfId: pdfId || result.pdfId } })} sx={{ mb: 1 }} />
            </Tooltip>
          </Stack>

          {/* Follow-up chips from AI */}
          {result.follow_ups && result.follow_ups.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Suggested Follow-ups:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {result.follow_ups.map((q, i) => (
                  <Chip key={i} label={q} onClick={() => handleExplain({ concept: q })}
                    variant="outlined" sx={{ mb: 1 }} />
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