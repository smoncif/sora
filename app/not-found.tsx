import Link from 'next/link';
import { Container, Box, Typography, Button, Card, CardContent } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';

export const metadata = {
  title: 'Page non trouvée - SORA',
  description: 'La page que vous recherchez n\'existe pas ou a été déplacée',
};

export default function NotFoundPage() {
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
            {/* Icône 404 */}
            <SearchOffIcon 
              sx={{ 
                fontSize: 80, 
                color: 'warning.main', 
                mb: 3 
              }} 
            />
            
            {/* Titre */}
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Page Non Trouvée
            </Typography>
            
            <Typography variant="h6" color="warning.main" gutterBottom>
              Erreur 404
            </Typography>
            
            {/* Description */}
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
              La page que vous recherchez n'existe pas ou a été déplacée. 
              Vérifiez l'URL ou utilisez les liens ci-dessous pour naviguer.
            </Typography>
            
            {/* Actions */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2, 
              justifyContent: 'center',
              mb: 3
            }}>
              <Button 
                variant="contained" 
                color="primary"
                component={Link}
                href="/dashboard"
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
            </Box>
            
            {/* Informations supplémentaires */}
            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Besoin d'aide ?</strong><br />
                Si vous pensez qu'il s'agit d'un problème, contactez le support technique.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
} 
