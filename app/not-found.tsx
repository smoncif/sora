'use client';

import React from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box,
  Paper
} from '@mui/material';
import { useRouter } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import SearchOffIcon from '@mui/icons-material/SearchOff';

/**
 * Page 404 - Ressource non trouvée
 * Composant Next.js 15 pour gérer les erreurs 404
 */
export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 6, 
          textAlign: 'center',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Box sx={{ mb: 4 }}>
          <SearchOffIcon 
            sx={{ 
              fontSize: 120, 
              color: 'primary.main',
              mb: 2
            }} 
          />
        </Box>

        <Typography 
          variant="h1" 
          component="h1" 
          sx={{ 
            fontSize: '8rem', 
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 2
          }}
        >
          404
        </Typography>

        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: 3
          }}
        >
          Page non trouvée
        </Typography>

        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.secondary',
            mb: 4,
            lineHeight: 1.6
          }}
        >
          Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
          <br />
          Vérifiez l&apos;URL ou retournez à l&apos;accueil.
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{ 
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem'
            }}
          >
            Retour au Dashboard
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={handleGoBack}
            sx={{ 
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem'
            }}
          >
            Page précédente
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

