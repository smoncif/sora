/**
 * Page d'erreur pour les liens de validation invalides ou expirés
 */

import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';
import Link from 'next/link';

export default function ValidationNotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 3,
        }}
      >
        <ErrorOutline sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Lien Invalide ou Expiré
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Ce lien de validation n'existe pas ou a expiré.
          <br />
          Veuillez contacter la personne qui vous l'a envoyé pour obtenir un nouveau lien.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            component={Link}
            href="/"
          >
            Retour à l'accueil
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}







