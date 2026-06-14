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
  School as SchoolIcon
} from '@mui/icons-material';
import { getDashboardStats, listPdfs } from '../api';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { PageSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pdf_count: 0, chunk_count: 0, page_count: 0 });
  const [recentPdfs, setRecentPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  const getProgress = useCallback((id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % 60) + 20;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, pdfsRes] = await Promise.all([
        getDashboardStats(),
        listPdfs()
      ]);
      setStats(statsRes.data);
      setRecentPdfs((pdfsRes.data || []).slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const avgMastery = useMemo(() => {
    if (recentPdfs.length === 0) return 0;
    return Math.round(recentPdfs.reduce((acc, pdf) => acc + getProgress(pdf.id), 0) / recentPdfs.length);
  }, [recentPdfs, getProgress]);

  // Weak Topics derived from actual uploaded PDFs — each PDF becomes a topic
  // with its real name and hash-based progress (placeholder until per-doc mastery exists)
  const weakTopics = useMemo(() => {
    if (recentPdfs.length === 0) {
      return [];
    }
    return recentPdfs.map((pdf) => {
      const progress = getProgress(pdf.id);
      const topicName = pdf.original_name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      return {
        topic: topicName.length > 30 ? topicName.slice(0, 27) + '...' : topicName,
        progress,
        color: progress < 30 ? '#EF4444' : progress < 50 ? '#F97316' : progress < 65 ? '#FBBF24' : progress < 80 ? '#34D399' : '#10B981',
        pdfId: pdf.id,
      };
    }).sort((a, b) => a.progress - b.progress);
  }, [recentPdfs, getProgress]);

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
        {/* LEFT COLUMN - Main Content */}
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
                      {avgMastery}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {recentPdfs.length > 0 ? 'Across your recent documents' : 'Upload a PDF to start tracking'}
                    </Typography>
                    
                    <LinearProgress 
                      variant="determinate" 
                      value={avgMastery} 
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
                        { icon: <UploadIcon />, label: 'PDFs', value: stats.pdf_count },
                        { icon: <BookIcon />, label: 'Chunks', value: stats.chunk_count },
                        { icon: <ChartIcon />, label: 'Pages', value: stats.page_count },
                        { icon: <SchoolIcon />, label: 'Quizzes', value: '—' },
                      ].map((stat, i) => (
                        <StatCard key={i} icon={stat.icon} label={stat.label} value={stat.value} sx={{ flex: 1, minWidth: 90 }} />
                      ))}
                    </Stack>

                    <Button variant="outlined" size="small" sx={{ mt: 3, borderRadius: '20px' }}>
                      View Analytics &gt;
                    </Button>
                  </Box>

                  {/* Full-bleed right-side video background */}
                  <Box sx={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: '60%', zIndex: 0, display: 'flex', justifyContent: 'flex-end'
                  }}>
                    <video 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      src="/crystal_loop.mp4" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        maskImage: 'linear-gradient(to right, transparent 0%, black 30%, black 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%, black 100%)'
                      }} 
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Continue Learning - Using actual PDFs */}
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
                    const progress = getProgress(pdf.id);
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
                              <LinearProgress 
                                variant="determinate" 
                                value={progress} 
                                sx={{ 
                                  height: 4, borderRadius: 2, mb: 2,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                  '& .MuiLinearProgress-bar': { backgroundColor: theme.main }
                                }} 
                              />
                              <Grid container spacing={1}>
                                <Grid item xs={4.5}>
                                  <Button fullWidth variant="contained" size="small" sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', 
                                    boxShadow: 'none', fontSize: '0.7rem', py: 0.5, borderRadius: 2,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }
                                  }}>Study</Button>
                                </Grid>
                                <Grid item xs={4.5}>
                                  <Button fullWidth variant="contained" size="small" sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)', color: 'text.primary', 
                                    boxShadow: 'none', fontSize: '0.7rem', py: 0.5, borderRadius: 2,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }
                                  }}>Quiz</Button>
                                </Grid>
                                <Grid item xs={3}>
                                  <Button fullWidth variant="contained" size="small" sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)', color: 'text.secondary', 
                                    boxShadow: 'none', minWidth: 0, p: 0, py: 0.5, borderRadius: 2,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }
                                  }}><MoreIcon fontSize="small" /></Button>
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

            {/* Recommended Next Steps */}
            <Box>
              <Typography variant="h6" fontWeight="700" mb={2}>Recommended Next Steps</Typography>
              <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 } }}>
                <Box sx={{ minWidth: 260, flex: 1 }}>
                  <Card sx={{ bgcolor: '#1A1525', border: '1px solid rgba(139,92,246,0.2)', height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, zIndex: 1, position: 'relative' }}>
                      <Typography variant="subtitle2" fontWeight="700" mb={0.5}>Review Weak Topics</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={3} sx={{ minHeight: 35, maxWidth: '70%' }}>
                        Focus on 6 weak areas to improve mastery.
                      </Typography>
                      <Button variant="contained" size="small" sx={{ bgcolor: '#8B5CF6', borderRadius: 2, px: 3 }}>Review Now</Button>
                    </CardContent>
                    <Box sx={{ position: 'absolute', right: -20, bottom: -20, width: 100, height: 100, border: '1px solid rgba(139,92,246,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box sx={{ width: 60, height: 60, border: '1px solid rgba(139,92,246,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Box sx={{ width: 20, height: 20, bgcolor: '#8B5CF6', borderRadius: '50%', boxShadow: '0 0 20px #8B5CF6' }} />
                      </Box>
                    </Box>
                  </Card>
                </Box>
                <Box sx={{ minWidth: 260, flex: 1 }}>
                  <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(59,130,246,0.2)', height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, zIndex: 1, position: 'relative' }}>
                      <Typography variant="subtitle2" fontWeight="700" color="#60A5FA" mb={0.5}>Practice Quiz</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={3} sx={{ minHeight: 35, maxWidth: '70%' }}>
                        12 questions on Neural Networks
                      </Typography>
                      <Button variant="contained" size="small" sx={{ bgcolor: '#3B82F6', borderRadius: 2, px: 3 }}>Start Quiz</Button>
                    </CardContent>
                    <Box sx={{ position: 'absolute', right: 10, bottom: 20, opacity: 0.5 }}>
                      <Box sx={{ width: 60, height: 60, border: '1px solid #3B82F6', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(59,130,246,0.1)', boxShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
                        <Typography variant="h4" color="#60A5FA">?</Typography>
                      </Box>
                    </Box>
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
              </Stack>
            </Box>

          </Stack>
        </Grid>

        {/* RIGHT COLUMN - Sidebar stats */}
        <Grid item xs={4}>
          <Stack spacing={3}>
            
            {/* Streak Card */}
            <Card sx={{ bgcolor: '#0B0A10', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box position="relative" zIndex={1}>
                  <Typography variant="subtitle1" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    You're on a streak! <FireIcon fontSize="small" sx={{ color: '#F97316' }} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                    7 days in a row
                  </Typography>
                  <Stack direction="row" gap={1.5} flexWrap="nowrap">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <Stack key={i} direction="column" alignItems="center" gap={1}>
                        <Box sx={{ 
                          width: 28, height: 28, borderRadius: '50%', 
                          bgcolor: i < 5 ? '#6366F1' : (i === 5 ? '#FFF' : 'rgba(255,255,255,0.05)'),
                          color: i < 5 ? '#fff' : (i === 5 ? '#000' : 'text.secondary'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: i === 5 ? '900' : 'bold'
                        }}>
                          {i < 5 ? '✓' : (i === 5 ? 'S' : '')}
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: i === 5 ? '#FFF' : 'text.secondary', fontWeight: i === 5 ? '700' : '400' }}>{day}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
                {/* Giant Fire Icon on Right */}
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

            {/* Weak Topics — each uploaded PDF is a topic with its real progress */}
            {weakTopics.length > 0 && (
              <Card sx={{ bgcolor: '#0B0A10', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="subtitle1" fontWeight="700">Documents by Mastery</Typography>
                    <Button size="small" sx={{ color: 'primary.light', minWidth: 0, p: 0, textTransform: 'none' }}>View all &rarr;</Button>
                  </Stack>
                  <Stack spacing={2.5}>
                    {weakTopics.map((item, i) => (
                      <Box key={item.pdfId || i}>
                        <Box display="flex" justifyContent="space-between" mb={1} flexWrap="wrap">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <ChartIcon sx={{ fontSize: 16, color: item.color }} />
                            <Typography variant="caption" fontWeight="600" color="text.primary">{item.topic}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{item.progress}%</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={item.progress} 
                          sx={{ 
                            height: 4, borderRadius: 2, 
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 2 }
                          }} 
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Accuracy Over Time */}
            <Card sx={{ bgcolor: '#0B0A10', border: '1px solid rgba(255,255,255,0.05)' }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="subtitle1" fontWeight="700">Accuracy Over Time</Typography>
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', px: 1.5, py: 0.5, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">30 Days v</Typography>
                  </Box>
                </Stack>
                
                {/* Simulated SVG Line Chart */}
                <Box sx={{ position: 'relative', height: 120, mb: 1 }}>
                  <svg viewBox="0 0 400 120" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 100 Q 20 50, 50 80 T 100 60 T 150 90 T 200 40 T 250 80 T 300 30 T 350 60 T 400 40 L 400 120 L 0 120 Z" fill="url(#lineGrad)" />
                    <path d="M 0 100 Q 20 50, 50 80 T 100 60 T 150 90 T 200 40 T 250 80 T 300 30 T 350 60 T 400 40" fill="none" stroke="#8B5CF6" strokeWidth="3" />
                    <circle cx="400" cy="40" r="4" fill="#8B5CF6" />
                  </svg>
                  <Box sx={{ position: 'absolute', right: 0, top: 0, bgcolor: '#8B5CF6', px: 1, py: 0.25, borderRadius: 1 }}>
                    <Typography variant="caption" fontWeight="bold">82%</Typography>
                  </Box>
                </Box>
                
                <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Apr 20</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Apr 27</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>May 4</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>May 11</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>May 18</Typography>
                </Stack>

              </CardContent>
            </Card>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
