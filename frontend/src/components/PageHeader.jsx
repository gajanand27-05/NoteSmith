import React from 'react';
import { Box, Typography, Stack, Breadcrumbs, Link, alpha, useTheme } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';
import { titleByPath } from './navMeta';

const subtitleByPath = {
  '/': 'Your learning at a glance.',
  '/upload': 'Add your PDFs, syllabus, or question papers to start studying.',
  '/summarize': 'Get concise, structured summaries of any document.',
  '/qa': 'Ask anything, get answers grounded in your documents.',
  '/questions': 'Generate exam-style questions from your notes.',
  '/flashcards': 'Create flip cards to memorize key concepts.',
  '/quiz': 'Test yourself with adaptive multiple-choice quizzes.',
  '/study-loop': 'Spaced repetition that actually sticks.',
  '/tutor': 'A patient tutor that explains any concept.',
  '/paper-analyzer': 'Spot patterns in previous year papers.',
};

const PageHeader = ({ title, subtitle, icon, actions, dense = false }) => {
  const theme = useTheme();
  const location = useLocation();
  const computedTitle = title || titleByPath[location.pathname] || 'NoteSmith';
  const computedSubtitle = subtitle ?? subtitleByPath[location.pathname];
  const crumbs = location.pathname === '/'
    ? [{ label: 'NoteSmith', to: '/' }, { label: 'Dashboard' }]
    : [{ label: 'NoteSmith', to: '/', icon: true }, { label: computedTitle }];

  return (
    <Box mb={dense ? 2 : 4} className="animate-fade-in">
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return isLast ? (
            <Typography key={i} variant="caption" color="text.secondary" fontWeight={600}>
              {c.label}
            </Typography>
          ) : (
            <Link
              key={i}
              component={RouterLink}
              to={c.to}
              underline="hover"
              color="text.secondary"
              variant="caption"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {c.icon ? <HomeIcon sx={{ fontSize: 14 }} /> : null}
              {c.label}
            </Link>
          );
        })}
      </Breadcrumbs>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                '& svg': { fontSize: 24 },
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Box>
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.01em">
              {computedTitle}
            </Typography>
            {computedSubtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {computedSubtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {actions ? <Box>{actions}</Box> : null}
      </Stack>
    </Box>
  );
};

export default PageHeader;
