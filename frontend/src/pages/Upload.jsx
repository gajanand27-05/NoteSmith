import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { 
  CloudUpload as UploadIcon, 
  PictureAsPdf as PdfIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { listPdfs, uploadPdf } from '../api';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);

  const fetchPdfs = async () => {
    try {
      const response = await listPdfs();
      setPdfs(response.data);
    } catch (error) {
      console.error("Failed to fetch PDFs", error);
    } finally {
      setLoadingPdfs(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setMessage({ type: '', text: '' });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      await uploadPdf(file);
      setMessage({ type: 'success', text: `Successfully uploaded and indexed ${file.name}` });
      setFile(null);
      fetchPdfs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed. Make sure the backend is running and Ollama is online.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Upload Notes</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Add your PDFs, syllabus, or question papers to start studying.
      </Typography>

      <Paper sx={{ p: 4, mb: 4, textAlign: 'center', border: '2px dashed #ccc', bgcolor: 'transparent' }}>
        <input
          accept="application/pdf"
          style={{ display: 'none' }}
          id="raised-button-file"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="raised-button-file">
          <Button 
            variant="contained" 
            component="span" 
            startIcon={<UploadIcon />}
            disabled={uploading}
            sx={{ mb: 2 }}
          >
            Select PDF
          </Button>
        </label>
        
        {file && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selected: <strong>{file.name}</strong>
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleUpload}
            disabled={!file || uploading}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
          >
            {uploading ? 'Uploading & Indexing...' : 'Start Upload'}
          </Button>
        </Box>

        {message.text && (
          <Alert severity={message.type} sx={{ mt: 3 }}>
            {message.text}
          </Alert>
        )}
      </Paper>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Your Documents</Typography>
      <Paper>
        {loadingPdfs ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {pdfs.length === 0 ? (
              <ListItem>
                <ListItemText primary="No documents uploaded yet." />
              </ListItem>
            ) : (
              pdfs.map((pdf, index) => (
                <React.Fragment key={pdf.id}>
                  <ListItem>
                    <ListItemIcon>
                      <PdfIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={pdf.original_name} 
                      secondary={`${pdf.page_count} pages • ${pdf.chunk_count} chunks • Uploaded on ${new Date(pdf.created_at).toLocaleDateString()}`} 
                    />
                    <SuccessIcon color="success" />
                  </ListItem>
                  {index < pdfs.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))
            )}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default Upload;
