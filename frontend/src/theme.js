import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#6366F1', // Indigo primary
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#059669', // Emerald accent
      light: '#34D399',
      dark: '#047857',
    },
    background: {
      default: mode === 'light' ? 'transparent' : '#0F172A',
      paper: mode === 'light' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(30, 41, 59, 0.75)',
    },
    text: {
      primary: mode === 'light' ? '#1E1B4B' : '#F8FAFC',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
    }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
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
  },
});
