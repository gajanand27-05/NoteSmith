import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress, Radio, RadioGroup,
  FormControlLabel, FormControl, Card, CardContent, Stack, LinearProgress,
  Divider, Alert, Chip, Collapse, IconButton, Tooltip, Grid,
} from '@mui/material';
import {
  Quiz as QuizIcon, Check as CheckIcon, Close as CloseIcon,
  Refresh as RetryIcon, School as TutorIcon, Style as FlashIcon,
  ExpandMore as ExpandIcon, TrendingUp as MasteryIcon,
} from '@mui/icons-material';
import PdfSelector from '../components/shared/PdfSelector';
import { generateQuiz, submitQuizAnswer, getPdfMastery } from '../api';

const Quiz = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const masteryBefore = useRef(null);

  const handleStartQuiz = async () => {
    if (!pdfId) return;
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setFeedback(null);
    setResults(null);
    setAnswers([]);
    setShowReview(false);
    try {
      const [masteryRes, quizRes] = await Promise.all([
        getPdfMastery(pdfId).catch(() => null),
        generateQuiz(pdfId),
      ]);
      masteryBefore.current = masteryRes?.data?.mastery_score ?? null;
      setQuestions(quizRes.data.questions);
    } catch (error) {
      console.error("Quiz generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQ = questions[currentIndex];
    const isCorrect = selectedOption === currentQ.correct;
    try {
      await submitQuizAnswer(pdfId, currentQ.number, isCorrect);
    } catch (e) {
      console.error("Failed to record answer", e);
    }
    const answer = {
      number: currentQ.number,
      question: currentQ.question,
      options: currentQ.options,
      correct: currentQ.correct,
      selected: selectedOption,
      isCorrect,
      explanation: currentQ.explanation,
    };
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (currentIndex + 1 < questions.length) {
      setFeedback(answer);
      setSelectedOption('');
    } else {
      const after = await getPdfMastery(pdfId).catch(() => null);
      const afterScore = after?.data?.mastery_score ?? null;
      const correctCount = newAnswers.filter((a) => a.isCorrect).length;
      setResults({
        total: questions.length,
        correct: correctCount,
        incorrect: questions.length - correctCount,
        accuracy: Math.round((correctCount / questions.length) * 100),
        masteryBefore: masteryBefore.current,
        masteryAfter: afterScore,
        masteryDelta: afterScore !== null && masteryBefore.current !== null
          ? afterScore - masteryBefore.current
          : null,
      });
      setFeedback(answer);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedOption('');
  };

  if (results) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>Quiz Completed!</Typography>

          <Box sx={{ my: 4 }}>
            <Typography variant="h2" fontWeight={700} color="primary" sx={{ lineHeight: 1 }}>
              {results.correct} / {results.total}
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
              {results.accuracy}% Accuracy
            </Typography>
          </Box>

          {/* Mastery delta */}
          {results.masteryDelta !== null && (
            <Paper
              variant="outlined"
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1.5,
                px: 3, py: 1.5, mb: 3, borderRadius: 2,
                borderColor: results.masteryDelta >= 0 ? 'success.main' : 'warning.main',
                bgcolor: results.masteryDelta >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(251,191,36,0.06)',
              }}
            >
              <MasteryIcon sx={{ fontSize: 20, color: results.masteryDelta >= 0 ? '#10B981' : '#FBBF24' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                  Mastery
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {Math.round(results.masteryBefore)}% → {Math.round(results.masteryAfter)}%
                  <Typography component="span" variant="body2" fontWeight={700}
                    sx={{ color: results.masteryDelta >= 0 ? '#10B981' : '#EF4444', ml: 1 }}>
                    ({results.masteryDelta >= 0 ? '+' : ''}{Math.round(results.masteryDelta)}%)
                  </Typography>
                </Typography>
              </Box>
            </Paper>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Correct / Incorrect */}
          <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 3 }}>
            <Box>
              <CheckIcon sx={{ color: '#10B981', fontSize: 28, display: 'block', mx: 'auto', mb: 0.5 }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: '#10B981' }}>{results.correct}</Typography>
              <Typography variant="caption" color="text.secondary">Correct</Typography>
            </Box>
            <Box>
              <CloseIcon sx={{ color: '#EF4444', fontSize: 28, display: 'block', mx: 'auto', mb: 0.5 }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: '#EF4444' }}>{results.incorrect}</Typography>
              <Typography variant="caption" color="text.secondary">Incorrect</Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* Review answers toggle */}
          <Button
            size="small"
            onClick={() => setShowReview(!showReview)}
            endIcon={<ExpandIcon sx={{ transform: showReview ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
            sx={{ mb: 2 }}
          >
            {showReview ? 'Hide Answers' : 'Review Answers'}
          </Button>
          <Collapse in={showReview}>
            <Stack spacing={1.5} sx={{ textAlign: 'left', mb: 3 }}>
              {answers.map((a, i) => (
                <Paper key={i} variant="outlined" sx={{
                  p: 2, borderLeft: 3,
                  borderLeftColor: a.isCorrect ? 'success.main' : 'error.main',
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, mr: 1 }}>
                      Q{a.number}. {a.question}
                    </Typography>
                    <Chip
                      icon={a.isCorrect ? <CheckIcon /> : <CloseIcon />}
                      label={a.isCorrect ? 'Correct' : 'Incorrect'}
                      size="small"
                      color={a.isCorrect ? 'success' : 'error'}
                      sx={{ flexShrink: 0 }}
                    />
                  </Stack>
                  <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                    Your answer: {a.selected}) {a.options.find(o => o.label === a.selected)?.text}
                  </Typography>
                  {!a.isCorrect && (
                    <Typography variant="caption" display="block" sx={{ color: 'success.main', mt: 0.5 }}>
                      Correct: {a.correct}) {a.options.find(o => o.label === a.correct)?.text}
                    </Typography>
                  )}
                  {a.explanation && (
                    <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.6 }}>
                      {a.explanation}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          </Collapse>

          {/* Recommended next steps */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Recommended Next Steps
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<FlashIcon />}
              onClick={() => navigate('/flashcards', { state: { pdfId } })}>
              Flashcards
            </Button>
            <Button size="small" variant="outlined" startIcon={<TutorIcon />}
              onClick={() => navigate('/tutor', { state: { pdfId } })}>
              Ask Tutor
            </Button>
            <Button size="small" variant="contained" startIcon={<RetryIcon />} onClick={handleStartQuiz}>
              Try Again
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Quiz</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Test your knowledge with AI-generated multiple choice questions.
      </Typography>

      {!questions.length ? (
        <Paper sx={{ p: 3 }}>
          <PdfSelector value={pdfId} onChange={setPdfId} />
          <Button
            variant="contained" fullWidth size="large" sx={{ mt: 2 }}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QuizIcon />}
            onClick={handleStartQuiz} disabled={!pdfId || loading}
          >
            {loading ? 'Generating Quiz...' : 'Start Quiz'}
          </Button>
        </Paper>
      ) : (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={((feedback ? currentIndex : currentIndex) / questions.length) * 100}
              sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
            />
            <Typography variant="body2" fontWeight={600}>
              {Math.min(currentIndex + (feedback ? 0 : 0), questions.length)} of {questions.length}
            </Typography>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                {questions[currentIndex - (feedback ? 1 : 0)]?.question || questions[0]?.question}
              </Typography>

              <FormControl component="fieldset" fullWidth disabled={!!feedback}>
                <RadioGroup
                  value={feedback ? '' : selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                >
                  {((feedback ? questions[currentIndex - 1] : questions[currentIndex])?.options || []).map((opt) => {
                    const isSelected = feedback && selectedOption === opt.label;
                    const isCorrectAnswer = feedback?.correct === opt.label;
                    const showCorrect = feedback?.isCorrect === false && isCorrectAnswer;
                    return (
                      <Paper
                        key={opt.label}
                        variant="outlined"
                        sx={{
                          mb: 1.5, p: 1,
                          borderColor: showCorrect ? 'success.main' : isSelected && !feedback?.isCorrect ? 'error.main' : 'divider',
                          bgcolor: showCorrect ? 'rgba(16,185,129,0.06)' : isSelected && !feedback?.isCorrect ? 'rgba(239,68,68,0.06)' : 'transparent',
                        }}
                      >
                        <FormControlLabel
                          value={opt.label}
                          control={<Radio />}
                          label={`${opt.label}) ${opt.text}`}
                          sx={{ width: '100%', m: 0 }}
                        />
                      </Paper>
                    );
                  })}
                </RadioGroup>
              </FormControl>

              {feedback && (
                <Alert
                  severity={feedback.isCorrect ? "success" : "error"}
                  icon={feedback.isCorrect ? <CheckIcon /> : <CloseIcon />}
                  sx={{ mt: 3 }}
                >
                  <Typography variant="subtitle2">
                    {feedback.isCorrect ? "Correct!" : `Incorrect. The correct answer is ${feedback.correct}.`}
                  </Typography>
                  {feedback.explanation && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{feedback.explanation}</Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!feedback ? (
              <Button variant="contained" size="large" onClick={handleSubmitAnswer} disabled={!selectedOption}>
                Submit Answer
              </Button>
            ) : (
              <Button variant="contained" size="large" onClick={handleNext}>
                {currentIndex < questions.length ? "Next Question" : "Show Results"}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Quiz;