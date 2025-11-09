'use client';

/**
 * Switch tri-state pour validation de rôle
 * États: Validé (✅) / En attente (❓) / Refusé (❌)
 */

import React from 'react';
import { Box, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  HelpOutline 
} from '@mui/icons-material';

export interface ApprovalSwitchProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
}

export const ApprovalSwitch: React.FC<ApprovalSwitchProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const theme = useTheme();

  const handleClick = (newValue: boolean | null) => {
    if (disabled) return;
    onChange(newValue);
  };

  const getButtonStyles = (isActive: boolean, paletteColor: string) => ({
    color: isActive ? paletteColor : theme.palette.action.disabled,
    bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
    '&:hover': {
      bgcolor: isActive ? alpha(paletteColor, 0.2) : 'transparent',
    },
    '&.Mui-disabled': {
      color: isActive ? paletteColor : theme.palette.action.disabled,
      bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
      opacity: isActive ? 1 : undefined,
    },
    '&.Mui-disabled:hover': {
      bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
    },
    transition: 'all 0.2s ease',
  });

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 0.5, 
      alignItems: 'center',
      justifyContent: 'center' 
    }}>
      {/* Bouton Valider */}
      <Tooltip title="Valider" arrow>
        <span>
          <IconButton
            onClick={() => handleClick(true)}
            disabled={disabled}
            size="small"
            sx={getButtonStyles(value === true, theme.palette.success.main)}
          >
            <CheckCircle />
          </IconButton>
        </span>
      </Tooltip>

      {/* Bouton En attente */}
      <Tooltip title="En attente / À discuter" arrow>
        <span>
          <IconButton
            onClick={() => handleClick(null)}
            disabled={disabled}
            size="small"
            sx={getButtonStyles(value === null, theme.palette.warning.main)}
          >
            <HelpOutline />
          </IconButton>
        </span>
      </Tooltip>

      {/* Bouton Refuser */}
      <Tooltip title="Refuser" arrow>
        <span>
          <IconButton
            onClick={() => handleClick(false)}
            disabled={disabled}
            size="small"
            sx={getButtonStyles(value === false, theme.palette.error.main)}
          >
            <Cancel />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

