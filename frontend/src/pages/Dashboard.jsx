import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid, Stack, LinearProgress, Button, Typography, Box, CardContent 
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  LocalFireDepartment as FireIcon,
  AutoGraph as ChartIcon,
  Psychology as BrainIcon,
  MenuBook as BookIcon,
  FormatQuote as QuoteIcon,
  PictureAsPdf as PdfIcon,
  TrendingUp as TrendingIcon,
  Lightbulb as BulbIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

// New design system components
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { PageSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

// API
import { getDashboardStats, listPdfs } from '../api';
import { enqueueSnackbar } from 'notistack';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pdf_count: 0, chunk_count: 0, page_count: 0 });
  const [recentPdfs, setRecentPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock mastery until real tracking exists
  const getProgress = useCallback((id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % 60) + 20;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, pdfsRes] = await Promise.all([
        getDashboardStats(),
        listPdfs()
      ]);
      setStats(statsRes.data);
      setRecentPdfs((pdfsRes.data || []).slice(0, 3));
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setError(err);
      enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const avgMastery = useMemo(() => {
    if (recentPdfs.length === 0) return 0;
    return Math.round(recentPdfs.reduce((acc, pdf) => acc + getProgress(pdf.id), 0) / recentPdfs.length);
  }, [recentPdfs, getProgress]);

  const metricCards = useMemo(() => [
    { icon: <PdfIcon />, label: 'PDFs', value: stats.pdf_count, color: 'primary' },
    { icon: <BookIcon />, label: 'Chunks', value: stats.chunk_count, color: 'primary' },
    { icon: <TrendingIcon />, label: 'Quizzes', value: '—', color: 'secondary' },
    { icon: <SchoolIcon />, label: 'Study Time', value: '—', color: 'success' },
  ], [stats]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <Box className="animate-fade-in" sx={{ pb: 6 }}>
      {/* PageHeader with breadcrumbs, title, subtitle, Upload action */}
      <PageHeader
        icon={<BrainIcon />}
        title="Dashboard"
        subtitle="Track your progress and continue your learning journey."
        actions={
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => navigate('/upload')}
            sx={{ borderRadius: 2 }}
          >
            Upload Notes
          </Button>
        }
      />

      {/* Responsive 2-column grid */}
      <Grid container spacing={3}>
        {/* LEFT COLUMN - 8/12 on desktop, full on mobile */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* 1. MASTERY HERO */}
            <SectionCard
              icon={<BrainIcon />}
              title="Overall Mastery"
              subtitle={`${recentPdfs.length} recent document${recentPdfs.length !== 1 ? 's' : ''}`}
              action={
                <Button size="small" variant="outlined" sx={{ borderRadius: 2 }}>
                  View Analytics →
                </Button>
              }
            >
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={4} sx={{ flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h2" fontWeight={800} sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, lineHeight: 1 }}>
                      {avgMastery}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recentPdfs.length > 0 ? 'Average across recent documents' : 'Upload a PDF to start tracking mastery'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <LinearProgress
                      variant="determinate"
                      value={avgMastery}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #6366F1, #A855F7)',
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                </Stack>

                {/* Inline metric chips */}
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
                  {metricCards.map((m, i) => (
                    <StatCard 
                      key={i} 
                      icon={m.icon} 
                      label={m.label} 
                      value={m.value} 
                      color={m.color} 
                      sx={{ minWidth: 100, flex: 1 }} 
                    />
                  ))}
                </Stack>
              </Stack>
            </SectionCard>

            {/* 2. CONTINUE LEARNING */}
            <SectionCard
              title="Continue Learning"
              subtitle="Pick up where you left off"
              action={
                <Button size="small" sx={{ color: 'primary.main', textTransform: 'none' }} onClick={() => navigate('/upload')}>
                  View all PDFs →
                </Button>
              }
            >
              {recentPdfs.length === 0 ? (
                <EmptyState
                  icon={<PdfIcon />}
                  title="No documents yet"
                  description="Upload your first PDF, syllabus, or question paper to start studying."
                  primaryAction={
                    <Button variant="contained" startIcon={<UploadIcon />} onClick={() => navigate('/upload')}>
                      Upload PDF
                    </Button>
                  }
                />
              ) : (
                <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 } }}>
                  {recentPdfs.map((pdf, i) => {
                    const progress = getProgress(pdf.id);
                    const themes = [
                      { main: '#8B5CF6' }, { main: '#3B82F6' }, { main: '#10B981' }, { main: '#F97316' },
                    ];
                    const theme = themes[i % themes.length];
                    return (
                      <Box key={pdf.id} sx={{ minWidth: 260, flex: 1 }}>
                        <SectionCard noPadding sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: theme.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BookIcon sx={{ fontSize: 18, color: '#fff' }} />
                              </Box>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, height: 36 }} title={pdf.original_name}>
                              {pdf.original_name.replace('.pdf', '')}
                            </Typography>
                            <Box sx={{ mt: 'auto' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: '0.7rem' }}>
                                {progress}% Mastered
                              </Typography>
                              <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 2, '& .MuiLinearProgress-bar': { backgroundColor: theme.main } }} />
                              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                <Button fullWidth size="small" variant="outlined" onClick={() => navigate('/qa')}>Study</Button>
                                <Button fullWidth size="small" variant="outlined" onClick={() => navigate('/quiz')}>Quiz</Button>
                              </Stack>
                            </Box>
                          </CardContent>
                        </SectionCard>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </SectionCard>

            {/* 3. RECOMMENDED NEXT STEPS */}
            <SectionCard title="Recommended Next Steps" subtitle="AI-generated suggestions based on your activity">
              <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 } }}>
                {[
                  { icon: <BulbIcon />, title: 'Review Weak Topics', desc: 'Focus on 6 weak areas to improve mastery', cta: 'Review Now', color: '#8B5CF6', path: '/questions' },
                  { icon: <TrendingIcon />, title: 'Practice Quiz', desc: '12 adaptive questions on your recent topics', cta: 'Start Quiz', color: '#3B82F6', path: '/quiz' },
                  { icon: <SchoolIcon />, title: 'AI Tutor', desc: 'Ask anything from your uploaded PDFs', cta: 'Ask Tutor', color: '#10B981', path: '/tutor' },
                ].map((step, i) => (
                  <Box key={i} sx={{ minWidth: 280, flex: 1 }}>
                    <SectionCard noPadding sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" fontWeight={700} color={step.color} mb={0.5}>{step.title}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mb={3} sx={{ minHeight: 36, flex: 1 }}>{step.desc}</Typography>
                        <Button 
                          variant="contained" 
                          size="small" 
                          sx={{ 
                            bgcolor: step.color, 
                            color: step.color === '#10B981' ? '#000' : '#fff', 
                            borderRadius: 2, 
                            alignSelf: 'flex-start',
                            '&:hover': { bgcolor: step.color, filter: 'brightness(0.9)' }
                          }} 
                          onClick={() => navigate(step.path)}
                        >
                          {step.cta}
                        </Button>
                      </CardContent>
                    </SectionCard>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN - 4/12 on desktop, hidden on mobile (or stacked below) */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* STREAK CARD */}
            <SectionCard icon={<FireIcon />} title="Study Streak" subtitle="7 days in a row 🔥">
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                {['M','T','W','T','F','S','S'].map((day, i) => (
                  <Stack key={i} direction="column" alignItems="center" spacing={0.5}>
                    <Box sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      bgcolor: i < 5 ? 'primary.main' : 'transparent', 
                      border: i >= 5 ? '1px solid' : 'none', 
                      borderColor: 'divider', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: i < 5 ? '#fff' : 'text.secondary' 
                    }}>
                      {i < 5 ? '✓' : day}
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color={i === 5 ? 'primary.main' : 'text.secondary'}>{day}</Typography>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>

            {/* QUOTE CARD */}
            <SectionCard icon={<QuoteIcon />} title="Daily Inspiration">
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <QuoteIcon sx={{ fontSize: 28, color: 'primary.main', opacity: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontStyle="italic" color="text.secondary" sx={{ lineHeight: 1.6, mb: 1 }}>
                    "The beautiful thing about learning is that nobody can take it away from you."
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={700}>— B.B. King</Typography>
                </Box>
              </Stack>
            </SectionCard>

            {/* WEAK TOPICS */}
            <SectionCard
              title="Weak Topics"
              subtitle="Areas needing attention"
              action={<Button size="small" sx={{ color: 'primary.main', textTransform: 'none' }}>View all →</Button>}
            >
              <Stack spacing={2}>
                {[
                  { topic: 'Neural Networks', progress: 24, color: '#EF4444' },
                  { topic: 'Linear Regression', progress: 38, color: '#F97316' },
                  { topic: 'Backpropagation', progress: 45, color: '#FBBF24' },
                  { topic: 'Normalization', progress: 61, color: '#34D399' },
                  { topic: 'Gradient Descent', progress: 72, color: '#10B981' },
                ].map((item, i) => (
                  <Box key={i}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ChartIcon sx={{ fontSize: 16, color: item.color }} />
                        <Typography variant="caption" fontWeight={600} color="text.primary">{item.topic}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{item.progress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={item.progress} sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 2 } }} />
                  </Box>
                ))}
              </Stack>
            </SectionCard>

            {/* ACCURACY OVER TIME - SVG Chart */}
            <SectionCard
              title="Accuracy Over Time"
              subtitle="Last 30 days"
              action={<Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.25, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">30 Days ▼</Typography></Box>}
            >
              <Box sx={{ position: 'relative', height: 140 }}>
                <svg viewBox="0 0 400 140" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 110 Q 20 70, 50 90 T 100 80 T 150 100 T 200 60 T 250 90 T 300 50 T 350 70 T 400 60 L 400 140 L 0 140 Z" fill="url(#accGrad)" />
                  <path d="M 0 110 Q 20 70, 50 90 T 100 80 T 150 100 T 200 60 T 250 90 T 300 50 T 350 70 T 400 60" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="400" cy="60" r="5" fill="#8B5CF6" />
                </svg>
                <Box sx={{ position: 'absolute', right: 0, top: 0, bgcolor: '#8B5CF6', px: 1.5, py: 0.5, borderRadius: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} color="#fff">82%</Typography>
                </Box>
              </Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                {['Apr 20', 'Apr 27', 'May 4', 'May 11', 'May 18'].map((d, i) => (
                  <Typography key={i} variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{d}</Typography>
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
