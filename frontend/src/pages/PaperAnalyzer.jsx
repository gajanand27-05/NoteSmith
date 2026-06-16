import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress, Divider, Stack, Chip,
  Checkbox, FormGroup, FormControlLabel, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Analytics as PaperIcon, AutoAwesome as PredictionIcon,
  Quiz as QuizIcon, Style as FlashIcon, Warning as WeakIcon,
  EmojiObjects as ConceptIcon,
} from '@mui/icons-material';
import { listPdfs, analyzePapers, recordMasteryEvent } from '../api';

const PaperAnalyzer = () => {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listPdfs().then((r) => setPdfs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await analyzePapers(selectedIds);
      setResult(response.data);
      response.data.papers.forEach((p) => {
        recordMasteryEvent(p.pdf_id, 'PAPER_ANALYZER', null, null, null, { analyzed_with: selectedIds.filter((id) => id !== p.pdf_id) }).catch(() => {});
      });
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  const sortedTopics = useMemo(() => {
    if (!result) return { high: [], medium: [], low: [] };
    const topics = [...result.topics];
    return {
      high: topics.filter((t) => t.count >= 3 || t.trend === 'rising'),
      medium: topics.filter((t) => t.count === 2),
      low: topics.filter((t) => t.count <= 1 && t.trend !== 'rising'),
    };
  }, [result]);

  const difficultyEstimate = useMemo(() => {
    if (!result) return null;
    const allMarks = result.papers.flatMap((p) => p.questions.map((q) => q.marks));
    if (allMarks.length === 0) return null;
    const avg = allMarks.reduce((a, b) => a + b, 0) / allMarks.length;
    if (avg <= 3) return { label: 'Mostly Short Answer', color: 'success' };
    if (avg <= 7) return { label: 'Mixed Difficulty', color: 'warning' };
    return { label: 'Mostly Long/Detailed', color: 'error' };
  }, [result]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Paper Analyzer</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Analyze multiple previous year question papers to find topic trends and predict likely questions.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Select Papers (Choose at least 2)</Typography>
        <FormGroup sx={{ mb: 3 }}>
          <Grid container spacing={1}>
            {pdfs.map((pdf) => (
              <Grid item xs={12} sm={6} md={4} key={pdf.id}>
                <FormControlLabel
                  control={<Checkbox checked={selectedIds.includes(pdf.id)} onChange={() => handleToggle(pdf.id)} />}
                  label={pdf.original_name}
                />
              </Grid>
            ))}
          </Grid>
        </FormGroup>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained" size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PaperIcon />}
            onClick={handleAnalyze} disabled={selectedIds.length < 2 || loading}
          >
            {loading ? 'Analyzing Trends...' : 'Analyze Papers'}
          </Button>
          {selectedIds.length > 0 && (
            <>
              <Button variant="outlined" size="large" startIcon={<QuizIcon />}
                onClick={() => navigate('/quiz', { state: { pdfId: selectedIds[0] } })}>
                Generate Quiz
              </Button>
              <Button variant="outlined" size="large" startIcon={<FlashIcon />}
                onClick={() => navigate('/flashcards', { state: { pdfId: selectedIds[0] } })}>
                Generate Flashcards
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {result && (
        <Box>
          {/* Key Concepts & Weak Areas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <ConceptIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Key Concepts</Typography>
                  </Stack>
                  {sortedTopics.high.length > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {sortedTopics.high.map((t, i) => (
                        <Chip key={i} label={`${t.topic} (${t.count}x)`} size="small"
                          color="primary" variant="outlined" sx={{ mb: 1 }} />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No dominant topics identified.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', borderLeft: 3, borderLeftColor: 'warning.main' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <WeakIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>Weak Areas</Typography>
                  </Stack>
                  {sortedTopics.low.length > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {sortedTopics.low.map((t, i) => (
                        <Chip key={i} label={`${t.topic} (${t.count}x)`} size="small"
                          color="warning" variant="outlined" sx={{ mb: 1 }} />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">All topics appear regularly. No weak areas detected.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Difficulty estimate */}
          {difficultyEstimate && (
            <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>Paper Difficulty:</Typography>
              <Chip label={difficultyEstimate.label} size="small" color={difficultyEstimate.color} />
            </Paper>
          )}

          {/* Topic Frequency Table */}
          <Typography variant="h5" fontWeight={700} gutterBottom>Topic Frequency & Trends</Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
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
                        color={topic.trend === 'rising' ? 'error' : topic.trend === 'falling' ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Predicted Questions */}
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Likely Questions for {result.target_year}
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {result.predicted.map((q, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card sx={{ height: '100%', borderLeft: 3, borderLeftColor: 'secondary.main' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Chip icon={<PredictionIcon />} label={`${Math.round(q.confidence * 100)}% Confidence`} color="secondary" size="small" />
                      <Typography variant="subtitle2" color="text.secondary">{q.marks} Marks</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>{q.question}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Reason:</strong> {q.reasoning}
                    </Typography>
                    <Chip label={q.topic} size="small" sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Paper Details */}
          <Typography variant="h5" fontWeight={700} gutterBottom>Papers Analyzed</Typography>
          <Grid container spacing={2}>
            {result.papers.map((p, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{p.filename}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {p.question_count} questions {p.year ? `(${p.year})` : ''}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {p.questions.slice(0, 5).map((q, j) => (
                      <Chip key={j} label={`Q${q.number} (${q.marks}m)`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    ))}
                    {p.questions.length > 5 && (
                      <Chip label={`+${p.questions.length - 5} more`} size="small" sx={{ fontSize: '0.65rem' }} />
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default PaperAnalyzer;