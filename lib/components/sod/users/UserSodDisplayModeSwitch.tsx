/**
 * Composant switch pour basculer entre les modes d'affichage utilisateur :
 * - Mode "Par Rôle" : User → Risque → Fonction → Rôle → Action
 * - Mode "Par Transaction" : User → Risque → Fonction → Action → Rôle
 */

'use client';

import React from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ViewListIcon from '@mui/icons-material/ViewList';

export type UserDisplayMode = 'BY_ROLE' | 'BY_TRANSACTION';

export interface UserSodDisplayModeSwitchProps {
  /** Mode d'affichage actuel */
  value: UserDisplayMode;
  
  /** Callback quand le mode change */
  onChange: (mode: UserDisplayMode) => void;
  
  /** Désactivé */
  disabled?: boolean;
  
  /** Taille du composant */
  size?: 'small' | 'medium';
}

/**
 * Switch pour basculer entre les modes d'affichage
 */
export const UserSodDisplayModeSwitch: React.FC<UserSodDisplayModeSwitchProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'medium',
}) => {
  const theme = useTheme();
  
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: UserDisplayMode | null
  ) => {
    if (newMode !== null) {
      onChange(newMode);
    }
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.secondary,
          fontWeight: 500,
        }}
      >
        Mode d'affichage :
      </Typography>
      
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        disabled={disabled}
        size={size}
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          borderRadius: 2,
          '& .MuiToggleButtonGroup-grouped': {
            border: 'none',
            borderRadius: '8px !important',
            mx: 0.25,
            '&:not(:first-of-type)': {
              borderRadius: '8px !important',
            },
            '&:first-of-type': {
              borderRadius: '8px !important',
            },
          },
        }}
      >
        <ToggleButton
          value="BY_ROLE"
          sx={{
            px: size === 'small' ? 1.5 : 2,
            py: size === 'small' ? 0.5 : 0.75,
            textTransform: 'none',
            fontWeight: value === 'BY_ROLE' ? 600 : 400,
            color: value === 'BY_ROLE' 
              ? theme.palette.primary.main 
              : theme.palette.text.secondary,
            backgroundColor: value === 'BY_ROLE' 
              ? alpha(theme.palette.primary.main, 0.12) 
              : 'transparent',
            '&:hover': {
              backgroundColor: value === 'BY_ROLE' 
                ? alpha(theme.palette.primary.main, 0.2) 
                : alpha(theme.palette.action.hover, 0.1),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
              },
            },
          }}
        >
          <Tooltip title="Analyser par rôle : voir quels rôles sont responsables des risques">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountTreeIcon fontSize={size === 'small' ? 'small' : 'medium'} />
              <Typography variant={size === 'small' ? 'caption' : 'body2'}>
                Par Rôle
              </Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
        
        <ToggleButton
          value="BY_TRANSACTION"
          sx={{
            px: size === 'small' ? 1.5 : 2,
            py: size === 'small' ? 0.5 : 0.75,
            textTransform: 'none',
            fontWeight: value === 'BY_TRANSACTION' ? 600 : 400,
            color: value === 'BY_TRANSACTION' 
              ? theme.palette.secondary.main 
              : theme.palette.text.secondary,
            backgroundColor: value === 'BY_TRANSACTION' 
              ? alpha(theme.palette.secondary.main, 0.12) 
              : 'transparent',
            '&:hover': {
              backgroundColor: value === 'BY_TRANSACTION' 
                ? alpha(theme.palette.secondary.main, 0.2) 
                : alpha(theme.palette.action.hover, 0.1),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.secondary.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.secondary.main, 0.2),
              },
            },
          }}
        >
          <Tooltip title="Analyser par transaction : voir quelles transactions sont responsables des risques">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ViewListIcon fontSize={size === 'small' ? 'small' : 'medium'} />
              <Typography variant={size === 'small' ? 'caption' : 'body2'}>
                Par Transaction
              </Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
      
      {/* Icône de transition */}
      <SwapHorizIcon 
        sx={{ 
          color: theme.palette.text.disabled,
          fontSize: 20,
          opacity: 0.5,
        }} 
      />
    </Box>
  );
};

/**
 * Version compacte du switch (pour les espaces réduits)
 */
export const UserSodDisplayModeSwitchCompact: React.FC<UserSodDisplayModeSwitchProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const theme = useTheme();
  
  const handleToggle = () => {
    onChange(value === 'BY_ROLE' ? 'BY_TRANSACTION' : 'BY_ROLE');
  };
  
  return (
    <Tooltip 
      title={value === 'BY_ROLE' 
        ? 'Passer en mode Par Transaction' 
        : 'Passer en mode Par Rôle'
      }
    >
      <Box
        onClick={disabled ? undefined : handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: alpha(
            value === 'BY_ROLE' 
              ? theme.palette.primary.main 
              : theme.palette.secondary.main,
            0.1
          ),
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: disabled 
              ? undefined 
              : alpha(
                  value === 'BY_ROLE' 
                    ? theme.palette.primary.main 
                    : theme.palette.secondary.main,
                  0.2
                ),
          },
        }}
      >
        {value === 'BY_ROLE' ? (
          <AccountTreeIcon 
            fontSize="small" 
            sx={{ color: theme.palette.primary.main }} 
          />
        ) : (
          <ViewListIcon 
            fontSize="small" 
            sx={{ color: theme.palette.secondary.main }} 
          />
        )}
        
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: value === 'BY_ROLE' 
              ? theme.palette.primary.main 
              : theme.palette.secondary.main,
          }}
        >
          {value === 'BY_ROLE' ? 'Rôle' : 'Transaction'}
        </Typography>
        
        <SwapHorizIcon 
          fontSize="small"
          sx={{ 
            color: theme.palette.text.disabled,
            ml: 0.5,
          }} 
        />
      </Box>
    </Tooltip>
  );
};

/**
 * Légende explicative des modes d'affichage
 */
export const UserSodDisplayModeLegend: React.FC<{ mode: UserDisplayMode }> = ({ mode }) => {
  const theme = useTheme();
  
  const hierarchyByRole = [
    'Utilisateur',
    'Risque',
    'Fonction',
    'Rôle Composite',
    'Rôle Simple',
    'Action',
    'Ressource',
  ];
  
  const hierarchyByTransaction = [
    'Utilisateur',
    'Risque',
    'Fonction',
    'Action',
    'Rôle Composite',
    'Rôle Simple',
    'Ressource',
  ];
  
  const hierarchy = mode === 'BY_ROLE' ? hierarchyByRole : hierarchyByTransaction;
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap',
        p: 1,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        borderRadius: 1,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
        Hiérarchie :
      </Typography>
      
      {hierarchy.map((item, index) => (
        <React.Fragment key={item}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: index < 3 ? 600 : 400,
              color: index < 3 
                ? theme.palette.text.primary 
                : theme.palette.text.secondary,
            }}
          >
            {item}
          </Typography>
          
          {index < hierarchy.length - 1 && (
            <Typography variant="caption" sx={{ color: 'text.disabled', mx: 0.25 }}>
              →
            </Typography>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

