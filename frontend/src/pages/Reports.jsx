import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Stack, Chip, Divider, Tooltip,
} from '@mui/material';
import {
  Assessment as ReportIcon, Download as DownloadIcon, ContentCopy as CopyIcon,
  PictureAsPdf as PdfIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { getMasteryReport, getWeeklyReport, getFullReport } from '../api';

const REPORT_TYPES = [
  { key: 'mastery', label: 'Mastery Progress', api: getMasteryReport, icon: <ReportIcon /> },
  { key: 'weekly', label: 'Weekly Summary', api: getWeeklyReport, icon: <ReportIcon /> },
  { key: 'full', label: 'Full Study Report', api: getFullReport, icon: <PdfIcon /> },
];

const Reports = () => {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState(null);

  const handleGenerate = async (type) => {
    setLoading(true);
    setReport('');
    setActiveType(type.key);
    try {
      const res = await type.api();
      setReport(res.data);
    } catch (e) {
      console.error('Report generation failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report).catch(() => {});
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeType}-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>NoteSmith Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
        h1, h2, h3 { color: #1a1a2e; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
        hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
        @media print { body { margin: 0; } }
      </style></head><body>${report}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Reports</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Generate and export study reports to track your progress over time.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
          Choose a Report
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {REPORT_TYPES.map((type) => (
            <Button
              key={type.key}
              variant={activeType === type.key ? 'contained' : 'outlined'}
              size="large"
              startIcon={loading && activeType === type.key ? <CircularProgress size={18} color="inherit" /> : type.icon}
              onClick={() => handleGenerate(type)}
              disabled={loading}
            >
              {type.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      {report && (
        <Paper sx={{ p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Chip label={REPORT_TYPES.find((t) => t.key === activeType)?.label} color="primary" variant="outlined" />
            <Stack direction="row" spacing={1}>
              <Tooltip title="Copy">
                <Button size="small" variant="outlined" startIcon={<CopyIcon sx={{ fontSize: 16 }} />} onClick={handleCopy}>
                  Copy
                </Button>
              </Tooltip>
              <Tooltip title="Download as Markdown">
                <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />} onClick={handleDownload}>
                  Download
                </Button>
              </Tooltip>
              <Tooltip title="Print / Save as PDF">
                <Button size="small" variant="outlined" startIcon={<PdfIcon sx={{ fontSize: 16 }} />} onClick={handlePrint}>
                  PDF
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
          <Divider sx={{ mb: 3 }} />
          <Box className="markdown-content" sx={{ lineHeight: 1.8 }}>
            <ReactMarkdown>{report}</ReactMarkdown>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Reports;