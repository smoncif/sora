'use client';

import React from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Alert
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import SecurityIcon from '@mui/icons-material/Security';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '@/hooks/useAuth';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '70vh' 
        }}>
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              {/* Icône d'erreur */}
              <SecurityIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'error.main', 
                  mb: 3 
                }} 
              />
              
              {/* Titre */}
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Accès Non Autorisé
              </Typography>
              
              {/* Message d'erreur */}
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body1">
                  Vous n&apos;avez pas les autorisations nécessaires pour accéder à cette page.
                </Typography>
              </Alert>
              
              {/* Description */}
              <Typography variant="body1" color="text.secondary" paragraph>
                Cette page nécessite des permissions spécifiques que votre compte ne possède pas actuellement. 
                Veuillez contacter votre administrateur système si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
              </Typography>
              
              {/* Actions */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2, 
                justifyContent: 'center',
                mt: 4 
              }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  component={Link}
                  href="/"
                  startIcon={<DashboardIcon />}
                  size="large"
                >
                  Tableau de Bord
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="primary"
                  component={Link}
                  href="/"
                  startIcon={<HomeIcon />}
                  size="large"
                >
                  Accueil
                </Button>
                
                <Button 
                  variant="text" 
                  color="secondary"
                  onClick={handleSignOut}
                  size="large"
                >
                  Changer de Compte
                </Button>
              </Box>
              
              {/* Informations supplémentaires */}
              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Besoin d&apos;aide ?</strong><br />
                  Contactez votre administrateur système pour obtenir les autorisations nécessaires 
                  ou vérifier la configuration de votre compte.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </MainLayout>
  );
} 