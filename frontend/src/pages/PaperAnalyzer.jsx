import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  Divider,
  Stack,
  Chip,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Analytics as PaperIcon, AutoAwesome as PredictionIcon } from '@mui/icons-material';
import { listPdfs, analyzePapers } from '../api';

const PaperAnalyzer = () => {
  const [pdfs, setPdfs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPdfs, setLoadingPdfs] = useState(true);

  useEffect(() => {
    const fetchPdfs = async () => {
      try {
        const response = await listPdfs();
        setPdfs(response.data);
      } catch (error) {
        console.error("Failed to fetch PDFs", error);
      } finally {
        setLoadingPdfs(false);
      }
    };
    fetchPdfs();
  }, []);

  const handleToggle = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await analyzePapers(selectedIds);
      setResult(response.data);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Paper Analyzer</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Analyze multiple previous year question papers to find topic trends and predict likely questions.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Select Papers (Choose at least 2)</Typography>
        {loadingPdfs ? <CircularProgress /> : (
          <FormGroup sx={{ mb: 3 }}>
            <Grid container spacing={1}>
              {pdfs.map(pdf => (
                <Grid item xs={12} sm={6} md={4} key={pdf.id}>
                  <FormControlLabel
                    control={<Checkbox checked={selectedIds.includes(pdf.id)} onChange={() => handleToggle(pdf.id)} />}
                    label={pdf.original_name}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
        )}
        <Button 
          variant="contained" 
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PaperIcon />}
          onClick={handleAnalyze}
          disabled={selectedIds.length < 2 || loading}
        >
          {loading ? 'Analyzing Trends...' : 'Analyze Papers'}
        </Button>
      </Paper>

      {result && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Topic Frequency & Trends</Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.light' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Topic</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Frequency</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.topics.map((topic, i) => (
                  <TableRow key={i}>
                    <TableCell>{topic.topic}</TableCell>
                    <TableCell>{topic.count} times</TableCell>
                    <TableCell>
                      <Chip 
                        label={topic.trend} 
                        size="small" 
                        color={topic.trend === 'High' ? 'error' : topic.trend === 'Medium' ? 'warning' : 'success'} 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h5" gutterBottom>Likely Questions for {result.target_year}</Typography>
          <Grid container spacing={3}>
            {result.predicted.map((q, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card sx={{ height: '100%', borderLeft: '5px solid', borderLeftColor: 'secondary.main' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Chip icon={<PredictionIcon />} label={`${Math.round(q.confidence * 100)}% Confidence`} color="secondary" />
                      <Typography variant="subtitle2" color="text.secondary">{q.marks} Marks</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>{q.question}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Reason:</strong> {q.reasoning}
                    </Typography>
                    <Chip label={q.topic} size="small" sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default PaperAnalyzer;
