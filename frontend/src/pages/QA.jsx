import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper, Avatar,
  Stack, Chip, Collapse, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon, Person as PersonIcon, SmartToy as RobotIcon,
  ContentCopy as CopyIcon, Refresh as RegenerateIcon,
  AutoStories as FlashcardsIcon, Quiz as QuizIcon,
  Description as SummarizeIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNavigate } from 'react-router-dom';
import PdfSelector from '../components/shared/PdfSelector';
import { askQuestionStream } from '../api';

const SUGGESTED_PROMPTS = [
  'Explain this chapter in simple terms',
  'Summarize the key ideas from this document',
  'Generate practice questions based on the content',
  'Teach me this topic like I am a beginner',
];

const COPY_TIMEOUT = 2000;

const CodeBlock = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');
  return (
    <Box sx={{ position: 'relative', my: 1, borderRadius: 1, overflow: 'hidden', fontSize: '0.8rem' }}>
      <SyntaxHighlighter style={oneDark} language={match?.[1] || 'text'} PreTag="div" customStyle={{ margin: 0, borderRadius: 0 }}>
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

const MarkdownContent = ({ content }) => (
  <Box sx={{
    '& p': { m: 0, lineHeight: 1.6 },
    '& p + p': { mt: 1 },
    '& ul, & ol': { m: 0.5, pl: 2.5 },
    '& li': { lineHeight: 1.6 },
    '& h1, & h2, & h3, & h4': { mt: 1.5, mb: 0.5, fontWeight: 700 },
    '& h1': { fontSize: '1.25rem' },
    '& h2': { fontSize: '1.1rem' },
    '& h3': { fontSize: '1rem' },
    '& blockquote': {
      borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, py: 0.5, my: 1, opacity: 0.85,
    },
    '& table': { borderCollapse: 'collapse', width: '100%', my: 1, fontSize: '0.8rem' },
    '& th, & td': { border: '1px solid', borderColor: 'rgba(255,255,255,0.12)', p: 1, textAlign: 'left' },
    '& th': { bgcolor: 'rgba(99,102,241,0.1)', fontWeight: 700 },
    '& code:not(pre code)': {
      bgcolor: 'rgba(99,102,241,0.12)', px: 0.6, py: 0.15, borderRadius: 0.75, fontSize: '0.8em',
    },
    '& pre': { my: 1, borderRadius: 1, overflow: 'hidden' },
  }}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const isBlock = /language-/.test(className || '');
          if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
          return <code className={className} {...props}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </Box>
);

const SourcePanel = ({ sources }) => {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Chip
        label={`${sources.length} source${sources.length > 1 ? 's' : ''}`}
        size="small"
        variant="outlined"
        onClick={() => setOpen(!open)}
        icon={open ? <CollapseIcon sx={{ fontSize: 14 }} /> : <ExpandIcon sx={{ fontSize: 14 }} />}
        sx={{ cursor: 'pointer', fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
      />
      <Collapse in={open}>
        <Paper variant="outlined" sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.02)' }}>
          {sources.map((src, i) => (
            <Box key={i} sx={{ mb: i < sources.length - 1 ? 1 : 0, pb: i < sources.length - 1 ? 1 : 0, borderBottom: i < sources.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem' }}>
                Source {i + 1}
                {src.metadata?.page && <span> &middot; Page {src.metadata.page}</span>}
                {src.metadata?.chapter && <span> &middot; {src.metadata.chapter}</span>}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.7rem', opacity: 0.7, lineHeight: 1.4 }}>
                "{src.text?.substring(0, 250)}{src.text?.length > 250 ? '...' : ''}"
              </Typography>
            </Box>
          ))}
        </Paper>
      </Collapse>
    </Box>
  );
};

const MessageActions = ({ msg, onCopy, onRegenerate, pdfId, navigate }) => (
  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, opacity: 0, transition: 'opacity 0.15s', '&:hover': { opacity: 1 } }}>
    <Tooltip title="Copy">
      <IconButton size="small" sx={{ color: 'text.disabled', fontSize: '0.7rem' }} onClick={() => onCopy(msg.content)}>
        <CopyIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
    <Tooltip title="Regenerate">
      <IconButton size="small" sx={{ color: 'text.disabled', fontSize: '0.7rem' }} onClick={onRegenerate}>
        <RegenerateIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
    {pdfId && (
      <>
        <Tooltip title="Create Flashcards">
          <IconButton size="small" sx={{ color: 'text.disabled', fontSize: '0.7rem' }} onClick={() => navigate('/flashcards', { state: { pdfId } })}>
            <FlashcardsIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Create Quiz">
          <IconButton size="small" sx={{ color: 'text.disabled', fontSize: '0.7rem' }} onClick={() => navigate('/quiz', { state: { pdfId } })}>
            <QuizIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Summarize">
          <IconButton size="small" sx={{ color: 'text.disabled', fontSize: '0.7rem' }} onClick={() => navigate('/summarize', { state: { pdfId } })}>
            <SummarizeIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </>
    )}
  </Stack>
);

const EmptyChat = ({ onSelectPrompt, hasPdf }) => (
  <Box sx={{ m: 'auto', textAlign: 'center', px: 2 }}>
    <RobotIcon sx={{ fontSize: 72, color: 'primary.main', mb: 2, opacity: 0.6 }} />
    <Typography variant="h5" fontWeight={700} mb={0.5}>
      {hasPdf ? 'Ask me anything about your document' : 'Select a document to start'}
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={3}>
      {hasPdf
        ? 'Try one of these questions to get started:'
        : 'Choose a PDF from the dropdown above to begin asking questions.'}
    </Typography>
    {hasPdf && (
      <Stack spacing={1} alignItems="center">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Chip
            key={prompt}
            label={prompt}
            onClick={() => onSelectPrompt(prompt)}
            variant="outlined"
            sx={{
              maxWidth: 480, width: '100%', justifyContent: 'flex-start', px: 2,
              py: 1.5, height: 'auto', borderRadius: 2,
              borderColor: 'rgba(255,255,255,0.1)',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.06)' },
              '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'left' },
            }}
          />
        ))}
        <Typography variant="caption" color="text.disabled" sx={{ mt: 2 }}>
          Press <Box component="span" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.05)', px: 0.75, py: 0.15, borderRadius: 0.5 }}>Enter</Box> to send, <Box component="span" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.05)', px: 0.75, py: 0.15, borderRadius: 0.5 }}>Shift+Enter</Box> for new line
        </Typography>
      </Stack>
    )}
  </Box>
);

const MasteryChip = ({ mastery }) => {
  if (!mastery || mastery.delta === 0) return null;
  const color = mastery.delta > 0 ? '#10B981' : '#EF4444';
  const sign = mastery.delta > 0 ? '+' : '';
  return (
    <Chip
      size="small"
      variant="outlined"
      label={`Mastery ${Math.round(mastery.before)}% → ${Math.round(mastery.after)}% (${sign}${Math.round(mastery.delta)}%)`}
      sx={{
        height: 20, fontSize: '0.6rem', fontWeight: 600,
        color, borderColor: color,
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
};

const MessageBubble = ({ msg, onCopy, onRegenerate, pdfId, navigate }) => {
  const isUser = msg.role === 'user';
  const isStreaming = msg._streaming;
  const hasMastery = msg.mastery && msg.mastery.delta !== 0;
  const time = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <Box sx={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '78%', display: 'flex', gap: 1, flexDirection: isUser ? 'row-reverse' : 'row', width: '100%' }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: isUser ? 'primary.main' : '#6366F1', flexShrink: 0 }}>
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <RobotIcon sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: isUser ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            border: '1px solid',
            borderColor: isUser ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          }}
        >
          {isStreaming && !msg.content.trim() ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} thickness={6} sx={{ color: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary">Thinking...</Typography>
            </Stack>
          ) : (
            <>
              <MarkdownContent content={msg.content} />
              {isStreaming && (
                <Box component="span" sx={{
                  display: 'inline-block', width: 6, height: 16,
                  bgcolor: 'primary.main', ml: 0.25,
                  animation: 'blink 0.8s step-end infinite',
                  verticalAlign: 'middle',
                  '@keyframes blink': { '50%': { opacity: 0 } },
                }} />
              )}
            </>
          )}
        </Paper>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25, px: 0.5 }}>
          {time && <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>{time}</Typography>}
          {hasMastery && <MasteryChip mastery={msg.mastery} />}
          <Box sx={{ flex: 1 }} />
          {!isUser && !isStreaming && <MessageActions msg={msg} onCopy={onCopy} onRegenerate={onRegenerate} pdfId={pdfId} navigate={navigate} />}
        </Stack>
        {!isUser && !isStreaming && <SourcePanel sources={msg.sources} />}
      </Box>
    </Box>
  );
};

const QA = () => {
  const [pdfId, setPdfId] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamMsgRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const updateStreamMessage = useCallback(() => {
    if (!streamMsgRef.current) return;
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length > 0) copy[copy.length - 1] = { ...streamMsgRef.current };
      return copy;
    });
  }, []);

  const handleSend = useCallback((text) => {
    const q = text || question;
    if (!pdfId || !q.trim() || streaming) return;

    const userMsg = { role: 'user', content: q.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setStreaming(true);

    const msg = {
      role: 'assistant', content: '', sources: [],
      _streaming: true, timestamp: new Date().toISOString(),
    };
    streamMsgRef.current = msg;
    setMessages((prev) => [...prev, msg]);

    askQuestionStream(pdfId, q.trim(), {
      onToken: (token) => {
        if (!streamMsgRef.current) return;
        streamMsgRef.current.content += token;
        updateStreamMessage();
      },
      onSources: (sources) => {
        if (!streamMsgRef.current) return;
        streamMsgRef.current.sources = sources.map((s) => ({
          text: s.text || '', distance: s.distance ?? 0, metadata: s.metadata || {},
        }));
        updateStreamMessage();
      },
      onDone: (mastery) => {
        if (!streamMsgRef.current) return;
        streamMsgRef.current._streaming = false;
        streamMsgRef.current.content = streamMsgRef.current.content.trimEnd();
        if (mastery && mastery.delta !== 0) {
          streamMsgRef.current.mastery = mastery;
        }
        updateStreamMessage();
        streamMsgRef.current = null;
        setStreaming(false);
      },
      onError: (err) => {
        setMessages((prev) => {
          const withoutStreaming = streamMsgRef.current
            ? prev.slice(0, -1)
            : prev;
          return [...withoutStreaming, {
            role: 'assistant',
            content: `Sorry, something went wrong: ${err}`,
            timestamp: new Date().toISOString(),
          }];
        });
        streamMsgRef.current = null;
        setStreaming(false);
      },
    });
  }, [pdfId, question, streaming, updateStreamMessage]);

  const handleSuggestedPrompt = (prompt) => {
    setQuestion(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  const handleRegenerate = (msg) => {
    if (msg.role !== 'assistant' || streaming) return;
    const idx = messages.indexOf(msg);
    if (idx < 1 || messages[idx - 1].role !== 'user') return;
    const questionText = messages[idx - 1].content;
    setMessages((prev) => prev.slice(0, idx - 1));
    setTimeout(() => handleSend(questionText), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      inputRef.current?.focus();
    }
  };

  const hasPdf = !!pdfId;

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Q&A</Typography>
        <PdfSelector value={pdfId} onChange={setPdfId} label="Select Document to Chat With" />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          flexGrow: 1, mb: 2, p: 2, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 1.5,
          bgcolor: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 3,
        }}
      >
        {messages.length === 0 && !streaming ? (
          <EmptyChat hasPdf={hasPdf} onSelectPrompt={handleSuggestedPrompt} />
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                pdfId={pdfId}
                onCopy={handleCopy}
                onRegenerate={() => handleRegenerate(msg)}
                navigate={navigate}
              />
            ))}
          </>
        )}
        <div ref={chatEndRef} />
      </Paper>

      <Paper variant="outlined" sx={{ p: '6px 6px 6px 16px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder={hasPdf ? 'Ask a question about your document...' : 'Select a document first...'}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasPdf || streaming}
            variant="standard"
            sx={{
              '& .MuiInputBase-root': { fontSize: '0.9rem', py: 0.5 },
              '& .MuiInputBase-input': { py: 1 },
              '& .MuiInput-underline:before': { borderBottom: 'none' },
              '& .MuiInput-underline:after': { borderBottom: 'none' },
              '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
            }}
          />
          <Tooltip title="Send (Enter)">
            <span>
              <IconButton
                color="primary"
                onClick={() => handleSend()}
                disabled={!hasPdf || !question.trim() || streaming}
                sx={{
                  bgcolor: !hasPdf || !question.trim() || streaming ? 'transparent' : 'primary.main',
                  color: !hasPdf || !question.trim() || streaming ? 'text.disabled' : 'white',
                  '&:hover': { bgcolor: !hasPdf || !question.trim() || streaming ? 'transparent' : 'primary.dark' },
                  width: 40, height: 40,
                }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>
    </Box>
  );
};

export default QA;
