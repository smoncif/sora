'use client';

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import { Close } from '@mui/icons-material';

export interface UserSelectedRolesProps {
  selectedRoles: string[];
  onRemoveRole: (roleName: string) => void;
  onClearAll: () => void;
}

export const UserSelectedRoles = React.memo(function UserSelectedRoles({
  selectedRoles,
  onRemoveRole,
  onClearAll
}: UserSelectedRolesProps) {
  const theme = useTheme();

  if (selectedRoles.length === 0) {
    return null;
  }

  // Fonction pour créer un dégradé de couleur
  const getGradientColor = () => {
    return `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.success.main} 100%)`;
  };

  return (
    <Box sx={{ 
      width: '100%', 
      mb: 0,
      p: 0
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'nowrap', 
        gap: 2,
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        '&::-webkit-scrollbar': {
          height: '4px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: alpha(theme.palette.text.secondary, 0.2),
          borderRadius: '2px',
          '&:hover': {
            bgcolor: alpha(theme.palette.text.secondary, 0.3),
          },
        },
      }}>
        {selectedRoles.map((roleName) => (
          <Box
            key={roleName}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2.5,
              py: 1.5,
              borderRadius: 1.5,
              transition: 'all 0.2s ease',
              flexShrink: 0,
              '&:hover': {
                transform: 'translateY(-2px)',
              }
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                color: theme.palette.text.primary,
                letterSpacing: '0.5px'
              }}
            >
              {roleName}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onRemoveRole(roleName)}
              sx={{
                width: 24,
                height: 24,
                p: 0,
                color: theme.palette.error.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  color: theme.palette.error.dark
                }
              }}
            >
              <Close sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
});
