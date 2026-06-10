import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import { 
  Warning as WarningIcon, 
  TrendingUp as TrendIcon, 
  History as HistoryIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import PdfSelector from '../components/shared/PdfSelector';
import api from '../api';

const StudyLoop = () => {
  const [pdfId, setPdfId] = useState('');
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pdfId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [loopRes, activityRes] = await Promise.all([
          api.get(`/loop/weak-topics/${pdfId}`),
          api.get(`/loop/activity/${pdfId}`)
        ]);
        setData(loopRes.data);
        setActivity(activityRes.data.activity);
      } catch (error) {
        console.error("Failed to fetch loop data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pdfId]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Study Loop</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Track your progress, identify weak topics, and close the learning loop.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} label="Select Document to Track Progress" />
      </Paper>

      {loading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}

      {pdfId && data && !loading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: data.overall < 0.4 ? 'error.light' : data.overall < 0.7 ? 'warning.light' : 'success.light', color: 'white' }}>
              <CardContent>
                <Typography variant="h6">Overall Mastery</Typography>
                <Typography variant="h2">{Math.round(data.overall * 100)}%</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={data.overall * 100} 
                  sx={{ mt: 2, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} 
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>Topic Breakdown</Typography>
            <Paper sx={{ p: 2 }}>
              {data.topics.length === 0 ? <Typography>No topic data yet. Take some quizzes!</Typography> : (
                <List>
                  {data.topics.map((t, i) => (
                    <Box key={i}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={t.topic || "General"} 
                          secondary={`${t.attempts} attempts • Avg Score: ${Math.round(t.avg_score * 100)}%`} 
                        />
                        <Chip 
                          label={t.avg_score < 0.5 ? "Needs Work" : t.avg_score < 0.8 ? "Getting There" : "Mastered"} 
                          color={t.avg_score < 0.5 ? "error" : t.avg_score < 0.8 ? "warning" : "success"}
                          size="small"
                        />
                      </ListItem>
                      <LinearProgress variant="determinate" value={t.avg_score * 100} color={t.avg_score < 0.5 ? "error" : "primary"} sx={{ height: 6, borderRadius: 3 }} />
                      {i < data.topics.length - 1 && <Divider sx={{ my: 1 }} />}
                    </Box>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Recent Activity</Typography>
            <Paper>
              {activity.length === 0 ? <Box sx={{ p: 3 }}>No recent activity.</Box> : (
                <List>
                  {activity.map((act, i) => (
                    <ListItem key={i} divider={i < activity.length - 1}>
                      <ListItemIcon>
                        {act.type === 'quiz' ? <SuccessIcon color="primary" /> : <TrendIcon color="secondary" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={act.type === 'quiz' ? `Quiz: ${act.score}/${act.total}` : `Flashcard Review`} 
                        secondary={`${act.topic || 'General'} • ${new Date(act.timestamp).toLocaleString()}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {pdfId && !data && !loading && (
        <Alert severity="info">No data found for this document yet. Start by taking a quiz or reviewing flashcards.</Alert>
      )}
    </Box>
  );
};

export default StudyLoop;
