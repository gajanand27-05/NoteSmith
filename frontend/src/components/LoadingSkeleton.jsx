import React from 'react';
import { Box, Skeleton, Stack, Card, CardContent, alpha, useTheme } from '@mui/material';

export const TextSkeleton = ({ width = '100%', height = 16, sx }) => (
  <Skeleton variant="text" width={width} height={height} sx={sx} />
);

export const BlockSkeleton = ({ height = 120, sx }) => (
  <Skeleton variant="rounded" height={height} sx={{ borderRadius: 3, ...sx }} />
);

export const CardSkeleton = ({ height = 180, lines = 2 }) => (
  <Card sx={{ height }}>
    <CardContent>
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" width={56} height={56} sx={{ borderRadius: 2 }} />
        <Skeleton variant="text" width="60%" height={28} />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} variant="text" width={i === lines - 1 ? '70%' : '100%'} />
        ))}
      </Stack>
    </CardContent>
  </Card>
);

export const SectionSkeleton = ({ count = 3, height = 140 }) => (
  <Stack spacing={2}>
    <Skeleton variant="text" width={180} height={28} />
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${count}, minmax(0, 1fr))` },
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} height={height} />
      ))}
    </Box>
  </Stack>
);

export const PageSkeleton = () => {
  const theme = useTheme();
  return (
    <Box>
      <Skeleton variant="text" width={120} height={18} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width={260} height={44} />
      <Skeleton variant="text" width={360} height={20} sx={{ mb: 4 }} />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
        }}
      >
        <Stack spacing={2}>
          <CardSkeleton height={220} lines={3} />
          <SectionSkeleton count={3} height={160} />
        </Stack>
        <Stack spacing={2}>
          <CardSkeleton height={160} lines={2} />
          <CardSkeleton height={220} lines={4} />
          <CardSkeleton height={180} lines={3} />
        </Stack>
      </Box>
      <Box
        sx={{
          mt: 4,
          p: 2,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.4),
        }}
      >
        <Skeleton variant="text" width="40%" />
      </Box>
    </Box>
  );
};

export default PageSkeleton;
