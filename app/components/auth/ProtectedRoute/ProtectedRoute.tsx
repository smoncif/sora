'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, Permission } from '@/types/auth';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: Permission | Permission[];
  fallbackUrl?: string;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

/**
 * Composant de protection des routes
 * 
 * Ce composant vérifie l'authentification et les permissions de l'utilisateur
 * avant d'afficher le contenu protégé. Il redirige vers la page de connexion
 * ou d'erreur selon le cas.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackUrl = '/login',
  loadingComponent,
  unauthorizedComponent,
}) => {
  const router = useRouter();
  const { 
    isAuthenticated, 
    loading, 
    hasRole, 
    hasPermission
  } = useAuth();
  
  useEffect(() => {
    // Si le chargement est terminé et l'utilisateur n'est pas authentifié
    if (!loading && !isAuthenticated) {
      // Construire l'URL de redirection avec l'URL de retour
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = `${fallbackUrl}?returnUrl=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
        return;
      }
      
    // Si l'utilisateur est authentifié mais n'a pas les permissions requises
    if (!loading && isAuthenticated) {
      // Vérifier le rôle requis
      if (requiredRole && !hasRole(requiredRole)) {
          throw new Error('unauthorized: Missing required role');
        }
      
      // Vérifier la permission requise
      if (requiredPermission && !hasPermission(requiredPermission)) {
          throw new Error('unauthorized: Missing required permission');
        }
      }
  }, [
    loading, 
    isAuthenticated, 
    requiredRole, 
    requiredPermission, 
    hasRole, 
    hasPermission, 
    router, 
    fallbackUrl
  ]);
  
  // Affichage pendant le chargement
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Vérification des autorisations...
        </Typography>
      </Box>
    );
  }
  
  // Si l'utilisateur n'est pas authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    return null;
  }

  // Vérifier les permissions après authentification
  const hasRequiredRole = !requiredRole || hasRole(requiredRole);
  const hasRequiredPermission = !requiredPermission || hasPermission(requiredPermission);

  // Si l'utilisateur n'a pas les permissions requises
  if (!hasRequiredRole || !hasRequiredPermission) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }

    // Redirection vers la page d'erreur (gérée par useEffect)
    return null;
  }

  // Afficher le contenu protégé
  return <>{children}</>;
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
