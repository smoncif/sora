/**
 * Composant avec Suspense pour les résultats d'analyse SOD
 * Améliore les performances avec lazy loading
 */

'use client';

import React, { Suspense, lazy } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SodSimpleRoleCardSkeleton, SodCompositeRoleCardSkeleton } from '../skeleton/SodRoleCardSkeleton';

// Lazy loading des composants lourds
const SodSimpleRoleCard = lazy(() => import('../display/SodSimpleRoleCard').then(module => ({ default: module.SodSimpleRoleCard })));
const SodCompositeRoleCard = lazy(() => import('../display/SodCompositeRoleCard').then(module => ({ default: module.SodCompositeRoleCard })));

// Composant de fallback pour les erreurs
const ErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      p: 3, 
      border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`, 
      borderRadius: 3,
      bgcolor: alpha(theme.palette.error.main, 0.05),
      mb: 3,
    }}>
      <Typography variant="h6" color="error" gutterBottom>
        ⚠️ Erreur de chargement
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {error.message}
      </Typography>
      <button onClick={retry} style={{ 
        padding: '8px 16px', 
        backgroundColor: theme.palette.primary.main, 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
        Réessayer
      </button>
    </Box>
  );
};

// Wrapper avec Error Boundary
class SodErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SodErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={() => this.setState({ hasError: false, error: null })} 
        />
      );
    }

    return this.props.children;
  }
}

// Composants optimisés avec Suspense
export const SodSimpleRoleCardSuspense: React.FC<any> = (props) => {
  return (
    <SodErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<SodSimpleRoleCardSkeleton />}>
        <SodSimpleRoleCard {...props} />
      </Suspense>
    </SodErrorBoundary>
  );
};

export const SodCompositeRoleCardSuspense: React.FC<any> = (props) => {
  return (
    <SodErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<SodCompositeRoleCardSkeleton />}>
        <SodCompositeRoleCard {...props} />
      </Suspense>
    </SodErrorBoundary>
  );
};

// Hook pour gérer le lazy loading intelligent
export const useSodLazyLoading = (roles: any[], threshold: number = 10) => {
  const [visibleRoles, setVisibleRoles] = React.useState(roles.slice(0, threshold));
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (roles.length <= threshold) {
      setVisibleRoles(roles);
      return;
    }

    // Charger progressivement les rôles restants
    const loadMoreRoles = async () => {
      setIsLoading(true);
      
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setVisibleRoles(roles);
      setIsLoading(false);
    };

    // Déclencher le chargement après un court délai
    const timer = setTimeout(loadMoreRoles, 50);
    
    return () => clearTimeout(timer);
  }, [roles, threshold]);

  return { visibleRoles, isLoading };
};

