import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  Divider
} from '@mui/material';
import { Summarize as SummarizeIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { getSummary } from '../api';

const Summarize = () => {
  const location = useLocation();
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [length, setLength] = useState('medium');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!pdfId) return;
    setLoading(true);
    setSummary('');
    try {
      const response = await getSummary(pdfId, length);
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Summarization failed", error);
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Summarize</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Generate concise summaries of your documents to save time.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} />
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="length-label">Summary Length</InputLabel>
          <Select
            labelId="length-label"
            value={length}
            label="Summary Length"
            onChange={(e) => setLength(e.target.value)}
          >
            <MenuItem value="short">Short (1-page equivalent)</MenuItem>
            <MenuItem value="medium">Medium (2-page equivalent)</MenuItem>
            <MenuItem value="long">Long (Comprehensive)</MenuItem>
          </Select>
        </FormControl>

        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SummarizeIcon />}
          onClick={handleSummarize}
          disabled={!pdfId || loading}
        >
          {loading ? 'Generating Summary...' : 'Generate Summary'}
        </Button>
      </Paper>

      {summary && (
        <Paper sx={{ p: 4, bgcolor: 'background.paper', border: '1px solid #eee' }}>
          <Typography variant="h5" gutterBottom>Summary</Typography>
          <Divider sx={{ mb: 2 }} />
          <Box className="markdown-content">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Summarize;
