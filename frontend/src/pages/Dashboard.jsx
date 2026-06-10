import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material';
import { listPdfs, getDashboardStats } from '../api';

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Welcome to NoteSmith</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        AI Study Companion - Turn PDFs into exam-ready preparation.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>PDFs Uploaded</Typography>
              <Typography variant="h3">{stats.pdf_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Pages</Typography>
              <Typography variant="h3">{stats.page_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Knowledge Chunks</Typography>
              <Typography variant="h3">{stats.chunk_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
