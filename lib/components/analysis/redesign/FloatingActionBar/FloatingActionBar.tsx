'use client';

import React from 'react';
import { Box, Button, useTheme, alpha, Tooltip } from '@mui/material';
import {
  Save as SaveIcon,
  FileDownload as ExportIcon,
  Refresh as ResetIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  tooltip?: string;
}

interface FloatingActionBarProps {
  actions: ActionButton[];
  visible?: boolean;
}

export function FloatingActionBar({
  actions,
  visible = true,
}: FloatingActionBarProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Glassmorphism container */}
      <Box
        sx={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: theme.palette.mode === 'dark'
            ? alpha('#1A1A2E', 0.9)
            : alpha('#FFFFFF', 0.9),
          borderTop: `3px solid ${theme.palette.text.primary}`,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box
          sx={{
            maxWidth: 'xl',
            mx: 'auto',
            px: 4,
            py: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {actions.map((action, index) => {
            const ButtonComponent = (
              <Button
                key={index}
                variant="contained"
                color={action.color || 'primary'}
                onClick={action.onClick}
                disabled={action.disabled}
                startIcon={action.icon}
                sx={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  border: `3px solid ${theme.palette.text.primary}`,
                  boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translate(-2px, -2px)',
                    boxShadow: '5px 5px 0px rgba(0, 0, 0, 0.25)',
                  },
                  '&:active': {
                    transform: 'translate(0, 0)',
                    boxShadow: 'none',
                  },
                  '&.Mui-disabled': {
                    opacity: 0.5,
                    border: `3px solid ${alpha(theme.palette.text.primary, 0.3)}`,
                  },
                }}
              >
                {action.label}
              </Button>
            );

            return action.tooltip ? (
              <Tooltip key={index} title={action.tooltip} arrow>
                {ButtonComponent}
              </Tooltip>
            ) : (
              ButtonComponent
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

// Pre-configured action buttons
export const createAction = (
  label: string,
  icon: React.ReactNode,
  onClick: () => void,
  options?: {
    disabled?: boolean;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    tooltip?: string;
  }
): ActionButton => ({
  label,
  icon,
  onClick,
  ...options,
});

// Common action icons
export const ActionIcons = {
  Save: <SaveIcon />,
  Export: <ExportIcon />,
  Reset: <ResetIcon />,
  Share: <ShareIcon />,
};

