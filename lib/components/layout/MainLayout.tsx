'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { 
  AppBar, 
  Box, 
  Container, 
  CssBaseline, 
  Toolbar, 
  Typography, 
  IconButton, 
  Button, 
  Avatar, 
  Menu, 
  MenuItem, 
  Tooltip,
  useTheme,
  alpha,
  Chip,
  Divider,
  Badge,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/Analytics';

import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Main Layout Component
 * 
 * Provides the main application layout structure with header, main content area,
 * and footer.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const pathname = usePathname();
  const [year, setYear] = useState('');
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAnchorEl, setMobileAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileAnchorEl(event.currentTarget);
    setIsMobileMenuOpen(true);
  };

  const handleMobileMenuClose = () => {
    setMobileAnchorEl(null);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    handleMenuClose();
    signOut();
  };

  const handleProfileClick = () => {
    handleMenuClose();
    router.push('/profile');
  };

  const navItems = [
    { text: 'Accueil', href: '/', icon: <HomeIcon fontSize="small" /> },
    { text: 'Analyse de Rôles', href: '/dashboard/analysis/roles/analysis', icon: <AnalyticsIcon fontSize="small" /> },
  ];

  // Fonction pour vérifier si un lien est actif avec une logique plus précise
  const isActiveLink = (href: string) => {
    if (!pathname) return false;
    
    // Page d'accueil : exact match
    if (href === '/') {
      return pathname === '/';
    }
    
    // Pour les autres pages : logique hiérarchique
    // On priorise les chemins les plus spécifiques
    if (href === '/dashboard/analysis/roles/analysis') {
      return pathname === '/dashboard/analysis/roles/analysis';
    }
    
    
    
    // Fallback pour les autres cas
    return pathname === href;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* 🎨 Header minimaliste et professionnel */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.primary.main,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar sx={{ 
          minHeight: { xs: 64, sm: 70 },
          px: { xs: 2, sm: 3 },
        }}>
          {/* 🎯 Menu mobile */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ 
              mr: 2, 
              display: { xs: 'flex', md: 'none' },
              color: '#ffffff',
              '&:hover': {
                backgroundColor: alpha('#ffffff', 0.1),
              },
            }}
            onClick={handleMobileMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          
          {/* 🎨 Logo SORA minimaliste */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '1.8rem' },
                color: '#ffffff',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
              onClick={() => router.push('/')}
            >
            SORA
          </Typography>
          </Box>
          
          {/* 🎯 Navigation principale - Design moderne épuré */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            alignItems: 'center',
            mr: 3,
          }}>
            {navItems.map((item) => {
              const isActive = isActiveLink(item.href);
              return (
              <Link key={item.href} href={item.href} passHref style={{ textDecoration: 'none' }}>
                  <Box
                    sx={{
                      position: 'relative',
                      px: 3,
                      py: 1.5,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        '& .nav-text': {
                          color: '#ffffff',
                          transform: 'translateY(-1px)',
                        },
                        '& .nav-icon': {
                          transform: 'scale(1.1)',
                        },
                        '&::before': {
                          opacity: 1,
                          transform: 'scaleX(1)',
                        },
                      },
                      // Effet de fond au survol
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: alpha('#ffffff', 0.12),
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: '8px',
                      },
                      // Indicateur actif élégant
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: isActive ? '24px' : '0px',
                        height: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '2px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isActive ? `0 2px 8px ${alpha('#ffffff', 0.4)}` : 'none',
                      },
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      <Box 
                        className="nav-icon"
                        sx={{ 
                          color: isActive ? '#ffffff' : alpha('#ffffff', 0.85),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography 
                        className="nav-text"
                        variant="body2"
                        sx={{
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#ffffff' : alpha('#ffffff', 0.85),
                          fontSize: '0.9rem',
                          letterSpacing: '0.02em',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                >
                  {item.text}
                      </Typography>
                    </Box>
                  </Box>
              </Link>
              );
            })}
          </Box>

          {/* 🎯 Section utilisateur moderne */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Notifications avec design moderne */}
              <Box
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  p: 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    '& .notification-icon': {
                      color: '#ffffff',
                    },
                  },
                }}
              >
                <Box 
                  className="notification-icon"
                  sx={{ 
                    color: alpha('#ffffff', 0.85),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Badge 
                    badgeContent={3} 
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ff4444',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        minWidth: '18px',
                        height: '18px',
                        boxShadow: `0 2px 8px ${alpha('#ff4444', 0.4)}`,
                      },
                    }}
                  >
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </Box>
              </Box>

              {/* Avatar utilisateur avec design moderne */}
              <Box
                onClick={handleProfileMenuOpen}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  p: 0.5,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    '& .avatar-container': {
                      boxShadow: `0 4px 16px ${alpha('#ffffff', 0.3)}`,
                      transform: 'scale(1.05)',
                    },
                  },
                }}
              >
                <Box
                  className="avatar-container"
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: `2px solid ${alpha('#ffffff', 0.3)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha('#ffffff', 0.15),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <AccountCircleIcon 
                    sx={{ 
                      color: '#ffffff', 
                      fontSize: '1.4rem',
                    }} 
                  />
                </Box>
              </Box>
              
              {/* 🎯 Menu utilisateur redesigné */}
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                sx={{
                  '& .MuiPaper-root': {
                    mt: 2,
                    minWidth: 220,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                    borderRadius: '16px',
                    boxShadow: `
                      0 4px 32px ${alpha('#000000', 0.08)},
                      0 2px 16px ${alpha('#000000', 0.04)}
                    `,
                    overflow: 'hidden',
                  },
                }}
              >
                {/* En-tête utilisateur moderne */}
                <Box sx={{ 
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <AccountCircleIcon />
                    </Box>
                    <Box>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          lineHeight: 1.2,
                        }}
                      >
                        {user?.email?.split('@')[0] || 'Utilisateur'}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: theme.palette.text.secondary,
                          fontSize: '0.75rem',
                        }}
                      >
                        {user?.email || 'user@example.com'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Items du menu avec design moderne */}
                <Box sx={{ p: 1 }}>
                  <MenuItem 
                    onClick={handleProfileClick}
                    sx={{
                      borderRadius: '12px',
                      mx: 1,
                      my: 0.5,
                      px: 2,
                      py: 1.5,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <AccountCircleIcon 
                      fontSize="small" 
                      sx={{ 
                        mr: 2, 
                        color: theme.palette.primary.main,
                      }} 
                    />
                    <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      Mon Profil
                    </Typography>
                  </MenuItem>
                  
                  <MenuItem 
                    onClick={() => { handleMenuClose(); router.push('/settings'); }}
                    sx={{
                      borderRadius: '12px',
                      mx: 1,
                      my: 0.5,
                      px: 2,
                      py: 1.5,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <SettingsIcon 
                      fontSize="small" 
                      sx={{ 
                        mr: 2, 
                        color: theme.palette.secondary.main,
                      }} 
                    />
                    <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      Paramètres
                    </Typography>
                </MenuItem>
                </Box>
                
                <Divider sx={{ mx: 2, my: 1 }} />
                
                <Box sx={{ p: 1 }}>
                  <MenuItem 
                    onClick={handleLogout}
                    sx={{
                      borderRadius: '12px',
                      mx: 1,
                      my: 0.5,
                      px: 2,
                      py: 1.5,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <ExitToAppIcon 
                      fontSize="small" 
                      sx={{ 
                        mr: 2, 
                        color: theme.palette.error.main,
                      }} 
                    />
                    <Typography 
                      sx={{ 
                        fontWeight: 500, 
                        fontSize: '0.9rem',
                        color: theme.palette.error.main,
                      }}
                    >
                  Déconnexion
                    </Typography>
                </MenuItem>
                </Box>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* 🎯 Menu mobile redesigné */}
      <Menu
        anchorEl={mobileAnchorEl}
        id="mobile-menu"
        open={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
        sx={{
          '& .MuiPaper-root': {
            width: '280px',
            mt: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            borderRadius: '16px',
            boxShadow: `
              0 4px 32px ${alpha('#000000', 0.08)},
              0 2px 16px ${alpha('#000000', 0.04)}
            `,
            overflow: 'hidden',
          },
        }}
      >
        {/* En-tête du menu mobile */}
        <Box sx={{ 
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.primary.main,
              letterSpacing: '0.02em',
            }}
          >
            SORA
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
            }}
          >
            Business Role Analysis
          </Typography>
        </Box>

        {/* Navigation mobile moderne */}
        <Box sx={{ p: 1 }}>
          {navItems.map((item) => {
            const isActive = isActiveLink(item.href);
            return (
              <MenuItem 
                key={item.href} 
                onClick={() => {
            handleMobileMenuClose();
            router.push(item.href);
                }}
                sx={{
                  borderRadius: '12px',
                  mx: 1,
                  my: 0.5,
                  px: 2,
                  py: 1.5,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: isActive 
                    ? alpha(theme.palette.primary.main, 0.1) 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive 
                      ? alpha(theme.palette.primary.main, 0.15)
                      : alpha(theme.palette.primary.main, 0.08),
                    transform: 'translateX(4px)',
                  },
                  // Indicateur actif pour mobile
                  borderLeft: isActive 
                    ? `4px solid ${theme.palette.primary.main}` 
                    : '4px solid transparent',
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  width: '100%',
                }}>
                  <Box sx={{ 
                    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {item.icon}
                  </Box>
                  <Typography 
                    sx={{ 
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                      fontSize: '0.9rem',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {item.text}
                  </Typography>
                  {isActive && (
                    <Box sx={{ 
                      ml: 'auto',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.primary.main,
                      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                    }} />
                  )}
                </Box>
          </MenuItem>
            );
          })}
        </Box>
      </Menu>
      
      {/* Main Content */}
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        {children}
      </Container>
      
      {/* 🎨 Footer épuré */}
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto', 
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Container maxWidth="lg">
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center"
            sx={{
              fontWeight: 400,
              fontSize: '0.85rem',
            }}
          >
            © {year} SORA - Business Role Analysis • Développé avec ❤️ par Artimis
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout; 

