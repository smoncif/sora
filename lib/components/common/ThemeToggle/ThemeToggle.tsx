'use client';

import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  SettingsBrightness as SystemIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useTheme } from '@/hooks/useTheme';

/**
 * Composant pour basculer entre les thèmes clair, sombre et système
 */
export const ThemeToggle: React.FC = () => {
  const muiTheme = useMuiTheme();
  const { mode, isDark, setThemeMode } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeSelect = (selectedMode: 'light' | 'dark' | 'system') => {
    setThemeMode(selectedMode);
    handleClose();
  };

  const getCurrentIcon = () => {
    switch (mode) {
      case 'light':
        return <LightIcon />;
      case 'dark':
        return <DarkIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <PaletteIcon />;
    }
  };

  const getCurrentLabel = () => {
    switch (mode) {
      case 'light':
        return 'Thème clair';
      case 'dark':
        return 'Thème sombre';
      case 'system':
        return 'Thème système';
      default:
        return 'Thème';
    }
  };

  const menuItems = [
    {
      mode: 'light' as const,
      icon: <LightIcon />,
      label: 'Clair',
      description: 'Thème clair permanent',
    },
    {
      mode: 'dark' as const,
      icon: <DarkIcon />,
      label: 'Sombre',
      description: 'Thème sombre permanent',
    },
    {
      mode: 'system' as const,
      icon: <SystemIcon />,
      label: 'Système',
      description: 'Suit les préférences système',
    },
  ];

  return (
    <>
      <Tooltip title={getCurrentLabel()}>
        <IconButton
          onClick={handleClick}
          size="medium"
          sx={{
            color: muiTheme.palette.text.primary,
            backgroundColor: isDark 
              ? muiTheme.palette.action.hover 
              : muiTheme.palette.background.paper,
            border: `1px solid ${muiTheme.palette.divider}`,
            '&:hover': {
              backgroundColor: muiTheme.palette.action.hover,
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              '&:first-of-type': {
                mt: 1,
              },
              '&:last-of-type': {
                mb: 1,
              },
            },
          },
        }}
      >
        {menuItems.map((item) => (
          <MenuItem
            key={item.mode}
            onClick={() => handleModeSelect(item.mode)}
            selected={mode === item.mode}
            sx={{
              '&.Mui-selected': {
                backgroundColor: muiTheme.palette.primary.main + '20',
                '&:hover': {
                  backgroundColor: muiTheme.palette.primary.main + '30',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: mode === item.mode 
                  ? muiTheme.palette.primary.main 
                  : muiTheme.palette.text.secondary,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: mode === item.mode ? 600 : 400,
                    color: mode === item.mode 
                      ? muiTheme.palette.primary.main 
                      : muiTheme.palette.text.primary,
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: muiTheme.palette.text.secondary,
                    display: 'block',
                  }}
                >
                  {item.description}
                </Typography>
              </Box>
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}; 


