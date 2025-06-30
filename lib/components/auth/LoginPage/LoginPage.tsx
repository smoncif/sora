'use client';

import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Button,
} from '@mui/material';
import Link from 'next/link';
import { useEffect, Suspense } from 'react';
import { LoginForm } from '../LoginForm';
import { Logo } from 'lib/components/common';

/**
 * Page de connexion complète
 * 
 * Composant qui affiche la page complète de connexion avec le formulaire,
 * le logo, et les liens vers les autres pages d'authentification.
 */
export interface LoginPageProps {
  redirectAfterLogin?: string;
}

// Composant de chargement pour le Suspense
const LoginFormSkeleton = () => (
  <Box sx={{ p: 2, textAlign: 'center' }}>
    <Typography variant="body2" color="text.secondary">
      Chargement...
    </Typography>
  </Box>
);

export const LoginPage = ({ redirectAfterLogin }: LoginPageProps) => {
  // Effet pour compléter la déconnexion si l'utilisateur vient d'être déconnecté
  useEffect(() => {
    // Appeler l'API de déconnexion pour s'assurer que la session est complètement nettoyée
    const completeSignOut = async () => {
      try {
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        // Ignorer les erreurs de déconnexion
      }
    };
    
    completeSignOut();
  }, []);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4
        }}
      >
        {/* Logo et titre */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Logo variant="auth" size="large" />
        </Box>

        {/* Carte de connexion */}
        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              Connexion
            </Typography>

            {/* Formulaire de connexion avec Suspense */}
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm redirectAfterLogin={redirectAfterLogin} />
            </Suspense>

            {/* Liens vers d'autres pages */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Mot de passe oublié ?{' '}
                <Button
                  component={Link}
                  href="/reset-password/request"
                  color="primary"
                  size="small"
                  sx={{ p: 0, minWidth: 'auto' }}
                >
                  Réinitialiser
                </Button>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Besoin d&apos;un compte ?{' '}
                <Button
                  component={Link}
                  href="/register"
                  color="primary"
                  size="small"
                  sx={{ p: 0, minWidth: 'auto' }}
                >
                  S&apos;inscrire
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Pied de page */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Artimis. Tous droits réservés.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}; 


