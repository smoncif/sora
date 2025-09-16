import React from 'react';
import {
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';
import { SimpleRole } from '../../../types';

export interface ComparisonIconProps {
  role: SimpleRole;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (role: SimpleRole) => void;
}

export const ComparisonIcon: React.FC<ComparisonIconProps> = ({
  role,
  isSelected,
  isDisabled,
  onSelect
}) => {
  const handleClick = () => {
    if (!isDisabled) {
      onSelect(role);
    }
  };

  // 🎨 NOUVEAU : Logique des 3 états visuels
  const getIconStyle = () => {
    if (isSelected) {
      // État 2 : Rôle sélectionné (vert/succès)
      return {
        color: 'success.main',
        '&:hover': {
          color: 'success.dark',
          backgroundColor: 'success.light',
          opacity: 0.1
        }
      };
    }
    
    if (isDisabled) {
      // État 3 : Maximum atteint, désactivé (gris clair)
      return {
        color: 'text.disabled',
        opacity: 0.5,
        '&:hover': {
          color: 'text.disabled',
          backgroundColor: 'action.hover',
          opacity: 0.6
        },
        '&.Mui-disabled': {
          color: 'text.disabled',
          opacity: 0.4
        }
      };
    }
    
    // État 1 : Initial, non sélectionné (gris neutre)
    return {
      color: 'text.secondary',
      '&:hover': {
        color: 'primary.main',
        backgroundColor: 'action.hover'
      }
    };
  };

  const getTooltipText = () => {
    if (isSelected) {
      return `Retirer`;
    }
    if (isDisabled) {
      return '🚫';
    }
    return `Comparer`;
  };

  return (
    <Tooltip title={getTooltipText()}>
      <span>
        <IconButton
          onClick={handleClick}
          disabled={isDisabled}
          size="small"
          sx={getIconStyle()}
        >
          <CompareArrowsIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default ComparisonIcon;
