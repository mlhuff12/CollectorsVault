import { createTheme, PaletteMode } from '@mui/material/styles';

// generate design tokens based on light/dark mode and optional custom colours
interface CustomPalette {
  primary?: string;
  secondary?: string;
}

export const getDesignTokens = (mode: PaletteMode, custom?: CustomPalette) => ({
  palette: {
    mode,
    primary: {
      main: custom?.primary || '#1976d2', // neutral blue default
    },
    secondary: {
      main: custom?.secondary || '#9c27b0',
    },
  },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  },
});

export const getTheme = (mode: PaletteMode, custom?: CustomPalette) =>
  createTheme(getDesignTokens(mode, custom));
