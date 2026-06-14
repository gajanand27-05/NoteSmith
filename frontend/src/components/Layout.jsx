import React, { useState, useEffect, useCallback } from 'react';
import { Box, Toolbar, useTheme, useMediaQuery, CssBaseline } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { drawerWidth } from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import ShortcutsHelp from './ShortcutsHelp';
import { titleByPath } from './navMeta';

const gotoMap = {
  d: '/', u: '/upload', s: '/summarize', a: '/qa', q: '/questions',
  f: '/flashcards', z: '/quiz', l: '/study-loop', t: '/tutor', p: '/paper-analyzer',
};

const isTypingTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
};

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteSeed, setPaletteSeed] = useState('');

  const openPalette = useCallback((seed = '') => {
    setPaletteSeed(seed);
    setPaletteOpen(true);
  }, []);

  useEffect(() => {
    let pendingG = false;
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setHelpOpen(false);
        return;
      }
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === 'r' || e.key === 'R') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        window.location.reload();
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        window.print();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        localStorage.clear();
        window.location.reload();
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        pendingG = true;
        setTimeout(() => { pendingG = false; }, 900);
        return;
      }
      if (pendingG) {
        const lower = e.key.toLowerCase();
        const target = gotoMap[lower];
        if (target) {
          e.preventDefault();
          navigate(target);
          pendingG = false;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <CssBaseline />
      <TopBar
        onOpenMobileDrawer={() => setMobileOpen(true)}
        onOpenPalette={openPalette}
        onOpenShortcuts={() => setHelpOpen(true)}
      />
      <Box
        component="nav"
        aria-label="Primary"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} variant="temporary" />
        <Sidebar variant="permanent" />
      </Box>
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} initialQuery={paletteSeed} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Box>
  );
};

export default Layout;
