import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Stack, Typography, Chip, Divider, useTheme, alpha,
} from '@mui/material';

const groups = [
  {
    title: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
      { keys: ['G', 'D'], desc: 'Go to Dashboard' },
      { keys: ['G', 'U'], desc: 'Go to Upload' },
      { keys: ['G', 'S'], desc: 'Go to Summarize' },
      { keys: ['G', 'A'], desc: 'Go to Q&A' },
      { keys: ['G', 'Q'], desc: 'Go to Questions' },
      { keys: ['G', 'F'], desc: 'Go to Flashcards' },
      { keys: ['G', 'Z'], desc: 'Go to Quiz' },
      { keys: ['G', 'L'], desc: 'Go to Study Loop' },
      { keys: ['G', 'T'], desc: 'Go to Tutor' },
      { keys: ['G', 'P'], desc: 'Go to Paper Analyzer' },
      { keys: ['?'], desc: 'Open this help' },
      { keys: ['Esc'], desc: 'Close dialog / palette' },
    ],
  },
  {
    title: 'On any page',
    items: [
      { keys: ['R'], desc: 'Reload app' },
      { keys: ['P'], desc: 'Print current view' },
      { keys: ['C'], desc: 'Clear local cache' },
    ],
  },
];

const Kbd = ({ children }) => (
  <Chip
    size="small"
    label={children}
    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.25 }}
  />
);

const ShortcutsHelp = ({ open, onClose }) => {
  const theme = useTheme();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Keyboard shortcuts</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {groups.map((g, gi) => (
          <Box key={g.title} sx={{ p: 2.5, ...(gi > 0 ? { borderTop: '1px solid' } : {}), borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              {g.title}
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.25 }}>
              {g.items.map((it, i) => (
                <Stack key={i} direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.primary">
                    {it.desc}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {it.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutsHelp;
