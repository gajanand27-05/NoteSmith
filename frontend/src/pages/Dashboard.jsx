import React, { useState, useEffect } from 'react';
import { Grid, Typography, Box, Card, CardContent, CircularProgress } from '@mui/material';
import { 
  PictureAsPdf as PdfIcon, 
  MenuBook as PagesIcon, 
  Memory as ChunkIcon 
} from '@mui/icons-material';
import { getDashboardStats } from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({ pdf_count: 0, chunk_count: 0, page_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getDashboardStats();
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in">
      <Typography variant="h3" fontWeight="800" gutterBottom>
        Welcome to <span className="text-gradient">NoteSmith</span>
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
        Your personal AI Study Companion. Turn messy PDFs into exam-ready preparation in seconds.
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography color="text.secondary" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
                  Knowledge Base
                </Typography>
                <PdfIcon sx={{ color: 'primary.main', fontSize: 32, opacity: 0.8 }} />
              </Box>
              <Typography variant="h2" fontWeight="800" color="primary.main">
                {stats.pdf_count}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                PDF documents analyzed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography color="text.secondary" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
                  Pages Read
                </Typography>
                <PagesIcon sx={{ color: 'secondary.main', fontSize: 32, opacity: 0.8 }} />
              </Box>
              <Typography variant="h2" fontWeight="800" color="secondary.main">
                {stats.page_count}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Total pages processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography color="text.secondary" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
                  AI Brain Cells
                </Typography>
                <ChunkIcon sx={{ color: '#DB2777', fontSize: 32, opacity: 0.8 }} />
              </Box>
              <Typography variant="h2" fontWeight="800" sx={{ color: '#DB2777' }}>
                {stats.chunk_count}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Embeddings stored in memory
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
