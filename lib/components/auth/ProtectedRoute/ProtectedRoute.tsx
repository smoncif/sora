'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Alert, 
  Button, 
  Container,
  Stack
} from '@mui/material';
import { useAuth } from 'lib/hooks/auth/useAuth';
import { UserRole } from 'lib/types/auth';
import SecurityIcon from '@mui/icons-material/Security';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';

export interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallbackUrl?: string;
  showAccessDenied?: boolean;
}

/**
 * Composant de protection de route qui vérifie l'authentification et les rôles
 * 
 * @param children - Les composants enfants à afficher si l'accès est autorisé
 * @param requireAuth - Si true, l'utilisateur doit être authentifié
 * @param requiredRole - Rôle unique requis
 * @param requiredRoles - Liste de rôles autorisés (OR logic)
 * @param fallbackUrl - URL de redirection si l'accès est refusé
 * @param showAccessDenied - Si true, affiche une page d'erreur au lieu de rediriger
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  requiredRoles,
  fallbackUrl = '/login',
  showAccessDenied = true
}) => {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  useEffect(() => {
    // Attendre que l'authentification soit complètement initialisée
    if (loading) {
      setShouldRender(false);
      setAccessDenied(false);
      setAuthInitialized(false);
        return;
      }
      
    setAuthInitialized(true);

    // Si l'authentification n'est pas requise, afficher directement
    if (!requireAuth) {
      setShouldRender(true);
      setAccessDenied(false);
      return;
    }

    // Vérifier l'authentification
    if (!isAuthenticated) {
      setShouldRender(false);
      setAccessDenied(true);
      
      if (!showAccessDenied) {
        const redirectUrl = `${fallbackUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
        router.push(redirectUrl);
      }
      return;
    }

    // Vérifier les rôles si spécifiés
    if (requiredRole || requiredRoles) {
      const rolesToCheck = requiredRoles || (requiredRole ? [requiredRole] : []);
      const hasRequiredRole = rolesToCheck.some(role => hasRole(role));

      if (!hasRequiredRole) {
        setShouldRender(false);
        setAccessDenied(true);
        
        if (!showAccessDenied) {
          router.push('/unauthorized');
        }
        return;
      }
    }

    // Toutes les vérifications sont passées
    setShouldRender(true);
    setAccessDenied(false);
  }, [
    loading, 
    isAuthenticated, 
    hasRole, 
    requireAuth, 
    requiredRole, 
    requiredRoles, 
    fallbackUrl, 
    showAccessDenied,
    router
  ]);

  // Affichage de chargement pendant l'initialisation
  if (loading || !authInitialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column'
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Vérification des permissions...
        </Typography>
      </Box>
    );
  }
  
  // Affichage d'erreur d'accès
  if (accessDenied && showAccessDenied) {
    const missingRole = requiredRole || (requiredRoles && requiredRoles[0]);
    
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <SecurityIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom color="error">
              Accès Non Autorisé
            </Typography>
            
            {!isAuthenticated ? (
              <>
                <Typography variant="body1" paragraph color="text.secondary">
                  Vous devez être connecté pour accéder à cette page.
                </Typography>
                
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                    startIcon={<LoginIcon />}
                  >
                    Se connecter
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => router.push('/')}
                    startIcon={<HomeIcon />}
                  >
                    Retour à l'accueil
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Typography variant="body1" paragraph color="text.secondary">
                  Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
                </Typography>
                
                <Typography variant="body2" paragraph color="text.secondary">
                  Erreur: access-denied: Insufficient permissions
                </Typography>
                
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/')}
                    startIcon={<HomeIcon />}
                  >
                    Retour à l'accueil
                  </Button>
                </Stack>
                
                {/* Informations de débogage */}
                {user && (
                  <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Informations de débogage:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email: {user.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rôle actuel: {user.role}
                    </Typography>
                    {missingRole && (
                      <Typography variant="body2" color="text.secondary">
                        Rôle requis: {missingRole}
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        </Container>
      </Box>
    );
  }

  // Affichage du contenu si tout est OK
  if (shouldRender) {
    return <>{children}</>;
  }

  // État de fallback (ne devrait pas arriver)
  return null;
};

/**
 * Hook utilitaire pour protéger des composants
 */
export const useProtectedRoute = (
  requiredRole?: UserRole | UserRole[],
  requiredPermission?: Permission | Permission[]
) => {
  const { isAuthenticated, loading, hasRole, hasPermission } = useAuth();

  const isAuthorized = React.useMemo(() => {
    if (loading || !isAuthenticated) {
      return false;
    }

    const hasRequiredRole = !requiredRole || hasRole(requiredRole);
    const hasRequiredPermission = !requiredPermission || hasPermission(requiredPermission);

    return hasRequiredRole && hasRequiredPermission;
  }, [loading, isAuthenticated, requiredRole, requiredPermission, hasRole, hasPermission]);

  return {
    isAuthenticated,
    isAuthorized,
    loading,
  };
}; 


