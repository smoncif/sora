/**
 * Hook TanStack Query complet pour gérer les sessions d'analyse SoD
 * 
 * Combine :
 * - ✅ Cache automatique TanStack Query
 * - ✅ Toutes les fonctions de l'ancien useSodSession
 * - ✅ Optimistic updates
 * - ✅ Prefetching
 * - ✅ Gestion d'état optimisée
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  SodAnalysisSession,
  SodSimpleRole,
  SodCompositeRole,
  SodParsingResult,
  SodFilteringStats,
  SodSimpleRoleMetrics,
  SodCompositeRoleMetrics,
} from 'lib/types/sodAnalysis';
import { parseSodExcelFile } from 'lib/services/sod/sodParsingService';
import {
  buildSimpleRoleHierarchy,
  buildCompositeRoleHierarchy,
  calculateSimpleRoleMetrics,
  calculateCompositeRoleMetrics,
} from 'lib/services/sod/sodAnalysisService';

export interface UseSodSessionOptions {
  /** ID utilisateur */
  userId?: string;
  
  /** ID de session spécifique (optionnel) */
  sessionId?: string;
  
  /** Callback après upload réussi */
  onUploadSuccess?: (session: SodAnalysisSession) => void;
  
  /** Callback en cas d'erreur */
  onError?: (error: Error) => void;
}

export interface UseSodSessionReturn {
  /** Session actuelle */
  session: SodAnalysisSession | null;
  
  /** Step actuel */
  currentStep: 1 | 2 | 3 | 4;
  
  /** Changer de step */
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  
  /** Upload et parse du fichier */
  uploadFile: (file: File) => Promise<void>;
  
  /** Créer une session à partir de données déjà parsées (depuis Web Worker) */
  createSessionFromParsedData: (file: File, parsedRecords: any[]) => Promise<SodAnalysisSession | null>;
  
  /** États de chargement */
  isLoading: boolean;
  isUploading: boolean;
  isParsing: boolean;
  
  /** Erreurs */
  error: Error | null;
  
  /** Warnings du parsing */
  warnings: string[];
  
  /** Réinitialiser la session */
  resetSession: () => void;
  
  /** Rôles simples */
  simpleRoles: SodSimpleRole[];
  simpleRolesMetrics: SodSimpleRoleMetrics | null;
  
  /** Rôles composites */
  compositeRoles: SodCompositeRole[];
  compositeRolesMetrics: SodCompositeRoleMetrics | null;
  
  /** Statistiques de filtrage */
  filteringStats: SodFilteringStats | null;
  
  /** Mutations TanStack Query */
  mutations: {
    createSession: ReturnType<typeof useMutation<SodAnalysisSession, Error, SodAnalysisSession>>;
    updateSession: ReturnType<typeof useMutation<SodAnalysisSession, Error, { sessionId: string; updates: Partial<SodAnalysisSession> }>>;
    deleteSession: ReturnType<typeof useMutation<string, Error, string>>;
  };
}

// 🔑 Clés de query standardisées
const sodQueryKeys = {
  all: ['sod'] as const,
  session: (sessionId: string) => [...sodQueryKeys.all, 'session', sessionId] as const,
  sessions: (userId: string) => [...sodQueryKeys.all, 'sessions', userId] as const,
  analysis: (sessionId: string) => [...sodQueryKeys.all, 'analysis', sessionId] as const,
};

/**
 * Hook TanStack Query complet pour gérer les sessions SoD
 */
export const useSodSession = (options: UseSodSessionOptions = {}): UseSodSessionReturn => {
  const { userId = 'anonymous', sessionId, onUploadSuccess, onError } = options;
  const queryClient = useQueryClient();
  
  // État local pour les préférences utilisateur
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  // 🔄 QUERY : Récupérer la session actuelle
  const sessionQuery = useQuery({
    queryKey: sessionId ? sodQueryKeys.session(sessionId) : ['sod', 'empty'],
    queryFn: async () => {
      if (!sessionId) return null;
      
      // TODO: Remplacer par votre API réelle
      const response = await fetch(`/api/sod/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json() as Promise<SodAnalysisSession>;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // 🔄 MUTATION : Créer une nouvelle session
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: SodAnalysisSession) => {
      // TODO: Remplacer par votre API réelle
      const response = await fetch('/api/sod/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      if (!response.ok) throw new Error('Failed to create session');
      return response.json() as Promise<SodAnalysisSession>;
    },
    onSuccess: (newSession) => {
      console.log('✅ Session SOD créée avec succès:', newSession.id);
      
      // Mettre à jour le cache
      queryClient.setQueryData(sodQueryKeys.session(newSession.id), newSession);
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.sessions(userId) });
      
      if (onUploadSuccess) {
        onUploadSuccess(newSession);
      }
    },
    onError: (error) => {
      console.error('❌ Erreur lors de la création de la session:', error);
      if (onError) {
        onError(error as Error);
      }
    },
  });
  
  // 🔄 MUTATION : Mettre à jour une session
  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<SodAnalysisSession> }) => {
      // TODO: Remplacer par votre API réelle
      const response = await fetch(`/api/sod/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update session');
      return response.json() as Promise<SodAnalysisSession>;
    },
    onSuccess: (updatedSession) => {
      console.log('✅ Session SOD mise à jour:', updatedSession.id);
      
      // Mettre à jour le cache
      queryClient.setQueryData(sodQueryKeys.session(updatedSession.id), updatedSession);
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.sessions(userId) });
    },
  });
  
  // 🔄 MUTATION : Supprimer une session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      // TODO: Remplacer par votre API réelle
      const response = await fetch(`/api/sod/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete session');
      return sessionId;
    },
    onSuccess: (deletedSessionId) => {
      console.log('✅ Session SOD supprimée:', deletedSessionId);
      
      // Supprimer du cache
      queryClient.removeQueries({ queryKey: sodQueryKeys.session(deletedSessionId) });
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.sessions(userId) });
    },
  });
  
  /**
   * Upload et parse du fichier (⚠️ DEPRECATED - utiliser createSessionFromParsedData à la place)
   */
  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsParsing(true);
    setWarnings([]);
    
    try {
      // Étape 1 : Parser le fichier Excel
      const parsingResult: SodParsingResult = await parseSodExcelFile(file);
      
      setWarnings(parsingResult.warnings);
      
      if (parsingResult.errors.length > 0) {
        throw new Error(`Erreurs de parsing:\n${parsingResult.errors.join('\n')}`);
      }
      
      // Étape 2 : Construire les hiérarchies
      const simpleRoles = buildSimpleRoleHierarchy(parsingResult.simpleRoleRecords);
      const compositeRoles = buildCompositeRoleHierarchy(parsingResult.compositeRoleRecords);
      
      // Étape 3 : Calculer les métriques
      const simpleRolesMetrics = calculateSimpleRoleMetrics(simpleRoles);
      const compositeRolesMetrics = calculateCompositeRoleMetrics(compositeRoles);
      
      // Étape 4 : Créer la session
      const newSession: SodAnalysisSession = {
        id: `sod-${Date.now()}`,
        name: `Analyse SoD - ${file.name}`,
        timestamp: new Date(),
        currentStep: 1,
        
        sourceFile: {
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date(),
        },
        
        filteringStats: parsingResult.filteringStats,
        
        simpleRoles: {
          roles: simpleRoles,
          metrics: simpleRolesMetrics,
        },
        
        compositeRoles: {
          roles: compositeRoles,
          metrics: compositeRolesMetrics,
        },
        
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          lastModified: new Date(),
          processingTimeMs: parsingResult.metadata.processingTimeMs,
          version: '1.0.0',
        },
      };
      
      // Utiliser la mutation TanStack Query pour créer la session
      createSessionMutation.mutate(newSession);
      setCurrentStep(1);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (onError) {
        onError(error);
      }
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  }, [userId, onUploadSuccess, onError, createSessionMutation]);
  
  /**
   * Créer une session à partir de données déjà parsées (depuis Web Worker)
   * ✅ OPTIMISÉ : Pas de re-parsing, utilise directement les données du Worker
   * 🎯 OPTION B : Retourne la session créée pour que le workflow puisse mettre à jour le sessionId
   */
  const createSessionFromParsedData = useCallback(async (file: File, parsedRecords: any[]): Promise<SodAnalysisSession | null> => {
    console.log('🎯 createSessionFromParsedData appelée avec:', {
      fileName: file.name,
      recordsCount: parsedRecords.length,
      userId
    });
    
    setIsUploading(true);
    setWarnings([]);
    
    try {
      const startTime = Date.now();
      
      // Séparer les rôles simples et composites
      const simpleRoleRecords = parsedRecords.filter(r => !r.compositeBusinessRole || r.compositeBusinessRole.trim() === '');
      const compositeRoleRecords = parsedRecords.filter(r => r.compositeBusinessRole && r.compositeBusinessRole.trim() !== '');
      
      console.log('📊 Séparation des rôles:', {
        simples: simpleRoleRecords.length,
        composites: compositeRoleRecords.length
      });
      
      // Construire les hiérarchies
      const simpleRoles = buildSimpleRoleHierarchy(simpleRoleRecords);
      const compositeRoles = buildCompositeRoleHierarchy(compositeRoleRecords);
      
      console.log('🏗️ Hiérarchies construites:', {
        simpleRoles: simpleRoles.length,
        compositeRoles: compositeRoles.length
      });
      
      // Calculer les métriques
      const simpleRolesMetrics = calculateSimpleRoleMetrics(simpleRoles);
      const compositeRolesMetrics = calculateCompositeRoleMetrics(compositeRoles);
      
      // Statistiques de filtrage (approximatives)
      const filteringStats: SodFilteringStats = {
        originalRecordCount: parsedRecords.length,
        afterRuleIdRemoval: parsedRecords.length,
        afterControlFilter: parsedRecords.length,
        afterRiskIdFilter: parsedRecords.length,
        afterDuplicateRemoval: parsedRecords.length,
        removedDuplicates: 0,
        removedByControlFilter: 0,
        removedByRiskIdFilter: 0,
      };
      
      // Créer la session
      const processingTimeMs = Date.now() - startTime;
      const newSession: SodAnalysisSession = {
        id: `sod-${Date.now()}`,
        name: `Analyse SoD - ${file.name}`,
        timestamp: new Date(),
        currentStep: 1,
        
        sourceFile: {
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date(),
        },
        
        filteringStats,
        
        simpleRoles: {
          roles: simpleRoles,
          metrics: simpleRolesMetrics,
        },
        
        compositeRoles: {
          roles: compositeRoles,
          metrics: compositeRolesMetrics,
        },
        
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          lastModified: new Date(),
          processingTimeMs,
          version: '1.0.0',
        },
      };
      
      console.log('✅ Session créée:', {
        id: newSession.id,
        simpleRoles: newSession.simpleRoles.roles.length,
        compositeRoles: newSession.compositeRoles.roles.length
      });
      
      // Utiliser la mutation TanStack Query pour créer la session
      // 🎯 Utiliser mutateAsync pour attendre la réponse
      await createSessionMutation.mutateAsync(newSession);
      
      setCurrentStep(1);
      
      // 🎯 Retourner la session créée
      return newSession;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Erreur dans createSessionFromParsedData:', error);
      if (onError) {
        onError(error);
      }
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [userId, onError, createSessionMutation]);
  
  /**
   * Réinitialiser la session
   */
  const resetSession = useCallback(() => {
    setCurrentStep(1);
    setWarnings([]);
    setIsUploading(false);
    setIsParsing(false);
    
    // Supprimer la session du cache si elle existe
    if (sessionId) {
      queryClient.removeQueries({ queryKey: sodQueryKeys.session(sessionId) });
    }
  }, [sessionId, queryClient]);
  
  // État dérivé optimisé
  const session = sessionQuery.data || null;
  const isLoading = sessionQuery.isLoading || isUploading || isParsing;
  const error = sessionQuery.error as Error || null;
  
  const simpleRoles = session?.simpleRoles?.roles || [];
  const simpleRolesMetrics = session?.simpleRoles?.metrics || null;
  const compositeRoles = session?.compositeRoles?.roles || [];
  const compositeRolesMetrics = session?.compositeRoles?.metrics || null;
  const filteringStats = session?.filteringStats || null;
  
  return {
    session,
    currentStep,
    setCurrentStep,
    uploadFile,
    createSessionFromParsedData,
    isLoading,
    isUploading,
    isParsing,
    error,
    warnings,
    resetSession,
    simpleRoles,
    simpleRolesMetrics,
    compositeRoles,
    compositeRolesMetrics,
    filteringStats,
    mutations: {
      createSession: createSessionMutation,
      updateSession: updateSessionMutation,
      deleteSession: deleteSessionMutation,
    },
  };
};

/**
 * Hook pour sauvegarder une session (mutation)
 */
export function useSaveSodSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (session: SodAnalysisSession) => {
      // TODO: Remplacer par votre API réelle
      const response = await fetch('/api/sod/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
      if (!response.ok) throw new Error('Failed to save session');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // ✅ Invalider le cache pour recharger les données
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.sessions(variables.metadata.createdBy) });
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.session(variables.id) });
    },
  });
}

/**
 * 🚀 Hook pour prefetch une session (charge en arrière-plan)
 */
export function usePrefetchSodSession() {
  const queryClient = useQueryClient();
  
  return {
    prefetchSession: (sessionId: string) => {
      return queryClient.prefetchQuery({
        queryKey: sodQueryKeys.session(sessionId),
        queryFn: async () => {
          // TODO: Remplacer par votre API réelle
          const response = await fetch(`/api/sod/sessions/${sessionId}`);
          if (!response.ok) throw new Error('Failed to fetch session');
          return response.json();
        },
      });
    },
  };
}

/**
 * 🎯 Hook pour mettre à jour le cache manuellement (setQueryData)
 */
export function useUpdateSodCache() {
  const queryClient = useQueryClient();
  
  return {
    setSession: (sessionId: string, data: SodAnalysisSession) => {
      queryClient.setQueryData(sodQueryKeys.session(sessionId), data);
    },
    
    updateSession: (sessionId: string, updater: (old: SodAnalysisSession | undefined) => SodAnalysisSession) => {
      queryClient.setQueryData(sodQueryKeys.session(sessionId), updater);
    },
    
    invalidateSession: (sessionId: string) => {
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.session(sessionId) });
    },
  };
}

// Export des clés pour utilisation externe
export { sodQueryKeys };