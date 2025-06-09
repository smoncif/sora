'use client';

import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  useTheme,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { CurrentUserAvatar } from '@/components/common';

export interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
}

/**
 * Composant d'en-tête utilisé dans toute l'application
 */
const Header: React.FC<HeaderProps> = ({ 
  title = 'SORA Platform', 
  onMenuToggle 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {isMobile && onMenuToggle && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CurrentUserAvatar size={40} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 
