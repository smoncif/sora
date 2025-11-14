'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  alpha,
  Avatar,
  Stack,
  Container,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Assignment as LicenseIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from 'lib/hooks/auth/useAuth';
import { UserRole } from 'lib/types/auth';
import { MainLayout } from 'lib/components/layout';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 80;

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Configuration de la navigation
  const navigationItems = [
    {
      id: 'profile',
      label: 'Profil utilisateur',
      description: 'Modifier vos informations et mot de passe',
      icon: <PersonIcon />,
      href: '/settings/profile',
      roles: [UserRole.USER, UserRole.EDITOR, UserRole.ADMIN], // Accessible à tous
    },
    {
      id: 'validation-tracking',
      label: 'Suivi des validations',
      description: 'Gérer vos liens de validation',
      icon: <AssignmentTurnedInIcon />,
      href: '/settings/validation-tracking',
      roles: [UserRole.USER, UserRole.EDITOR, UserRole.ADMIN], // Accessible à tous
    },
    {
      id: 'users-management',
      label: 'Gestion des utilisateurs',
      description: 'Administrer les comptes utilisateurs',
      icon: <AdminIcon />,
      href: '/settings/users-management',
      roles: [UserRole.ADMIN], // Accessible uniquement aux admins
    },
    {
      id: 'licenses-management',
      label: 'Gestion des licences',
      description: 'Configurer les associations entre rôles simples et types de licences',
      icon: <LicenseIcon />,
      href: '/settings/licenses-management',
      roles: [UserRole.ADMIN], // Accessible uniquement aux admins
    },
  ];

  // Filtrer les éléments de navigation selon le rôle
  const filteredNavigationItems = navigationItems.filter(item =>
    item.roles.includes(userRole as UserRole)
  );

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!isAuthenticated) {
    return null; // Ou redirection vers login
  }

  return (
    <MainLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Sidebar */}
        <Paper
          elevation={2}
          sx={{
              width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRadius: 3,
            background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            height: 'fit-content',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              position: 'relative',
          }}
        >
          {/* Bouton collapse/expand */}
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 8,
              zIndex: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
              transition: 'all 0.2s ease',
            }}
            size="small"
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>

          {/* En-tête de la sidebar */}
          <Box sx={{ 
            p: 3, 
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderRadius: '12px 12px 0 0',
          }}>
            <Stack direction="row" alignItems="center" spacing={2} justifyContent={collapsed ? 'center' : 'flex-start'}>
              <Avatar sx={{ 
                bgcolor: theme.palette.primary.main,
                width: 48,
                height: 48,
              }}>
                <SettingsIcon />
              </Avatar>
              {!collapsed && (
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Paramètres
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configuration du compte
                </Typography>
              </Box>
              )}
            </Stack>
          </Box>

          {/* Informations utilisateur */}
          {!collapsed && (
          <Box sx={{ 
            p: 3,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                width: 40,
                height: 40,
              }}>
                <AccountIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {userRole === UserRole.ADMIN ? 'Administrateur' : 
                   userRole === UserRole.EDITOR ? 'Éditeur' : 'Utilisateur'}
                </Typography>
              </Box>
            </Stack>
          </Box>
          )}

          {/* Navigation */}
          <Box sx={{ p: 2 }}>
            <List sx={{ p: 0 }}>
              {filteredNavigationItems.map((item, index) => (
                <ListItem key={item.id} sx={{ p: 0, mb: 1 }}>
                  <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                  <ListItemButton
                    onClick={() => handleNavigation(item.href)}
                    sx={{
                      borderRadius: 2,
                      py: 2,
                      px: 2,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                      background: isActive(item.href) 
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                        : 'transparent',
                      border: isActive(item.href)
                        ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        : '1px solid transparent',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        background: isActive(item.href)
                          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`
                          : alpha(theme.palette.action.hover, 0.04),
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ 
                        minWidth: collapsed ? 0 : 40,
                      color: isActive(item.href) 
                        ? theme.palette.primary.main 
                        : theme.palette.text.secondary,
                        justifyContent: 'center',
                    }}>
                      {item.icon}
                    </ListItemIcon>
                      {!collapsed && (
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body2" 
                          fontWeight={isActive(item.href) ? 600 : 400}
                          color={isActive(item.href) ? 'primary.main' : 'text.primary'}
                        >
                          {item.label}
                        </Typography>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {item.description}
                        </Typography>
                      }
                    />
                      )}
                  </ListItemButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Footer de la sidebar */}
          {!collapsed && (
          <Box sx={{ 
            p: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: alpha(theme.palette.background.default, 0.5),
            borderRadius: '0 0 12px 12px',
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              Application SORA
            </Typography>
          </Box>
          )}
        </Paper>

        {/* Contenu principal */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0, // Permet au contenu de se rétrécir
          }}
        >
          {children}
        </Box>
      </Box>
      </Container>
    </MainLayout>
  );
}
 