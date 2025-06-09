'use client';

import { useRouter } from 'next/navigation';
import { 
  Box, 
  Card, 
  CardContent, 
  Container, 
  Typography
} from '@mui/material';
import Image from 'next/image';
import { RequestResetPasswordForm } from '@/components/auth/RequestResetPasswordForm';

/**
 * Page de demande de réinitialisation de mot de passe
 * 
 * Cette page permet à l'utilisateur de demander un lien de réinitialisation
 * de mot de passe en fournissant son adresse email.
 */
export const RequestResetPasswordPage = () => {
  const router = useRouter();

  const handleCancel = () => {
    router.push('/login');
  };

  const handleSuccess = () => {
    // La gestion du succès est déjà faite dans le formulaire
    // On pourrait ajouter des actions supplémentaires ici si nécessaire
  };

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          my: 8,
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          {/* Logo */}
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            SORA
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            SAP Optimal Role Analyzer
          </Typography>
          <Typography variant="h5" sx={{ mt: 2 }}>
            Réinitialisation de mot de passe
          </Typography>
        </Box>

        <Card sx={{ width: '100%' }}>
          <CardContent>
            <RequestResetPasswordForm 
              onCancel={handleCancel}
              onSuccess={handleSuccess}
            />
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}; 
