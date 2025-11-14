'use client';

import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface HeroMetric {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface HeroHeaderProps {
  title: string;
  subtitle: string;
  metrics?: HeroMetric[];
  action?: React.ReactNode;
  loading?: boolean;
}

export function HeroHeader({
  title,
  subtitle,
  metrics = [],
  action,
  loading = false,
}: HeroHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      className="neo-animate-slide-up neo-pattern-circuit"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        mb: 6,
        p: 4,
        borderRadius: 3,
        border: `4px solid ${theme.palette.text.primary}`,
        boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.25)',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
      }}
    >
      {/* Decorative corner accent */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          opacity: 0.1,
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
        }}
      />

      {/* Header Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Title Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h1"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 800,
              color: theme.palette.text.primary,
              mb: 1,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              color: theme.palette.text.secondary,
              fontWeight: 400,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        {/* Metrics + Action Row */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 3,
          }}
        >
          {/* Metrics */}
          {metrics.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                flex: 1,
              }}
            >
              {metrics.map((metric, index) => (
                <Box
                  key={index}
                  className={`neo-animate-scale neo-delay-${(index + 1) * 100}`}
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2,
                    border: `3px solid ${theme.palette.text.primary}`,
                    background: alpha(metric.color, 0.1),
                    boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translate(-2px, -2px)',
                      boxShadow: '5px 5px 0px rgba(0, 0, 0, 0.25)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box
                      sx={{
                        color: metric.color,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {metric.icon}
                    </Box>
                    <Typography
                      variant="overline"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: theme.palette.text.secondary,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {metric.label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography
                      variant="h3"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        fontWeight: 700,
                        color: metric.color,
                        lineHeight: 1,
                      }}
                    >
                      {loading ? '...' : metric.value}
                    </Typography>
                    {metric.trend && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          background: metric.trend.isPositive
                            ? alpha(theme.palette.success.main, 0.15)
                            : alpha(theme.palette.warning.main, 0.15),
                        }}
                      >
                        <TrendingUpIcon
                          sx={{
                            fontSize: '1rem',
                            color: metric.trend.isPositive
                              ? theme.palette.success.main
                              : theme.palette.warning.main,
                            transform: metric.trend.isPositive ? 'none' : 'rotate(180deg)',
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                            color: metric.trend.isPositive
                              ? theme.palette.success.main
                              : theme.palette.warning.main,
                          }}
                        >
                          {Math.abs(metric.trend.value)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Action Button */}
          {action && (
            <Box
              className="neo-animate-scale neo-delay-400"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'stretch', md: 'flex-end' },
              }}
            >
              {action}
            </Box>
          )}
        </Box>
      </Box>

      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -20,
          left: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
          animation: 'neo-pulse 3s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          right: -30,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
          animation: 'neo-pulse 4s ease-in-out infinite',
          animationDelay: '1s',
        }}
      />
    </Box>
  );
}

// Export pre-configured metrics helpers
export const createMetric = (
  label: string,
  value: string | number,
  color: string,
  icon: React.ReactNode,
  trend?: { value: number; isPositive: boolean }
): HeroMetric => ({
  label,
  value,
  color,
  icon,
  trend,
});

// Common metric configurations
export const MetricIcons = {
  Speed: <SpeedIcon sx={{ fontSize: '1.2rem' }} />,
  Check: <CheckCircleIcon sx={{ fontSize: '1.2rem' }} />,
  Trending: <TrendingUpIcon sx={{ fontSize: '1.2rem' }} />,
};

