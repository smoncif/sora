'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, 
  Card, 
  CardContent, 
  Container, 
  Typography
} from '@mui/material';
import Image from 'next/image';
import { ConfirmResetPasswordForm } from '../ConfirmResetPasswordForm';

/**
 * Page de confirmation de réinitialisation de mot de passe
 * 
 * Cette page permet à l'utilisateur de créer un nouveau mot de passe
 * après avoir cliqué sur un lien de réinitialisation.
 */
export const ConfirmResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tokenError, setTokenError] = useState(false);

  // Vérifier si le token est présent dans l'URL
  useEffect(() => {
    // Vérification du token et autres paramètres
    const hasRequiredParams = searchParams && 
                             searchParams.has('access_token') && 
                             searchParams.has('refresh_token') && 
                             searchParams.has('expires_in') && 
                             searchParams.has('token_type');
                             
    if (!hasRequiredParams) {
      setTokenError(true);
    }
  }, [searchParams]);

  const handleSuccess = () => {
    if (tokenError) {
      router.push('/reset-password/request');
    } else {
      router.push('/login');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          {/* Logo */}
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            SORA
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            SAP Optimal Role Analyzer
          </Typography>
          <Typography variant="h5" sx={{ mt: 2 }}>
            {tokenError ? 'Lien invalide' : 'Nouveau mot de passe'}
          </Typography>
        </Box>

        <Card sx={{ width: '100%' }}>
          <CardContent>
            <ConfirmResetPasswordForm 
              tokenError={tokenError}
              onSuccess={handleSuccess}
            />
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};


