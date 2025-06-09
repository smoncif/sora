import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: PaletteColor;
  }
  
  interface PaletteOptions {
    neutral?: PaletteColorOptions;
  }
  
  interface TypeText {
    primary: string;
    secondary: string;
    disabled: string;
  }
  
  interface TypeAction {
    active: string;
    hover: string;
    selected: string;
    disabled: string;
    disabledBackground: string;
  }
}

// Extension pour les couleurs personnalisées
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    neutral: true;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    neutral: true;
  }
}

declare module '@mui/material/IconButton' {
  interface IconButtonPropsColorOverrides {
    neutral: true;
  }
}

declare module '@mui/material/SvgIcon' {
  interface SvgIconPropsColorOverrides {
    neutral: true;
  }
} 
