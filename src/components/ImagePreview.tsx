import { useRef, useEffect, useCallback } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useImageStore } from '../store/imageStore';

const CANVAS_W = 600;
const CANVAS_H = 380;

/** Pre-generate a synthetic tissue-like grayscale pattern */
function buildBasePattern(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (w * 0.4);
      const dy = (y - cy) / (h * 0.35);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Radial gradient base (bright center, dark edges)
      const radial = Math.max(0, 1 - dist) * 180;

      // Add wave-like structures (simulate tissue layers)
      const wave1 = Math.sin(y * 0.05 + x * 0.03) * 20;
      const wave2 = Math.cos(x * 0.04 - y * 0.06) * 15;
      const speckle = ((Math.sin(x * 7.3) * Math.cos(y * 5.9) + 1) / 2) * 25;

      let v = Math.max(0, Math.min(255, radial + wave1 + wave2 + speckle));

      // Add an inner ellipse ("organ" outline)
      const innerDist = Math.sqrt(
        ((x - cx) / (w * 0.22)) ** 2 + ((y - cy) / (h * 0.18)) ** 2
      );
      if (innerDist < 1) {
        v = Math.min(255, v + 40);
      }
      if (Math.abs(innerDist - 1) < 0.05) {
        v = Math.min(255, v + 60);
      }

      const i = (y * w + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, w, h);
}

export function ImagePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const basePatternRef = useRef<ImageData | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const gain = useImageStore((s) => s.params.gain);
  const width = useImageStore((s) => s.params.width);
  const zoom = useImageStore((s) => s.params.zoom);

  // Build base pattern once
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const pattern = buildBasePattern(CANVAS_W, CANVAS_H);
    offscreen.getContext('2d')!.putImageData(pattern, 0, 0);
    basePatternRef.current = pattern;
    offscreenRef.current = offscreen;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gainFactor = gain / 100;
    const widthFactor = width / 100;

    // Apply zoom and width transform
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom * widthFactor, zoom);
    ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);

    // Apply gain as global alpha (0 = black, 1 = full brightness)
    ctx.globalAlpha = Math.max(0.05, gainFactor);
    ctx.drawImage(offscreen, 0, 0);
    ctx.globalAlpha = 1;

    ctx.restore();

    // Depth markers on right edge
    ctx.fillStyle = 'rgba(0,180,160,0.7)';
    ctx.font = '11px monospace';
    for (let i = 0; i <= 5; i++) {
      const y = (canvas.height / 5) * i;
      ctx.fillText(`${i * 2} cm`, canvas.width - 38, y + 12);
      ctx.fillStyle = 'rgba(0,180,160,0.3)';
      ctx.fillRect(canvas.width - 46, y, 4, 1);
      ctx.fillStyle = 'rgba(0,180,160,0.7)';
    }

    // Status overlay
    ctx.fillStyle = 'rgba(0,118,190,0.8)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`G:${gain}  W:${width}%  Z:${zoom.toFixed(1)}x`, 8, canvas.height - 8);
  }, [gain, width, zoom]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <Paper
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        height: '100%',
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" alignSelf="flex-start">
        Image Preview
      </Typography>
      <Box
        component="canvas"
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        sx={{
          border: '1px solid rgba(0,118,190,0.3)',
          borderRadius: 1,
          maxWidth: '100%',
          height: 'auto',
          bgcolor: '#000',
        }}
      />
    </Paper>
  );
}
