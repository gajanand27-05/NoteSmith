import React from 'react';
import { Box, Typography, Button, Stack, alpha, useTheme } from '@mui/material';
import { Warning as WarningIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (this.props.onError) this.props.onError(error, info);
    else console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
    else window.location.reload();
  };

  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} onReset={this.handleReset} title={this.props.title} />;
    }
    return this.props.children;
  }
}

export const ErrorScreen = ({ error, onReset, title = 'Something went wrong' }) => {
  const theme = useTheme();
  return (
    <Box
      role="alert"
      sx={{
        textAlign: 'center',
        py: 8,
        px: 3,
        borderRadius: 3,
        border: '1px dashed',
        borderColor: alpha(theme.palette.error.main, 0.4),
        bgcolor: alpha(theme.palette.error.main, 0.05),
        m: 2,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          mb: 2,
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.error.main, 0.15),
          color: 'error.main',
        }}
      >
        <WarningIcon />
      </Box>
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 480, mx: 'auto' }}>
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </Typography>
      <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={onReset}>
          Reload
        </Button>
        <Button variant="outlined" onClick={() => window.history.back()}>
          Go back
        </Button>
      </Stack>
    </Box>
  );
};

export default ErrorBoundary;
