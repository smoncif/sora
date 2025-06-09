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
import { RegisterForm } from '@/components/auth/RegisterForm';

/**
 * Page d'inscription complète
 * 
 * Composant qui affiche la page complète d'inscription avec le formulaire,
 * le logo, et les liens vers les autres pages d'authentification.
 */
export const RegisterPage = () => {
  return (
    <Container component="main" maxWidth="sm">
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
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          {/* Logo placeholder */}
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            SORA
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            SAP Optimal Role Analyzer
          </Typography>
        </Box>

        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              Créer un compte
            </Typography>
            
            <RegisterForm />
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Vous avez déjà un compte ?{' '}
                <Button
                  component={Link}
                  href="/login"
                  color="primary"
                  size="small"
                  sx={{ p: 0, minWidth: 'auto' }}
                >
                  Se connecter
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


