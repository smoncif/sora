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
 * 🎨 Composant Logo SORA moderne et élégant
 * Conçu pour être utilisé dans différents contextes (header, mobile, auth)
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
    small: { fontSize: '1.2rem', iconSize: 20 },
    medium: { fontSize: variant === 'auth' ? '2.5rem' : '1.8rem', iconSize: variant === 'auth' ? 32 : 24 },
    large: { fontSize: '3rem', iconSize: 40 }
  };

  const config = sizeConfig[size];

  // Couleurs selon le variant
  const getColors = () => {
    switch (variant) {
      case 'header':
        return {
          primary: '#ffffff',
          secondary: alpha('#ffffff', 0.9),
          gradient: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.95) 100%)'
        };
      case 'mobile':
        return {
          primary: theme.palette.primary.main,
          secondary: alpha(theme.palette.primary.main, 0.8),
          gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
        };
      case 'auth':
        return {
          primary: theme.palette.primary.main,
          secondary: alpha(theme.palette.primary.main, 0.8),
          gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
        };
      default:
        return {
          primary: theme.palette.primary.main,
          secondary: alpha(theme.palette.primary.main, 0.8),
          gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
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
        gap: variant === 'auth' ? 2 : 1.5,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: variant === 'auth' ? 'scale(1.02)' : 'translateY(-1px)',
          '& .logo-icon': {
            transform: 'rotate(180deg) scale(1.1)',
          },
          '& .logo-text': {
            background: colors.gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }
        }
      }}
    >
      {/* 🔸 Icône moderne - Représente l'analyse et l'optimisation */}
      <Box
        className="logo-icon"
        sx={{
          width: config.iconSize,
          height: config.iconSize,
          borderRadius: '6px',
          background: variant === 'header' 
            ? `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)`
            : colors.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: variant === 'auth' 
            ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`
            : `0 2px 8px ${alpha('#000000', 0.1)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '20%',
            left: '20%',
            width: '60%',
            height: '60%',
            borderRadius: '2px',
            background: variant === 'header' 
              ? alpha('#000000', 0.6)
              : '#ffffff',
            opacity: 0.9,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '35%',
            left: '35%',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: variant === 'header' 
              ? alpha('#000000', 0.8)
              : alpha('#ffffff', 0.8),
          }
        }}
      />

      {/* 📝 Texte SORA stylisé */}
      <Typography
        className="logo-text"
        variant="h4"
        component="div"
        sx={{
          fontWeight: 800,
          fontSize: config.fontSize,
          color: colors.primary,
          letterSpacing: variant === 'auth' ? '0.1em' : '0.05em',
          fontFamily: '"Inter", "Roboto", sans-serif',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          textShadow: variant === 'auth' 
            ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`
            : variant === 'header' 
              ? `0 1px 3px ${alpha('#000000', 0.2)}`
              : 'none',
          '& .highlight': {
            background: colors.gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }
        }}
      >
        SO<span className="highlight">R</span>A
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