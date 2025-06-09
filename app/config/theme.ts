import { createTheme, alpha } from '@mui/material/styles';

// Palette de couleurs moderne avec dégradés - Inspirée de l'image fournie
const colors = {
  // Couleur principale - Vert moderne (Primary de l'image)
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Vert principal de l'image
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  // Couleur secondaire - Violet moderne (Secondary de l'image)
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6', // Violet principal de l'image
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  
  // Info - Bleu cyan moderne (Info de l'image)
  info: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4', // Bleu cyan de l'image
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  
  // Success - Vert success moderne (Success de l'image)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Vert success de l'image
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Warning - Orange moderne (Warning de l'image)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f59e0b', // Orange warning de l'image
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Error - Rouge moderne (Error de l'image)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Rouge error de l'image
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Base neutre - Gris modernes (Grey de l'image)
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Dégradés modernes pour effets visuels
  gradients: {
    primary: `linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)`,
    secondary: `linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)`,
    info: `linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)`,
    success: `linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)`,
    warning: `linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)`,
    error: `linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)`,
    subtle: `linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)`,
    primaryLight: `linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)`,
    secondaryLight: `linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)`,
  },
  
  // Couleurs accent pour diversité
  accent: {
    primarySubtle: '#ecfdf5',
    secondarySubtle: '#f5f3ff',
    infoSubtle: '#ecfeff',
    successSubtle: '#f0fdf4',
    warningSubtle: '#fffbeb',
    errorSubtle: '#fef2f2',
  },
};

// Thème clair
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary[500], // Vert moderne principal
      light: colors.primary[400],
      dark: colors.primary[600],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary[500], // Violet moderne
      light: colors.secondary[400],
      dark: colors.secondary[600],
      contrastText: '#ffffff',
    },
    neutral: {
      main: colors.neutral[500],
      light: colors.neutral[300],
      dark: colors.neutral[700],
      contrastText: '#ffffff',
    },
    success: {
      main: colors.success[500],
      light: colors.success[400],
      dark: colors.success[600],
      contrastText: '#ffffff',
    },
    error: {
      main: colors.error[500],
      light: colors.error[400],
      dark: colors.error[600],
      contrastText: '#ffffff',
    },
    warning: {
      main: colors.warning[500],
      light: colors.warning[400],
      dark: colors.warning[600],
      contrastText: '#ffffff',
    },
    info: {
      main: colors.info[500],
      light: colors.info[400],
      dark: colors.info[600],
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: colors.neutral[50],
    },
    text: {
      primary: colors.neutral[700],
      secondary: colors.neutral[500],
      disabled: colors.neutral[400],
    },
    divider: colors.neutral[200],
    action: {
      active: colors.primary[500],
      hover: alpha(colors.primary[50], 0.8),
      selected: alpha(colors.primary[100], 0.6),
      disabled: colors.neutral[300],
      disabledBackground: colors.neutral[100],
    },
  },
  
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    
    // Échelle typographique harmonieuse
    h1: {
      fontSize: '3rem', // 48px
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      color: colors.neutral[900],
    },
    h2: {
      fontSize: '2.25rem', // 36px
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
      color: colors.neutral[900],
    },
    h3: {
      fontSize: '1.875rem', // 30px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.02em',
      color: colors.neutral[900],
    },
    h4: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: colors.neutral[900],
    },
    h5: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.5,
      color: colors.neutral[900],
    },
    h6: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.5,
      color: colors.neutral[900],
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
      color: colors.neutral[700],
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.6,
      color: colors.neutral[600],
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: colors.neutral[700],
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: colors.neutral[600],
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: colors.neutral[500],
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: colors.neutral[500],
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
  
  shape: {
    borderRadius: 12,
  },
  
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.05)',
    '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
    '0px 4px 6px rgba(0, 0, 0, 0.07), 0px 2px 4px rgba(0, 0, 0, 0.06)',
    '0px 10px 15px rgba(0, 0, 0, 0.1), 0px 4px 6px rgba(0, 0, 0, 0.05)',
    '0px 20px 25px rgba(0, 0, 0, 0.1), 0px 10px 10px rgba(0, 0, 0, 0.04)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px rgba(0, 0, 0, 0.25)',
  ],
  
  components: {
    // Configuration globale
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          backgroundColor: colors.neutral[50],
          fontFeatureSettings: '"cv03", "cv04", "cv11"',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: colors.neutral[100],
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: colors.neutral[300],
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: colors.neutral[400],
          },
        },
      },
    },
    
    // Boutons avec dégradés modernes
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          background: colors.gradients.primary, // Dégradé vert moderne
          color: '#ffffff',
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 50%, ${colors.primary[800]} 100%)`,
            boxShadow: `0 8px 25px ${alpha(colors.primary[500], 0.4)}`,
          },
          '&.MuiButton-containedSecondary': {
            background: colors.gradients.secondary, // Dégradé violet moderne
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.secondary[600]} 0%, ${colors.secondary[700]} 50%, ${colors.secondary[800]} 100%)`,
              boxShadow: `0 8px 25px ${alpha(colors.secondary[500], 0.4)}`,
            },
          },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: colors.primary[300],
          color: colors.primary[600],
          background: colors.gradients.subtle,
          '&:hover': {
            borderColor: colors.primary[400],
            background: colors.gradients.subtle,
            color: colors.primary[700],
          },
        },
        text: {
          color: colors.neutral[600],
          '&:hover': {
            background: colors.gradients.subtle,
            color: colors.primary[600],
          },
        },
      },
    },
    
    // Cartes avec dégradés subtils et couleurs modernes
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colors.neutral[200]}`,
          background: colors.gradients.subtle,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
            borderColor: colors.neutral[300],
          },
          // Cartes avec thèmes colorés modernes
          '&.card-primary': {
            background: colors.gradients.primaryLight,
            borderColor: colors.primary[200],
            '&:hover': {
              borderColor: colors.primary[300],
              boxShadow: `0 12px 40px ${alpha(colors.primary[500], 0.2)}`,
            },
          },
          '&.card-secondary': {
            background: colors.gradients.secondaryLight,
            borderColor: colors.secondary[200],
            '&:hover': {
              borderColor: colors.secondary[300],
              boxShadow: `0 12px 40px ${alpha(colors.secondary[500], 0.2)}`,
            },
          },
          '&.card-success': {
            background: `linear-gradient(135deg, ${colors.success[50]} 0%, ${colors.success[100]} 100%)`,
            borderColor: colors.success[200],
            '&:hover': {
              borderColor: colors.success[300],
              boxShadow: `0 12px 40px ${alpha(colors.success[500], 0.2)}`,
            },
          },
          '&.card-warning': {
            background: `linear-gradient(135deg, ${colors.warning[50]} 0%, ${colors.warning[100]} 100%)`,
            borderColor: colors.warning[200],
            '&:hover': {
              borderColor: colors.warning[300],
              boxShadow: `0 12px 40px ${alpha(colors.warning[500], 0.2)}`,
            },
          },
          '&.card-error': {
            background: `linear-gradient(135deg, ${colors.error[50]} 0%, ${colors.error[100]} 100%)`,
            borderColor: colors.error[200],
            '&:hover': {
              borderColor: colors.error[300],
              boxShadow: `0 12px 40px ${alpha(colors.error[500], 0.2)}`,
            },
          },
          '&.card-info': {
            background: `linear-gradient(135deg, ${colors.info[50]} 0%, ${colors.info[100]} 100%)`,
            borderColor: colors.info[200],
            '&:hover': {
              borderColor: colors.info[300],
              boxShadow: `0 12px 40px ${alpha(colors.info[500], 0.2)}`,
            },
          },
        },
      },
    },
    
    // Champs de texte modernes
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
          borderRadius: 12,
            background: colors.gradients.subtle,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.neutral[400],
              },
            },
            '&.Mui-focused': {
              background: colors.gradients.subtle,
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
                borderColor: colors.primary[500],
                boxShadow: `0 0 0 3px ${alpha(colors.primary[500], 0.1)}`,
              },
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
            color: colors.neutral[600],
            '&.Mui-focused': {
              color: colors.primary[600],
            },
          },
        },
      },
    },
    
    // Papier
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${colors.neutral[200]}`,
          backgroundColor: '#ffffff',
        },
        elevation1: {
          boxShadow: 'none',
        },
        elevation2: {
          boxShadow: 'none',
        },
        elevation3: {
          boxShadow: 'none',
        },
      },
    },
    
    // Chips avec dégradés colorés
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
          fontSize: '0.8125rem',
          transition: 'all 0.2s ease',
        },
        filled: {
          '&.MuiChip-colorDefault': {
            background: colors.gradients.subtle,
            color: colors.neutral[700],
          },
          '&.MuiChip-colorPrimary': {
            background: colors.gradients.primaryLight,
            color: colors.primary[700],
            border: `1px solid ${colors.primary[200]}`,
          },
          '&.MuiChip-colorSecondary': {
            background: colors.gradients.secondaryLight,
            color: colors.secondary[700],
            border: `1px solid ${colors.secondary[200]}`,
          },
          '&.MuiChip-colorSuccess': {
            background: `linear-gradient(135deg, ${colors.success[100]} 0%, ${colors.success[200]} 100%)`,
            color: colors.success[700],
            border: `1px solid ${colors.success[200]}`,
          },
          '&.MuiChip-colorError': {
            background: `linear-gradient(135deg, ${colors.error[100]} 0%, ${colors.error[200]} 100%)`,
            color: colors.error[700],
            border: `1px solid ${colors.error[200]}`,
          },
          '&.MuiChip-colorWarning': {
            background: `linear-gradient(135deg, ${colors.warning[100]} 0%, ${colors.warning[200]} 100%)`,
            color: colors.warning[700],
            border: `1px solid ${colors.warning[200]}`,
          },
          '&.MuiChip-colorInfo': {
            background: `linear-gradient(135deg, ${colors.info[100]} 0%, ${colors.info[200]} 100%)`,
            color: colors.info[700],
            border: `1px solid ${colors.info[200]}`,
          },
        },
      },
    },
    
    // Alertes
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: '1px solid',
          '&.MuiAlert-standardSuccess': {
            backgroundColor: colors.success[50],
            borderColor: colors.success[200],
            color: colors.success[700],
          },
          '&.MuiAlert-standardError': {
            backgroundColor: colors.error[50],
            borderColor: colors.error[200],
            color: colors.error[700],
          },
          '&.MuiAlert-standardWarning': {
            backgroundColor: colors.warning[50],
            borderColor: colors.warning[200],
            color: colors.warning[700],
          },
          '&.MuiAlert-standardInfo': {
            backgroundColor: colors.info[50],
            borderColor: colors.info[200],
            color: colors.info[700],
          },
        },
      },
    },
    
    // Dialogues
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    
    // Menus
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 6,
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    
    // Tooltips clairs et harmonisés
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#fff',
          color: colors.neutral[800],
          fontSize: '0.95rem',
          fontWeight: 400,
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: `1px solid ${colors.neutral[200]}`,
          padding: '12px 16px',
          maxWidth: 340,
          lineHeight: 1.6,
        },
        arrow: {
          color: '#fff',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))',
        },
      },
    },
    
    // Tabs
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            height: 2,
            backgroundColor: colors.neutral[600],
          },
        },
      },
    },
    
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 400,
          fontSize: '0.875rem',
          minHeight: 40,
          color: colors.neutral[600],
          '&.Mui-selected': {
            fontWeight: 500,
            color: colors.neutral[800],
          },
        },
      },
    },
  },
});

// Thème sombre
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary[400],
      light: colors.primary[300],
      dark: colors.primary[500],
      contrastText: colors.neutral[900],
    },
    secondary: {
      main: colors.secondary[400],
      light: colors.secondary[300],
      dark: colors.secondary[500],
      contrastText: colors.neutral[900],
    },
    neutral: {
      main: colors.neutral[400],
      light: colors.neutral[300],
      dark: colors.neutral[600],
      contrastText: colors.neutral[100],
    },
    success: {
      main: colors.success[400],
      light: colors.success[300],
      dark: colors.success[500],
      contrastText: colors.neutral[900],
    },
    error: {
      main: colors.error[400],
      light: colors.error[300],
      dark: colors.error[500],
      contrastText: colors.neutral[900],
    },
    warning: {
      main: colors.warning[400],
      light: colors.warning[300],
      dark: colors.warning[500],
      contrastText: colors.neutral[900],
    },
    info: {
      main: colors.info[400],
      light: colors.info[300],
      dark: colors.info[500],
      contrastText: colors.neutral[900],
    },
    background: {
      default: colors.neutral[900],
      paper: colors.neutral[800],
    },
    text: {
      primary: colors.neutral[100],
      secondary: colors.neutral[300],
      disabled: colors.neutral[500],
    },
    divider: colors.neutral[700],
    action: {
      active: colors.neutral[300],
      hover: alpha(colors.neutral[400], 0.08),
      selected: alpha(colors.primary[400], 0.12),
      disabled: colors.neutral[600],
      disabledBackground: colors.neutral[700],
    },
  },
  
  typography: lightTheme.typography,
  shape: lightTheme.shape,
  shadows: lightTheme.shadows,
  
  components: {
    ...lightTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          backgroundColor: colors.neutral[900],
          fontFeatureSettings: '"cv03", "cv04", "cv11"',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: colors.neutral[800],
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: colors.neutral[600],
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: colors.neutral[500],
          },
        },
      },
    },
  },
});

export { lightTheme, darkTheme, colors };
export default lightTheme; 


