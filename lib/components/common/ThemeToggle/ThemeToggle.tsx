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
} from '@mui/icons-material';
import { useTheme } from 'lib/hooks/useTheme';

/**
 * Composant pour basculer entre les thèmes clair et sombre
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

  const handleModeSelect = (selectedMode: 'light' | 'dark') => {
    setThemeMode(selectedMode);
    handleClose();
  };

  const getCurrentIcon = () => {
    return isDark ? <DarkIcon /> : <LightIcon />;
  };

  const getCurrentLabel = () => {
    return isDark ? 'Thème sombre' : 'Thème clair';
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
  ];

  return (
    <>
      <Tooltip title={getCurrentLabel()}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            color: muiTheme.palette.text.secondary,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              color: muiTheme.palette.primary.main,
              transform: 'translateY(-1px)',
            },
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


