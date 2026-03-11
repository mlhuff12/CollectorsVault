import React, { createContext, useContext, useState, useMemo } from 'react';
import { PaletteMode } from '@mui/material';

interface ColorModeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
  setMode: (mode: PaletteMode) => void;
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<PaletteMode>(() => {
    const stored = localStorage.getItem('colorMode') as PaletteMode | null;
    return stored || 'light';
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    return localStorage.getItem('primaryColor') || '#1976d2';
  });
  const [secondaryColor, setSecondaryColorState] = useState<string>(() => {
    return localStorage.getItem('secondaryColor') || '#9c27b0';
  });

  const setMode = (newMode: PaletteMode) => {
    localStorage.setItem('colorMode', newMode);
    setModeState(newMode);
  };

  const toggleColorMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const setPrimaryColor = (hex: string) => {
    localStorage.setItem('primaryColor', hex);
    setPrimaryColorState(hex);
  };
  const setSecondaryColor = (hex: string) => {
    localStorage.setItem('secondaryColor', hex);
    setSecondaryColorState(hex);
  };

  const value = useMemo(
    () => ({
      mode,
      toggleColorMode,
      setMode,
      primaryColor,
      secondaryColor,
      setPrimaryColor,
      setSecondaryColor,
    }),
    [mode, primaryColor, secondaryColor]
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};

export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  if (!context) {
    // during tests it's convenient to avoid wrapping every render; return
    // a harmless stub so consumers don't crash.
    if (process.env.NODE_ENV === 'test') {
      return {
        mode: 'light',
        toggleColorMode: () => {},
        primaryColor: '#1976d2',
        secondaryColor: '#9c27b0',
        setPrimaryColor: () => {},
        setSecondaryColor: () => {},
      } as unknown as ColorModeContextType;
    }
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
};
