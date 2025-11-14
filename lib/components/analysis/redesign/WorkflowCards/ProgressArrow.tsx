'use client';

import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

interface ProgressArrowProps {
  isActive?: boolean;
  delay?: number;
}

export function ProgressArrow({ isActive = false, delay = 0 }: ProgressArrowProps) {
  const theme = useTheme();

  return (
    <Box
      className={`neo-animate-fade neo-delay-${delay}`}
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        alignSelf: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `3px solid ${theme.palette.text.primary}`,
          background: isActive 
            ? theme.palette.primary.main
            : theme.palette.background.paper,
          boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: isActive ? 'neo-pulse 2s ease-in-out infinite' : 'none',
          '&:hover': {
            transform: 'scale(1.1) rotate(90deg)',
          },
        }}
      >
        <ArrowForwardIcon
          sx={{
            fontSize: '1.5rem',
            color: isActive ? '#FFFFFF' : theme.palette.text.primary,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </Box>

      {/* Animated dashed line */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: 3,
          background: `repeating-linear-gradient(
            90deg,
            ${theme.palette.text.primary} 0px,
            ${theme.palette.text.primary} 10px,
            transparent 10px,
            transparent 20px
          )`,
          opacity: 0.2,
          zIndex: -1,
          animation: isActive ? 'neo-shimmer 1.5s linear infinite' : 'none',
        }}
      />
    </Box>
  );
}

