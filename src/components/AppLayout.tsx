import { Box, Toolbar, AppBar, Typography, Chip, Tooltip, useTheme } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useImageStore } from '../store/imageStore';

const LLM_PROVIDER = ((import.meta.env.VITE_LLM_PROVIDER as string | undefined) ?? 'ollama').toLowerCase();
const LLM_MODEL = LLM_PROVIDER === 'foundry'
  ? ((import.meta.env.VITE_FOUNDRY_MODEL as string | undefined) ?? 'unknown')
  : ((import.meta.env.VITE_OLLAMA_MODEL as string | undefined) ?? 'unknown');

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  const theme = useTheme();
  const llmAvailable = useImageStore((s) => s.llmAvailable);
  const asrStatus = useImageStore((s) => s.asrStatus);

  const asrColor: 'default' | 'success' | 'warning' | 'error' = (() => {
    switch (asrStatus) {
      case 'ready':
      case 'recording':
        return 'success';
      case 'loading':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  })();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Toolbar variant="dense" sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Local Voice Control
          </Typography>

          <Tooltip title={`ASR: ${asrStatus}`}>
            <Chip
              icon={<MicIcon />}
              label={`ASR: ${asrStatus}`}
              size="small"
              color={asrColor}
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title={llmAvailable ? `${LLM_PROVIDER} reachable · ${LLM_MODEL}` : `${LLM_PROVIDER} not reachable – using fallback parser · ${LLM_MODEL}`}>
            <Chip
              icon={<SmartToyIcon />}
              label={llmAvailable ? `${LLM_PROVIDER}: online · ${LLM_MODEL}` : `${LLM_PROVIDER}: offline`}
              size="small"
              color={llmAvailable ? 'success' : 'warning'}
              variant="outlined"
            />
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
