import React, { useState, useEffect } from 'react';
import { 
  Grid, Typography, Box, Card, CardContent, CircularProgress,
  LinearProgress, Button, IconButton, Avatar, Chip, Stack
} from '@mui/material';
import { 
  LocalFireDepartment as FireIcon,
  AutoGraph as ChartIcon,
  MoreHoriz as MoreIcon,
  Psychology as BrainIcon,
  MenuBook as BookIcon,
  FormatQuote as QuoteIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { getDashboardStats, listPdfs } from '../api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({ pdf_count: 0, chunk_count: 0, page_count: 0 });
  const [recentPdfs, setRecentPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, pdfsRes] = await Promise.all([
          getDashboardStats(),
          listPdfs()
        ]);
        setStats(statsRes.data);
        // Get the 3 most recently uploaded PDFs
        setRecentPdfs((pdfsRes.data || []).slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Generate a random progress value for demonstration purposes,
  // since we don't have actual per-PDF mastery tracking yet.
  const getProgress = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % 60) + 20; // 20% to 80%
  };

  const colors = ["#818CF8", "#38BDF8", "#34D399"];

  return (
    <Box className="animate-fade-in" sx={{ pb: 6 }}>
      {/* Header Area */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5 }}>
            Good morning, Scholar! 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Let's make today a productive learning day.
          </Typography>
        </Box>

        {/* Streak Card as Top Horizontal Banner */}
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', backdropFilter: 'none', border: '1px solid rgba(245,158,11,0.2)' }}>
          <CardContent sx={{ py: 1, px: 3, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <FireIcon sx={{ fontSize: 32, color: '#F59E0B', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }} />
              <Box>
                <Typography variant="subtitle2" fontWeight="700">You're on a streak!</Typography>
                <Typography variant="caption" color="text.secondary">7 days in a row</Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1.5}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <Box key={i} display="flex" flexDirection="column" alignItems="center">
                  <Box sx={{ 
                    width: 20, height: 20, borderRadius: '50%', 
                    bgcolor: i < 5 ? '#F59E0B' : (i === 5 ? 'text.primary' : 'rgba(255,255,255,0.1)'),
                    color: i < 5 ? '#fff' : (i === 5 ? 'background.default' : 'text.secondary'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 'bold', mb: 0.5
                  }}>
                    {i < 5 ? '✓' : (i === 5 ? '⚡' : '')}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{day}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT COLUMN - Main Content */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            
            {/* Hero Card: Overall Mastery */}
            <Card sx={{ 
              position: 'relative', overflow: 'hidden', p: 0,
              background: 'linear-gradient(145deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)'
            }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box display="flex" justifyContent="space-between">
                  <Box sx={{ flex: 1, zIndex: 1 }}>
                    <Typography variant="overline" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontWeight: 700, lineHeight: 1 }}>
                      <BrainIcon fontSize="small" /> OVERALL MASTERY
                    </Typography>
                    <Typography variant="h2" fontWeight="800" sx={{ mt: 1, mb: 0.5, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
                      82%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      You're doing great! Keep it up.
                    </Typography>
                    
                    <LinearProgress 
                      variant="determinate" 
                      value={82} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3, 
                        mb: 3, 
                        maxWidth: 250,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #6366F1, #A855F7)'
                        }
                      }} 
                    />

                    <Grid container spacing={2} sx={{ maxWidth: 350 }}>
                      <Grid item xs={3}>
                        <Typography variant="h6" fontWeight="700">{stats.pdf_count}</Typography>
                        <Typography variant="caption" color="text.secondary">PDFs</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h6" fontWeight="700">{stats.chunk_count}</Typography>
                        <Typography variant="caption" color="text.secondary">Chunks</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h6" fontWeight="700">28</Typography>
                        <Typography variant="caption" color="text.secondary">Quizzes</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h6" fontWeight="700">18h</Typography>
                        <Typography variant="caption" color="text.secondary">Study Time</Typography>
                      </Grid>
                    </Grid>

                    <Button variant="outlined" size="small" sx={{ mt: 3, borderRadius: '20px' }}>
                      View Analytics &gt;
                    </Button>
                  </Box>

                  {/* Decorative glowing background element (simulating the 3D crystal) */}
                  <Box sx={{
                    position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)',
                    width: '250px', height: '250px',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(168,85,247,0) 70%)',
                    zIndex: 0, pointerEvents: 'none', display: { xs: 'none', sm: 'block' }
                  }}>
                    <Box sx={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      width: '80px', height: '120px', background: 'linear-gradient(135deg, #A855F7, #6366F1)',
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      boxShadow: '0 0 40px #A855F7', opacity: 0.8
                    }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Continue Learning - Using actual PDFs */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                <Typography variant="h6" fontWeight="700">Continue Learning</Typography>
                <Button size="small" sx={{ color: 'primary.light' }} onClick={() => navigate('/upload')}>
                  View all PDFs &gt;
                </Button>
              </Stack>
              
              {recentPdfs.length === 0 ? (
                <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <PdfIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                  <Typography variant="body1" color="text.secondary">You haven't uploaded any PDFs yet.</Typography>
                  <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => navigate('/upload')}>Upload PDF</Button>
                </Card>
              ) : (
                <Grid container spacing={2}>
                  {recentPdfs.map((pdf, i) => {
                    const progress = getProgress(pdf.id);
                    const color = colors[i % colors.length];
                    return (
                      <Grid item xs={12} sm={6} md={4} key={pdf.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flex: 1, p: 2, '&:last-child': { pb: 2 } }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                              <Avatar sx={{ bgcolor: `${color}20`, color: color, width: 36, height: 36, borderRadius: 2 }}>
                                <BookIcon fontSize="small" />
                              </Avatar>
                              <IconButton size="small" sx={{ p: 0.5 }}><MoreIcon fontSize="small" /></IconButton>
                            </Box>
                            
                            <Typography variant="subtitle2" fontWeight="700" sx={{ 
                              mb: 1.5, 
                              display: '-webkit-box', 
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.3,
                              height: 36
                            }} title={pdf.original_name}>
                              {pdf.original_name.replace('.pdf', '')}
                            </Typography>
                            
                            <Box sx={{ mt: 'auto' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {progress}% Mastered
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={progress} 
                                sx={{ 
                                  height: 4, borderRadius: 2, mb: 1.5,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                  '& .MuiLinearProgress-bar': { backgroundColor: color }
                                }} 
                              />
                              <Grid container spacing={1}>
                                <Grid item xs={6}>
                                  <Button fullWidth variant="contained" size="small" sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', 
                                    boxShadow: 'none', fontSize: '0.75rem', py: 0.5,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }
                                  }}>Study</Button>
                                </Grid>
                                <Grid item xs={6}>
                                  <Button fullWidth variant="contained" size="small" sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', 
                                    boxShadow: 'none', fontSize: '0.75rem', py: 0.5,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }
                                  }}>Quiz</Button>
                                </Grid>
                              </Grid>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>

            {/* Recommended Next Steps */}
            <Box>
              <Typography variant="h6" fontWeight="700" mb={2}>Recommended Next Steps</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ bgcolor: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)', height: '100%' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" fontWeight="700" mb={0.5}>Review Weak Topics</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={2} sx={{ minHeight: 35 }}>
                        Focus on 6 weak areas.
                      </Typography>
                      <Button variant="contained" color="primary" size="small" fullWidth>Review Now</Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ bgcolor: 'rgba(56,189,248,0.05)', borderColor: 'rgba(56,189,248,0.15)', height: '100%' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" fontWeight="700" mb={0.5}>Practice Quiz</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={2} sx={{ minHeight: 35 }}>
                        12 fresh questions.
                      </Typography>
                      <Button variant="contained" size="small" fullWidth sx={{ bgcolor: '#0284C7' }}>Start Quiz</Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ bgcolor: 'rgba(52,211,153,0.05)', borderColor: 'rgba(52,211,153,0.15)', height: '100%' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" fontWeight="700" mb={0.5}>AI Tutor</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={2} sx={{ minHeight: 35 }}>
                        Ask any questions.
                      </Typography>
                      <Button variant="contained" color="secondary" size="small" fullWidth>Ask Tutor</Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

          </Stack>
        </Grid>

        {/* RIGHT COLUMN - Sidebar stats */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            
            {/* Quote Card */}
            <Card sx={{ bgcolor: 'rgba(99,102,241,0.05)' }}>
              <CardContent sx={{ display: 'flex', gap: 1.5, p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <QuoteIcon color="primary" sx={{ fontSize: 32, opacity: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontStyle="italic" mb={1} lineHeight={1.4}>
                    "The beautiful thing about learning is that nobody can take it away from you."
                  </Typography>
                  <Typography variant="caption" color="primary.light" fontWeight="700">
                    — B.B. King
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Weak Topics */}
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="700">Weak Topics</Typography>
                  <Button size="small" sx={{ color: 'primary.light', minWidth: 0, p: 0 }}>View all &gt;</Button>
                </Stack>
                <Stack spacing={2}>
                  {[
                    { topic: 'Neural Networks', progress: 24, color: '#EF4444' },
                    { topic: 'Linear Regression', progress: 38, color: '#F97316' },
                    { topic: 'Backpropagation', progress: 45, color: '#EAB308' },
                    { topic: 'Normalization', progress: 61, color: '#22C55E' },
                  ].map((item, i) => (
                    <Box key={i}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight="600">{item.topic}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.progress}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={item.progress} 
                        sx={{ 
                          height: 4, borderRadius: 2, 
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          '& .MuiLinearProgress-bar': { backgroundColor: item.color }
                        }} 
                      />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Accuracy Over Time Placeholder */}
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="700">Accuracy Over Time</Typography>
                  <Chip label="30 Days" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                </Stack>
                <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2, mb: 2 }}>
                  <ChartIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
                </Box>
                <Box display="flex" gap={1.5} alignItems="center" bgcolor="rgba(52,211,153,0.1)" p={1.5} borderRadius={2}>
                  <ChartIcon color="secondary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" fontWeight="700" display="block">Nice work! Accuracy improved</Typography>
                    <Typography variant="caption" color="secondary.main" fontWeight="700">12% in the last 7 days.</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
