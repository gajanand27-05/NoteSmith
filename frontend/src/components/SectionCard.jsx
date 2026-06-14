import React from 'react';
import { Card, CardContent, Box, Typography, Stack, alpha, useTheme } from '@mui/material';

const SectionCard = ({
  title,
  subtitle,
  icon,
  action,
  children,
  contentSx,
  sx,
  noPadding = false,
  tone = 'default',
}) => {
  const theme = useTheme();
  const toneBg =
    tone === 'muted'
      ? alpha(theme.palette.background.paper, 0.4)
      : alpha(theme.palette.background.paper, 0.75);

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: alpha(theme.palette.text.primary, 0.06),
        bgcolor: toneBg,
        backdropFilter: 'blur(10px)',
        ...sx,
      }}
    >
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            {icon ? (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                  '& svg': { fontSize: 18 },
                }}
              >
                {icon}
              </Box>
            ) : null}
            <Box>
              {title ? (
                <Typography variant="subtitle1" fontWeight={700}>
                  {title}
                </Typography>
              ) : null}
              {subtitle ? (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {action}
        </Box>
      )}
      <CardContent
        sx={{
          p: noPadding ? 0 : 2.5,
          '&:last-child': { pb: noPadding ? 0 : 2.5 },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};

export default SectionCard;
