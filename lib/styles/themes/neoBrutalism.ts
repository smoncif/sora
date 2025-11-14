/**
 * Neo-Brutalism Theme for Role Analysis
 * Inspired by: Terminal aesthetics + Modern data visualization
 * Typography: JetBrains Mono + IBM Plex Sans
 */

import { createTheme, alpha } from '@mui/material/styles';

// Color tokens
const colors = {
  primary: '#FF6B35',      // Orange vif - accent énergique
  secondary: '#004E89',    // Bleu profond - confiance
  accent: '#F7B801',       // Jaune doré - highlights
  dark: '#1A1A2E',         // Noir bleuté - fond sombre
  light: '#F5F5F5',        // Gris très clair - fond clair
  success: '#06D6A0',      // Vert cyan - succès
  warning: '#EF476F',      // Rose vif - attention
  info: '#00A8E8',         // Bleu clair - information
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #FF6B35 0%, #F7B801 100%)',
    secondary: 'linear-gradient(135deg, #004E89 0%, #00A8E8 100%)',
    success: 'linear-gradient(135deg, #06D6A0 0%, #00D9A5 100%)',
    warning: 'linear-gradient(135deg, #EF476F 0%, #FF6B9D 100%)',
    dark: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
  },
  
  // Shadows (hard, no blur)
  shadows: {
    small: '2px 2px 0px rgba(0, 0, 0, 0.25)',
    medium: '4px 4px 0px rgba(0, 0, 0, 0.25)',
    large: '6px 6px 0px rgba(0, 0, 0, 0.25)',
    colored: {
      primary: '4px 4px 0px rgba(255, 107, 53, 0.3)',
      secondary: '4px 4px 0px rgba(0, 78, 137, 0.3)',
      success: '4px 4px 0px rgba(6, 214, 160, 0.3)',
    }
  }
};

// Typography setup
const typography = {
  fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  monoFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
  
  h1: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '3.5rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  h2: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  h3: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '2rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  h4: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
  button: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none' as const,
    letterSpacing: '0.02em',
  },
  caption: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '0.75rem',
    lineHeight: 1.5,
  },
  overline: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
};

// Create light theme
export const neoBrutalismLightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: alpha(colors.primary, 0.8),
      dark: '#E55A2A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.secondary,
      light: alpha(colors.secondary, 0.8),
      dark: '#003A6B',
      contrastText: '#FFFFFF',
    },
    success: {
      main: colors.success,
      light: alpha(colors.success, 0.8),
      dark: '#05B88A',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: colors.warning,
      light: alpha(colors.warning, 0.8),
      dark: '#D63D5F',
      contrastText: '#FFFFFF',
    },
    info: {
      main: colors.info,
      light: alpha(colors.info, 0.8),
      dark: '#0090C8',
      contrastText: '#FFFFFF',
    },
    error: {
      main: colors.warning,
      light: alpha(colors.warning, 0.8),
      dark: '#D63D5F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: colors.light,
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F0F0F',
      secondary: '#666666',
      disabled: '#999999',
    },
    divider: alpha('#0F0F0F', 0.12),
  },
  typography,
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    colors.shadows.small,
    colors.shadows.small,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          border: '3px solid #0F0F0F',
          boxShadow: colors.shadows.small,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: colors.shadows.medium,
          },
          '&:active': {
            transform: 'translate(0px, 0px)',
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: colors.shadows.medium,
          },
        },
        outlined: {
          borderWidth: '3px',
          '&:hover': {
            borderWidth: '3px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '3px solid #0F0F0F',
          boxShadow: colors.shadows.medium,
          borderRadius: 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translate(-2px, -4px)',
            boxShadow: colors.shadows.large,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: colors.shadows.small,
        },
        elevation2: {
          boxShadow: colors.shadows.medium,
        },
        elevation3: {
          boxShadow: colors.shadows.large,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          border: '2px solid #0F0F0F',
          fontWeight: 600,
          fontFamily: '"IBM Plex Sans", sans-serif',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderWidth: '3px',
              borderColor: '#0F0F0F',
            },
            '&:hover fieldset': {
              borderWidth: '3px',
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderWidth: '3px',
              borderColor: colors.primary,
            },
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 8,
        },
        thumb: {
          width: 24,
          height: 24,
          border: '3px solid #0F0F0F',
          boxShadow: colors.shadows.small,
          '&:hover': {
            boxShadow: colors.shadows.medium,
          },
        },
        track: {
          height: 8,
          border: '2px solid #0F0F0F',
        },
        rail: {
          height: 8,
          border: '2px solid #0F0F0F',
          opacity: 1,
          backgroundColor: '#E0E0E0',
        },
      },
    },
  },
});

// Create dark theme
export const neoBrutalismDarkTheme = createTheme({
  ...neoBrutalismLightTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary,
      light: alpha(colors.primary, 0.8),
      dark: '#E55A2A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00A8E8',
      light: alpha('#00A8E8', 0.8),
      dark: colors.secondary,
      contrastText: '#FFFFFF',
    },
    success: {
      main: colors.success,
      light: alpha(colors.success, 0.8),
      dark: '#05B88A',
      contrastText: '#0F0F0F',
    },
    warning: {
      main: colors.warning,
      light: alpha(colors.warning, 0.8),
      dark: '#D63D5F',
      contrastText: '#FFFFFF',
    },
    info: {
      main: colors.info,
      light: alpha(colors.info, 0.8),
      dark: '#0090C8',
      contrastText: '#FFFFFF',
    },
    error: {
      main: colors.warning,
      light: alpha(colors.warning, 0.8),
      dark: '#D63D5F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: colors.dark,
      paper: '#16213E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#AAAAAA',
      disabled: '#666666',
    },
    divider: alpha('#FFFFFF', 0.12),
  },
  components: {
    ...neoBrutalismLightTheme.components,
    MuiButton: {
      styleOverrides: {
        root: {
          ...neoBrutalismLightTheme.components?.MuiButton?.styleOverrides?.root,
          border: '3px solid #FFFFFF',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          ...neoBrutalismLightTheme.components?.MuiCard?.styleOverrides?.root,
          border: '3px solid #FFFFFF',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          ...neoBrutalismLightTheme.components?.MuiChip?.styleOverrides?.root,
          border: '2px solid #FFFFFF',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderWidth: '3px',
              borderColor: '#FFFFFF',
            },
            '&:hover fieldset': {
              borderWidth: '3px',
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderWidth: '3px',
              borderColor: colors.primary,
            },
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          ...neoBrutalismLightTheme.components?.MuiSlider?.styleOverrides?.root,
        },
        thumb: {
          ...neoBrutalismLightTheme.components?.MuiSlider?.styleOverrides?.thumb,
          border: '3px solid #FFFFFF',
        },
        track: {
          ...neoBrutalismLightTheme.components?.MuiSlider?.styleOverrides?.track,
          border: '2px solid #FFFFFF',
        },
        rail: {
          ...neoBrutalismLightTheme.components?.MuiSlider?.styleOverrides?.rail,
          border: '2px solid #FFFFFF',
          backgroundColor: '#2A2A3E',
        },
      },
    },
  },
});

// Export colors and utilities
export { colors };

// Helper function to get theme based on mode
export const getNeoBrutalismTheme = (mode: 'light' | 'dark') => {
  return mode === 'dark' ? neoBrutalismDarkTheme : neoBrutalismLightTheme;
};

