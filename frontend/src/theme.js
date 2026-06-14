import { createTheme, alpha } from '@mui/material/styles';

const tokens = {
  light: {
    bg: '#F5F3FF',
    bgGradient: 'linear-gradient(135deg, #F5F3FF 0%, #E0E7FF 100%)',
    paper: 'rgba(255, 255, 255, 0.78)',
    paperStrong: 'rgba(255, 255, 255, 0.92)',
    paperMuted: 'rgba(255, 255, 255, 0.55)',
    border: 'rgba(17, 24, 39, 0.08)',
    borderStrong: 'rgba(17, 24, 39, 0.14)',
    text: '#0F172A',
    textMuted: '#475569',
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#0EA5E9',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    appBar: 'rgba(255, 255, 255, 0.78)',
    drawer: 'rgba(255, 255, 255, 0.85)',
    shadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    focus: 'rgba(99, 102, 241, 0.45)',
  },
  dark: {
    bg: '#0B0A10',
    bgGradient:
      'radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.18), transparent 60%),' +
      'radial-gradient(900px 500px at 100% 10%, rgba(168,85,247,0.12), transparent 60%),' +
      '#0B0A10',
    paper: 'rgba(20, 18, 32, 0.72)',
    paperStrong: 'rgba(20, 18, 32, 0.92)',
    paperMuted: 'rgba(20, 18, 32, 0.45)',
    border: 'rgba(255, 255, 255, 0.06)',
    borderStrong: 'rgba(255, 255, 255, 0.12)',
    text: '#F8FAFC',
    textMuted: '#A1A1AA',
    primary: '#A855F7',
    primaryLight: '#C084FC',
    primaryDark: '#9333EA',
    secondary: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#F87171',
    appBar: 'rgba(11, 10, 16, 0.75)',
    drawer: '#0B0A10',
    shadow: '0 14px 40px rgba(0, 0, 0, 0.45)',
    focus: 'rgba(168, 85, 247, 0.55)',
  },
};

export const getTheme = (mode) => {
  const t = tokens[mode] || tokens.dark;
  return createTheme({
    palette: {
      mode,
      primary: {
        main: t.primary,
        light: t.primaryLight,
        dark: t.primaryDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: t.secondary,
        contrastText: '#FFFFFF',
      },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
      background: {
        default: t.bg,
        paper: t.paper,
      },
      text: {
        primary: t.text,
        secondary: t.textMuted,
      },
      divider: t.border,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", system-ui, sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.75rem', fontWeight: 700 },
      h4: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontSize: '1.25rem', fontWeight: 600 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { scrollBehavior: 'smooth' },
          body: {
            background: t.bgGradient,
            backgroundAttachment: 'fixed',
            color: t.text,
            minHeight: '100vh',
            fontFeatureSettings: '"cv02","cv03","cv04","cv11"',
          },
          '*:focus-visible': {
            outline: `2px solid ${t.focus}`,
            outlineOffset: 2,
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderColor: t.border,
            boxShadow: t.shadow,
          },
        },
        defaultProps: { className: 'glass-card' },
      },
      MuiCard: { defaultProps: { className: 'glass-card' } },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            paddingInline: 18,
            fontWeight: 600,
            transition: 'transform .2s ease, box-shadow .2s ease, background-color .2s ease',
          },
          containedPrimary: {
            boxShadow: `0 6px 20px ${alpha(t.primary, 0.35)}`,
          },
          containedPrimaryHover: {
            boxShadow: `0 10px 26px ${alpha(t.primary, 0.45)}`,
            transform: 'translateY(-1px)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { transition: 'background-color .2s ease, transform .2s ease' },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: t.paperMuted,
            backdropFilter: 'blur(8px)',
            '& fieldset': { borderColor: t.border },
            '&:hover fieldset': { borderColor: t.borderStrong },
            '&.Mui-focused fieldset': { borderColor: t.primary, borderWidth: 1 },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.drawer,
            borderRight: `1px solid ${t.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.appBar,
            backdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${t.border}`,
            boxShadow: 'none',
            backgroundImage: 'none',
            color: t.text,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.paperStrong,
            color: t.text,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadow,
            fontSize: 12,
            fontWeight: 500,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { backgroundColor: alpha(t.text, 0.08), borderRadius: 999 },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: { separator: { color: t.textMuted } },
      },
    },
  });
};

export default getTheme;
