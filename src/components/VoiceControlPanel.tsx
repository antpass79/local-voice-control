import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  TextField,
  Button,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SettingsIcon from '@mui/icons-material/Settings';
import { useImageStore } from '../store/imageStore';
import { useVoiceControl } from '../hooks/useVoiceControl';
import { AsrInitDialog } from './AsrInitDialog';
import type { SherpaModelConfig } from '../types';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  idle: 'default',
  loading: 'warning',
  ready: 'info',
  recording: 'success',
  error: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'Not initialized',
  loading: 'Loading model…',
  ready: 'Ready',
  recording: '● Recording',
  error: 'Error',
};

export function VoiceControlPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const asrStatus = useImageStore((s) => s.asrStatus);
  const loadingProgress = useImageStore((s) => s.loadingProgress);
  const currentTranscript = useImageStore((s) => s.currentTranscript);
  const isListening = useImageStore((s) => s.isListening);
  const error = useImageStore((s) => s.error);

  const { initializeSherpa, startListening, stopListening } = useVoiceControl();

  // Keep the last config so the user can retry after an error
  const [lastConfig, setLastConfig] = useState<SherpaModelConfig | null>(null);

  const canListen = asrStatus === 'ready' || asrStatus === 'recording';

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
    } else {
      try {
        await startListening();
      } catch (err) {
        console.error('Failed to start microphone:', err);
      }
    }
  };

  const handleInit = async (config: SherpaModelConfig) => {
    setLastConfig(config);
    await initializeSherpa(config);
  };

  return (
    <>
      <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Voice Control</Typography>
          <Tooltip title="Configure ASR model">
            <IconButton size="small" onClick={() => setDialogOpen(true)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider />

        {/* Status row */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Chip
            label={STATUS_LABEL[asrStatus] ?? asrStatus}
            color={STATUS_COLOR[asrStatus] ?? 'default'}
            size="small"
            variant={asrStatus === 'recording' ? 'filled' : 'outlined'}
          />
          {asrStatus === 'idle' && (
            <Typography variant="caption" color="text.secondary">
              Click ⚙ to initialize Sherpa-ONNX
            </Typography>
          )}
        </Stack>

        {asrStatus === 'loading' && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Loading model…
              </Typography>
              <Typography variant="caption" color="warning.main" fontWeight="bold">
                {loadingProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant={loadingProgress > 0 ? 'determinate' : 'indeterminate'}
              value={loadingProgress}
              color="warning"
            />
          </Box>
        )}

        {asrStatus === 'error' && error && (
          <Alert
            severity="error"
            variant="outlined"
            action={
              lastConfig && (
                <Button
                  color="error"
                  size="small"
                  onClick={() => handleInit(lastConfig)}
                >
                  Retry
                </Button>
              )
            }
          >
            <AlertTitle>ASR initialization failed</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Mic button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Tooltip
            title={
              !canListen
                ? 'Initialize ASR first'
                : isListening
                ? 'Stop recording'
                : 'Start recording'
            }
          >
            <span>
              <IconButton
                disabled={!canListen}
                onClick={handleMicToggle}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: isListening ? 'error.dark' : 'primary.dark',
                  color: 'white',
                  border: isListening ? '2px solid' : 'none',
                  borderColor: 'error.main',
                  boxShadow: isListening
                    ? '0 0 20px rgba(229,57,53,0.5)'
                    : '0 0 10px rgba(0,118,190,0.3)',
                  '&:hover': {
                    bgcolor: isListening ? 'error.main' : 'primary.main',
                    boxShadow: isListening
                      ? '0 0 28px rgba(229,57,53,0.7)'
                      : '0 0 18px rgba(0,118,190,0.5)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.06)',
                    color: 'text.disabled',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {isListening ? <MicOffIcon sx={{ fontSize: 36 }} /> : <MicIcon sx={{ fontSize: 36 }} />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Typography variant="caption" align="center" color="text.secondary">
          {isListening ? 'Speak a command…' : 'Press the button to start'}
        </Typography>

        <Divider />

        {/* Live transcript */}
        <Typography variant="subtitle2" color="text.secondary">
          Live Transcript
        </Typography>
        <TextField
          multiline
          minRows={3}
          maxRows={5}
          value={currentTranscript}
          placeholder="Transcription will appear here…"
          InputProps={{ readOnly: true }}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              bgcolor: 'rgba(255,255,255,0.03)',
            },
          }}
        />

        {/* Voice command hints */}
        <Divider />
        <Typography variant="subtitle2" color="text.secondary">
          Example Commands
        </Typography>
        <Stack spacing={0.5}>
          {[
            '"set gain to 80"',
            '"zoom in" / "zoom out"',
            '"increase width by 10"',
            '"maximum gain"',
            '"reset zoom"',
          ].map((hint) => (
            <Typography key={hint} variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {hint}
            </Typography>
          ))}
        </Stack>
      </Paper>

      <AsrInitDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onInit={handleInit}
      />
    </>
  );
}
