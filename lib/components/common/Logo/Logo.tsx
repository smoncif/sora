import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

interface LogoProps {
  variant?: 'header' | 'mobile' | 'auth';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

/**
 * 🎨 Composant Logo SORA simple en mode texte
 * Version simplifiée sans icône complexe
 */
export const Logo: React.FC<LogoProps> = ({ 
  variant = 'header', 
  size = 'medium',
  onClick 
}) => {
  const theme = useTheme();
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/');
    }
  };

  // Configuration des tailles selon le variant
  const sizeConfig = {
    small: { fontSize: '1.2rem' },
    medium: { fontSize: variant === 'auth' ? '2.5rem' : '1.8rem' },
    large: { fontSize: '3rem' }
  };

  const config = sizeConfig[size];

  // Couleurs selon le variant
  const getColors = () => {
    switch (variant) {
      case 'header':
        return {
          primary: '#ffffff',
          secondary: alpha('#ffffff', 0.9)
        };
      case 'mobile':
        return {
          primary: theme.palette.primary.main,
          secondary: alpha(theme.palette.primary.main, 0.8)
        };
      case 'auth':
        return {
          primary: theme.palette.primary.main,
          secondary: alpha(theme.palette.primary.main, 0.8)
        };
      default:
        return {
          primary: theme.palette.primary.main,
          secondary: alpha(theme.palette.primary.main, 0.8)
        };
    }
  };

  const colors = getColors();

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover .logo-text': {
          opacity: 0.85,
        }
      }}
    >
      <Typography
        className="logo-text"
        variant="h4"
        component="div"
        sx={{
          fontWeight: 700,
          fontSize: config.fontSize,
          letterSpacing: '0.05em',
          fontFamily: '"Inter", "Roboto", sans-serif',
          transition: 'all 0.3s ease',
          ...(variant === 'header'
            ? {
                color: '#fff',
                background: 'none',
                WebkitTextFillColor: '#fff',
              }
            : {
                background: 'linear-gradient(90deg, #00C3FF 0%, #7D5FFF 40%, #FF61A6 70%, #FFB347 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
              }
          )
        }}
      >
        SORA
      </Typography>

      {/* 💼 Sous-titre pour la version auth */}
      {variant === 'auth' && (
        <Box sx={{ ml: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: alpha(theme.palette.primary.main, 0.7),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            SAP Optimal
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: alpha(theme.palette.primary.main, 0.7),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Role Analyzer
          </Typography>
        </Box>
      )}
    </Box>
  );
}; 