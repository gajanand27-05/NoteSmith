import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#6366F1' : '#A855F7', // Bright purple in dark mode
      light: mode === 'light' ? '#818CF8' : '#C084FC',
      dark: mode === 'light' ? '#4F46E5' : '#9333EA',
    },
    secondary: {
      main: mode === 'light' ? '#059669' : '#F59E0B', // Amber accent in dark mode (like the logo)
      light: mode === 'light' ? '#34D399' : '#FBBF24',
      dark: mode === 'light' ? '#047857' : '#D97706',
    },
    background: {
      default: mode === 'light' ? '#F5F3FF' : '#0B0A10', // Deep dark for reference
      paper: mode === 'light' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(19, 18, 31, 0.85)',
    },
    text: {
      primary: mode === 'light' ? '#1E1B4B' : '#FFFFFF',
      secondary: mode === 'light' ? '#64748B' : '#A1A1AA',
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.75rem', fontWeight: 700 },
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h5: { fontSize: '1.25rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    button: { fontWeight: 600 }
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: mode === 'light' 
            ? 'linear-gradient(135deg, #F5F3FF 0%, #E0E7FF 100%)' 
            : '#0B0A10', // Solid deep dark background
          backgroundAttachment: 'fixed',
          color: mode === 'light' ? '#1E1B4B' : '#FFFFFF',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: mode === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.05)',
        },
      },
      defaultProps: {
        className: 'glass-card animate-fade-in',
      }
    },
    MuiCard: {
      defaultProps: {
        className: 'glass-card animate-fade-in',
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          padding: '8px 24px',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.85)' : '#0B0A10',
          borderRight: `1px solid ${mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(11, 10, 16, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
          boxShadow: 'none',
        }
      }
    }
  },
});
