import { Grid } from '@mui/material';
import { AppLayout } from './components/AppLayout';
import { ImageParametersPanel } from './components/ImageParametersPanel';
import { ImagePreview } from './components/ImagePreview';
import { VoiceControlPanel } from './components/VoiceControlPanel';
import { CommandLog } from './components/CommandLog';

export default function App() {
  return (
    <AppLayout>
      {/*
       * Layout:
       *  ┌──────────────┬──────────────────────┬──────────────────┐
       *  │  Parameters  │    Image Preview      │  Voice Control   │
       *  │   (sliders)  │                       │  + Command Log   │
       *  └──────────────┴──────────────────────┴──────────────────┘
       */}
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Left column – image parameter sliders */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <ImageParametersPanel />
        </Grid>

        {/* Center column – image preview */}
        <Grid item xs={12} md={5} sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ImagePreview />
        </Grid>

        {/* Right column – voice control + command log */}
        <Grid item xs={12} md={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Voice control takes ~60% of right column */}
          <Grid container direction="column" spacing={2} sx={{ flex: 1 }}>
            <Grid item sx={{ flex: '0 0 auto' }}>
              <VoiceControlPanel />
            </Grid>
            <Grid item sx={{ flex: 1, minHeight: 0 }}>
              <CommandLog />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </AppLayout>
  );
}
