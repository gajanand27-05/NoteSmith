import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  IconButton, Stack, Chip, LinearProgress, Tooltip, TextField,
} from '@mui/material';
import {
  Style as FlashcardsIcon, ChevronLeft as PrevIcon,
  ChevronRight as NextIcon, ContentCopy as CopyIcon,
  Refresh as RegenerateIcon, CheckCircle as CheckIcon,
  Star as StarIcon, TrendingUp as MasteryIcon,
} from '@mui/icons-material';
import PdfSelector from '../components/shared/PdfSelector';
import { generateFlashcards, reviewFlashcard, getPdfMastery } from '../api';
import './Flashcards.css';

const CONFIDENCE = [
  { label: 'Hard', score: 0.3, correct: false, color: '#EF4444', icon: '✗' },
  { label: 'Good', score: 0.7, correct: true, color: '#FBBF24', icon: '★' },
  { label: 'Easy', score: 1.0, correct: true, color: '#10B981', icon: '✓' },
];

const Flashcards = () => {
  const location = useLocation();
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [count, setCount] = useState(10);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(new Set());
  const [sessionMastery, setSessionMastery] = useState(null);
  const [masteryBefore, setMasteryBefore] = useState(null);
  const [masteryDelta, setMasteryDelta] = useState(null);

  const fetchMastery = useCallback(async () => {
    if (!pdfId) return null;
    try {
      const res = await getPdfMastery(pdfId);
      return res.data?.mastery_score ?? null;
    } catch { return null; }
  }, [pdfId]);

  const handleGenerate = async () => {
    if (!pdfId) return;
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewed(new Set());
    setSessionMastery(null);
    setMasteryDelta(null);
    const before = await fetchMastery();
    setMasteryBefore(before);
    try {
      const response = await generateFlashcards(pdfId, count);
      setCards(response.data.flashcards);
    } catch (error) {
      console.error("Flashcard generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (confidence) => {
    if (!cards[currentIndex] || reviewed.has(currentIndex)) return;
    try {
      await reviewFlashcard(pdfId, currentIndex + 1, confidence.correct, confidence.label.toLowerCase());
      const newReviewed = new Set(reviewed);
      newReviewed.add(currentIndex);
      setReviewed(newReviewed);
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
        }
      }, 400);
    } catch (e) {
      console.error("Review failed", e);
    }
  };

  useEffect(() => {
    if (cards.length > 0 && reviewed.size === cards.length) {
      const showDelta = async () => {
        const after = await fetchMastery();
        if (masteryBefore !== null && after !== null) {
          setMasteryDelta({ before: masteryBefore, after, delta: after - masteryBefore });
        }
      };
      showDelta();
    }
  }, [reviewed.size, cards.length, fetchMastery, masteryBefore]);

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const handleCopyAll = () => {
    const text = cards.map((c, i) => `Card ${i + 1}\nFront: ${c.front}\nBack: ${c.back}\n`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const progress = cards.length > 0 ? (reviewed.size / cards.length) * 100 : 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Flashcards</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Review and test your knowledge with interactive cards.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} />
        <TextField
          type="number"
          label="Number of Cards"
          value={count}
          onChange={(e) => setCount(Math.max(5, Math.min(50, parseInt(e.target.value) || 5)))}
          sx={{ mt: 2 }}
        />
        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 2 }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FlashcardsIcon />}
          onClick={handleGenerate}
          disabled={!pdfId || loading}
        >
          {loading ? 'Generating...' : 'Generate Flashcards'}
        </Button>
      </Paper>

      {cards.length > 0 && (
        <>
          {/* Progress bar */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Review Progress
              </Typography>
              <Typography variant="caption" fontWeight={700}>
                {reviewed.size} / {cards.length}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
          </Paper>

          {/* Mastery delta */}
          {masteryDelta && (
            <Paper sx={{ p: 1.5, mb: 2, textAlign: 'center', bgcolor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <MasteryIcon sx={{ fontSize: 18, color: '#10B981' }} />
                <Typography variant="caption" fontWeight={700} sx={{ color: '#10B981' }}>
                  Mastery {Math.round(masteryDelta.before)}% → {Math.round(masteryDelta.after)}% (+{Math.round(masteryDelta.delta)}%)
                </Typography>
              </Stack>
            </Paper>
          )}

          {/* Card display */}
          <Box sx={{ textAlign: 'center' }}>
            <Box
              className={`flashcard-container ${isFlipped ? 'flipped' : ''}`}
              onClick={() => !reviewed.has(currentIndex) && setIsFlipped(!isFlipped)}
            >
              <Box className="flashcard">
                <Paper className="flashcard-front" elevation={4}>
                  <Typography variant="caption" sx={{ position: 'absolute', top: 12, left: 16, opacity: 0.4, fontSize: '0.6rem' }}>
                    Card {currentIndex + 1} of {cards.length}
                  </Typography>
                  <Typography variant="h5" sx={{ px: 4, fontWeight: 600 }}>
                    {cards[currentIndex].front}
                  </Typography>
                  <Typography variant="caption" sx={{ position: 'absolute', bottom: 12, right: 16, opacity: 0.3 }}>
                    Click to flip
                  </Typography>
                </Paper>
                <Paper className="flashcard-back" elevation={4} sx={{ borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
                  <Box sx={{ px: 3, py: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    <Typography variant="caption" sx={{ position: 'absolute', top: 12, left: 16, opacity: 0.4, fontSize: '0.6rem' }}>
                      Card {currentIndex + 1} of {cards.length}
                    </Typography>
                    <Typography variant="h6" sx={{ mb: reviewed.has(currentIndex) ? 2 : 3, fontWeight: 600 }}>
                      {cards[currentIndex].back}
                    </Typography>
                    {reviewed.has(currentIndex) ? (
                      <Chip icon={<CheckIcon />} label="Reviewed" size="small" sx={{ color: '#10B981', borderColor: '#10B981', fontWeight: 600 }} variant="outlined" />
                    ) : (
                      <Stack direction="row" spacing={1}>
                        {CONFIDENCE.map((c) => (
                          <Button
                            key={c.label}
                            variant="outlined"
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleReview(c); }}
                            sx={{
                              color: c.color, borderColor: c.color, fontWeight: 700, fontSize: '0.7rem',
                              '&:hover': { bgcolor: `${c.color}15`, borderColor: c.color },
                              minWidth: 60,
                            }}
                          >
                            {c.label}
                          </Button>
                        ))}
                      </Stack>
                    )}
                    <Typography variant="caption" sx={{ position: 'absolute', bottom: 12, right: 16, opacity: reviewed.has(currentIndex) ? 0 : 0.3 }}>
                      Click to flip
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mt: 3 }}>
              <IconButton onClick={prevCard} sx={{ bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <PrevIcon />
              </IconButton>
              <Typography variant="body2" fontWeight={600}>
                {currentIndex + 1} / {cards.length}
              </Typography>
              <IconButton onClick={nextCard} sx={{ bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <NextIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
              <Tooltip title="Copy All">
                <IconButton size="small" sx={{ color: 'text.disabled' }} onClick={handleCopyAll}>
                  <CopyIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Regenerate">
                <IconButton size="small" sx={{ color: 'text.disabled' }} onClick={handleGenerate}>
                  <RegenerateIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Flashcards;