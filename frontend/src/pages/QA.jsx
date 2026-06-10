import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Paper, 
  Avatar,
  Stack,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Send as SendIcon, 
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  SmartToy as RobotIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import PdfSelector from '../components/shared/PdfSelector';
import { askQuestion } from '../api';

const QA = () => {
  const [pdfId, setPdfId] = useState('');
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleSend = async () => {
    if (!pdfId || !question.trim()) return;
    
    const userMsg = { role: 'user', content: question };
    setChat(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await askQuestion(pdfId, userMsg.content);
      const botMsg = { 
        role: 'assistant', 
        content: response.data.answer,
        sources: response.data.sources 
      };
      setChat(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("QA failed", error);
      setChat(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't find an answer. Please check if the PDF is indexed properly." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" gutterBottom>Q&A</Typography>
        <PdfSelector value={pdfId} onChange={setPdfId} label="Select Document to Chat With" />
      </Box>

      <Paper sx={{ flexGrow: 1, mb: 2, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {chat.length === 0 && (
          <Box sx={{ m: 'auto', textAlign: 'center', opacity: 0.5 }}>
            <RobotIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6">Ask me anything about your document!</Typography>
          </Box>
        )}
        
        {chat.map((msg, idx) => (
          <Box 
            key={idx} 
            sx={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              gap: 1,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <Avatar sx={{ bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
              {msg.role === 'user' ? <PersonIcon /> : <RobotIcon />}
            </Avatar>
            <Box>
              <Paper sx={{ p: 2, bgcolor: msg.role === 'user' ? 'primary.light' : 'background.paper', color: msg.role === 'user' ? 'white' : 'text.primary' }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </Paper>
              
              {msg.sources && msg.sources.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Accordion size="small">
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="caption">View Sources ({msg.sources.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {msg.sources.map((src, sIdx) => (
                        <Box key={sIdx} sx={{ mb: 1 }}>
                          <Typography variant="caption" display="block" color="text.secondary">Source {sIdx + 1}:</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{src.text.substring(0, 200)}..."</Typography>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ alignSelf: 'flex-start', display: 'flex', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}><RobotIcon /></Avatar>
            <Paper sx={{ p: 2 }}><CircularProgress size={20} /></Paper>
          </Box>
        )}
        <div ref={chatEndRef} />
      </Paper>

      <Stack direction="row" spacing={1}>
        <TextField 
          fullWidth 
          placeholder="Type your question here..." 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={!pdfId || loading}
        />
        <IconButton color="primary" onClick={handleSend} disabled={!pdfId || !question.trim() || loading} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default QA;
