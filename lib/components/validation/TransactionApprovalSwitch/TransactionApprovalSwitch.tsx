'use client';

/**
 * Switch de validation pour une transaction individuelle
 * Version compacte pour affichage dans la liste des transactions
 */

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  TextField,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  HelpOutline as PendingIcon,
} from '@mui/icons-material';

export interface TransactionApprovalSwitchProps {
  value: boolean | null;  // true = validé, false = refusé, null = en attente
  comment?: string;
  onChange: (value: boolean | null) => void;
  onCommentChange: (comment: string) => void;
  disabled?: boolean;
}

export function TransactionApprovalSwitch({
  value,
  comment = '',
  onChange,
  onCommentChange,
  disabled = false,
}: TransactionApprovalSwitchProps) {
  const theme = useTheme();

  const getButtonStyle = (buttonValue: boolean | null) => {
    const isActive = value === buttonValue;
    
    if (buttonValue === true) {
      const paletteColor = theme.palette.success.main;
      return {
        color: isActive ? paletteColor : theme.palette.text.disabled,
        bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
        '&:hover': {
          bgcolor: isActive ? alpha(paletteColor, 0.2) : 'transparent',
        },
        '&.Mui-disabled': {
          color: isActive ? paletteColor : theme.palette.text.disabled,
          bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
          opacity: isActive ? 1 : undefined,
        },
        '&.Mui-disabled:hover': {
          bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
        },
      };
    } else if (buttonValue === false) {
      const paletteColor = theme.palette.error.main;
      return {
        color: isActive ? paletteColor : theme.palette.text.disabled,
        bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
        '&:hover': {
          bgcolor: isActive ? alpha(paletteColor, 0.2) : 'transparent',
        },
        '&.Mui-disabled': {
          color: isActive ? paletteColor : theme.palette.text.disabled,
          bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
          opacity: isActive ? 1 : undefined,
        },
        '&.Mui-disabled:hover': {
          bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
        },
      };
    } else {
      const paletteColor = theme.palette.warning.main;
      return {
        color: isActive ? paletteColor : theme.palette.text.disabled,
        bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
        '&:hover': {
          bgcolor: isActive ? alpha(paletteColor, 0.2) : 'transparent',
        },
        '&.Mui-disabled': {
          color: isActive ? paletteColor : theme.palette.text.disabled,
          bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
          opacity: isActive ? 1 : undefined,
        },
        '&.Mui-disabled:hover': {
          bgcolor: isActive ? alpha(paletteColor, 0.1) : 'transparent',
        },
      };
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Boutons de validation */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <Tooltip title="Valider">
          <IconButton
            size="small"
            onClick={() => onChange(true)}
            disabled={disabled}
            sx={getButtonStyle(true)}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="En attente">
          <IconButton
            size="small"
            onClick={() => onChange(null)}
            disabled={disabled}
            sx={getButtonStyle(null)}
          >
            <PendingIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Refuser">
          <IconButton
            size="small"
            onClick={() => onChange(false)}
            disabled={disabled}
            sx={getButtonStyle(false)}
          >
            <CancelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Champ commentaire (optionnel) */}
      {value !== null && (
        <TextField
          size="small"
          placeholder="Commentaire (optionnel)"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          disabled={disabled}
          multiline
          rows={1}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '0.75rem',
            },
          }}
        />
      )}
    </Box>
  );
}

