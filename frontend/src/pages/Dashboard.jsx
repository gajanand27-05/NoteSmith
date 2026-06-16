import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Grid, Typography, Box, Card, CardContent, LinearProgress,
  Button, IconButton, Stack
} from '@mui/material';
import {
  LocalFireDepartment as FireIcon,
  AutoGraph as ChartIcon,
  MoreHoriz as MoreIcon,
  Psychology as BrainIcon,
  MenuBook as BookIcon,
  FormatQuote as QuoteIcon,
  PictureAsPdf as PdfIcon,
  CloudUpload as UploadIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { getDashboardStats, listPdfs, getMasterySummary, getWeakTopics, getRecommendations } from '../api';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { PageSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentPdfs, setRecentPdfs] = useState([]);
  const [masteryList, setMasteryList] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, pdfsRes, masteryRes, weakRes, recsRes] = await Promise.all([
        getDashboardStats(),
        listPdfs(),
        getMasterySummary().catch(() => ({ data: [] })),
        getWeakTopics().catch(() => ({ data: [] })),
        getRecommendations().catch(() => ({ data: { recommendations: [] } })),
      ]);
      setStats(statsRes.data);
      const pdfs = pdfsRes.data || [];
      setRecentPdfs(pdfs.slice(0, 3));
      const mastery = masteryRes.data || [];
      setMasteryList(mastery);
      setWeakTopics(weakRes.data || []);
      setRecommendations(recsRes.data?.recommendations || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const masteryMap = useMemo(() => {
    const mm = {};
    masteryList.forEach((m) => { mm[m.pdf_id] = m; });
    recentPdfs.forEach((p) => {
      if (!mm[p.id]) mm[p.id] = { pdf_id: p.id, pdf_name: p.original_name, mastery_score: 0, total_events: 0, breakdown: {} };
    });
    return mm;
  }, [masteryList, recentPdfs]);

  const overallMastery = useMemo(() => {
    if (stats && stats.mastery != null) return Math.round(stats.mastery * 100);
    const scores = Object.values(masteryMap).map((m) => m.mastery_score ?? 0).filter(Boolean);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [stats, masteryMap]);

  const accuracyScore = useMemo(() => {
    const scores = Object.values(masteryMap).filter((m) => m.total_events > 0).map((m) => m.mastery_score ?? 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [masteryMap]);

  const studyStreak = useMemo(() => {
    if (stats?.streak?.current_streak != null) return stats.streak.current_streak;
    return 0;
  }, [stats]);

  const atRisk = useMemo(() => {
    return Object.values(masteryMap).filter((m) => (m.mastery_score ?? 100) < 50 && m.total_events > 0).length;
  }, [masteryMap]);

  const healthStats = useMemo(() => ({
    masteryScore: overallMastery,
    accuracy: accuracyScore,
    studyStreak,
    learningRisk: atRisk,
  }), [overallMastery, accuracyScore, studyStreak, atRisk]);

  const documentsByMastery = useMemo(() => {
    const entries = Object.values(masteryMap).filter((m) => m.total_events > 0 || recentPdfs.some((p) => p.id === m.pdf_id));
    return [...entries]
      .map((m) => {
        const score = m.mastery_score ?? 0;
        const topicName = (m.pdf_name || '').replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        return {
          topic: topicName.length > 35 ? topicName.slice(0, 32) + '...' : topicName,
          progress: score,
          color: score < 30 ? '#EF4444' : score < 50 ? '#F97316' : score < 65 ? '#FBBF24' : score < 80 ? '#34D399' : '#10B981',
          pdfId: m.pdf_id,
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [masteryMap, recentPdfs]);

  const displayWeakTopics = useMemo(() => {
    if (weakTopics.length > 0) {
      return weakTopics.slice(0, 5).map((m) => {
        const score = m.mastery_score ?? 0;
        const topicName = (m.pdf_name || '').replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        return {
          topic: topicName.length > 30 ? topicName.slice(0, 27) + '...' : topicName,
          progress: score,
          color: score < 30 ? '#EF4444' : score < 50 ? '#F97316' : score < 65 ? '#FBBF24' : score < 80 ? '#34D399' : '#10B981',
          pdfId: m.pdf_id,
        };
      });
    }
    const entries = Object.values(masteryMap).filter((m) => m.total_events > 0 || recentPdfs.some((p) => p.id === m.pdf_id));
    return [...entries]
      .map((m) => {
        const score = m.mastery_score ?? 0;
        const topicName = (m.pdf_name || '').replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        return {
          topic: topicName.length > 30 ? topicName.slice(0, 27) + '...' : topicName,
          progress: score,
          color: score < 30 ? '#EF4444' : score < 50 ? '#F97316' : score < 65 ? '#FBBF24' : score < 80 ? '#34D399' : '#10B981',
          pdfId: m.pdf_id,
        };
      })
      .sort((a, b) => a.progress - b.progress);
  }, [weakTopics, masteryMap, recentPdfs]);

  const maxStreak = useMemo(() => {
    if (stats?.streak?.longest_streak != null) return stats.streak.longest_streak;
    return studyStreak;
  }, [stats, studyStreak]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const streakDays = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(studyStreak > i);
    }
    return days;
  }, [studyStreak]);

  const todayIndex = new Date().getDay();
  const orderedDayLabels = [...dayLabels.slice(todayIndex), ...dayLabels.slice(0, todayIndex)];

  if (loading) return <PageSkeleton />;

  return (
    <Box className="animate-fade-in" sx={{ pb: 6 }}>
      <PageHeader
        icon={<BrainIcon />}
        actions={
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => navigate('/upload')}>
            Upload Notes
          </Button>
        }
      />

      <Grid container spacing={3} wrap="nowrap" sx={{ minWidth: 900 }}>
        {/* LEFT COLUMN */}
        <Grid item xs={8}>
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
                      {overallMastery}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {recentPdfs.length > 0 ? 'Across all your documents' : 'Upload a PDF to start tracking'}
                    </Typography>

                    <LinearProgress 
                      variant="determinate" 
                      value={overallMastery} 
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

                    <Stack direction="row" gap={1.5} sx={{ maxWidth: 450, overflowX: 'auto', pb: 1, flexWrap: 'wrap' }}>
                      {[
                        { icon: <UploadIcon />, label: 'PDFs', value: stats?.pdf_count ?? 0 },
                        { icon: <BookIcon />, label: 'With Data', value: stats?.pdfs_with_data ?? 0 },
                        { icon: <ChartIcon />, label: 'Active', value: stats?.active_pdfs ?? 0 },
                        { icon: <SchoolIcon />, label: 'Attempts', value: stats?.total_attempts ?? '—' },
                      ].map((stat, i) => (
                        <StatCard key={i} icon={stat.icon} label={stat.label} value={stat.value} sx={{ flex: 1, minWidth: 90 }} />
                      ))}
                    </Stack>

                    <Button variant="outlined" size="small" sx={{ mt: 3, borderRadius: '20px' }}>
                      View Analytics &gt;
                    </Button>
                  </Box>

                  <Box sx={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: '60%', zIndex: 0, display: 'flex', justifyContent: 'flex-end'
                  }}>
                    <video 
                      autoPlay loop muted playsInline
                      src="/crystal_loop.mp4" 
                      style={{ 
                        width: '100%', height: '100%', objectFit: 'cover',
                        maskImage: 'linear-gradient(to right, transparent 0%, black 30%, black 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%, black 100%)'
                      }} 
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Continue Learning */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                <Typography variant="h6" fontWeight="700">Continue Learning</Typography>
                <Button size="small" sx={{ color: 'primary.light', textTransform: 'none' }} onClick={() => navigate('/upload')}>
                  View all PDFs &rarr;
                </Button>
              </Stack>

              {recentPdfs.length === 0 ? (
                <EmptyState
                  icon={<PdfIcon />}
                  title="No documents yet"
                  description="Upload your first PDF, syllabus, or question paper to start studying."
                  primaryAction={<Button variant="contained" startIcon={<UploadIcon />} onClick={() => navigate('/upload')}>Upload PDF</Button>}
                />
              ) : (
                <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 } }}>
                  {recentPdfs.map((pdf, i) => {
                    const mastery = masteryMap[pdf.id];
                    const progress = mastery?.mastery_score ?? 0;
                    const colorThemes = [
                      { main: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
                      { main: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                      { main: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                      { main: '#F97316', bg: 'rgba(249,115,22,0.1)' }
                    ];
                    const theme = colorThemes[i % colorThemes.length];
                    return (
                      <Box key={pdf.id} sx={{ minWidth: 240, flex: 1 }}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <CardContent sx={{ flex: 1, p: 2, '&:last-child': { pb: 2 } }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                              <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: theme.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BookIcon sx={{ fontSize: 18, color: '#fff' }} />
                              </Box>
                              <IconButton size="small" sx={{ color: 'text.secondary', p: 0 }}><MoreIcon fontSize="small" /></IconButton>
                            </Box>
                            <Typography variant="subtitle2" fontWeight="700" sx={{ 
                              mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3, height: 36
                            }} title={pdf.original_name}>
                              {pdf.original_name.replace('.pdf', '')}
                            </Typography>
                            <Box sx={{ mt: 'auto' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: '0.65rem' }}>
                                {progress}% Mastered
                              </Typography>
                              <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 2, backgroundColor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { backgroundColor: theme.main } }} />
                              <Grid container spacing={1}>
                                <Grid item xs={4.5}>
                                  <Button fullWidth variant="contained" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', boxShadow: 'none', fontSize: '0.7rem', py: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' } }}>Study</Button>
                                </Grid>
                                <Grid item xs={4.5}>
                                  <Button fullWidth variant="contained" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', boxShadow: 'none', fontSize: '0.7rem', py: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' } }}>Quiz</Button>
                                </Grid>
                                <Grid item xs={3}>
                                  <Button fullWidth variant="contained" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.secondary', boxShadow: 'none', minWidth: 0, p: 0, py: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' } }}><MoreIcon fontSize="small" /></Button>
                                </Grid>
                              </Grid>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* Recommended Next Action */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="700">Recommended Next Action</Typography>
                <Typography variant="caption" color="text.secondary">Powered by recommendation engine</Typography>
              </Stack>
              <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 } }}>
                {recommendations.length > 0 ? (
                  recommendations.slice(0, 3).map((rec, i) => {
                    const palettes = [
                      { main: '#8B5CF6', bg: '#1A1525', border: 'rgba(139,92,246,0.2)', accent: '#A78BFA' },
                      { main: '#3B82F6', bg: '#111827', border: 'rgba(59,130,246,0.2)', accent: '#60A5FA' },
                      { main: '#10B981', bg: '#064E3B', border: 'rgba(16,185,129,0.2)', accent: '#34D399' },
                    ];
                    const p = palettes[i % palettes.length];
                    const docName = rec.topic || (rec.pdf_name || '').replace(/\.pdf$/i, '');
                    return (
                      <Box key={rec.pdf_id + (rec.topic || '')} sx={{ minWidth: 260, flex: 1 }}>
                        <Card sx={{ bgcolor: p.bg, border: `1px solid ${p.border}`, height: '100%', position: 'relative', overflow: 'hidden' }}>
                          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, zIndex: 1, position: 'relative' }}>
                            <Typography variant="subtitle2" fontWeight="700" color={p.accent} mb={0.5}>
                              {docName.length > 35 ? docName.slice(0, 32) + '...' : docName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={1.5} sx={{ minHeight: 32 }}>
                              {rec.reason || `Mastery: ${Math.round(rec.mastery)}%`}
                            </Typography>
                            <Typography variant="h4" fontWeight="800" color={p.accent} mb={1}>
                              {Math.round(rec.mastery)}%
                            </Typography>
                            <LinearProgress variant="determinate" value={Math.round(rec.mastery)} sx={{ height: 3, borderRadius: 2, mb: 2, backgroundColor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { backgroundColor: p.main } }} />
                            <Button variant="contained" size="small" sx={{ bgcolor: p.main, borderRadius: 2, px: 3 }} onClick={() => navigate(`/study/${rec.pdf_id}`)}>Study Now</Button>
                          </CardContent>
                        </Card>
                      </Box>
                    );
                  })
                ) : (
                  <>
                    <Box sx={{ minWidth: 260, flex: 1 }}>
                      <Card sx={{ bgcolor: '#1A1525', border: '1px solid rgba(139,92,246,0.2)', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, zIndex: 1, position: 'relative' }}>
                          <Typography variant="subtitle2" fontWeight="700" mb={0.5}>No Recommendations Yet</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mb={3} sx={{ minHeight: 35, maxWidth: '70%' }}>
                            Upload a PDF and start studying to get personalised recommendations.
                          </Typography>
                          <Button variant="contained" size="small" sx={{ bgcolor: '#8B5CF6', borderRadius: 2, px: 3 }} onClick={() => navigate('/upload')}>Upload PDF</Button>
                        </CardContent>
                      </Card>
                    </Box>
                    <Box sx={{ minWidth: 260, flex: 1 }}>
                      <Card sx={{ bgcolor: '#064E3B', border: '1px solid rgba(16,185,129,0.2)', height: '100%', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)' }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, zIndex: 1, position: 'relative' }}>
                          <Typography variant="subtitle2" fontWeight="700" color="#34D399" mb={0.5}>AI Tutor</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mb={3} sx={{ minHeight: 35, maxWidth: '60%' }}>
                            Ask anything from your PDFs
                          </Typography>
                          <Button variant="contained" size="small" sx={{ bgcolor: '#10B981', color: '#000', fontWeight: 'bold', borderRadius: 2, px: 3 }}>Ask Tutor</Button>
                        </CardContent>
                        <Box sx={{ position: 'absolute', right: 0, bottom: -10 }}>
                           <BrainIcon sx={{ fontSize: 100, color: '#34D399', opacity: 0.3 }} />
                        </Box>
                      </Card>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>

          </Stack>
        </Grid>

        {/* RIGHT COLUMN */}
        <Grid item xs={4}>
          <Stack spacing={3}>

            {/* Streak Card */}
            <Card sx={{ bgcolor: '#0B0A10', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box position="relative" zIndex={1}>
                  <Typography variant="subtitle1" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {studyStreak > 0 ? `You're on a streak!` : 'Start your streak'}
                    <FireIcon fontSize="small" sx={{ color: '#F97316' }} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                    {studyStreak > 0
                      ? `${studyStreak} day${studyStreak > 1 ? 's' : ''} in a row`
                      : 'Complete a study session to begin'}
                  </Typography>
                  <Stack direction="row" gap={1.5} flexWrap="nowrap">
                    {orderedDayLabels.map((day, i) => (
                      <Stack key={i} direction="column" alignItems="center" gap={1}>
                        <Box sx={{ 
                          width: 28, height: 28, borderRadius: '50%', 
                          bgcolor: streakDays[i] ? '#6366F1' : 'rgba(255,255,255,0.05)',
                          color: streakDays[i] ? '#fff' : 'text.secondary',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: 'bold'
                        }}>
                          {streakDays[i] ? '✓' : ''}
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: streakDays[i] ? '#FFF' : 'text.secondary', fontWeight: streakDays[i] ? '700' : '400' }}>{day}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                    Best streak: {maxStreak} day{maxStreak > 1 ? 's' : ''}
                  </Typography>
                </Box>
                <FireIcon sx={{ 
                  position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 140, color: '#F97316', filter: 'drop-shadow(0 0 40px rgba(249,115,22,0.5))', opacity: 0.8, zIndex: 0
                }} />
              </CardContent>
            </Card>

            {/* Quote Card */}
            <Card sx={{ bgcolor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)' }}>
              <CardContent sx={{ display: 'flex', gap: 2, p: 3, '&:last-child': { pb: 3 } }}>
                <QuoteIcon sx={{ fontSize: 32, color: '#6366F1', flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" fontStyle="italic" mb={1.5} lineHeight={1.5} color="text.secondary">
                    "The beautiful thing about learning is that nobody can take it away from you."
                  </Typography>
                  <Typography variant="caption" color="#6366F1" fontWeight="700">
                    — B.B. King
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Weakest Topics */}
            {displayWeakTopics.length > 0 && (
              <Card sx={{ bgcolor: '#0B0A10', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="subtitle1" fontWeight="700">Weakest Topics</Typography>
                    <Typography variant="caption" color="text.secondary">Powered by mastery engine</Typography>
                  </Stack>
                  <Stack spacing={2.5}>
                    {displayWeakTopics.map((item, i) => (
                      <Box key={item.pdfId || i}>
                        <Box display="flex" justifyContent="space-between" mb={1} flexWrap="wrap">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <ChartIcon sx={{ fontSize: 16, color: item.color }} />
                            <Typography variant="caption" fontWeight="600" color="text.primary">{item.topic}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{item.progress}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={item.progress} sx={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 2 } }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Documents by Mastery */}
            {documentsByMastery.length > 0 && (
              <Card sx={{ bgcolor: '#0B0A10', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={3}>Documents by Mastery</Typography>
                  <Stack spacing={2}>
                    {documentsByMastery.map((item, i) => (
                      <Box key={item.pdfId || i}>
                        <Box display="flex" justifyContent="space-between" mb={1} flexWrap="wrap">
                          <Typography variant="caption" fontWeight="600" color="text.primary">{item.topic}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.progress}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={item.progress} sx={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 2 } }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Learning Health */}
            <Card sx={{ bgcolor: '#0B0A10', border: '1px solid rgba(255,255,255,0.05)' }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="subtitle1" fontWeight="700">Learning Health</Typography>
                  <Typography variant="caption" color="text.secondary">Powered by mastery engine</Typography>
                </Stack>
                <Grid container spacing={2}>
                  {[
                    { label: 'Mastery Score', value: `${healthStats.masteryScore}%`, color: '#8B5CF6', icon: <BrainIcon /> },
                    { label: 'Accuracy', value: `${healthStats.accuracy}%`, color: '#10B981', icon: <ChartIcon /> },
                    { label: 'Study Streak', value: `${healthStats.studyStreak} day${healthStats.studyStreak !== 1 ? 's' : ''}`, color: '#F97316', icon: <FireIcon /> },
                    { label: 'Learning Risk', value: healthStats.learningRisk, color: '#EF4444', icon: <SchoolIcon /> },
                  ].map((h, i) => (
                    <Grid item xs={6} key={i}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                        <Box sx={{ color: h.color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>{h.icon}</Box>
                        <Typography variant="h5" fontWeight="800" color={h.color}>{h.value}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{h.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
