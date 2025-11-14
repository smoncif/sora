'use client';

import React from 'react';
import { Box, Typography, useTheme, alpha, LinearProgress, Chip, IconButton, Tooltip } from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

interface ResultMetric {
  label: string;
  value: number;
  max: number;
  color: string;
}

interface ResultCardProps {
  title: string;
  subtitle?: string;
  score?: number;
  metrics?: ResultMetric[];
  tags?: Array<{ label: string; color?: string }>;
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
  }>;
  onView?: () => void;
  delay?: number;
  featured?: boolean;
}

export function ResultCard({
  title,
  subtitle,
  score,
  metrics = [],
  tags = [],
  actions = [],
  onView,
  delay = 0,
  featured = false,
}: ResultCardProps) {
  const theme = useTheme();

  return (
    <Box
      className={`neo-animate-slide-up neo-delay-${delay}`}
      onClick={onView}
      sx={{
        position: 'relative',
        p: 3,
        borderRadius: 2,
        border: featured 
          ? `4px solid ${theme.palette.primary.main}`
          : `3px solid ${theme.palette.text.primary}`,
        background: theme.palette.background.paper,
        boxShadow: featured
          ? '6px 6px 0px rgba(0, 0, 0, 0.25)'
          : '4px 4px 0px rgba(0, 0, 0, 0.25)',
        cursor: onView ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onView ? {
          transform: 'translate(-2px, -4px)',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.25)',
        } : {},
      }}
    >
      {/* Featured badge */}
      {featured && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            border: `2px solid ${theme.palette.text.primary}`,
            background: theme.palette.primary.main,
            color: '#FFFFFF',
          }}
        >
          <StarIcon sx={{ fontSize: '0.9rem' }} />
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            TOP
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontWeight: 700,
                color: theme.palette.text.primary,
                mb: subtitle ? 0.5 : 0,
                fontSize: '1.1rem',
                lineHeight: 1.3,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.875rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {/* Score */}
          {score !== undefined && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 2,
                py: 1,
                borderRadius: 1.5,
                border: `3px solid ${theme.palette.text.primary}`,
                background: alpha(
                  score >= 80 
                    ? theme.palette.success.main 
                    : score >= 60 
                    ? theme.palette.info.main 
                    : theme.palette.warning.main,
                  0.15
                ),
                minWidth: 70,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 800,
                  color: score >= 80 
                    ? theme.palette.success.main 
                    : score >= 60 
                    ? theme.palette.info.main 
                    : theme.palette.warning.main,
                  lineHeight: 1,
                  fontSize: '1.8rem',
                }}
              >
                {score}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                SCORE
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Tags */}
      {tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag.label}
              size="small"
              sx={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 24,
                border: `2px solid ${theme.palette.text.primary}`,
                borderColor: tag.color || theme.palette.text.primary,
                color: tag.color || theme.palette.text.primary,
                backgroundColor: tag.color ? alpha(tag.color, 0.1) : 'transparent',
              }}
            />
          ))}
        </Box>
      )}

      {/* Metrics */}
      {metrics.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {metrics.map((metric, index) => (
            <Box key={index} sx={{ mb: index < metrics.length - 1 ? 1.5 : 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {metric.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    color: metric.color,
                    fontSize: '0.75rem',
                  }}
                >
                  {metric.value}/{metric.max}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 10,
                  borderRadius: 1,
                  border: `2px solid ${theme.palette.text.primary}`,
                  background: alpha(theme.palette.text.primary, 0.05),
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${(metric.value / metric.max) * 100}%`,
                    background: metric.color,
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            pt: 2,
            borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {actions.map((action, index) => (
            <Tooltip key={index} title={action.label} arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                sx={{
                  border: `2px solid ${theme.palette.text.primary}`,
                  borderRadius: 1,
                  color: action.color || theme.palette.text.primary,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translate(-1px, -1px)',
                    boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.25)',
                    backgroundColor: action.color ? alpha(action.color, 0.1) : undefined,
                  },
                }}
              >
                {action.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Decorative corner */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -15,
          right: -15,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}

// Helper to create metrics
export const createResultMetric = (
  label: string,
  value: number,
  max: number,
  color: string
): ResultMetric => ({
  label,
  value,
  max,
  color,
});

// Common action icons
export const ResultCardIcons = {
  View: <ViewIcon sx={{ fontSize: '1.1rem' }} />,
  Edit: <EditIcon sx={{ fontSize: '1.1rem' }} />,
  Delete: <DeleteIcon sx={{ fontSize: '1.1rem' }} />,
  Trending: <TrendingUpIcon sx={{ fontSize: '1.1rem' }} />,
};

