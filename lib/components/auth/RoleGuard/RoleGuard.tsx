'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/auth';
import { UserRole } from 'lib/types/auth';

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles: UserRole | UserRole[];
  redirectTo?: string;
}

const RoleGuard = ({ children, requiredRoles, redirectTo = '/login' }: RoleGuardProps) => {
  const router = useRouter();
  const { hasRole, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Attendre que l'authentification soit chargée
    if (!isLoading) {
      // Si non authentifié, rediriger vers la page de connexion
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      
      // Vérifier si l'utilisateur a le rôle requis
      if (!hasRole(requiredRoles)) {
        router.push(redirectTo);
      }
    }
  }, [isLoading, isAuthenticated, hasRole, requiredRoles, redirectTo, router]);

  // Ne rien afficher pendant le chargement ou si l'utilisateur n'a pas les droits
  if (isLoading || !isAuthenticated || !hasRole(requiredRoles)) {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard; 


