/**
 * Composant pour afficher une valeur (Value From → Value To)
 */

'use client';

import React from 'react';
import { Chip, Box, Typography, alpha, useTheme } from '@mui/material';
import { SodValue } from 'lib/types/sodAnalysis';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export interface SodValueChipProps {
  /** Valeur */
  value: SodValue;
  
  /** Taille */
  size?: 'small' | 'medium';
  
  /** Variante */
  variant?: 'default' | 'outlined';
}

/**
 * Chip pour afficher une valeur (From → To)
 */
export const SodValueChip: React.FC<SodValueChipProps> = ({
  value,
  size = 'small',
  variant = 'default',
}) => {
  const theme = useTheme();
  
  const { valueFrom, valueTo } = value;
  
  // Si les valeurs sont identiques, n'afficher qu'une seule fois
  const isSameValue = valueFrom === valueTo;
  
  if (variant === 'outlined') {
    return (
      <Chip
        label={
          isSameValue ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <span>{valueFrom}</span>
              {valueFrom && valueFrom !== valueFrom && (
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                  {valueFrom}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{valueFrom}</span>
                <ArrowForwardIcon sx={{ fontSize: 10 }} />
                <span>{valueTo}</span>
              </Box>
              {(valueFrom || valueTo) && (
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                  {valueFrom} → {valueTo}
                </Typography>
              )}
            </Box>
          )
        }
        size={size}
        variant="outlined"
        sx={{
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          height: 'auto',
          '& .MuiChip-label': {
            padding: '4px 8px',
          },
        }}
      />
    );
  }
  
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        fontFamily: 'monospace',
        color: theme.palette.text.primary,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'monospace',
          fontWeight: 500,
          color: theme.palette.primary.main,
        }}
      >
        {valueFrom}
      </Typography>
      
      {!isSameValue && (
        <>
          <ArrowForwardIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 500,
              color: theme.palette.primary.main,
            }}
          >
            {valueTo}
          </Typography>
        </>
      )}
    </Box>
  );
};

/**
 * Liste de valeurs affichées horizontalement
 */
export const SodValueList: React.FC<{
  values: SodValue[];
  maxVisible?: number;
}> = ({ values, maxVisible = 5 }) => {
  const visibleValues = values.slice(0, maxVisible);
  const remainingCount = values.length - maxVisible;
  
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {visibleValues.map((value, index) => (
        <SodValueChip key={index} value={value} size="small" />
      ))}
      
      {remainingCount > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontStyle: 'italic',
            ml: 0.5,
          }}
        >
          +{remainingCount} autre{remainingCount > 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
};

