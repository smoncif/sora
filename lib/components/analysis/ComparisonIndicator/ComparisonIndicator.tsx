import React from 'react';
import { Box, IconButton, Tooltip, Badge } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';
import { SimpleRole } from '../../../types/analysis';

export interface ComparisonIndicatorProps {
  selectedRoles: SimpleRole[];
  isSliderOpen: boolean;
  onOpenSlider: () => void;
}

export const ComparisonIndicator: React.FC<ComparisonIndicatorProps> = ({
  selectedRoles,
  isSliderOpen,
  onOpenSlider,
}) => {
  // N'afficher l'indicateur que si des rôles sont sélectionnés ET que le slider n'est pas ouvert
  if (selectedRoles.length === 0 || isSliderOpen) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <Tooltip title={`${selectedRoles.length} rôle(s) sélectionné(s) pour comparaison`} placement="left">
        <Badge badgeContent={selectedRoles.length} color="success">
          <IconButton
            onClick={onOpenSlider}
            sx={{
              bgcolor: 'success.main',
              color: 'white',
              width: 56,
              height: 56,
              '&:hover': {
                bgcolor: 'success.dark',
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
              boxShadow: 2,
              transition: 'all 0.2s ease-in-out',
              // Animation de pulsation pour attirer l'attention
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
                },
              },
            }}
          >
            <KeyboardArrowUp 
              sx={{ 
                fontSize: 28,
                // Animation de rebond sur hover
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  animation: 'bounce 0.6s ease-in-out',
                },
                '@keyframes bounce': {
                  '0%, 20%, 50%, 80%, 100%': {
                    transform: 'translateY(0)',
                  },
                  '40%': {
                    transform: 'translateY(-4px)',
                  },
                  '60%': {
                    transform: 'translateY(-2px)',
                  },
                },
              }} 
            />
          </IconButton>
        </Badge>
      </Tooltip>
    </Box>
  );
};
