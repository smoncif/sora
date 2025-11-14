'use client';

import React from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';

interface ResultsGridProps {
  title?: string;
  children: React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function ResultsGrid({
  title,
  children,
  emptyMessage = 'Aucun résultat à afficher',
  loading = false,
}: ResultsGridProps) {
  const theme = useTheme();

  const isEmpty = !loading && React.Children.count(children) === 0;

  return (
    <Box>
      {/* Title */}
      {title && (
        <Box
          sx={{
            mb: 3,
            pb: 2,
            borderBottom: `3px solid ${theme.palette.text.primary}`,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              color: theme.palette.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </Typography>
        </Box>
      )}

      {/* Grid */}
      {!isEmpty && (
        <Grid container spacing={3}>
          {React.Children.map(children, (child, index) => (
            <Grid key={index} size={{ xs: 12, md: 6, lg: 4 }}>
              {child}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {isEmpty && (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 2,
            border: `3px dashed ${theme.palette.text.primary}`,
            opacity: 0.5,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              color: theme.palette.text.secondary,
            }}
          >
            {emptyMessage}
          </Typography>
        </Box>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Box
                className="neo-skeleton"
                sx={{
                  height: 200,
                  borderRadius: 2,
                  border: `3px solid ${theme.palette.text.primary}`,
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

