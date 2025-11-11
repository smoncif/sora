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
    medium: { fontSize: variant === 'auth' ? '2.5rem' : '2.2rem' },
    large: { fontSize: '3rem' }
  };

  const config = sizeConfig[size];

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover .logo-text': {
          transform: 'scale(1.05)',
        }
      }}
    >
      <Typography
        className="logo-text"
        variant="h4"
        component="div"
        sx={{
          fontWeight: 800,
          fontSize: config.fontSize,
          letterSpacing: '0.08em',
          fontFamily: '"Montserrat", "Inter", "Roboto", sans-serif',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.2)}`,
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