import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress, Stack, Chip,
  LinearProgress, Card, CardContent, Divider, Alert, Grid, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
  School as StudyIcon, TrendingUp as MasteryIcon, FlashOn as FlashIcon,
  Quiz as QuizIcon, QuestionAnswer as TutorIcon, Refresh as RefreshIcon,
  CheckCircle as CompleteIcon, ArrowForward as ArrowIcon,
  Warning as WarningIcon, EmojiObjects as TipIcon, Insights as IntelIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import PdfSelector from '../components/shared/PdfSelector';
import { getStudyPlan, getPdfMastery, getWeeklyIntel } from '../api';

const RISK_COLORS = { high: 'error', medium: 'warning', low: 'success' };

const StudyLoop = () => {
  const navigate = useNavigate();
  const [pdfId, setPdfId] = useState('');
  const [plan, setPlan] = useState(null);
  const [queue, setQueue] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [masteryBefore, setMasteryBefore] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedActions, setCompletedActions] = useState([]);
  const [weeklyIntel, setWeeklyIntel] = useState(null);
  const [showIntel, setShowIntel] = useState(false);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudyPlan(pdfId || null);
      const data = res.data;
      setPlan(data.plan);
      setQueue(data.queue || []);
      setMessage(data.message);
      if (data.plan?.pdf_id) {
        try {
          const m = await getPdfMastery(data.plan.pdf_id);
          setMasteryBefore(m.data?.mastery_score ?? null);
        } catch {}
      }
    } catch (e) {
      console.error('Failed to load study plan', e);
    } finally {
      setLoading(false);
    }
  }, [pdfId]);

  useEffect(() => {
    fetchPlan();
    getWeeklyIntel().then((r) => setWeeklyIntel(r.data)).catch(() => {});
  }, [fetchPlan]);

  const handleAction = async (action, targetPdfId) => {
    const pid = targetPdfId || plan?.pdf_id;
    if (!pid) return;
    if (action === 'flashcards') navigate('/flashcards', { state: { pdfId: pid } });
    else if (action === 'quiz') navigate('/quiz', { state: { pdfId: pid } });
    else if (action === 'tutor') navigate('/tutor', { state: { pdfId: pid } });
    setCompletedActions((prev) => [...prev, action]);
  };

  const handleRefreshMastery = async () => {
    if (!plan?.pdf_id) return;
    try {
      const after = await getPdfMastery(plan.pdf_id);
      const afterScore = after.data?.mastery_score ?? null;
      if (masteryBefore !== null && afterScore !== null) {
        setPlan((prev) => ({
          ...prev,
          mastery: afterScore,
          masteryDelta: afterScore - masteryBefore,
          masteryAfter: afterScore,
        }));
        setShowCompletion(true);
      } else {
        setMasteryBefore(afterScore);
      }
    } catch {}
  };

  const allActionsDone = plan?.recommended_actions?.every((a) => completedActions.includes(a));

  const RiskBadge = ({ risk }) => (
    <Chip
      icon={<WarningIcon sx={{ fontSize: 14 }} />}
      label={risk === 'high' ? 'High Priority' : risk === 'medium' ? 'Medium Priority' : 'Low Priority'}
      size="small"
      color={RISK_COLORS[risk]}
      sx={{ fontWeight: 600 }}
    />
  );

  if (message && !plan) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Study Loop</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Your personalized study plan. Turn analytics into action.
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <StudyIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" gutterBottom>{message}</Typography>
          <PdfSelector value={pdfId} onChange={setPdfId} sx={{ mt: 2 }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4" fontWeight={700}>Study Loop</Typography>
        <Tooltip title="Refresh mastery data">
          <IconButton size="small" onClick={handleRefreshMastery} sx={{ color: 'text.disabled' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography variant="body2" color="text.secondary" paragraph>
        Your personalized study plan. Turn analytics into action.
      </Typography>

      {/* PDF selector */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} label="Focus on a specific document (optional)" />
      </Paper>

      {loading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}

      {/* ── Completion State ── */}
      {showCompletion && plan?.masteryDelta !== undefined && (
        <Paper sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 3 }}>
          <CompleteIcon sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>Study Session Complete</Typography>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ my: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Mastery</Typography>
              <Typography variant="h6" fontWeight={700}>
                {Math.round(masteryBefore)}% → {Math.round(plan.masteryAfter)}%
                <Typography component="span" variant="body2" fontWeight={700}
                  sx={{ color: plan.masteryDelta >= 0 ? '#10B981' : '#EF4444', ml: 1 }}>
                  ({plan.masteryDelta >= 0 ? '+' : ''}{Math.round(plan.masteryDelta)}%)
                </Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Actions Done</Typography>
              <Typography variant="h6" fontWeight={700}>{completedActions.length}</Typography>
            </Box>
          </Stack>
          {queue.length > 1 && (
            <Button variant="outlined" size="small" endIcon={<ArrowIcon />}
              onClick={() => {
                const next = queue.find((q) => q.pdf_id !== plan?.pdf_id);
                if (next) setPdfId(next.pdf_id);
                setShowCompletion(false);
              }}>
              Next Topic: {queue.find((q) => q.pdf_id !== plan?.pdf_id)?.pdf_name || 'Continue'}
            </Button>
          )}
        </Paper>
      )}

      {plan && !showCompletion && (
        <>
          {/* ── Hero: Today's Study Plan ── */}
          <Paper sx={{ p: 4, mb: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.04 }}>
              <StudyIcon sx={{ fontSize: 180 }} />
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Today's Study Plan
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>{plan.pdf_name}</Typography>
              </Box>
              <RiskBadge risk={plan.risk} />
            </Stack>

            <Grid container spacing={4} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Current Mastery</Typography>
                <Typography variant="h3" fontWeight={700} color={plan.mastery < 30 ? 'error.main' : plan.mastery < 60 ? 'warning.main' : 'success.main'}>
                  {Math.round(plan.mastery)}%
                </Typography>
                {plan.trend !== 0 && (
                  <Typography variant="caption" sx={{ color: plan.trend > 0 ? '#10B981' : '#EF4444' }}>
                    {plan.trend > 0 ? '+' : ''}{Math.round(plan.trend)}% this week
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Target</Typography>
                <Typography variant="h3" fontWeight={700} color="primary">{plan.target}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  {plan.target - Math.round(plan.mastery)}% improvement needed
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Study Events</Typography>
                <Typography variant="h3" fontWeight={700}>{plan.total_events}</Typography>
                <Typography variant="caption" color="text.secondary">total recorded</Typography>
              </Grid>
            </Grid>

            <LinearProgress
              variant="determinate"
              value={Math.min(plan.mastery, 100)}
              sx={{
                height: 10, borderRadius: 5, mb: 3,
                bgcolor: 'rgba(255,255,255,0.05)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: plan.mastery < 30 ? 'error.main' : plan.mastery < 60 ? 'warning.main' : 'success.main',
                },
              }}
            />

            {/* ── Action Sequence ── */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
              Action Sequence
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {plan.recommended_actions?.map((action) => {
                const done = completedActions.includes(action);
                const icons = { flashcards: <FlashIcon />, quiz: <QuizIcon />, tutor: <TutorIcon /> };
                const labels = { flashcards: 'Review Flashcards', quiz: 'Take Quiz', tutor: 'Ask Tutor' };
                return (
                  <Button
                    key={action}
                    variant={done ? 'outlined' : 'contained'}
                    size="large"
                    startIcon={done ? <CompleteIcon /> : icons[action]}
                    onClick={() => handleAction(action)}
                    sx={{
                      opacity: done ? 0.6 : 1,
                      borderColor: done ? '#10B981' : undefined,
                      color: done ? '#10B981' : undefined,
                    }}
                  >
                    {labels[action] || action}
                  </Button>
                );
              })}
            </Stack>
            {completedActions.length > 0 && (
              <Button size="small" variant="text" onClick={handleRefreshMastery} sx={{ mt: 2 }}>
                Check Progress & Complete Session
              </Button>
            )}
          </Paper>

          {/* ── Learning Queue ── */}
          {queue.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Learning Queue</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Ordered by recommendation priority
              </Typography>
              <Stack spacing={1.5}>
                {queue.map((item, i) => {
                  const isActive = item.pdf_id === plan.pdf_id;
                  return (
                    <Card
                      key={item.pdf_id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderLeft: 3,
                        borderLeftColor: isActive ? 'primary.main' : RISK_COLORS[item.risk],
                        bgcolor: isActive ? 'rgba(25,118,210,0.04)' : 'transparent',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      }}
                      onClick={() => setPdfId(item.pdf_id)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24, fontWeight: 700 }}>
                              #{i + 1}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600}>{item.pdf_name}</Typography>
                            {isActive && <Chip label="Active" size="small" color="primary" sx={{ height: 20, fontSize: '0.6rem' }} />}
                          </Stack>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5, ml: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Mastery: <strong>{Math.round(item.mastery)}%</strong>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Events: <strong>{item.total_events}</strong>
                            </Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                          {item.recommended_actions?.slice(0, 3).map((a) => (
                            <IconButton
                              key={a}
                              size="small"
                              sx={{ color: 'text.disabled', fontSize: '0.7rem' }}
                              onClick={(e) => { e.stopPropagation(); handleAction(a, item.pdf_id); }}
                            >
                              {a === 'flashcards' ? <FlashIcon sx={{ fontSize: 16 }} /> : a === 'quiz' ? <QuizIcon sx={{ fontSize: 16 }} /> : <TutorIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                          ))}
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(item.mastery, 100)}
                        sx={{
                          mt: 1, height: 4, borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.mastery < 30 ? 'error.main' : item.mastery < 60 ? 'warning.main' : 'success.main',
                          },
                        }}
                      />
                    </Card>
                  );
                })}
              </Stack>
            </Paper>
          )}

          {/* ── Weekly Intelligence ── */}
          {weeklyIntel && (
            <Paper sx={{ mt: 4, overflow: 'hidden' }}>
              <Button
                fullWidth
                onClick={() => setShowIntel(!showIntel)}
                sx={{ p: 2, justifyContent: 'space-between', textTransform: 'none', color: 'text.primary' }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IntelIcon color="primary" />
                  <Box textAlign="left">
                    <Typography variant="subtitle1" fontWeight={700}>Weekly Intelligence</Typography>
                    <Typography variant="caption" color="text.secondary">{weeklyIntel.period_label}</Typography>
                  </Box>
                </Stack>
                <ExpandIcon sx={{ transform: showIntel ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.disabled' }} />
              </Button>
              <Collapse in={showIntel}>
                <Divider />
                <Box sx={{ p: 3 }}>
                  {/* KPI Cards */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={6} sm={4} md={2}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>{weeklyIntel.total_events}</Typography>
                        <Typography variant="caption" color="text.secondary">Study Events</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700} color={weeklyIntel.mastery_growth >= 0 ? '#10B981' : '#EF4444'}>
                          {weeklyIntel.mastery_growth !== null ? `${weeklyIntel.mastery_growth >= 0 ? '+' : ''}${(weeklyIntel.mastery_growth * 100).toFixed(1)}%` : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Mastery Growth</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>{weeklyIntel.avg_mastery}%</Typography>
                        <Typography variant="caption" color="text.secondary">Avg Mastery</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>{weeklyIntel.active_docs}</Typography>
                        <Typography variant="caption" color="text.secondary">Active Docs</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>
                          {weeklyIntel.quiz_accuracy !== null ? `${Math.round(weeklyIntel.quiz_accuracy * 100)}%` : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Quiz Accuracy</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Strongest / Weakest */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'success.main', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Strongest Topic</Typography>
                          <Typography variant="subtitle1" fontWeight={700}>{weeklyIntel.strongest_topic?.pdf_name || 'N/A'}</Typography>
                          <Typography variant="h5" fontWeight={700} color="success.main">
                            {Math.round(weeklyIntel.strongest_topic?.mastery || 0)}% mastery
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'warning.main', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Weakest Topic</Typography>
                          <Typography variant="subtitle1" fontWeight={700}>{weeklyIntel.weakest_topic?.pdf_name || 'N/A'}</Typography>
                          <Typography variant="h5" fontWeight={700} color="warning.main">
                            {Math.round(weeklyIntel.weakest_topic?.mastery || 0)}% mastery
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Activity Heatmap */}
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                    Study Activity Heatmap
                  </Typography>
                  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 3 }}>
                    {weeklyIntel.heatmap?.map((d) => {
                      const intensity = d.count === 0 ? 0 : Math.min(d.count / Math.max(...weeklyIntel.heatmap.map((h) => h.count), 1), 1);
                      const bg = d.count === 0 ? 'rgba(255,255,255,0.03)' : `rgba(16,185,129,${0.15 + intensity * 0.7})`;
                      return (
                        <Box key={d.day} sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.5, fontSize: '0.6rem' }}>
                            {d.day.charAt(0).toUpperCase() + d.day.slice(1, 3)}
                          </Typography>
                          <Box
                            sx={{
                              width: 40, height: 40, borderRadius: 1.5, bgcolor: bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: d.count > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <Typography variant="caption" fontWeight={700} sx={{ color: d.count > 0 ? '#10B981' : 'text.disabled', fontSize: '0.65rem' }}>
                              {d.count}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>

                  {/* Activity breakdown */}
                  {Object.keys(weeklyIntel.activity_breakdown || {}).length > 0 && (
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                      {Object.entries(weeklyIntel.activity_breakdown).map(([type, count]) => (
                        <Chip key={type} label={`${type}: ${count}`} size="small" variant="outlined" sx={{ opacity: 0.7 }} />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Collapse>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default StudyLoop;