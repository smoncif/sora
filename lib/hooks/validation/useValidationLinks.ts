/**
 * Hook personnalisé pour gérer les liens de validation
 */

import { useState, useEffect, useCallback } from 'react';

export interface ProcessInfo {
  id: string;
  process: string;
  submitted_at?: string;
  validator_email?: string;
  validator_name?: string;
  updated_at?: string;
}

export interface ValidationLink {
  id: string;
  token: string;
  mission: string;
  businessRoles: string[];
  createdAt: string;
  expiresAt: string;
  status: string;
  technicalViewEnabled: boolean;
  createdBy: string;
  creatorEmail?: string | null;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  submittedCount: number;
  draftCount: number;
  processes: {
    submitted: ProcessInfo[];
    drafts: ProcessInfo[];
  };
}

export function useValidationLinks() {
  const [links, setLinks] = useState<ValidationLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Récupérer les liens
  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/validation/links');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des liens');
      }

      setLinks(result.data);
      setIsAdmin(result.isAdmin);
    } catch (err) {
      console.error('Erreur récupération liens:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Supprimer un lien
  const deleteLink = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/validation/links/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      // Rafraîchir la liste
      await fetchLinks();
      
      return true;
    } catch (err) {
      console.error('Erreur suppression lien:', err);
      throw err;
    }
  }, [fetchLinks]);

  // Prolonger un lien (mise à jour optimiste pour fluidité)
  const extendLink = useCallback(async (id: string, newExpirationDate: Date) => {
    try {
      const response = await fetch(`/api/validation/links/${id}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newExpirationDate: newExpirationDate.toISOString(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la prolongation');
      }

      // Mise à jour optimiste : mettre à jour uniquement le lien concerné
      const now = new Date();
      const daysRemaining = Math.ceil(
        (newExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      setLinks(prevLinks =>
        prevLinks.map(link =>
          link.id === id
            ? {
                ...link,
                expiresAt: newExpirationDate.toISOString(),
                status: 'active',
                isExpired: false,
                isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 2,
                daysRemaining,
              }
            : link
        )
      );
      
      return true;
    } catch (err) {
      console.error('Erreur prolongation lien:', err);
      throw err;
    }
  }, []);

  // Ouvrir un lien
  const openLink = useCallback((token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/validation/${token}`;
    window.open(url, '_blank');
  }, []);

  // Charger les liens au montage
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return {
    links,
    isLoading,
    error,
    isAdmin,
    fetchLinks,
    deleteLink,
    extendLink,
    openLink,
  };
}


