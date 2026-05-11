import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Link,
} from '@mui/material';
import type { SherpaModelConfig } from '../types';

const DEFAULT_CONFIG: SherpaModelConfig = {
  sherpaBaseUrl: (import.meta.env.VITE_SHERPA_BASE_URL as string | undefined) ?? '/sherpa-onnx/',
  sampleRate: Number(import.meta.env.VITE_ASR_SAMPLE_RATE ?? 16000),
};

interface Props {
  open: boolean;
  onClose: () => void;
  onInit: (config: SherpaModelConfig) => Promise<void>;
}

export function AsrInitDialog({ open, onClose, onInit }: Props) {
  const [config, setConfig] = useState<SherpaModelConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onInit(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Initialize Sherpa-ONNX ASR</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" variant="outlined">
            Files already downloaded to <code>public/sherpa-onnx/</code> via{' '}
            <code>scripts/setup.ps1</code>.{' '}
            <Link
              href="https://github.com/k2-fsa/sherpa-onnx/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Releases
            </Link>
          </Alert>

          <TextField
            label="Sherpa-ONNX Base URL"
            helperText="Directory containing sherpa-onnx-asr.js, .wasm, and .data files"
            value={config.sherpaBaseUrl}
            onChange={(e) => setConfig((p) => ({ ...p, sherpaBaseUrl: e.target.value }))}
            size="small"
            fullWidth
          />

          <TextField
            label="Sample Rate (Hz)"
            type="number"
            value={config.sampleRate}
            onChange={(e) => setConfig((p) => ({ ...p, sampleRate: Number(e.target.value) }))}
            size="small"
            sx={{ width: 180 }}
          />

          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleInit} variant="contained" disabled={loading}>
          {loading ? 'Loading model…' : 'Initialize'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
