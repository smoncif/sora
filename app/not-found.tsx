'use client';

import React from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box
} from '@mui/material';
import { useRouter } from 'next/navigation';

/**
 * Page 404 personnalisée avec crocodile
 */
export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafbfc',
        py: 4
      }}
    >
      <Container maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '3.5rem', sm: '5rem', md: '6rem' },
            fontWeight: 700,
            color: '#333',
            mb: 2,
            textAlign: 'center',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img
            src="/images/404-crocodile.png"
            alt="Crocodile sous la douche - page non trouvée"
            style={{
              maxWidth: 260,
              width: '100%',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              borderRadius: 0
            }}
          />
        </Box>

        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#333',
            mb: 2,
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          Eh bien, Bonjour !
        </Typography>

        <Typography
          variant="h6"
          sx={{
            color: '#333',
            mb: 4,
            textAlign: 'center',
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: 400
          }}
        >
          Il semble que vous ayez terminé au mauvais endroit. Vite, refermez le rideau et retournez à la page d'Accueil.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleGoHome}
          sx={{
            px: 6,
            py: 1.8,
            borderRadius: 8,
            textTransform: 'none',
            fontSize: '1.25rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(60, 180, 120, 0.10)',
            background: '#16a765',
            '&:hover': { background: '#129a59' }
          }}
        >
          Accueil
        </Button>
      </Container>
    </Box>
  );
}

