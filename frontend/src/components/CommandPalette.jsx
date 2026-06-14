import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, InputAdornment, List, ListItemButton, ListItemIcon,
  ListItemText, TextField, Box, Typography, Chip, Stack, Divider, alpha, useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  FileUpload as UploadIcon,
  Summarize as SummarizeIcon,
  QuestionAnswer as QAIcon,
  Quiz as QuizIcon,
  Help as QuestionsIcon,
  Style as FlashcardsIcon,
  School as TutorIcon,
  Analytics as PaperIcon,
  Loop as LoopIcon,
  KeyboardCommandKey as CmdIcon,
} from '@mui/icons-material';

const items = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', keywords: ['home', 'overview'] },
  { text: 'Upload Notes', icon: <UploadIcon />, path: '/upload', keywords: ['pdf', 'add', 'new'] },
  { text: 'Summarize', icon: <SummarizeIcon />, path: '/summarize', keywords: ['summary', 'short'] },
  { text: 'Q&A', icon: <QAIcon />, path: '/qa', keywords: ['ask', 'chat', 'question'] },
  { text: 'Generate Questions', icon: <QuestionsIcon />, path: '/questions', keywords: ['exam', 'practice'] },
  { text: 'Flashcards', icon: <FlashcardsIcon />, path: '/flashcards', keywords: ['cards', 'memorize'] },
  { text: 'Quiz', icon: <QuizIcon />, path: '/quiz', keywords: ['test', 'mcq'] },
  { text: 'Study Loop', icon: <LoopIcon />, path: '/study-loop', keywords: ['spaced', 'repetition'] },
  { text: 'AI Tutor', icon: <TutorIcon />, path: '/tutor', keywords: ['explain', 'concept'] },
  { text: 'Paper Analyzer', icon: <PaperIcon />, path: '/paper-analyzer', keywords: ['previous', 'year'] },
];

const CommandPalette = ({ open, onClose, initialQuery = '' }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const filtered = query
    ? items.filter((i) => {
        const q = query.toLowerCase();
        return i.text.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q));
      })
    : items;

  useEffect(() => {
    if (open) {
      setQuery(initialQuery || '');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = filtered[active];
      if (it) go(it.path);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(20,18,32,0.95)' : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 0.5 }}>
        <TextField
          fullWidth
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a command or search…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={0.5}>
                  <Chip size="small" label="Esc" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Stack>
              </InputAdornment>
            ),
            sx: {
              '& fieldset': { border: 'none' },
              fontSize: '1.05rem',
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { background: 'transparent' } }}
        />
      </Box>
      <Divider />
      <DialogContent sx={{ p: 1, maxHeight: 360 }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No results for “{query}”.
            </Typography>
          </Box>
        ) : (
          <List dense>
            {filtered.map((item, idx) => {
              const selected = idx === active;
              return (
                <ListItemButton
                  key={item.path}
                  selected={selected}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(item.path)}
                  sx={{
                    borderRadius: 2,
                    my: 0.25,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary">Go to</Typography>
                    <CmdIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  </Stack>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
      <Divider />
      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip size="small" label="↑" sx={{ height: 18, fontSize: '0.65rem' }} />
            <Chip size="small" label="↓" sx={{ height: 18, fontSize: '0.65rem' }} />
            <Typography variant="caption" color="text.secondary">Navigate</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip size="small" label="↵" sx={{ height: 18, fontSize: '0.65rem' }} />
            <Typography variant="caption" color="text.secondary">Open</Typography>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Powered by NoteSmith
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
