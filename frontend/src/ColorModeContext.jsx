import React, { createContext, useMemo, useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { SnackbarProvider } from 'notistack';
import { getTheme } from './theme';

export const ColorModeContext = createContext({ toggleColorMode: () => {}, setMode: () => {}, mode: 'system' });

export const ColorModeProvider = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setModeState] = useState(() => localStorage.getItem('themeMode') || 'system');

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const setMode = useCallback((m) => setModeState(m), []);
  const toggleColorMode = useCallback(
    () => setModeState((m) => (m === 'dark' ? 'light' : 'dark')),
    [],
  );

  const appliedMode = useMemo(() => {
    if (mode === 'system') return prefersDarkMode ? 'dark' : 'light';
    return mode;
  }, [mode, prefersDarkMode]);

  const theme = useMemo(() => getTheme(appliedMode), [appliedMode]);

  const value = useMemo(() => ({ mode, setMode, toggleColorMode, appliedMode }), [mode, setMode, toggleColorMode, appliedMode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          autoHideDuration={4000}
          dense
        >
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
