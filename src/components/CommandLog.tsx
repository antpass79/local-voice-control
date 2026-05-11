import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useImageStore } from '../store/imageStore';
import type { CommandLogEntry } from '../types';

function LogItem({ entry }: { entry: CommandLogEntry }) {
  const time = entry.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        bgcolor: entry.applied
          ? 'rgba(67,160,71,0.07)'
          : 'rgba(229,57,53,0.07)',
        border: '1px solid',
        borderColor: entry.applied
          ? 'rgba(67,160,71,0.2)'
          : 'rgba(229,57,53,0.2)',
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        {entry.applied ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main', mt: 0.25 }} />
        ) : (
          <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.25 }} />
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            "{entry.transcript}"
          </Typography>

          {entry.command && (
            <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
              <Chip
                label={entry.command.parameter}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
              <Chip
                label={entry.command.action}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
              <Chip
                label={entry.command.value}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            </Stack>
          )}

          {entry.error && (
            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.25 }}>
              {entry.error}
            </Typography>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', pt: 0.1 }}>
          {time}
        </Typography>
      </Stack>
    </Box>
  );
}

export function CommandLog() {
  const commandLog = useImageStore((s) => s.commandLog);
  const clearLog = useImageStore((s) => s.clearLog);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="h6">Command Log</Typography>
        <Tooltip title="Clear log">
          <span>
            <IconButton
              size="small"
              onClick={clearLog}
              disabled={commandLog.length === 0}
            >
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {commandLog.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No commands yet
          </Typography>
        ) : (
          commandLog.map((entry) => <LogItem key={entry.id} entry={entry} />)
        )}
      </Box>
    </Paper>
  );
}
