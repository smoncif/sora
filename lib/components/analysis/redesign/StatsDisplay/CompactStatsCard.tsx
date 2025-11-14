'use client';

import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';

interface CompactStatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    label: string;
  };
  onClick?: () => void;
  delay?: number;
  loading?: boolean;
}

export function CompactStatsCard({
  label,
  value,
  icon,
  color,
  trend,
  onClick,
  delay = 0,
  loading = false,
}: CompactStatsCardProps) {
  const theme = useTheme();

  return (
    <Box
      className={`neo-animate-scale neo-delay-${delay}`}
      onClick={onClick}
      sx={{
        position: 'relative',
        p: 3,
        borderRadius: 2,
        border: `3px solid ${theme.palette.text.primary}`,
        background: alpha(color, 0.08),
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick ? {
          transform: 'translate(-2px, -4px)',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.25)',
        } : {},
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          height: '100%',
          opacity: 0.03,
          background: `repeating-linear-gradient(
            45deg,
            ${color} 0px,
            ${color} 2px,
            transparent 2px,
            transparent 10px
          )`,
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Icon + Label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 1.5,
              border: `2px solid ${theme.palette.text.primary}`,
              background: alpha(color, 0.15),
              color: color,
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="overline"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              letterSpacing: '0.1em',
              lineHeight: 1,
            }}
          >
            {label}
          </Typography>
        </Box>

        {/* Value */}
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '2rem', sm: '2.5rem' },
            fontWeight: 800,
            color: color,
            lineHeight: 1,
            mb: trend ? 1 : 0,
          }}
        >
          {loading ? (
            <Box
              className="neo-skeleton"
              sx={{
                width: '80%',
                height: 40,
                borderRadius: 1,
              }}
            />
          ) : (
            value
          )}
        </Typography>

        {/* Trend */}
        {trend && !loading && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              border: `2px solid ${theme.palette.text.primary}`,
              background: alpha(color, 0.1),
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                color: color,
                fontSize: '0.75rem',
              }}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.7rem',
              }}
            >
              {trend.label}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Decorative corner */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -10,
          right: -10,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, transparent 70%)`,
        }}
      />
    </Box>
  );
}

