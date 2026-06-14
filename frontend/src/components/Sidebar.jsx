import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, Divider, Stack, Chip, alpha, useTheme, Tooltip,
} from '@mui/material';
import {
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
  AutoAwesome as BrandIcon,
} from '@mui/icons-material';

const drawerWidth = 248;

const groups = [
  {
    label: 'Overview',
    items: [{ text: 'Dashboard', icon: <DashboardIcon />, path: '/', shortcut: 'G D' }],
  },
  {
    label: 'Library',
    items: [
      { text: 'Upload', icon: <UploadIcon />, path: '/upload', shortcut: 'G U' },
      { text: 'Summarize', icon: <SummarizeIcon />, path: '/summarize', shortcut: 'G S' },
    ],
  },
  {
    label: 'Study',
    items: [
      { text: 'Q&A', icon: <QAIcon />, path: '/qa', shortcut: 'G A' },
      { text: 'Questions', icon: <QuestionsIcon />, path: '/questions', shortcut: 'G Q' },
      { text: 'Flashcards', icon: <FlashcardsIcon />, path: '/flashcards', shortcut: 'G F' },
      { text: 'Quiz', icon: <QuizIcon />, path: '/quiz', shortcut: 'G Z' },
      { text: 'Study Loop', icon: <LoopIcon />, path: '/study-loop', shortcut: 'G L' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { text: 'Tutor', icon: <TutorIcon />, path: '/tutor', shortcut: 'G T' },
      { text: 'Paper Analyzer', icon: <PaperIcon />, path: '/paper-analyzer', shortcut: 'G P' },
    ],
  },
];

const SidebarContent = ({ onNavigate, activePath, dense = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const path = activePath ?? location.pathname;
  const handleClick = (p) => {
    navigate(p);
    onNavigate?.(p);
  };

  return (
    <Box
      role="navigation"
      aria-label="Primary"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <Toolbar sx={{ px: 2.5, minHeight: 64 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary?.main || theme.palette.primary.dark} 100%)`,
              color: '#fff',
              boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.45)}`,
            }}
          >
            <BrandIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1}>
              NoteSmith
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI study copilot
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {groups.map((group, gi) => (
          <Box key={group.label} sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                px: 2.5,
                display: 'block',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                fontSize: '0.65rem',
                mb: 0.5,
                mt: gi === 0 ? 1 : 0,
              }}
            >
              {group.label}
            </Typography>
            <List dense={dense} sx={{ px: 1 }}>
              {group.items.map((item) => {
                const selected = path === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                    <ListItemButton
                      onClick={() => handleClick(item.path)}
                      selected={selected}
                      aria-current={selected ? 'page' : undefined}
                      sx={{
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.9,
                        position: 'relative',
                        color: selected ? 'primary.main' : 'text.primary',
                        '& .MuiListItemIcon-root': {
                          color: selected ? 'primary.main' : 'text.secondary',
                          minWidth: 36,
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.text.primary, 0.04),
                        },
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.10),
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.14),
                        },
                        transition: 'background-color .2s ease, color .2s ease',
                      }}
                    >
                      {selected ? (
                        <Box
                          aria-hidden
                          sx={{
                            position: 'absolute',
                            left: -8,
                            top: 8,
                            bottom: 8,
                            width: 3,
                            borderRadius: 2,
                            bgcolor: 'primary.main',
                            boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.6)}`,
                          }}
                        />
                      ) : null}
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: selected ? 700 : 500,
                          fontSize: '0.92rem',
                        }}
                      />
                      {item.shortcut ? (
                        <Chip
                          size="small"
                          label={item.shortcut}
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            bgcolor: alpha(theme.palette.text.primary, 0.06),
                            color: 'text.secondary',
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      ) : null}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Tooltip title="Local backend health">
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.text.primary, 0.04),
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: '0 0 8px rgba(16,185,129,0.7)',
              }}
            />
            <Box>
              <Typography variant="caption" fontWeight={700} display="block">
                All systems normal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Backend · Ollama · DB
              </Typography>
            </Box>
          </Stack>
        </Tooltip>
      </Box>
    </Box>
  );
};

export { drawerWidth };

const Sidebar = ({ mobileOpen, onClose, variant = 'permanent' }) => {
  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true, sx: { '& .MuiBackdrop-root': { bgcolor: 'rgba(0,0,0,0.4)' } } }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <SidebarContent onNavigate={onClose} />
      </Drawer>
    );
  }
  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <SidebarContent />
    </Drawer>
  );
};

export default Sidebar;
