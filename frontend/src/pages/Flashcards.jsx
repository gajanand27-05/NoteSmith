import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Stack
} from '@mui/material';
import { 
  Style as FlashcardsIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  FlipCameraAndroid as FlipIcon
} from '@mui/icons-material';
import PdfSelector from '../components/shared/PdfSelector';
import { generateFlashcards } from '../api';
import './Flashcards.css';

const Flashcards = () => {
  const [pdfId, setPdfId] = useState('');
  const [count, setCount] = useState(10);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleGenerate = async () => {
    if (!pdfId) return;
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    try {
      const response = await generateFlashcards(pdfId, count);
      setCards(response.data.flashcards);
    } catch (error) {
      console.error("Flashcard generation failed", error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Flashcards</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Quick review with interactive study cards.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} />
        <TextField 
          fullWidth
          type="number"
          label="Number of Flashcards"
          value={count}
          onChange={(e) => setCount(Math.max(5, Math.min(50, parseInt(e.target.value) || 5)))}
          sx={{ mb: 3 }}
        />
        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FlashcardsIcon />}
          onClick={handleGenerate}
          disabled={!pdfId || loading}
        >
          {loading ? 'Generating Cards...' : 'Generate Flashcards'}
        </Button>
      </Paper>

      {cards.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Box className={`flashcard-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
            <Box className="flashcard">
              <Paper className="flashcard-front" elevation={4}>
                <Typography variant="caption" sx={{ position: 'absolute', top: 10, left: 10 }}>Front</Typography>
                <Typography variant="h5" sx={{ px: 4 }}>{cards[currentIndex].front}</Typography>
                <Typography variant="caption" sx={{ position: 'absolute', bottom: 10, right: 10 }}>Click to Flip</Typography>
              </Paper>
              <Paper className="flashcard-back" elevation={4}>
                <Typography variant="caption" sx={{ position: 'absolute', top: 10, left: 10 }}>Back</Typography>
                <Typography variant="h6" sx={{ px: 4 }}>{cards[currentIndex].back}</Typography>
                <Typography variant="caption" sx={{ position: 'absolute', bottom: 10, right: 10 }}>Click to Flip</Typography>
              </Paper>
            </Box>
          </Box>

          <Stack direction="row" spacing={4} justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
            <IconButton onClick={prevCard} sx={{ bgcolor: 'white', boxShadow: 1 }}><PrevIcon /></IconButton>
            <Typography variant="h6">Card {currentIndex + 1} of {cards.length}</Typography>
            <IconButton onClick={nextCard} sx={{ bgcolor: 'white', boxShadow: 1 }}><NextIcon /></IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default Flashcards;
