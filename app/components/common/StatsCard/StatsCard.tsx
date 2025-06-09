'use client';

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: SvgIconComponent;
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
  
  // Palette de couleurs moderne et épurée
  const colorMap = {
    primary: '#8b5cf6',
    secondary: '#f59e0b', 
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
  };

  const mainColor = colorMap[color];

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(10px)',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        '&:hover': onClick ? {
          transform: 'translateY(-3px)',
          boxShadow: `0 8px 32px ${alpha(mainColor, 0.12)}`,
          border: `1px solid ${alpha(mainColor, 0.15)}`,
        } : {
          boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.04)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${mainColor} 0%, ${alpha(mainColor, 0.6)} 100%)`,
          borderRadius: '3px 3px 0 0',
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '100%' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.text.secondary, 0.7),
              fontWeight: 500,
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
              color: theme.palette.text.primary,
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
                color: alpha(theme.palette.text.secondary, 0.8),
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
                  backgroundColor: trend.isPositive !== false 
                    ? alpha('#10b981', 0.1)
                    : alpha('#ef4444', 0.1),
                  border: `1px solid ${trend.isPositive !== false 
                    ? alpha('#10b981', 0.2)
                    : alpha('#ef4444', 0.2)}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    color: trend.isPositive !== false 
                      ? '#10b981'
                      : '#ef4444',
                  }}
                >
                  {trend.isPositive !== false ? '+' : ''}{trend.value}%
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: alpha(theme.palette.text.secondary, 0.7),
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
              backgroundColor: alpha(mainColor, 0.08),
              color: mainColor,
              ml: 2,
              flexShrink: 0,
              border: `1px solid ${alpha(mainColor, 0.12)}`,
            }}
          >
            <Icon sx={{ fontSize: 26 }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}; 


