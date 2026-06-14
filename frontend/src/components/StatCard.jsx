import React from 'react';
import { Card, CardContent, Box, Typography, alpha, useTheme } from '@mui/material';

const StatCard = ({ icon, label, value, hint, color = 'primary', sx }) => {
  const theme = useTheme();
  const accent = theme.palette[color]?.main || theme.palette.primary.main;
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha(theme.palette.text.primary, 0.06),
        bgcolor: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(10px)',
        ...sx,
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {icon ? (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(accent, 0.14),
                color: accent,
                '& svg': { fontSize: 20 },
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2} noWrap>
              {value}
            </Typography>
            {hint ? (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
