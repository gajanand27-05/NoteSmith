import React, { useState, useEffect } from 'react';
import { 
  Grid, Typography, Box, Card, CardContent, CircularProgress,
  LinearProgress, Button, IconButton, Avatar, Chip, Stack
} from '@mui/material';
import { 
  LocalFireDepartment as FireIcon,
  AutoGraph as ChartIcon,
  PlayArrow as PlayIcon,
  MoreHoriz as MoreIcon,
  Psychology as BrainIcon,
  MenuBook as BookIcon,
  Bolt as FlashIcon,
  FormatQuote as QuoteIcon
} from '@mui/icons-material';
import { getDashboardStats } from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({ pdf_count: 0, chunk_count: 0, page_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getDashboardStats();
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in" sx={{ pb: 6 }}>
      {/* Header Area */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" fontWeight="800" sx={{ mb: 1 }}>
            Good morning, Scholar! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Let's make today a productive learning day.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT COLUMN - Main Content */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            
            {/* Hero Card: Overall Mastery */}
            <Card sx={{ 
              position: 'relative', overflow: 'hidden', p: 1, 
              background: 'linear-gradient(145deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)'
            }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box sx={{ flex: 1, zIndex: 1 }}>
                    <Typography variant="overline" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontWeight: 700 }}>
                      <BrainIcon fontSize="small" /> OVERALL MASTERY
                    </Typography>
                    <Typography variant="h1" fontWeight="800" sx={{ mt: 1, mb: 1, fontSize: '4rem' }}>
                      82%
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      You're doing great! Keep it up.
                    </Typography>
                    
                    <LinearProgress 
                      variant="determinate" 
                      value={82} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        mb: 4, 
                        maxWidth: 300,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #6366F1, #A855F7)'
                        }
                      }} 
                    />

                    <Grid container spacing={2} sx={{ maxWidth: 400 }}>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="700">{stats.pdf_count}</Typography>
                        <Typography variant="caption" color="text.secondary">PDFs</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="700">{stats.chunk_count}</Typography>
                        <Typography variant="caption" color="text.secondary">Chunks</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="700">28</Typography>
                        <Typography variant="caption" color="text.secondary">Quizzes</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h5" fontWeight="700">18h</Typography>
                        <Typography variant="caption" color="text.secondary">Study Time</Typography>
                      </Grid>
                    </Grid>

                    <Button variant="outlined" sx={{ mt: 4, borderRadius: '20px' }}>
                      View Analytics &gt;
                    </Button>
                  </Box>

                  {/* Decorative glowing background element (simulating the 3D crystal) */}
                  <Box sx={{
                    position: 'absolute',
                    right: '-10%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0) 70%)',
                    zIndex: 0,
                    pointerEvents: 'none',
                    display: { xs: 'none', sm: 'block' }
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100px', height: '150px',
                      background: 'linear-gradient(135deg, #A855F7, #6366F1)',
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      boxShadow: '0 0 50px #A855F7',
                      opacity: 0.8
                    }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Continue Learning */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="700">Continue Learning</Typography>
                <Button size="small" sx={{ color: 'primary.light' }}>View all PDFs &gt;</Button>
              </Box>
              <Grid container spacing={2}>
                {[
                  { title: "AI Fundamentals", progress: 72, color: "#818CF8", icon: <BrainIcon/> },
                  { title: "Machine Learning", progress: 64, color: "#38BDF8", icon: <BookIcon/> },
                  { title: "Deep Learning", progress: 48, color: "#34D399", icon: <FlashIcon/> },
                ].map((item, i) => (
                  <Grid item xs={12} sm={4} key={i}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flex: 1, p: 2.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Avatar sx={{ bgcolor: `${item.color}20`, color: item.color, borderRadius: 2 }}>
                            {item.icon}
                          </Avatar>
                          <IconButton size="small"><MoreIcon /></IconButton>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2, height: 48 }}>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {item.progress}% Mastered
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={item.progress} 
                          sx={{ 
                            height: 6, borderRadius: 3, mb: 2,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            '& .MuiLinearProgress-bar': { backgroundColor: item.color }
                          }} 
                        />
                        <Box display="flex" gap={1}>
                          <Button variant="contained" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', boxShadow: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}}>Study</Button>
                          <Button variant="contained" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', boxShadow: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}}>Quiz</Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Recommended Next Steps */}
            <Box>
              <Typography variant="h6" fontWeight="700" mb={2}>Recommended Next Steps</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ bgcolor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="700" mb={1}>Review Weak Topics</Typography>
                      <Typography variant="body2" color="text.secondary" mb={3} sx={{ minHeight: 40 }}>
                        Focus on 6 weak areas to improve mastery.
                      </Typography>
                      <Button variant="contained" color="primary">Review Now</Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ bgcolor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.2)' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="700" mb={1}>Practice Quiz</Typography>
                      <Typography variant="body2" color="text.secondary" mb={3} sx={{ minHeight: 40 }}>
                        12 questions on Neural Networks.
                      </Typography>
                      <Button variant="contained" sx={{ bgcolor: '#0284C7' }}>Start Quiz</Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={12} md={4}>
                  <Card sx={{ bgcolor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.2)' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="700" mb={1}>AI Tutor</Typography>
                      <Typography variant="body2" color="text.secondary" mb={3} sx={{ minHeight: 40 }}>
                        Ask anything from your PDFs.
                      </Typography>
                      <Button variant="contained" color="secondary">Ask Tutor</Button>
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
            
            {/* Streak Card */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" fontWeight="700">You're on a streak! <FireIcon sx={{ color: '#F59E0B', verticalAlign: 'middle' }}/></Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>7 days in a row</Typography>
                  </Box>
                  <FireIcon sx={{ fontSize: 60, color: '#F59E0B', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }} />
                </Box>
                <Box display="flex" justifyContent="space-between" mt={2}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <Box key={i} display="flex" flexDirection="column" alignItems="center">
                      <Box sx={{ 
                        width: 24, height: 24, borderRadius: '50%', 
                        bgcolor: i < 5 ? 'primary.main' : (i === 5 ? 'text.primary' : 'rgba(255,255,255,0.1)'),
                        color: i < 5 ? '#fff' : (i === 5 ? 'background.default' : 'text.secondary'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 'bold', mb: 1
                      }}>
                        {i < 5 ? '✓' : (i === 5 ? '⚡' : '')}
                      </Box>
                      <Typography variant="caption" color="text.secondary">{day}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Quote Card */}
            <Card sx={{ bgcolor: 'rgba(99,102,241,0.05)' }}>
              <CardContent sx={{ display: 'flex', gap: 2 }}>
                <QuoteIcon color="primary" sx={{ fontSize: 40, opacity: 0.5 }} />
                <Box>
                  <Typography variant="body1" fontStyle="italic" mb={1}>
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
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight="700">Weak Topics</Typography>
                  <Button size="small" sx={{ color: 'primary.light' }}>View all &gt;</Button>
                </Box>
                <Stack spacing={3}>
                  {[
                    { topic: 'Neural Networks', progress: 24, color: '#EF4444' },
                    { topic: 'Linear Regression', progress: 38, color: '#F97316' },
                    { topic: 'Backpropagation', progress: 45, color: '#EAB308' },
                    { topic: 'Normalization', progress: 61, color: '#22C55E' },
                  ].map((item, i) => (
                    <Box key={i}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight="600">{item.topic}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.progress}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={item.progress} 
                        sx={{ 
                          height: 6, borderRadius: 3, 
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
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="700">Accuracy Over Time</Typography>
                  <Chip label="30 Days" size="small" />
                </Box>
                <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2, mb: 2 }}>
                  {/* Placeholder for actual chart */}
                  <ChartIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.5 }} />
                </Box>
                <Box display="flex" gap={2} alignItems="center" bgcolor="rgba(52,211,153,0.1)" p={2} borderRadius={2}>
                  <ChartIcon color="secondary" />
                  <Box>
                    <Typography variant="body2" fontWeight="700">Nice work! Your accuracy improved</Typography>
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
