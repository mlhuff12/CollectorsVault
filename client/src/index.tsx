import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { ColorModeProvider, useColorMode } from './contexts/ColorModeContext';

const Main: React.FC = () => {
  const { mode, primaryColor, secondaryColor } = useColorMode();
  const theme = useMemo(
    () => getTheme(mode, { primary: primaryColor, secondary: secondaryColor }),
    [mode, primaryColor, secondaryColor]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ColorModeProvider>
        <Main />
      </ColorModeProvider>
    </React.StrictMode>
  );
}
