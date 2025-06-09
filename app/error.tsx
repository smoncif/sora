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
import SecurityIcon from '@mui/icons-material/Security';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  // Déterminer le type d'erreur
  const isUnauthorized = error.message.includes('unauthorized') || error.message.includes('permission');
  const isAccessDenied = error.message.includes('access-denied') || error.message.includes('denied');

  const getErrorContent = () => {
    if (isUnauthorized || isAccessDenied) {
      return {
        title: 'Accès Non Autorisé',
        description: 'Vous n\'avez pas les autorisations nécessaires pour accéder à cette page.',
        severity: 'error' as const
      };
    }
    
    return {
      title: 'Une erreur est survenue',
      description: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
      severity: 'error' as const
    };
  };

  const { title, description, severity } = getErrorContent();

  return (
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
              {title}
            </Typography>
            
            {/* Message d'erreur */}
            <Alert severity={severity} sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body1">
                {description}
              </Typography>
              {process.env.NODE_ENV === 'development' && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Erreur: {error.message}
                </Typography>
              )}
            </Alert>
            
            {/* Description */}
            <Typography variant="body1" color="text.secondary" paragraph>
              {isUnauthorized || isAccessDenied 
                ? 'Cette page nécessite des permissions spécifiques que votre compte ne possède pas actuellement. Veuillez contacter votre administrateur système si vous pensez qu\'il s\'agit d\'une erreur.'
                : 'Si le problème persiste, veuillez contacter le support technique.'
              }
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
                onClick={reset}
                startIcon={<RefreshIcon />}
                size="large"
              >
                Réessayer
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary"
                component={Link}
                href="/dashboard"
                startIcon={<DashboardIcon />}
                size="large"
              >
                Tableau de Bord
              </Button>
              
              <Button 
                variant="text" 
                color="primary"
                component={Link}
                href="/"
                startIcon={<HomeIcon />}
                size="large"
              >
                Accueil
              </Button>
            </Box>
            
            {/* Informations supplémentaires */}
            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Besoin d'aide ?</strong><br />
                Contactez votre administrateur système pour obtenir les autorisations nécessaires 
                ou vérifier la configuration de votre compte.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
} 


