import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  Divider,
  Alert
} from '@mui/material';
import { Quiz as QuizIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import PdfSelector from '../components/shared/PdfSelector';
import { generateQuiz } from '../api';

const Quiz = () => {
  const location = useLocation();
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleStartQuiz = async () => {
    if (!pdfId) return;
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setShowResult(false);
    setFeedback(null);
    try {
      const response = await generateQuiz(pdfId);
      setQuestions(response.data.questions);
    } catch (error) {
      console.error("Quiz generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    const currentQ = questions[currentIndex];
    const isCorrect = selectedOption === currentQ.correct;
    
    if (isCorrect) setScore(prev => prev + 1);
    
    setFeedback({
      isCorrect,
      correctAnswer: currentQ.correct,
      explanation: currentQ.explanation
    });
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedOption('');
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>Quiz Completed!</Typography>
          <Typography variant="h2" color="primary" sx={{ my: 4 }}>
            {score} / {questions.length}
          </Typography>
          <Typography variant="h6" gutterBottom>
            {score === questions.length ? "Perfect Score! 🌟" : score > questions.length / 2 ? "Great job! 👍" : "Keep studying! 📚"}
          </Typography>
          <Button variant="contained" size="large" onClick={handleStartQuiz} sx={{ mt: 4 }}>
            Try Again
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Quiz</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Test your knowledge with AI-generated multiple choice questions.
      </Typography>

      {!questions.length ? (
        <Paper sx={{ p: 3 }}>
          <PdfSelector value={pdfId} onChange={setPdfId} />
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QuizIcon />}
            onClick={handleStartQuiz}
            disabled={!pdfId || loading}
          >
            {loading ? 'Generating Quiz...' : 'Start Quiz'}
          </Button>
        </Paper>
      ) : (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress variant="determinate" value={(currentIndex / questions.length) * 100} sx={{ flexGrow: 1, height: 10, borderRadius: 5 }} />
            <Typography variant="body2">{currentIndex + 1} of {questions.length}</Typography>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                {questions[currentIndex].question}
              </Typography>

              <FormControl component="fieldset" fullWidth disabled={!!feedback}>
                <RadioGroup value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
                  {questions[currentIndex].options.map((opt) => (
                    <Paper 
                      key={opt.label} 
                      variant="outlined" 
                      sx={{ 
                        mb: 1.5, 
                        p: 1, 
                        borderColor: feedback?.correctAnswer === opt.label ? 'success.main' : feedback && selectedOption === opt.label && !feedback.isCorrect ? 'error.main' : 'divider',
                        bgcolor: feedback?.correctAnswer === opt.label ? '#f6fff6' : 'transparent'
                      }}
                    >
                      <FormControlLabel 
                        value={opt.label} 
                        control={<Radio />} 
                        label={`${opt.label}) ${opt.text}`}
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              </FormControl>

              {feedback && (
                <Alert 
                  severity={feedback.isCorrect ? "success" : "error"} 
                  icon={feedback.isCorrect ? <CheckIcon /> : <CloseIcon />}
                  sx={{ mt: 3 }}
                >
                  <Typography variant="subtitle2">
                    {feedback.isCorrect ? "Correct!" : `Incorrect. The correct answer is ${feedback.correctAnswer}.`}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{feedback.explanation}</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!feedback ? (
              <Button 
                variant="contained" 
                size="large" 
                onClick={handleSubmitAnswer} 
                disabled={!selectedOption}
              >
                Submit Answer
              </Button>
            ) : (
              <Button variant="contained" size="large" onClick={handleNext}>
                {currentIndex + 1 < questions.length ? "Next Question" : "Show Results"}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Quiz;
