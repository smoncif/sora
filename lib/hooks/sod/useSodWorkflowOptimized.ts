/**
 * Hook optimisé pour gérer le workflow complet de l'analyse SOD
 * Utilise TanStack Query pour une gestion d'état optimale
 */

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSodSession } from './useSodAnalysisQuery';
import { useSodExcelParserOptimized } from './useSodExcelParserOptimized';
import { resetSodGlobalMaps } from 'lib/utils/sodRulesApplication';
import { buildUserSodSession } from 'lib/services/sod/userSodAnalysisService';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';
import type { SodExcelFileType } from 'lib/types/userSodAnalysis';

export interface SodWorkflowConfig {
  userId: string;
}

export interface SodWorkflowState {
  // État du fichier
  importType: 'new' | 'import' | 'resume';
  loading: boolean;
  error: string | null;
  
  // État de l'analyse d'usage
  enableUsageAnalysis: boolean;
  
  // Session SOD
  session: any;
  currentStep: number;
  
  // État du parsing
  parsing: boolean;
  parsingProgress: number;
  parsingMessage: string;
  parsingError: string | null;
}

export interface SodWorkflowActions {
  // Gestion du type d'import
  setImportType: (type: 'new' | 'import' | 'resume') => void;
  
  // Gestion des fichiers
  startNewAnalysis: (file: File) => Promise<void>;
  loadSavedAnalysis: () => Promise<void>;
  resumeFromFile: () => Promise<void>;
  
  // Gestion de l'analyse d'usage
  setEnableUsageAnalysis: (enabled: boolean) => void;
  
  // Gestion des étapes
  setCurrentStep: (step: number) => void;
  
  // Création de session depuis données parsées
  createSessionFromParsedData: (file: File, parsedRecords: any[]) => Promise<SodAnalysisSession | null>;
  
  // Remédiation automatique
  startAutomaticRemediation: () => Promise<void>;
  
  // Reset du workflow
  resetWorkflow: () => void;
}

export interface SodWorkflow {
  state: SodWorkflowState;
  actions: SodWorkflowActions;
}

export const useSodWorkflowOptimized = (config: SodWorkflowConfig): SodWorkflow => {
  // 🔍 LOG : Détecter les re-renders du hook
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  const queryClient = useQueryClient();
  
  // État local pour les préférences utilisateur (ne nécessite pas de cache)
  const [importType, setImportType] = useState<'new' | 'import' | 'resume'>('new');
  const [enableUsageAnalysis, setEnableUsageAnalysis] = useState(false);
  
  // 🎯 OPTION B : État pour gérer quelle session est actuellement active
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  
  // Référence au fichier uploadé (pour créer la session après le parsing)
  const uploadedFileRef = useRef<File | null>(null);
  
  // Session SOD avec TanStack Query complet
  // 🎯 OPTION B : Passer activeSessionId pour que React Query fetch la bonne session
  const sodSession = useSodSession({ 
    userId: config.userId,
    sessionId: activeSessionId  // ← Clé dynamique
  });
  
  // ✅ SOLUTION : Extraire les valeurs stables au lieu de mémoriser le hook entier
  // Le hook useSodSession retourne toujours un nouvel objet, donc impossible à mémoriser efficacement
  const { 
    session, 
    isLoading: sessionLoading, 
    error: sessionError,
    currentStep,
    setCurrentStep,
    createSessionFromParsedData
  } = sodSession;
  
  // Parser Excel (garde la logique actuelle pour l'instant)
  const excelParser = useSodExcelParserOptimized();
  
  // ✅ SOLUTION : Extraire les valeurs stables au lieu de mémoriser le hook entier
  // Le hook retourne toujours un nouvel objet, donc impossible à mémoriser efficacement
  const { 
    parsing: parsingState, 
    parsedData,           // Données pour analyse RÔLES
    parsedUserData,       // Données pour analyse UTILISATEURS
    detectedFileType,     // Type de fichier détecté
    error: parserError, 
    parseFile 
  } = excelParser;
  
  // 🔍 LOG : Hook re-render avec détection de cause
  const prevHookState = useRef({
    activeSessionId,
    parsing: parsingState,
    importType,
    enableUsageAnalysis
  });
  
  const hookChanges: string[] = [];
  if (prevHookState.current.activeSessionId !== activeSessionId) {
    hookChanges.push(`activeSessionId: ${prevHookState.current.activeSessionId} → ${activeSessionId}`);
  }
  if (prevHookState.current.parsing !== parsingState) {
    hookChanges.push(`parsing: ${prevHookState.current.parsing} → ${parsingState}`);
  }
  if (prevHookState.current.importType !== importType) {
    hookChanges.push(`importType: ${prevHookState.current.importType} → ${importType}`);
  }
  if (prevHookState.current.enableUsageAnalysis !== enableUsageAnalysis) {
    hookChanges.push(`enableUsageAnalysis: ${prevHookState.current.enableUsageAnalysis} → ${enableUsageAnalysis}`);
  }
  
  // Render tracking removed
  
  prevHookState.current = {
    activeSessionId,
    parsing: parsingState,
    importType,
    enableUsageAnalysis
  };
  
  // ✅ SIMPLIFIÉ : Le hook useSodSession gère toutes les mutations nécessaires
  
  // 🎯 OPTION B : Effet pour créer la session ET activer le sessionId
  // Gère à la fois les fichiers RÔLES et UTILISATEURS
  useEffect(() => {
    // Créer la session seulement si :
    // 1. Les données sont parsées (rôles OU utilisateurs)
    // 2. Le parsing est terminé
    // 3. On a un fichier en attente
    // 4. Aucune session n'est active
    const hasRoleData = parsedData && parsedData.length > 0;
    const hasUserData = parsedUserData && parsedUserData.length > 0;
    
    if ((hasRoleData || hasUserData) && !parsingState && uploadedFileRef.current && !activeSessionId) {
      const file = uploadedFileRef.current;
      
      // 👤 FICHIER UTILISATEURS : Créer une session avec données utilisateur
      if (detectedFileType === 'USER_ANALYSIS' && hasUserData) {
        console.log('👤 [SESSION] Création de session UTILISATEURS...');
        
        // Construire la session utilisateur avec le service dédié
        const userSession = buildUserSodSession(
          parsedUserData,
          {
            originalRecordCount: parsedUserData.length,
            afterRuleIdRemoval: parsedUserData.length,
            afterControlFilter: parsedUserData.length,
            afterRiskIdFilter: parsedUserData.length,
            afterDuplicateRemoval: parsedUserData.length,
            removedDuplicates: 0,
            removedByControlFilter: 0,
            removedByRiskIdFilter: 0,
            uniqueUserCount: new Set(parsedUserData.map(r => r.userId)).size,
            riskyRolesIdentified: 0,
          },
          {
            fileName: file.name,
            fileSize: file.size,
            uploadDate: new Date(),
          }
        );
        
        // Créer la session SoD avec les données utilisateur intégrées
        const sessionId = `sod-user-${Date.now()}`;
        const newSession: SodAnalysisSession = {
          id: sessionId,
          name: `Analyse Utilisateurs - ${file.name}`,
          timestamp: new Date(),
          currentStep: 1, // Commencer à l'étape 1
          
          sourceFile: {
            fileName: file.name,
            fileSize: file.size,
            uploadDate: new Date(),
          },
          
          // Statistiques de filtrage adaptées
          filteringStats: {
            originalRecordCount: parsedUserData.length,
            removedByRuleIdFilter: 0,
            removedByControlFilter: 0,
            removedDuplicates: 0,
            finalRecordCount: parsedUserData.length,
          },
          
          // 🎯 Rôles risqués identifiés depuis l'analyse utilisateur
          // Distribués entre Step 1 (simples) et Step 2 (composites)
          simpleRoles: {
            roles: userSession.riskyRoles
              .filter(r => r.roleType === 'SIMPLE')
              .map((riskyRole, idx) => ({
                id: idx + 1,
                roleName: riskyRole.roleName,
                roleDescription: riskyRole.roleDescription,
                risks: riskyRole.riskyForRisks.map(rr => ({
                  riskId: rr.riskId,
                  riskLevel: rr.riskLevel,
                  riskDescription: '',
                  functions: rr.functions.map(funcCode => ({
                    code: funcCode,
                    description: '',
                    system: '',
                    actions: [], // Sera enrichi si besoin
                  })),
                  functionCount: rr.functions.length,
                  totalActionCount: 0,
                  isRemediated: false,
                  remediationPercentage: 0,
                })),
                // Métadonnées conformes au type SodSimpleRole
                riskCount: riskyRole.riskyForRisks.length,
                highestRiskLevel: riskyRole.riskyForRisks[0]?.riskLevel || 'LOW',
                isRemediated: false,
                remediationPercentage: 0,
              })),
            metrics: {
              totalRoles: userSession.riskyRoles.filter(r => r.roleType === 'SIMPLE').length,
              totalRisks: 0,
              totalFunctions: 0,
              totalActions: 0,
              totalResources: 0,
              risksByLevel: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
            },
          },
          
          compositeRoles: {
            // ✅ APLATIR : Créer une entrée par simple role dans chaque composite
            roles: userSession.riskyRoles
              .filter(r => r.roleType === 'COMPOSITE')
              .flatMap((compositeRole) => 
                (compositeRole.simpleRoles || []).map((simpleRole) => ({
                  // Structure attendue par SodCompositeRole:
                  // - roleName = le rôle simple
                  // - compositeRoleName = le composite parent
                  roleName: simpleRole.roleName,
                  roleDescription: undefined, // Description du simple (non disponible)
                  compositeRoleName: compositeRole.roleName, // ← Le composite parent
                  compositeRoleDescription: compositeRole.roleDescription,
                  
                  // Filtrer les risques pour ce rôle simple spécifique
                  risks: compositeRole.riskyForRisks
                    .map(rr => {
                      // Filtrer les fonctions: garder seulement celles où ce simple est présent
                      const functionsForThisSimple = (simpleRole.functions || [])
                        .filter(funcCode => (rr.functions || []).includes(funcCode));
                      
                      if (functionsForThisSimple.length === 0) return null;
                      
                      return {
                        riskId: rr.riskId,
                        riskLevel: rr.riskLevel,
                        riskDescription: '',
                        functions: functionsForThisSimple.map(funcCode => ({
                          code: funcCode,
                          description: '',
                          system: '',
                          simpleRoles: [{
                            roleName: simpleRole.roleName,
                            roleDescription: undefined,
                            actions: [], // Sera enrichi si disponible
                          }],
                          actionCount: 0,
                          simpleRoleCount: 1,
                        })),
                        functionCount: functionsForThisSimple.length,
                        totalSimpleRoleCount: 1,
                        totalActionCount: 0,
                      };
                    })
                    .filter((risk): risk is NonNullable<typeof risk> => risk !== null),
                  
                  // Métadonnées
                  riskCount: compositeRole.riskyForRisks.length,
                  highestRiskLevel: compositeRole.riskyForRisks[0]?.riskLevel || 'LOW',
                  involvedSimpleRoleCount: 1, // Une entrée = un simple role
                }))
              ),
            metrics: {
              totalRoles: userSession.riskyRoles.filter(r => r.roleType === 'COMPOSITE').length,
              totalSimpleRoles: userSession.riskyRoles
                .filter(r => r.roleType === 'COMPOSITE')
                .reduce((sum, r) => sum + (r.simpleRoles?.length || 0), 0),
              totalRisks: 0,
              totalFunctions: 0,
              totalActions: 0,
              totalResources: 0,
              risksByLevel: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
            },
          },
          
          // 🎯 NOUVEAU : Données utilisateurs pour Step 3
          users: userSession.users,
          userMetrics: userSession.metrics,
          riskyRoles: userSession.riskyRoles,
          
          metadata: {
            createdBy: config.userId,
            createdAt: new Date(),
            lastModified: new Date(),
            processingTimeMs: 0,
            version: '1.0.0',
            fileType: 'USER_ANALYSIS' as SodExcelFileType,
          },
        };
        
        console.log('✅ [SESSION USER] Session créée:', {
          id: newSession.id,
          users: userSession.users.length,
          riskyRoles: userSession.riskyRoles.length,
          simpleRoles: newSession.simpleRoles.roles.length,
          compositeRoles: newSession.compositeRoles.roles.length,
        });
        
        console.log('📊 [SESSION USER] Détails composites:', {
          compositeRolesArray: newSession.compositeRoles.roles,
          firstComposite: newSession.compositeRoles.roles[0],
        });
        
        // Stocker dans le cache TanStack Query
        queryClient.setQueryData(['sod', 'session', sessionId], newSession);
        
        console.log('💾 [TANSTACK] Session stockée dans le cache avec clé:', ['sod', 'session', sessionId]);
        
        // ✅ SOLUTION : Invalider les requêtes pour forcer la notification des composants
        queryClient.invalidateQueries({ 
          queryKey: ['sod', 'session', sessionId],
          refetchType: 'none' // Ne pas refetch, juste notifier
        });
        
        // ✅ NOUVEAU : Invalider les queries de pagination composite pour forcer le reload
        queryClient.invalidateQueries({
          queryKey: ['sod', sessionId, 'roles', 'composite'],
          refetchType: 'active' // Refetch les queries actives
        });
        
        // ✅ NOUVEAU : Invalider les queries de pagination simple aussi
        queryClient.invalidateQueries({
          queryKey: ['sod', sessionId, 'roles', 'simple'],
          refetchType: 'active' // Refetch les queries actives
        });
        
        setActiveSessionId(sessionId);
        uploadedFileRef.current = null;
        
        return;
      }
      
      // 🎭 FICHIER RÔLES : Utiliser le flux existant
      if (hasRoleData) {
        console.log('🎭 [SESSION] Création de session RÔLES...');
        
        createSessionFromParsedData(file, parsedData)
          .then((newSession) => {
            if (newSession) {
              setActiveSessionId(newSession.id);
            }
          })
          .catch((error) => {
            console.error('❌ Erreur lors de la création de session:', error);
          });
        
        uploadedFileRef.current = null;
      }
    }
  }, [parsedData, parsedUserData, detectedFileType, parsingState, activeSessionId, createSessionFromParsedData, queryClient, config.userId]);
  
  // État dérivé optimisé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: sessionLoading || parsingState,
    error: sessionError || parserError,
    enableUsageAnalysis,
    session,
    currentStep,
    // État du parsing
    parsing: parsingState || false,
    parsingProgress: excelParser.progress?.progress || 0,
    parsingMessage: excelParser.progress?.message || 'Traitement en cours...',
    parsingError: parserError || null,
  }), [
    importType,
    enableUsageAnalysis,
    sessionLoading,
    sessionError,
    session,
    currentStep,
    parsingState,
    excelParser.progress?.progress,
    excelParser.progress?.message,
    parserError,
  ]);
  
  // Actions optimisées
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      // Analysis start removed
      
      // Sauvegarder la référence au fichier
      uploadedFileRef.current = file;
      
      // Parser le fichier Excel (asynchrone via Web Worker)
      await parseFile(file);
    },
    
    loadSavedAnalysis: async () => {
      console.log('📂 Chargement d\'analyse sauvegardée...');
      // TODO: Implémenter le chargement d'analyse sauvegardée
      setActiveSessionId('saved_session_123');
    },
    
    resumeFromFile: async () => {
      console.log('🔄 Reprise depuis fichier...');
      // TODO: Implémenter la reprise depuis fichier
      setActiveSessionId('resumed_session_456');
    },
    
    setEnableUsageAnalysis,
    
    setCurrentStep: setCurrentStep || (() => {}),
    
    createSessionFromParsedData,
    
    startAutomaticRemediation: async () => {
      // Auto remediation start removed
      
      // TODO: Implémenter avec mutation TanStack Query
    },
    
    resetWorkflow: () => {
      console.log('🔄 [SOD RESET] Réinitialisation complète du workflow...');
      
      // 1. Réinitialiser les Maps globales (source de vérité)
      resetSodGlobalMaps();
      
      // 2. Réinitialiser les états locaux du workflow
      setImportType('new');
      setEnableUsageAnalysis(false);
      
      // 3. Réinitialiser le sessionId actif
      setActiveSessionId(undefined);
      
      // 4. Invalider toutes les queries SOD dans TanStack Query
      queryClient.invalidateQueries({ queryKey: ['sod'] });
      queryClient.invalidateQueries({ queryKey: ['sod-session', config.userId] });
      queryClient.invalidateQueries({ queryKey: ['sod-sessions', config.userId] });
      
      // 5. Supprimer toutes les données du cache SOD
      queryClient.removeQueries({ queryKey: ['sod'] });
      
      // 6. Nettoyer le parser Excel
      excelParser.cancelParsing?.();
      excelParser.reset?.();
      
      // 7. Nettoyer la référence au fichier uploadé
      uploadedFileRef.current = null;
      
      console.log('✅ [SOD RESET] Workflow complètement réinitialisé');
    },
  }), [
    enableUsageAnalysis,
    sodSession,
    excelParser,
    queryClient,
    config.userId,
    setActiveSessionId,
  ]);
  
  return {
    state,
    actions,
  };
};
