import { useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Stack,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useImageStore } from '../store/imageStore';
import { IMAGE_PARAM_LIMITS } from '../types';
import type { ImageParamKey } from '../types';

const PARAM_LABELS: Record<ImageParamKey, string> = {
  gain: 'Gain',
  width: 'Width',
  zoom: 'Zoom',
};

const PARAM_ICONS: Record<ImageParamKey, string> = {
  gain: '☀',
  width: '↔',
  zoom: '🔍',
};

function ParamSlider({ paramKey }: { paramKey: ImageParamKey }) {
  const value = useImageStore((s) => s.params[paramKey]);
  const setParam = useImageStore((s) => s.setParam);
  const limits = IMAGE_PARAM_LIMITS[paramKey];

  const handleChange = useCallback(
    (_: Event, newValue: number | number[]) => {
      setParam(paramKey, newValue as number);
    },
    [paramKey, setParam]
  );

  const displayValue =
    paramKey === 'zoom'
      ? `${value.toFixed(1)}${limits.unit}`
      : `${value}${limits.unit}`;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ fontSize: '1rem' }}>
            {PARAM_ICONS[paramKey]}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {PARAM_LABELS[paramKey]}
          </Typography>
        </Stack>
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: 'monospace',
            bgcolor: 'rgba(0,118,190,0.12)',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            minWidth: 52,
            textAlign: 'center',
          }}
        >
          {displayValue}
        </Typography>
      </Stack>

      <Slider
        value={value}
        min={limits.min}
        max={limits.max}
        step={limits.step}
        onChange={handleChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) =>
          paramKey === 'zoom' ? `${(v as number).toFixed(1)}x` : `${v}${limits.unit}`
        }
        marks={[
          { value: limits.min, label: `${limits.min}` },
          { value: limits.max, label: `${limits.max}${limits.unit}` },
        ]}
        sx={{ mx: 0.5 }}
      />
    </Box>
  );
}

export function ImageParametersPanel() {
  const resetParams = useImageStore((s) => s.resetParams);

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Image Parameters</Typography>
        <Tooltip title="Reset to defaults">
          <IconButton onClick={resetParams} size="small" color="primary">
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={4}>
        {(['gain', 'width', 'zoom'] as ImageParamKey[]).map((key) => (
          <ParamSlider key={key} paramKey={key} />
        ))}
      </Stack>
    </Paper>
  );
}
