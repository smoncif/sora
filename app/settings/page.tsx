'use client';

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  useTheme,
  alpha,
  Stack,
  Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from 'lib/hooks/auth/useAuth';
import { UserRole } from 'lib/types/auth';

export default function SettingsPage() {
  const theme = useTheme();
  const router = useRouter();
  const { userRole } = useAuth();

  const settingsCards = [
    {
      id: 'profile',
      title: 'Profil utilisateur',
      description: 'Modifiez vos informations personnelles, nom, email et mot de passe',
      icon: <PersonIcon />,
      href: '/settings/profile',
      color: theme.palette.primary.main,
      roles: [UserRole.USER, UserRole.EDITOR, UserRole.ADMIN],
    },
    {
      id: 'users-management',
      title: 'Gestion des utilisateurs',
      description: 'Administrez les comptes utilisateurs, approuvez ou rejetez les demandes',
      icon: <AdminIcon />,
      href: '/settings/users-management',
      color: theme.palette.error.main,
      roles: [UserRole.ADMIN],
    },
  ];

  const availableCards = settingsCards.filter(card =>
    card.roles.includes(userRole as UserRole)
  );

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  return (
    <Box sx={{ py: 2, px: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 6 }}>
        <Typography 
          variant="h4" 
          fontWeight="bold" 
          gutterBottom
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Paramètres du compte
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
          Personnalisez votre expérience et gérez les paramètres de votre compte
        </Typography>
      </Box>

      {/* Cartes des paramètres */}
      <Grid container spacing={3}>
        {availableCards.map((card) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={card.id}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.15)}`,
                  border: `1px solid ${alpha(card.color, 0.3)}`,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleCardClick(card.href)}
                sx={{
                  height: '100%',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                }}
              >
                <CardContent sx={{ p: 0, width: '100%', '&:last-child': { pb: 0 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(card.color, 0.1),
                        color: card.color,
                        width: 56,
                        height: 56,
                      }}
                    >
                      {card.icon}
                    </Avatar>
                    <ChevronRightIcon 
                      sx={{ 
                        color: alpha(theme.palette.text.secondary, 0.5),
                        transition: 'transform 0.2s ease-in-out',
                        '.MuiCardActionArea-root:hover &': {
                          transform: 'translateX(4px)',
                          color: card.color,
                        }
                      }} 
                    />
                  </Stack>

                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    gutterBottom
                    sx={{ color: theme.palette.text.primary }}
                  >
                    {card.title}
                  </Typography>

                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Section d'aide */}
      <Box sx={{ mt: 8 }}>
        <Card
          sx={{
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  width: 40,
                  height: 40,
                }}
              >
                ❓
              </Avatar>
              <Typography variant="h6" fontWeight="bold" color="info.main">
                Besoin d'aide ?
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Si vous rencontrez des difficultés avec les paramètres de votre compte ou si vous avez des questions,
              n'hésitez pas à contacter notre équipe de support technique.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
