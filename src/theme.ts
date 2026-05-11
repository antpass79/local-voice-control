import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0076BE',
      light: '#4DA6E0',
      dark: '#005A8E',
    },
    secondary: {
      main: '#00B5AD',
    },
    error: {
      main: '#E53935',
    },
    success: {
      main: '#43A047',
    },
    warning: {
      main: '#FB8C00',
    },
    background: {
      default: '#0A0E1A',
      paper: '#141824',
    },
    text: {
      primary: '#E8EAF0',
      secondary: '#9CA3AF',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: '#0076BE' },
        thumb: {
          boxShadow: '0 0 0 4px rgba(0,118,190,0.16)',
          '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 0 0 6px rgba(0,118,190,0.24)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});
