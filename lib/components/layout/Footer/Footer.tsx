'use client';

import React from 'react';
import { Box, Typography, Container, Link as MuiLink } from '@mui/material';
import { OptimizedLink } from 'lib/components/common/OptimizedLink';

export interface FooterProps {
  companyName?: string;
  version?: string;
}

/**
 * Composant de pied de page utilisé dans toute l'application
 */
const Footer: React.FC<FooterProps> = ({
  companyName = 'SORA',
  version = 'v1.0.0'
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[100]
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} {companyName}. Tous droits réservés.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3 }}>
            <OptimizedLink href="/terms" prefetch={false}>
              <MuiLink variant="body2" color="text.secondary" underline="hover">
                Conditions d'utilisation
              </MuiLink>
            </OptimizedLink>
            <OptimizedLink href="/privacy" prefetch={false}>
              <MuiLink variant="body2" color="text.secondary" underline="hover">
                Politique de confidentialité
              </MuiLink>
            </OptimizedLink>
            <Typography variant="body2" color="text.secondary">
              {version}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 


