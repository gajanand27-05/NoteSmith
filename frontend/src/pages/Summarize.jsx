import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Divider, Stack, Tooltip, IconButton, List, ListItemButton, ListItemText,
} from '@mui/material';
import {
  Summarize as SummarizeIcon, ContentCopy as CopyIcon,
  Download as DownloadIcon, Refresh as RegenerateIcon,
  MenuOpen as TocIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { getSummary } from '../api';

const Summarize = () => {
  const location = useLocation();
  const [pdfId, setPdfId] = useState(location.state?.pdfId || '');
  const [length, setLength] = useState('medium');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToc, setShowToc] = useState(false);

  const handleSummarize = async () => {
    if (!pdfId) return;
    setLoading(true);
    setSummary('');
    try {
      const response = await getSummary(pdfId, length);
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Summarization failed", error);
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary).catch(() => {});
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${pdfId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    handleSummarize();
  };

  // Extract headings from markdown for section navigation
  const sections = useMemo(() => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const matches = [];
    let match;
    while ((match = headingRegex.exec(summary)) !== null) {
      matches.push({ level: match[1].length, text: match[2] });
    }
    return matches;
  }, [summary]);

  const scrollToSection = (text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowToc(false);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', position: 'relative' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Summarize</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Generate concise summaries of your documents to save time.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <PdfSelector value={pdfId} onChange={setPdfId} />
        <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
          <InputLabel id="length-label">Summary Length</InputLabel>
          <Select
            labelId="length-label"
            value={length}
            label="Summary Length"
            onChange={(e) => setLength(e.target.value)}
          >
            <MenuItem value="short">Short (1-page equivalent)</MenuItem>
            <MenuItem value="medium">Medium (2-page equivalent)</MenuItem>
            <MenuItem value="long">Long (Comprehensive)</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SummarizeIcon />}
          onClick={handleSummarize}
          disabled={!pdfId || loading}
        >
          {loading ? 'Generating Summary...' : 'Generate Summary'}
        </Button>
      </Paper>

      {summary && (
        <>
          {/* Toolbar */}
          <Paper sx={{ p: 1, mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            {sections.length > 1 && (
              <Tooltip title="Section Navigation">
                <IconButton size="small" onClick={() => setShowToc(!showToc)} sx={{ color: showToc ? 'primary.main' : 'text.disabled' }}>
                  <TocIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Copy">
              <IconButton size="small" sx={{ color: 'text.disabled' }} onClick={handleCopy}>
                <CopyIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Markdown">
              <IconButton size="small" sx={{ color: 'text.disabled' }} onClick={handleDownload}>
                <DownloadIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Regenerate">
              <IconButton size="small" sx={{ color: 'text.disabled' }} onClick={handleRegenerate}>
                <RegenerateIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
            {/* TOC sidebar */}
            {showToc && sections.length > 1 && (
              <Paper sx={{ position: 'sticky', top: 24, alignSelf: 'flex-start', minWidth: 200, maxHeight: '60vh', overflow: 'auto', p: 1 }}>
                <Typography variant="caption" fontWeight={700} sx={{ px: 1, pb: 1, display: 'block', opacity: 0.6 }}>
                  Sections
                </Typography>
                <List dense>
                  {sections.map((s, i) => (
                    <ListItemButton key={i} onClick={() => scrollToSection(s.text)} sx={{ py: 0.3, pl: s.level * 2 }}>
                      <ListItemText
                        primary={s.text}
                        primaryTypographyProps={{ variant: 'caption', fontWeight: s.level === 1 ? 700 : 400, noWrap: true }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )}

            {/* Summary content */}
            <Paper sx={{ p: 4, flex: 1, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Box className="markdown-content">
                <ReactMarkdown
                  components={{
                    h1: ({ children, ...props }) => {
                      const text = children?.toString() || '';
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      return <Typography variant="h4" id={id} {...props}>{children}</Typography>;
                    },
                    h2: ({ children, ...props }) => {
                      const text = children?.toString() || '';
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      return <Typography variant="h5" id={id} sx={{ mt: 3 }} {...props}>{children}</Typography>;
                    },
                    h3: ({ children, ...props }) => {
                      const text = children?.toString() || '';
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      return <Typography variant="h6" id={id} sx={{ mt: 2 }} {...props}>{children}</Typography>;
                    },
                    p: ({ children, ...props }) => <Typography variant="body1" paragraph {...props}>{children}</Typography>,
                    ul: ({ children, ...props }) => <Box component="ul" sx={{ mb: 2 }} {...props}>{children}</Box>,
                    ol: ({ children, ...props }) => <Box component="ol" sx={{ mb: 2 }} {...props}>{children}</Box>,
                    li: ({ children, ...props }) => <Typography component="li" variant="body1" {...props}>{children}</Typography>,
                    blockquote: ({ children, ...props }) => (
                      <Box sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 2, my: 2, opacity: 0.8 }} {...props}>
                        {children}
                      </Box>
                    ),
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </Box>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Summarize;