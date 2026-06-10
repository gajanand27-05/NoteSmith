import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { listPdfs } from '../../api';

const PdfSelector = ({ value, onChange, label = "Select Document" }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPdfs = async () => {
      try {
        const response = await listPdfs();
        setPdfs(response.data);
      } catch (error) {
        console.error("Failed to fetch PDFs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPdfs();
  }, []);

  return (
    <FormControl fullWidth sx={{ mb: 3 }}>
      <InputLabel id="pdf-selector-label">{label}</InputLabel>
      <Select
        labelId="pdf-selector-label"
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {pdfs.map((pdf) => (
          <MenuItem key={pdf.id} value={pdf.id}>
            {pdf.original_name}
          </MenuItem>
        ))}
      </Select>
      {pdfs.length === 0 && !loading && (
        <FormHelperText error>No documents found. Please upload one first.</FormHelperText>
      )}
    </FormControl>
  );
};

export default PdfSelector;
