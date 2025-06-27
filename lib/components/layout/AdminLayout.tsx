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
  Avatar, 
  Menu, 
  MenuItem, 
  Tooltip, 
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { useAuth } from 'lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from 'lib/types/auth';
import CurrentUserAvatar from '../common/CurrentUserAvatar';

// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import KeyIcon from '@mui/icons-material/Key';
import HistoryIcon from '@mui/icons-material/History';
import BuildIcon from '@mui/icons-material/Build';
import LayersIcon from '@mui/icons-material/Layers';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Constantes
const DRAWER_WIDTH = 240;

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour les pages d'administration
 * 
 * Fournit la structure des pages d'administration avec une barre latérale de navigation,
 * un en-tête avec les informations utilisateur et la déconnexion, et une zone de contenu principale.
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [year, setYear] = useState('');
  const { user, signOut, isAuthenticated, hasRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Vérifier si l'utilisateur a le rôle admin
  useEffect(() => {
    // Attendre que l'authentification soit initialisée
    if (loading) {
      setAuthLoading(true);
      return;
    }

    setAuthLoading(false);

    if (!isAuthenticated) {
      // Rediriger vers la page de connexion
      router.push('/login?redirect=/admin');
      return;
    }

    if (!hasRole(UserRole.ADMIN)) {
      setAccessDenied(true);
      return;
    }

    setAccessDenied(false);
  }, [isAuthenticated, hasRole, router, loading]);

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    handleMenuClose();
    signOut();
  };

  const handleProfileClick = () => {
    handleMenuClose();
    router.push('/profile');
  };

  // Navigation pour l'administration
  const adminNavItems = [
    { text: 'Tableau de bord', href: '/admin', icon: <DashboardIcon /> },
          { text: 'Gestion des utilisateurs', href: '/settings/users-management', icon: <PeopleIcon /> },
    { text: 'Profils et permissions', href: '/admin/profiles', icon: <SecurityIcon /> },
    { text: 'Configuration des modules', href: '/admin/modules', icon: <LayersIcon /> },
    { text: 'Licences', href: '/admin/licenses', icon: <KeyIcon /> },
    { text: 'Journaux d\'audit', href: '/admin/audit', icon: <HistoryIcon /> },
    { text: 'Paramètres système', href: '/admin/settings', icon: <SettingsIcon /> },
    { text: 'Maintenance', href: '/admin/maintenance', icon: <BuildIcon /> },
  ];

  // Détermine le titre de la page active à partir du chemin
  const getActivePageTitle = () => {
    const activeItem = adminNavItems.find(item => item.href === pathname);
    return activeItem ? activeItem.text : 'Administration';
  };

  // Génère les fil d'Ariane (breadcrumbs)
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    const breadcrumbs = [];
    
    // Accueil
    breadcrumbs.push({
      text: 'Accueil',
      href: '/',
    });
    
    // Admin (toujours présent dans ce layout)
    breadcrumbs.push({
      text: 'Administration',
      href: '/admin',
    });
    
    // Sous-section si nécessaire
    if (pathSegments.length > 1 && pathSegments[0] === 'admin') {
      const activeItem = adminNavItems.find(item => 
        item.href === `/${pathSegments[0]}/${pathSegments[1]}`
      );
      
      if (activeItem) {
        breadcrumbs.push({
          text: activeItem.text,
          href: activeItem.href,
        });
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  // Affichage conditionnel selon l'état d'authentification
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Vérification des permissions...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (accessDenied) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <SecurityIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="error">
              Accès Non Autorisé
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
            </Typography>
            <Typography variant="body2" paragraph color="text.secondary">
              Erreur: access-denied: Insufficient permissions
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => router.push('/')}
                startIcon={<HomeIcon />}
              >
                Retour à l'accueil
              </Button>
              <Button
                variant="outlined"
                onClick={() => signOut()}
                startIcon={<ExitToAppIcon />}
              >
                Se déconnecter
              </Button>
            </Box>
            
            {/* Informations de débogage pour l'admin */}
            {user && (
              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Informations de débogage:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {user.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rôle actuel: {user.role}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rôle requis: {UserRole.ADMIN}
                </Typography>
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    );
  }

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {adminNavItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton 
              component={Link} 
              href={item.href}
              selected={pathname === item.href}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            SORA Admin
          </Typography>
          
          {/* User Menu */}
          {isAuthenticated && (
            <>
              <Tooltip title="Paramètres du compte">
                <IconButton onClick={handleProfileMenuOpen} color="inherit">
                  <CurrentUserAvatar />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleProfileClick}>
                  <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} />
                  Profil
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ExitToAppIcon fontSize="small" sx={{ mr: 1 }} />
                  Déconnexion
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
        aria-label="admin navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          marginTop: '64px' // Hauteur de la toolbar
        }}
      >
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          aria-label="breadcrumb"
          sx={{ mb: 3 }}
        >
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return isLast ? (
              <Typography color="text.primary" key={item.href}>
                {item.text}
              </Typography>
            ) : (
              <MuiLink 
                component={Link} 
                href={item.href} 
                underline="hover" 
                color="inherit"
                key={item.href}
              >
                {item.text}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
        
        {/* Page Title */}
        <Typography variant="h4" component="h1" gutterBottom>
          {getActivePageTitle()}
        </Typography>
        
        {/* Page Content */}
        {children}
      </Box>
    </Box>
  );
};

export default AdminLayout; 


