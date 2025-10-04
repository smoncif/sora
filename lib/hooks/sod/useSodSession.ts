/**
 * Hook pour gérer la session d'analyse SoD
 * 
 * Gestion :
 * - Navigation entre les steps (1-4)
 * - Préservation de l'état
 * - Upload de fichier
 * - Parsing et analyse
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
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
}

/**
 * Hook pour gérer la session d'analyse SoD
 */
export const useSodSession = (options: UseSodSessionOptions = {}): UseSodSessionReturn => {
  const { userId = 'anonymous', onUploadSuccess, onError } = options;
  
  // État de la session
  const [session, setSession] = useState<SodAnalysisSession | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
  // États de chargement
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const isLoading = isUploading || isParsing;
  
  /**
   * Upload et parse du fichier
   */
  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsParsing(false);
    setError(null);
    setWarnings([]);
    
    try {
      // Étape 1 : Parser le fichier Excel
      setIsParsing(true);
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
      
      setSession(newSession);
      setCurrentStep(1);
      
      if (onUploadSuccess) {
        onUploadSuccess(newSession);
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  }, [userId, onUploadSuccess, onError]);
  
  /**
   * Réinitialiser la session
   */
  const resetSession = useCallback(() => {
    setSession(null);
    setCurrentStep(1);
    setError(null);
    setWarnings([]);
  }, []);
  
  /**
   * Changer de step (avec validation)
   */
  const handleSetCurrentStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setCurrentStep(step);
    
    // Mettre à jour la session si elle existe
    if (session) {
      setSession({
        ...session,
        currentStep: step,
        metadata: {
          ...session.metadata,
          lastModified: new Date(),
        },
      });
    }
  }, [session]);
  
  // Données dérivées
  const simpleRoles = useMemo(() => session?.simpleRoles.roles || [], [session]);
  const simpleRolesMetrics = useMemo(() => session?.simpleRoles.metrics || null, [session]);
  const compositeRoles = useMemo(() => session?.compositeRoles.roles || [], [session]);
  const compositeRolesMetrics = useMemo(() => session?.compositeRoles.metrics || null, [session]);
  const filteringStats = useMemo(() => session?.filteringStats || null, [session]);
  
  return {
    session,
    currentStep,
    setCurrentStep: handleSetCurrentStep,
    uploadFile,
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
  };
};

