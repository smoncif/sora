'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  CircularProgress,
  Fade,
  alpha,
  useTheme,
} from '@mui/material';

export interface AnalysisParsingProgressProps {
  loading: boolean;
  progress?: number;
  message?: string;
}

export function AnalysisParsingProgress({
  loading,
  progress = 0,
  message = 'Traitement en cours...',
}: AnalysisParsingProgressProps) {
  const theme = useTheme();

  if (!loading) {
    return null;
  }

  return (
    <Fade in timeout={300}>
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 4,
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.secondary.main, 0.02),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              color: theme.palette.text.primary,
            }}
          >
            {message}
          </Typography>
        </Box>
        {progress > 0 && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                borderRadius: 3,
              },
            }}
          />
        )}
      </Paper>
    </Fade>
  );
}
