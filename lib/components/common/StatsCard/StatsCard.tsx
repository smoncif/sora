'use client';

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: typeof SvgIconComponent;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

/**
 * Composant de carte de statistiques moderne et minimaliste
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  trend,
  onClick,
}) => {
  const theme = useTheme();
  
  // Dégradés vibrants et différents pour chaque couleur
  const gradientMap = {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Vert - pour transactions = 0
    error: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    warning: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)', // Orange - pour transactions > 0
    info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Bleu cyan
  };

  const gradient = gradientMap[color];

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 3,
        border: 'none',
        background: gradient,
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.15)}`,
        } : {
          boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.08)}`,
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '100%' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: 600,
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontSize: '0.7rem',
            }}
          >
            {title}
          </Typography>
          
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#ffffff',
              mb: 'auto',
              fontSize: '2.2rem',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.8rem',
                mt: 1,
              }}
            >
              {subtitle}
            </Typography>
          )}
          
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    color: '#ffffff',
                  }}
                >
                  {trend.isPositive !== false ? '+' : ''}{trend.value}%
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.7rem',
                }}
              >
                {trend.label}
              </Typography>
            </Box>
          )}
        </Box>
        
        {Icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 2.5,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              ml: 2,
              flexShrink: 0,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Icon sx={{ fontSize: 26 }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}; 


