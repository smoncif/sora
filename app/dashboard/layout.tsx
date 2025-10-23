'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { useAuth } from 'lib/hooks/useAuth';
import { MUIProvider } from 'lib/components/layout/MUIProvider';
import { MainLayout } from 'lib/components/layout';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  // Si l'authentification est en cours de chargement, on peut afficher un état de chargement
  if (loading) {
    return (
      <MUIProvider>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement...</Typography>
        </Box>
      </MUIProvider>
    );
  }

  // Si l'utilisateur n'est pas connecté, il sera redirigé par le middleware
  // Donc on ne fait rien de particulier ici

  return (
    <MUIProvider>
      <MainLayout>
        {children}
      </MainLayout>
    </MUIProvider>
  );
} 



