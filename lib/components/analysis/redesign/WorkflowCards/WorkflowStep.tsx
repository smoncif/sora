'use client';

import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';

interface WorkflowStepProps {
  stepNumber: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  isActive?: boolean;
  isCompleted?: boolean;
  color?: string;
  delay?: number;
}

export function WorkflowStep({
  stepNumber,
  title,
  description,
  children,
  isActive = false,
  isCompleted = false,
  color,
  delay = 0,
}: WorkflowStepProps) {
  const theme = useTheme();
  
  const stepColor = color || theme.palette.primary.main;
  const borderColor = isActive 
    ? stepColor
    : isCompleted
    ? theme.palette.success.main
    : theme.palette.text.primary;

  return (
    <Box
      className={`neo-animate-slide-up neo-delay-${delay}`}
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Step Number Badge */}
      <Box
        sx={{
          position: 'absolute',
          top: -12,
          left: 16,
          zIndex: 2,
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isCompleted 
            ? theme.palette.success.main
            : isActive
            ? stepColor
            : theme.palette.background.paper,
          border: `3px solid ${theme.palette.text.primary}`,
          borderRadius: 2,
          boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 800,
            color: isActive || isCompleted 
              ? '#FFFFFF'
              : theme.palette.text.primary,
            lineHeight: 1,
          }}
        >
          {isCompleted ? '✓' : stepNumber}
        </Typography>
      </Box>

      {/* Card */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          pt: 4,
          borderRadius: 3,
          border: `4px solid ${borderColor}`,
          background: theme.palette.background.paper,
          boxShadow: isActive 
            ? '6px 6px 0px rgba(0, 0, 0, 0.25)'
            : '4px 4px 0px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.25)',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: description ? 0.5 : 0,
              fontSize: '1.1rem',
            }}
          >
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              {description}
            </Typography>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>

        {/* Status Indicator */}
        {(isActive || isCompleted) && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.5,
                borderRadius: 1,
                border: `2px solid ${isCompleted ? theme.palette.success.main : stepColor}`,
                background: alpha(
                  isCompleted ? theme.palette.success.main : stepColor,
                  0.1
                ),
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isCompleted ? theme.palette.success.main : stepColor,
                  animation: isActive && !isCompleted ? 'neo-pulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  color: isCompleted ? theme.palette.success.main : stepColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.7rem',
                }}
              >
                {isCompleted ? 'Complété' : 'En cours'}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

