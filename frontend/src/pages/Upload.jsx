import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Paper, Grid, Stack, Chip, Card, CardContent,
  LinearProgress, IconButton, Alert, CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon, PictureAsPdf as PdfIcon, Delete as DeleteIcon,
  Description as FileIcon, Close as CloseIcon, CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { listPdfs, deletePdf, getPdf, uploadPdfWithProgress, getMasterySummary } from '../api';
import { enqueueSnackbar } from 'notistack';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingSkeleton';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const PROCESS_STEPS = ['uploaded', 'chunking', 'embedding', 'indexing'];
const PROCESS_LABELS = { uploaded: 'Uploaded', chunking: 'Chunking', embedding: 'Embedding', indexing: 'Indexing' };

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
};

const TrendBadge = ({ trend }) => {
  const rounded = Math.abs(trend) < 0.1 ? 0 : Math.round(trend * 10) / 10;
  if (rounded === 0) return null;
  const color = trend > 0 ? '#10B981' : '#EF4444';
  const icon = trend > 0
    ? <TrendingUpIcon sx={{ fontSize: 14 }} />
    : <TrendingDownIcon sx={{ fontSize: 14 }} />;
  return (
    <Typography variant="caption" sx={{ color, display: 'inline-flex', alignItems: 'center', gap: 0.25, fontWeight: 700 }}>
      {icon} {rounded > 0 ? '+' : ''}{rounded}%
    </Typography>
  );
};

const ProcessingIndicator = ({ status, fileName, fileSize }) => {
  const currentIdx = PROCESS_STEPS.indexOf(status);
  return (
    <Box sx={{ textAlign: 'center' }}>
      <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
      <Typography variant="h6" fontWeight="600" mb={0.5}>{fileName}</Typography>
      {fileSize > 0 && (
        <Typography variant="body2" color="text.secondary" mb={2}>{formatSize(fileSize)}</Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, maxWidth: 280, mx: 'auto', mb: 1 }}>
        {PROCESS_STEPS.map((step, i) => {
          const isComplete = i < currentIdx;
          const isActive = i === currentIdx;
          let icon;
          let color;
          if (isComplete) {
            icon = <CheckIcon sx={{ fontSize: 18, color: '#10B981' }} />;
            color = '#10B981';
          } else if (isActive) {
            icon = <CircularProgress size={16} thickness={6} sx={{ color: '#6366F1' }} />;
            color = '#6366F1';
          } else {
            icon = <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: 'rgba(255,255,255,0.15)' }} />;
            color = 'rgba(255,255,255,0.3)';
          }
          return (
            <Stack key={step} direction="row" alignItems="center" spacing={1.5}>
              {icon}
              <Typography variant="body2" sx={{ color, fontWeight: isActive ? 700 : 400, transition: 'color 0.3s' }}>
                {PROCESS_LABELS[step]}
              </Typography>
            </Stack>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Processing your document...
      </Typography>
    </Box>
  );
};

const StatusChip = ({ status, errorMessage }) => {
  const color = status === 'indexed' ? '#10B981' : status === 'failed' ? '#EF4444' : '#FBBF24';
  const label = status === 'indexed' ? 'Indexed' : status === 'failed' ? 'Failed' : status.charAt(0).toUpperCase() + status.slice(1);
  const icon = status === 'indexed'
    ? <CheckIcon sx={{ fontSize: 14 }} />
    : status === 'failed'
      ? <ErrorIcon sx={{ fontSize: 14 }} />
      : <CircularProgress size={12} thickness={6} sx={{ color: '#FBBF24' }} />;
  return (
    <Box>
      <Chip
        icon={icon}
        label={label}
        size="small"
        sx={{
          color, borderColor: color,
          fontWeight: 600, fontSize: '0.65rem',
          '& .MuiChip-icon': { ml: 0.5 },
        }}
        variant="outlined"
      />
      {status === 'failed' && errorMessage && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontSize: '0.6rem', lineHeight: 1.2 }}>
          {errorMessage}
        </Typography>
      )}
    </Box>
  );
};

const Upload = () => {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [processingFileName, setProcessingFileName] = useState('');
  const [processingFileSize, setProcessingFileSize] = useState(0);
  const [pdfs, setPdfs] = useState([]);
  const [masteryMap, setMasteryMap] = useState({});
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef(null);

  const fetchPdfs = useCallback(async () => {
    try {
      const [pdfsRes, masteryRes] = await Promise.all([
        listPdfs(),
        getMasterySummary().catch(() => ({ data: [] })),
      ]);
      setPdfs(pdfsRes.data || []);
      const mm = {};
      (masteryRes.data || []).forEach((m) => { mm[m.pdf_id] = m; });
      setMasteryMap(mm);
    } catch (error) {
      console.error("Failed to fetch PDFs", error);
    } finally {
      setLoadingPdfs(false);
    }
  }, []);

  useEffect(() => { fetchPdfs(); }, [fetchPdfs]);

  // Poll processing status
  useEffect(() => {
    if (!processingDocId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getPdf(processingDocId);
        const status = res.data.processing_status;
        setProcessingStatus(status);
        if (status === 'indexed') {
          clearInterval(interval);
          setProcessingDocId(null);
          setProcessingStatus(null);
          setUploadStatus('idle');
          setFile(null);
          setUploadProgress(0);
          enqueueSnackbar(`${processingFileName} processed successfully`, { variant: 'success' });
          setLoadingPdfs(true);
          fetchPdfs();
        } else if (status === 'failed') {
          clearInterval(interval);
          const errMsg = res.data.error_message || 'Processing failed';
          setProcessingDocId(null);
          setProcessingStatus(null);
          setUploadStatus('idle');
          setFile(null);
          setUploadProgress(0);
          enqueueSnackbar(`Processing failed: ${errMsg}`, { variant: 'error' });
          setLoadingPdfs(true);
          fetchPdfs();
        }
      } catch (e) {
        console.error('Status poll failed', e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [processingDocId, processingFileName, fetchPdfs]);

  const validateFile = (f) => {
    if (!f) return 'No file selected';
    if (f.type && f.type !== 'application/pdf' && !f.name.endsWith('.pdf'))
      return 'Only PDF files are supported';
    if (f.size > MAX_FILE_SIZE)
      return `File too large (${formatSize(f.size)}). Maximum is ${formatSize(MAX_FILE_SIZE)}.`;
    return '';
  };

  const handleFileSelect = (f) => {
    setValidationError('');
    const err = validateFile(f);
    if (err) { setValidationError(err); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setUploadProgress(0);
    setValidationError('');
    try {
      const res = await uploadPdfWithProgress(file, setUploadProgress);
      const pdfInfo = res.data.pdf;
      const initialStatus = pdfInfo.processing_status;
      if (initialStatus === 'indexed') {
        setUploadStatus('idle');
        setFile(null);
        setUploadProgress(0);
        enqueueSnackbar(`${file.name} uploaded successfully`, { variant: 'success' });
        setLoadingPdfs(true);
        fetchPdfs();
      } else {
        setUploadStatus('processing');
        setProcessingDocId(pdfInfo.id);
        setProcessingStatus(initialStatus);
        setProcessingFileName(file.name);
        setProcessingFileSize(file.size);
      }
    } catch (error) {
      console.error("Upload failed", error);
      const msg = error.response?.data?.detail || error.message || 'Upload failed';
      enqueueSnackbar(`Upload failed: ${msg}`, { variant: 'error' });
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  };

  const handleDelete = async (pdfId) => {
    try {
      await deletePdf(pdfId);
      enqueueSnackbar('PDF deleted successfully', { variant: 'success' });
      setDeleteTarget(null);
      setPdfs((prev) => prev.filter((p) => p.id !== pdfId));
    } catch {
      enqueueSnackbar('Failed to delete PDF', { variant: 'error' });
      setDeleteTarget(null);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); };

  const isLocked = uploadStatus === 'uploading' || uploadStatus === 'processing';

  const totalPdfs = pdfs.length;
  const dropZoneContent = () => {
    if (uploadStatus === 'uploading') {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4, mb: 2 }} />
          <Typography variant="h5" fontWeight="700" mb={0.5}>{uploadProgress}%</Typography>
          <Typography variant="body2" color="text.secondary">Uploading {file?.name}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {formatSize(file?.size || 0)}
          </Typography>
        </Box>
      );
    }
    if (uploadStatus === 'processing') {
      return (
        <ProcessingIndicator
          status={processingStatus}
          fileName={processingFileName}
          fileSize={processingFileSize}
        />
      );
    }
    if (file) {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" fontWeight="600">{file.name}</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>{formatSize(file.size)}</Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" size="large" startIcon={<UploadIcon />} onClick={handleUpload}>
              Start Upload
            </Button>
            <Button variant="outlined" size="large" startIcon={<CloseIcon />} onClick={() => setFile(null)}>
              Cancel
            </Button>
          </Stack>
        </Box>
      );
    }
    return (
      <Box sx={{ textAlign: 'center' }}>
        <UploadIcon sx={{ fontSize: 56, color: dragOver ? 'primary.main' : 'text.disabled', mb: 1.5, transition: '0.2s', transform: dragOver ? 'scale(1.1)' : 'scale(1)' }} />
        <Typography variant="h6" fontWeight="600" mb={0.5}>
          {dragOver ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          or click to browse &mdash; PDF up to {formatSize(MAX_FILE_SIZE)}
        </Typography>
        <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => inputRef.current?.click()}>
          Select PDF
        </Button>
      </Box>
    );
  };

  if (loadingPdfs) return <CardSkeleton />;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }}
      />

      {/* Drop zone */}
      <Paper
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: 5, mb: validationError ? 1 : 4, textAlign: 'center',
          border: '2px dashed',
          borderColor: validationError ? 'error.main' : dragOver ? 'primary.main' : isLocked ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.15)',
          bgcolor: isLocked ? 'rgba(99,102,241,0.03)' : dragOver ? 'rgba(99,102,241,0.05)' : 'transparent',
          borderRadius: 3,
          cursor: isLocked ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          ...(isLocked ? {} : { '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.03)' } }),
        }}
        onClick={() => !isLocked && !file && inputRef.current?.click()}
      >
        {dropZoneContent()}
      </Paper>

      {validationError && <Alert severity="error" sx={{ mb: 4 }} onClose={() => setValidationError('')}>{validationError}</Alert>}

      {/* Library Cards */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap">
          <Box>
            <Typography variant="h5" fontWeight="700">Your Documents</Typography>
            <Typography variant="body2" color="text.secondary">
              {totalPdfs > 0 ? `${totalPdfs} document${totalPdfs > 1 ? 's' : ''}` : 'No documents uploaded yet'}
            </Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={() => window.location.reload()} sx={{ borderRadius: 2 }}>
            Refresh
          </Button>
        </Stack>

        {totalPdfs === 0 ? (
          <EmptyState
            icon={<PdfIcon />}
            title="No study materials yet"
            description="Upload your first PDF, syllabus, or question paper to start studying."
            primaryAction={
              <Button variant="contained" startIcon={<UploadIcon />} onClick={() => inputRef.current?.click()}>
                Upload PDF
              </Button>
            }
          />
        ) : (
          <Grid container spacing={2}>
            {pdfs.map((pdf) => {
              const mastery = masteryMap[pdf.id];
              const score = mastery?.mastery_score ?? 0;
              const trend = mastery?.trend ?? 0;
              const color = score < 30 ? '#EF4444' : score < 50 ? '#F97316' : score < 65 ? '#FBBF24' : score < 80 ? '#34D399' : '#10B981';
              const pStatus = pdf.processing_status;
              const isIndexed = pStatus === 'indexed';
              const isFailed = pStatus === 'failed';
              return (
                <Grid item xs={12} sm={6} md={4} key={pdf.id}>
                  <Card sx={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    bgcolor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 3, position: 'relative',
                    opacity: isIndexed ? 1 : 0.75,
                    transition: 'opacity 0.3s',
                  }}>
                    <CardContent sx={{ flex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PdfIcon sx={{ color: '#6366F1', fontSize: 22 }} />
                        </Box>
                        <IconButton size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }} onClick={() => setDeleteTarget(pdf)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, minHeight: 36 }}>
                        {pdf.original_name.replace(/\.pdf$/i, '')}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        {isIndexed || isFailed ? (
                          <>
                            {pdf.page_count > 0 && (
                              <Chip label={`${pdf.page_count} page${pdf.page_count !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            )}
                            {pdf.chunk_count > 0 && (
                              <Chip label={`${pdf.chunk_count} chunks`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            )}
                          </>
                        ) : (
                          <Chip label={`${pdf.page_count} pages`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                        )}
                      </Stack>

                      {isFailed && <StatusChip status={pStatus} errorMessage={pdf.error_message} />}

                      {isIndexed && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: '0.65rem' }}>
                          Uploaded {formatDate(pdf.created_at)}
                        </Typography>
                      )}

                      {!isIndexed && !isFailed && (
                        <StatusChip status={pStatus} />
                      )}

                      {isIndexed && mastery && (
                        <Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Mastery</Typography>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="caption" fontWeight="700" color={color}>{score}%</Typography>
                              <TrendBadge trend={trend} />
                            </Box>
                          </Box>
                          <LinearProgress variant="determinate" value={score} sx={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { backgroundColor: color } }} />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete PDF?"
        message={
          deleteTarget
            ? `"${deleteTarget.original_name}" will be permanently removed. This action cannot be undone. All associated data (mastery, events, embeddings) will be deleted.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default Upload;
