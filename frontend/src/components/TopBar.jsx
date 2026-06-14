import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, IconButton, Chip, Tooltip, Stack,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, alpha, useTheme, InputBase, Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Circle as CircleIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SettingsBrightness as SystemIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  DeleteSweep as ClearIcon,
  Search as SearchIcon,
  KeyboardCommandKey as CmdIcon,
  Keyboard as KeyboardIcon,
  GitHub as GitHubIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { healthCheck } from '../api';
import { ColorModeContext } from '../ColorModeContext';
import { titleByPath } from './navMeta';

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

const TopBar = ({ onOpenMobileDrawer, onOpenPalette, onOpenShortcuts }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = React.useContext(ColorModeContext);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [themeAnchorEl, setThemeAnchorEl] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState('');

  useEffect(() => {
    const check = async () => {
      try {
        await healthCheck();
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    };
    check();
    const i = setInterval(check, 30_000);
    return () => clearInterval(i);
  }, []);

  const title = titleByPath[location.pathname] || 'NoteSmith';

  const handleMobileSearchSubmit = (e) => {
    e.preventDefault();
    if (mobileQuery.trim()) {
      onOpenPalette(mobileQuery);
      setMobileSearchOpen(false);
      setMobileQuery('');
    }
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: 64 }}>
        <IconButton
          color="inherit"
          aria-label="Open navigation"
          edge="start"
          onClick={onOpenMobileDrawer}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ minWidth: 0, mr: 2, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
            Workspace
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {title}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Desktop search trigger */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, mr: 1 }}>
          <Button
            onClick={() => onOpenPalette()}
            variant="outlined"
            size="small"
            startIcon={<SearchIcon fontSize="small" />}
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 2,
              px: 1.5,
              minWidth: 240,
              justifyContent: 'flex-start',
              '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}
          >
            <Box component="span" sx={{ flex: 1, textAlign: 'left', fontSize: '0.85rem' }}>
              Search pages…
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip
                size="small"
                label={isMac ? '⌘' : 'Ctrl'}
                sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha(theme.palette.text.primary, 0.08) }}
              />
              <Chip
                size="small"
                label="K"
                sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha(theme.palette.text.primary, 0.08) }}
              />
            </Stack>
          </Button>
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Tooltip title={backendStatus === 'online' ? 'Backend online' : 'Backend offline'}>
            <Chip
              icon={<CircleIcon sx={{ fontSize: '10px !important' }} />}
              label={backendStatus === 'checking' ? 'Checking' : backendStatus}
              size="small"
              color={backendStatus === 'online' ? 'success' : backendStatus === 'offline' ? 'error' : 'default'}
              variant="outlined"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            />
          </Tooltip>

          <Tooltip title="Keyboard shortcuts">
            <IconButton color="inherit" onClick={onOpenShortcuts} aria-label="Keyboard shortcuts">
              <KeyboardIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Open GitHub repo">
            <IconButton
              color="inherit"
              component="a"
              href="https://github.com/gajanand27-05/NoteSmith"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub repository"
            >
              <GitHubIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Theme">
            <IconButton
              color="inherit"
              onClick={(e) => setThemeAnchorEl(e.currentTarget)}
              aria-label="Change theme"
            >
              {mode === 'dark' ? <DarkIcon /> : mode === 'light' ? <LightIcon /> : <SystemIcon />}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={themeAnchorEl}
            open={Boolean(themeAnchorEl)}
            onClose={() => setThemeAnchorEl(null)}
            PaperProps={{ sx: { width: 220, mt: 1, borderRadius: 2 } }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
              <Tooltip title="System">
                <IconButton
                  onClick={() => { setMode('system'); setThemeAnchorEl(null); }}
                  color={mode === 'system' ? 'primary' : 'default'}
                >
                  <SystemIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Light">
                <IconButton
                  onClick={() => { setMode('light'); setThemeAnchorEl(null); }}
                  color={mode === 'light' ? 'primary' : 'default'}
                >
                  <LightIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Dark">
                <IconButton
                  onClick={() => { setMode('dark'); setThemeAnchorEl(null); }}
                  color={mode === 'dark' ? 'primary' : 'default'}
                >
                  <DarkIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider />
            <MenuItem onClick={() => { window.location.reload(); setThemeAnchorEl(null); }}>
              <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Reload app</ListItemText>
              <Typography variant="body2" color="text.secondary">R</Typography>
            </MenuItem>
            <MenuItem onClick={() => { window.print(); setThemeAnchorEl(null); }}>
              <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Print</ListItemText>
              <Typography variant="body2" color="text.secondary">P</Typography>
            </MenuItem>
            <MenuItem onClick={() => { localStorage.clear(); window.location.reload(); }}>
              <ListItemIcon><ClearIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Clear local cache</ListItemText>
              <Typography variant="body2" color="text.secondary">C</Typography>
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>

      {/* Mobile inline search (collapsible) */}
      {mobileSearchOpen ? (
        <Box
          component="form"
          onSubmit={handleMobileSearchSubmit}
          sx={{
            px: 2, pb: 1.5, pt: 0.5,
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <InputBase
            autoFocus
            value={mobileQuery}
            onChange={(e) => setMobileQuery(e.target.value)}
            placeholder="Search pages…"
            startAdornment={<SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />}
            sx={{
              flex: 1,
              px: 1.25, py: 0.5, borderRadius: 2,
              bgcolor: alpha(theme.palette.text.primary, 0.05),
            }}
          />
          <IconButton size="small" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : null}
    </AppBar>
  );
};

export default TopBar;
