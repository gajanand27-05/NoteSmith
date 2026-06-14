import React from 'react';
import { Box, Typography, Button, Stack, alpha, useTheme } from '@mui/material';

const EmptyState = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
  sx,
}) => {
  const theme = useTheme();
  return (
    <Box
      role="status"
      sx={{
        textAlign: 'center',
        py: compact ? 5 : 8,
        px: 3,
        borderRadius: 3,
        border: '1px dashed',
        borderColor: alpha(theme.palette.text.primary, 0.12),
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(8px)',
        ...sx,
      }}
    >
      {icon ? (
        <Box
          sx={{
            mx: 'auto',
            mb: 2,
            width: compact ? 48 : 64,
            height: compact ? 48 : 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
            '& svg': { fontSize: compact ? 24 : 32 },
          }}
        >
          {icon}
        </Box>
      ) : null}
      {title ? (
        <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={700}>
          {title}
        </Typography>
      ) : null}
      {description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: 460, mx: 'auto', lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      ) : null}
      {primaryAction || secondaryAction ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="center"
          sx={{ mt: 3 }}
        >
          {primaryAction}
          {secondaryAction}
        </Stack>
      ) : null}
    </Box>
  );
};

export default EmptyState;
