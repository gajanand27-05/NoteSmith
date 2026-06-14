import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton,
  Box, 
  CssBaseline,
  Divider,
  Chip,
  IconButton
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
  Menu as MenuIcon,
  Circle as CircleIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SettingsBrightness as SystemIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  DeleteSweep as ClearIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Menu, MenuItem, Tooltip } from '@mui/material';
import { healthCheck } from '../api';
import { ColorModeContext } from '../ColorModeContext';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Upload', icon: <UploadIcon />, path: '/upload' },
  { text: 'Summarize', icon: <SummarizeIcon />, path: '/summarize' },
  { text: 'Q&A', icon: <QAIcon />, path: '/qa' },
  { text: 'Questions', icon: <QuestionsIcon />, path: '/questions' },
  { text: 'Flashcards', icon: <FlashcardsIcon />, path: '/flashcards' },
  { text: 'Quiz', icon: <QuizIcon />, path: '/quiz' },
  { text: 'Study Loop', icon: <LoopIcon />, path: '/study-loop' },
  { text: 'Tutor', icon: <TutorIcon />, path: '/tutor' },
  { text: 'Paper Analyzer', icon: <PaperIcon />, path: '/paper-analyzer' },
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = React.useContext(ColorModeContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [themeAnchorEl, setThemeAnchorEl] = useState(null);

  const handleThemeMenuOpen = (event) => {
    setThemeAnchorEl(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeAnchorEl(null);
  };

  const handleThemeChange = (newMode) => {
    setMode(newMode);
    handleThemeMenuClose();
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthCheck();
        setBackendStatus('online');
      } catch (error) {
        setBackendStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          NoteSmith
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(m => m.path === location.pathname)?.text || 'NoteSmith'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Backend:</Typography>
            <Chip 
              icon={<CircleIcon sx={{ fontSize: '12px !important' }} />}
              label={backendStatus} 
              size="small" 
              color={backendStatus === 'online' ? 'success' : 'error'}
              variant="outlined"
            />
            <IconButton onClick={handleThemeMenuOpen} color="inherit" sx={{ ml: 1 }}>
              {mode === 'dark' ? <DarkIcon /> : mode === 'light' ? <LightIcon /> : <SystemIcon />}
            </IconButton>
            <Menu
              anchorEl={themeAnchorEl}
              open={Boolean(themeAnchorEl)}
              onClose={handleThemeMenuClose}
              PaperProps={{ sx: { width: 200 } }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
                <Tooltip title="System">
                  <IconButton onClick={() => handleThemeChange('system')} color={mode === 'system' ? 'primary' : 'default'}>
                    <SystemIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Light">
                  <IconButton onClick={() => handleThemeChange('light')} color={mode === 'light' ? 'primary' : 'default'}>
                    <LightIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dark">
                  <IconButton onClick={() => handleThemeChange('dark')} color={mode === 'dark' ? 'primary' : 'default'}>
                    <DarkIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider />
              <MenuItem onClick={() => window.location.reload()}>
                <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Rerun</ListItemText>
                <Typography variant="body2" color="text.secondary">R</Typography>
              </MenuItem>
              <MenuItem onClick={() => window.print()}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Print</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { localStorage.clear(); window.location.reload(); }}>
                <ListItemIcon><ClearIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Clear cache</ListItemText>
                <Typography variant="body2" color="text.secondary">C</Typography>
              </MenuItem>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary">Made with React + MUI</Typography>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          mt: '64px'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
