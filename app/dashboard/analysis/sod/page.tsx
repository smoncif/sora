'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, Alert, TablePagination, Grid, alpha, useTheme } from '@mui/material';
import { useAuth } from 'lib/hooks/useAuth';
import { SodStepperNavigation } from 'lib/components/sod/navigation/SodStepperNavigation';
import { SodFileUploadSection } from 'lib/components/sod/upload/SodFileUploadSection';
import { SodAutoSelectionSection } from 'lib/components/sod/autoselection/SodAutoSelectionSection';
import { SodParsingProgressDetailed } from 'lib/components/sod/progress/SodParsingProgressDetailed';
import { SodAnalysisResults } from 'lib/components/sod/results/SodAnalysisResults';
import { SodNavigationButton, SodNavigationSlider } from 'lib/components/sod';
import { SodSimpleRoleCardSuspense, SodCompositeRoleCardSuspense } from 'lib/components/sod/suspense/SodAnalysisResultsSuspense';
import { useSodWorkflowOptimized } from 'lib/hooks/sod/useSodWorkflowOptimized';
import { 
  calculateRiskRemediation,
  calculateCompositeRiskRemediation
} from 'lib/utils/sodRulesApplication';
import { useSodNavigation } from 'lib/hooks/sod/useSodNavigation';
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';
import { useSodAnalysisData } from 'lib/hooks/sod/useSodAnalysisDataQuery';
import { useSodOptimisticUpdates } from 'lib/hooks/sod/useSodOptimisticUpdates';
import { useQueryClient } from '@tanstack/react-query';
import { applyStateToSimpleRoles, applyStateToCompositeRoles } from 'lib/utils/sodStateApplication';
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';
// 🚀 NOUVEAUX HOOKS : Mutations et sélecteurs TanStack Query
import { useSodMutations } from 'lib/hooks/sod/useSodMutations';
import { useActionState, useRoleState } from 'lib/hooks/sod/useSodSelectors';
// 🚀 NOUVEAUX HOOKS : Pagination avec cache TanStack Query
import { useSodPagedRoles } from 'lib/hooks/sod/useSodPagedRoles';
import { useSodPagedCompositeRoles } from 'lib/hooks/sod/useSodPagedCompositeRoles';
import { useLazyRoleRendering } from 'lib/hooks/sod/useLazyRoleRendering';
import { useOptimisticPagination } from 'lib/hooks/sod/useOptimisticPagination';
// 🎨 NOUVEAUX COMPOSANTS : Skeletons pour lazy loading
import { SodSimpleRoleCardSkeleton, SodCompositeRoleCardSkeleton, SkeletonGrid } from 'lib/components/sod/skeleton';


export default function SodAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();

  // 🚀 NOUVEAU WORKFLOW SOD : Utiliser le hook unifié
  const sodWorkflow = useSodWorkflowOptimized({ userId: user?.id || 'anonymous' });

  // 🎯 PRIORITY-BASED LAZY LOADING : États pour la navigation intelligente
  const [prioritySimpleRoleName, setPrioritySimpleRoleName] = useState<string | undefined>(undefined);
  const [priorityCompositeRoleName, setPriorityCompositeRoleName] = useState<string | undefined>(undefined);
  
  // 🎯 PRIORITY-BASED LAZY LOADING : État de navigation pour éviter les conflits
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // 🧭 SYSTÈME DE NAVIGATION : Hook pour la navigation des risques
  const sodNavigation = useSodNavigation();

  // 🚀 OPTIMISTIC UPDATES : Hook pour les actions optimisées
  const optimisticUpdates = useSodOptimisticUpdates({ 
    userId: user?.id || 'anonymous',
    sessionId: sodWorkflow.state.session?.id 
  });

  // 🚀 NOUVEAUX HOOKS : Mutations et sélecteurs TanStack Query
  const sodMutations = useSodMutations({ 
    sessionId: sodWorkflow.state.session?.id || 'default' 
  });

  // ✅ DEBUG : Vérifier l'état de sodMutations
  // Debug mutations removed



  // 🚀 NOUVEAU : Hook TanStack Query pour l'analyse SoD (cohérent avec les autres pages)
  const { data: sodAnalysisData, isLoading: isSodAnalysisLoading, error: sodAnalysisError } = useSodAnalysisData();

  const queryClient = useQueryClient();

  // ✅ Les fonctions de remédiation sont maintenant importées depuis sodRulesApplication.ts

  // 🚀 PAGINATION OPTIMISTE : Affichage immédiat des skeletons
  const simplePagination = useOptimisticPagination({
    pageSize: 5,
    type: 'Simple'
  });
  
  const compositePagination = useOptimisticPagination({
    pageSize: 5,
    type: 'Composite'
  });
  
  // ⚡ État des actions géré par TanStack Query via sodRulesApplication.ts

  // 🚀 NOUVEAU : Pagination avec cache TanStack Query pour rôles simples
  const {
    roles: paginatedSimpleRoles,
    totalCount: simpleRolesTotalCount,
    totalPages: simpleRolesTotalPages,
    isLoading: isSimplePaginationLoading,
    isFetching: isSimplePaginationFetching,
    prefetchAdjacentPages: prefetchSimplePages,
  } = useSodPagedRoles({
    sessionId: sodWorkflow.state.session?.id,
    page: simplePagination.currentPage,
    pageSize: simplePagination.pageSize,
  });

  // 🚀 NOUVEAU : Pagination avec cache TanStack Query pour rôles composites
  const {
    roles: paginatedCompositeRoles,
    totalCount: compositeRolesTotalCount,
    totalPages: compositeRolesTotalPages,
    isLoading: isCompositePaginationLoading,
    isFetching: isCompositePaginationFetching,
    prefetchAdjacentPages: prefetchCompositePages,
  } = useSodPagedCompositeRoles({
    sessionId: sodWorkflow.state.session?.id,
    page: compositePagination.currentPage,
    pageSize: compositePagination.pageSize,
  });

  // 📊 Pour la compatibilité avec le code existant (allRestrictedActions, etc.)
  const simpleRoles = useMemo(() => {
    return (sodWorkflow.state.session?.simpleRoles?.roles || []) as SodSimpleRole[];
  }, [sodWorkflow.state.session?.simpleRoles?.roles]);
  
  const compositeRoles = useMemo(() => {
    return (sodWorkflow.state.session?.compositeRoles?.roles || []) as SodCompositeRole[];
  }, [sodWorkflow.state.session?.compositeRoles?.roles]);

  // 🔄 FONCTION DE RÉINITIALISATION COMPLÈTE
  const resetAllSodStates = useCallback(() => {
    console.log('🔄 [SOD PAGE RESET] Réinitialisation de tous les états de la page...');
    
    // 1. Réinitialiser les états de navigation
    setPrioritySimpleRoleName(undefined);
    setPriorityCompositeRoleName(undefined);
    setIsNavigating(false);
    
    // 2. Réinitialiser la pagination (retour à la page 0)
    simplePagination.handlePageChange(null, 0);
    compositePagination.handlePageChange(null, 0);
    
    // 3. Réinitialiser le workflow complet (inclut Maps, Session, Parser)
    sodWorkflow.actions.resetWorkflow();
    
    // 4. Réinitialiser les états UI (navigation des risques)
    // Note: Les états UI des composants seront automatiquement réinitialisés
    // quand la session sera vide après resetWorkflow()
    
    console.log('✅ [SOD PAGE RESET] Tous les états réinitialisés');
  }, [simplePagination, compositePagination, sodWorkflow.actions]);

  // ⚡ Prefetch automatique des pages adjacentes au changement de page
  useEffect(() => {
    if (sodWorkflow.state.session?.id) {
      prefetchSimplePages();
    }
  }, [simplePagination.currentPage, prefetchSimplePages, sodWorkflow.state.session?.id]);

  useEffect(() => {
    if (sodWorkflow.state.session?.id) {
      prefetchCompositePages();
    }
  }, [compositePagination.currentPage, prefetchCompositePages, sodWorkflow.state.session?.id]);


  // 🚀 LAZY LOADING : Chargement progressif RAPIDE pour pages avec beaucoup de rôles
  const {
    visibleRoles: visibleSimpleRoles,
    hasMore: hasMoreSimple,
    observerRef: simpleObserverRef,
    remainingCount: remainingSimpleCount,
    isLazyActive: isSimpleLazyActive,
  } = useLazyRoleRendering({
    allRoles: paginatedSimpleRoles,
    initialBatchSize: 3,  // ⚡ 3 rôles immédiats (au lieu de 2)
    scrollBatchSize: 2,   // ⚡ +2 rôles au scroll (au lieu de 1)
    lazyThreshold: 4,     // ⚡ Activer si > 4 rôles (au lieu de 3)
    // 🎯 SOLUTION C : États de chargement TanStack Query pour timing intelligent
    isLoading: isSimplePaginationLoading,
    isFetching: isSimplePaginationFetching,
    // 🎯 PRIORITY-BASED : Rôle à prioriser (pour navigation)
    priorityRoleName: prioritySimpleRoleName,
    // 🎯 PRIORITY-BASED : État de navigation pour éviter les conflits
    isNavigating: isNavigating,
  });

  const {
    visibleRoles: visibleCompositeRoles,
    hasMore: hasMoreComposite,
    observerRef: compositeObserverRef,
    remainingCount: remainingCompositeCount,
    isLazyActive: isCompositeLazyActive,
  } = useLazyRoleRendering({
    allRoles: paginatedCompositeRoles,
    initialBatchSize: 3,  // ⚡ Plus rapide
    scrollBatchSize: 2,   // ⚡ +2 rôles au scroll
    lazyThreshold: 4,     // ⚡ Threshold plus élevé
    // 🎯 SOLUTION C : États de chargement TanStack Query pour timing intelligent
    isLoading: isCompositePaginationLoading,
    isFetching: isCompositePaginationFetching,
    // 🎯 PRIORITY-BASED : Rôle à prioriser (pour navigation)
    priorityRoleName: priorityCompositeRoleName,
    // 🎯 PRIORITY-BASED : État de navigation pour éviter les conflits
    isNavigating: isNavigating,
  });

  
  // ✅ Callbacks de pagination OPTIMISTES (déjà intégrés dans useOptimisticPagination)
  // - simplePagination.handlePageChange : Changement immédiat + skeletons
  // - simplePagination.handlePageSizeChange : Changement de taille + skeletons
  // - compositePagination.handlePageChange : Changement immédiat + skeletons  
  // - compositePagination.handlePageSizeChange : Changement de taille + skeletons
  
  // 🗺️ Construire la Map globale des ressources par action (UNE SEULE FOIS)
  // ✅ OPTIMISÉ : Construction de la Map globale des ressources au chargement
  // ✅ buildActionResourcesMap est maintenant appelé automatiquement dans applySodRulesToSession
  
  // ⚡ Prefetch automatique des pages adjacentes au changement de page
  // ✅ NOUVEAU : Prefetch intelligent des données de pagination
  
  // ⚡ PREFETCH INITIAL : Charger les premières pages au démarrage
  useEffect(() => {
    if (sodWorkflow.state.parsing || !sodWorkflow.state.session || simpleRoles.length === 0) return;
    
    // ✅ Prefetch initial : charger les 3 premières pages (1, 2, 3) car on est sur page 0
    const pagesToPrefetch = [1, 2, 3]; // Pages suivantes de la page courante (0)
    const totalPages = Math.ceil(simpleRoles.length / 5); // Taille par défaut
    
    pagesToPrefetch.forEach(page => {
      if (page < totalPages) {
        // Utiliser prefetchSodPage directement pour les pages spécifiques
        queryClient.prefetchQuery({
          queryKey: ['analysis', 'sod', 'page', page, 5],
          queryFn: async () => {
            const pageSize = 5;
            const start = page * pageSize;
            const end = start + pageSize;
            return {
              roles: simpleRoles.slice(start, end),
              totalCount: simpleRoles.length,
              page,
              pageSize: pageSize,
              totalPages: Math.ceil(simpleRoles.length / pageSize),
              lastUpdated: new Date().toISOString(),
            };
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    });
    
  }, [sodWorkflow.state.parsing, sodWorkflow.state.session, simpleRoles.length, queryClient]);

  // ❌ SUPPRIMÉ : Prefetch automatique (causait double prefetch)
  // Le prefetch est maintenant géré uniquement via useOptimisticPagination
  
  // ⚡ PREFETCH INITIAL COMPOSITE : Charger les premières pages au démarrage
  useEffect(() => {
    if (sodWorkflow.state.parsing || !sodWorkflow.state.session || compositeRoles.length === 0) return;
    
    // ✅ Prefetch initial : charger les 3 premières pages (1, 2, 3) car on est sur page 0
    const pagesToPrefetch = [1, 2, 3]; // Pages suivantes de la page courante (0)
    const totalPages = Math.ceil(compositeRoles.length / 5); // Taille par défaut
    
    pagesToPrefetch.forEach(page => {
      if (page < totalPages) {
        // Utiliser prefetchSodPage directement pour les pages spécifiques
        queryClient.prefetchQuery({
          queryKey: ['analysis', 'sod', 'composite-page', page, 5],
          queryFn: async () => {
            const pageSize = 5;
            const start = page * pageSize;
            const end = start + pageSize;
            return {
              roles: compositeRoles.slice(start, end),
              totalCount: compositeRoles.length,
              page,
              pageSize: pageSize,
              totalPages: Math.ceil(compositeRoles.length / pageSize),
              lastUpdated: new Date().toISOString(),
            };
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    });
    
  }, [sodWorkflow.state.parsing, sodWorkflow.state.session, compositeRoles.length, queryClient]);

  // ❌ SUPPRIMÉ : Prefetch automatique (causait double prefetch)
  // Le prefetch est maintenant géré uniquement via useOptimisticPagination
  
  // 🚀 OPTIMISATION 3 : Callbacks stables (ne dépendent que des fonctions, pas du contexte entier)
  const handleDeleteAction = useCallback((roleName: string, _riskId: string, actionCode: string, resources?: any[]) => {
    // ✅ CORRIGÉ : Utiliser la mutation TanStack Query au lieu de l'appel direct
    sodMutations.deleteAction(roleName, _riskId, actionCode, resources || []);
  }, [sodMutations.deleteAction]); // ✅ Stable : sodMutations.deleteAction ne change jamais

  const handleRestrictAction = useCallback((roleName: string, _riskId: string, actionCode: string, resources?: any[]) => {
    // ✅ CORRIGÉ : Utiliser la mutation TanStack Query au lieu de l'appel direct
    sodMutations.restrictAction(roleName, _riskId, actionCode, resources || []);
  }, [sodMutations.restrictAction]); // ✅ Stable : sodMutations.restrictAction ne change jamais

  const handleRestrictResourceWrapped = useCallback((
        roleName: string,
    _riskId: string,
    _actionCode: string,
        resourceCode: string,
        externalResourceCode: string,
        values: string[],
    shouldRestrict?: boolean
      ) => {
    // ✅ CORRIGÉ : Utiliser la mutation TanStack Query au lieu de l'appel direct
    sodMutations.restrictResource(roleName, _riskId, _actionCode, resourceCode, externalResourceCode, values, shouldRestrict);
  }, [sodMutations.restrictResource]); // ✅ Stable : sodMutations.restrictResource ne change jamais

  const handleCompositeRestrictResourceWrapped = useCallback((
        roleName: string,
    _riskId: string,
    _actionCode: string,
        resourceCode: string,
        externalResourceCode: string,
        values: string[],
    shouldRestrict?: boolean
  ) => {
    // ✅ CORRIGÉ : Utiliser la mutation TanStack Query au lieu de l'appel direct
    sodMutations.restrictResource(roleName, _riskId, _actionCode, resourceCode, externalResourceCode, values, shouldRestrict);
  }, [sodMutations.restrictResource]); // ✅ Stable : sodMutations.restrictResource ne change jamais

  // 🧭 CALCUL DES RISQUES NON REMÉDIÉS : Pour le badge du bouton de navigation
  const nonRemediatedRisksCount = useMemo(() => {
    // ⚡ Skip pendant le parsing pour ne pas ralentir le chargement
    if (!sodWorkflow.state.session || sodWorkflow.state.parsing) return 0;

    let count = 0;

    // Compter les risques non remédiés dans les rôles simples
    if (sodWorkflow.state.session.simpleRoles?.roles) {
      sodWorkflow.state.session.simpleRoles.roles.forEach((role: any) => {
        role.risks?.forEach((risk: any) => {
          const remediation = calculateRiskRemediation(role.roleName, risk.functions);
          if (!remediation.isRemediated) {
            count++;
          }
        });
      });
    }

    // Compter les risques non remédiés dans les rôles composites
    if (sodWorkflow.state.session.compositeRoles?.roles) {
      sodWorkflow.state.session.compositeRoles.roles.forEach((role: any) => {
        role.risks?.forEach((risk: any) => {
          const remediation = calculateCompositeRiskRemediation(role.roleName, risk.functions);
          if (!remediation.isRemediated) {
            count++;
          }
        });
      });
    }

    return count;
  }, [sodWorkflow.state.session, sodWorkflow.state.parsing]);

  // 🧭 NAVIGATION VERS RISQUE : Callback pour naviguer vers un rôle/risque spécifique
  const handleNavigateToRisk = useCallback((
    roleName: string, 
    riskCode: string, 
    targetStep: number
  ) => {
    console.log('🚀 [NAVIGATION] Début de navigation:', {
      roleName,
      riskCode,
      targetStep,
      currentStep: sodWorkflow.state.currentStep,
      timestamp: new Date().toISOString()
    });
    
    // Corriger targetStep si undefined
    const correctedTargetStep = targetStep || sodWorkflow.state.currentStep;
    
    // 🎯 PRIORITY-BASED LAZY LOADING : Définir l'état de navigation AVANT tout
    console.log('🎯 [NAVIGATION] Définition de l\'état de navigation: true');
    setIsNavigating(true);
    
    // 🎯 PRIORITY-BASED LAZY LOADING : Définir le rôle priorisé AVANT la navigation
    if (correctedTargetStep === 1) {
      console.log('🎯 [NAVIGATION] Définition de la priorité simple:', roleName);
      setPrioritySimpleRoleName(roleName);
    } else if (correctedTargetStep === 2) {
      console.log('🎯 [NAVIGATION] Définition de la priorité composite:', roleName);
      setPriorityCompositeRoleName(roleName);
    }
    
    // Changer l'étape si nécessaire (avec réinitialisation intelligente)
    if (sodWorkflow.state.currentStep !== correctedTargetStep) {
      handleStepChange(correctedTargetStep);
    }

    // Gérer la pagination : trouver la page qui contient le rôle
    if (correctedTargetStep === 1) {
      // Étape 1 : Rôles simples
      const roleIndex = simpleRoles.findIndex(role => role.roleName === roleName);
      console.log('📄 [NAVIGATION] Recherche du rôle simple:', {
        roleName,
        roleIndex,
        totalSimpleRoles: simpleRoles.length,
        currentPage: simplePagination.currentPage
      });
      
      if (roleIndex !== -1) {
        const targetPage = Math.floor(roleIndex / 5);
        console.log('📄 [NAVIGATION] Calcul de la page cible:', {
          roleIndex,
          targetPage,
          currentPage: simplePagination.currentPage,
          needsPageChange: targetPage !== simplePagination.currentPage
        });
        
        if (targetPage !== simplePagination.currentPage) {
          console.log('📄 [NAVIGATION] Changement de page TanStack Query:', {
            from: simplePagination.currentPage,
            to: targetPage
          });
          handlePageChange(targetPage, 1);
        }
      }
    } else if (correctedTargetStep === 2) {
      // Étape 2 : Rôles composites
      const roleIndex = compositeRoles.findIndex(role => role.roleName === roleName);
      console.log('📄 [NAVIGATION] Recherche du rôle composite:', {
        roleName,
        roleIndex,
        totalCompositeRoles: compositeRoles.length,
        currentPage: compositePagination.currentPage
      });
      
      if (roleIndex !== -1) {
        const targetPage = Math.floor(roleIndex / 5);
        console.log('📄 [NAVIGATION] Calcul de la page cible:', {
          roleIndex,
          targetPage,
          currentPage: compositePagination.currentPage,
          needsPageChange: targetPage !== compositePagination.currentPage
        });
        
        if (targetPage !== compositePagination.currentPage) {
          console.log('📄 [NAVIGATION] Changement de page TanStack Query:', {
            from: compositePagination.currentPage,
            to: targetPage
          });
          handlePageChange(targetPage, 2);
        }
      }
    }

    // Fonction pour chercher l'élément avec retry
    const findElementWithRetry = (selector: string, maxRetries = 10, delay = 200) => {
      return new Promise<Element | null>((resolve) => {
        let attempts = 0;
        
        const search = () => {
          attempts++;
          const element = document.querySelector(selector);
          
          if (element) {
            resolve(element);
          } else if (attempts < maxRetries) {
            setTimeout(search, delay);
          } else {
            resolve(null);
          }
        };
        
        search();
      });
    };

    // Attendre que l'étape change, puis chercher l'élément
    setTimeout(async () => {
      // Sélecteur unique : combinaison rôle-risque pour éviter les conflits
      const uniqueRiskSelector = `[data-role-risk="${roleName}-${riskCode}"]`;
      const roleSelector = `[data-role-name="${roleName}"]`;
      
      let element = await findElementWithRetry(uniqueRiskSelector);
      
      // Si le risque spécifique n'est pas trouvé, chercher le rôle
      if (!element) {
        element = await findElementWithRetry(roleSelector);
      }
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Highlight temporaire avec styles inline
        const originalStyle = element.getAttribute('style') || '';
        element.setAttribute('style', 
          originalStyle + 
          'box-shadow: 0 0 20px rgba(25, 118, 210, 0.5) !important; ' +
          'border: 2px solid #1976d2 !important; ' +
          'border-radius: 8px !important; ' +
          'transition: all 0.3s ease !important;'
        );
        
        setTimeout(() => {
          element.setAttribute('style', originalStyle);
        }, 2000);
        
        // 🎯 PRIORITY-BASED LAZY LOADING : Fin de navigation après scroll réussi
        setTimeout(() => {
          console.log('🎯 [NAVIGATION] Navigation terminée, fin de l\'état de navigation après 1s');
          console.log('🎯 [NAVIGATION] État avant fin:', {
            isNavigating: true,
            prioritySimpleRoleName,
            priorityCompositeRoleName,
            timestamp: new Date().toISOString()
          });
          setIsNavigating(false);
          console.log('🎯 [NAVIGATION] État après fin:', {
            isNavigating: false,
            prioritySimpleRoleName,
            priorityCompositeRoleName,
            timestamp: new Date().toISOString()
          });
        }, 1000); // 1 seconde après le scroll
      }
    }, 300); // Augmenter le délai initial
  }, [sodWorkflow, simpleRoles, compositeRoles, simplePagination, compositePagination]);
  

  // 🎯 PRIORITY-BASED LAZY LOADING : Réinitialiser les priorités après navigation
  const resetPriorityRoles = useCallback(() => {
    console.log('🎯 [RESET] Réinitialisation des priorités et fin de navigation');
    console.log('🎯 [RESET] État avant réinitialisation:', {
      prioritySimpleRoleName,
      priorityCompositeRoleName,
      isNavigating,
      timestamp: new Date().toISOString()
    });
    setPrioritySimpleRoleName(undefined);
    setPriorityCompositeRoleName(undefined);
    setIsNavigating(false);
    console.log('🎯 [RESET] État après réinitialisation:', {
      prioritySimpleRoleName: undefined,
      priorityCompositeRoleName: undefined,
      isNavigating: false,
      timestamp: new Date().toISOString()
    });
  }, [prioritySimpleRoleName, priorityCompositeRoleName, isNavigating]);

  // 🔄 RÉINITIALISATION INTELLIGENTE : Lors des changements de page
  const handlePageChange = useCallback((newPage: number, step: number) => {
    console.log('🔄 [PAGE-CHANGE] Réinitialisation des priorités lors du changement de page:', {
      newPage,
      step,
      currentStep: sodWorkflow.state.currentStep,
      timestamp: new Date().toISOString()
    });
    
    // Réinitialiser les priorités avant le changement de page
    resetPriorityRoles();
    
    // Appeler la fonction de changement de page appropriée
    if (step === 1) {
      simplePagination.handlePageChange(null as any, newPage);
    } else if (step === 2) {
      compositePagination.handlePageChange(null as any, newPage);
    }
  }, [resetPriorityRoles, simplePagination, compositePagination, sodWorkflow.state.currentStep]);

  // 🔄 RÉINITIALISATION INTELLIGENTE : Lors des changements d'étape
  const handleStepChange = useCallback((newStep: number) => {
    console.log('🔄 [STEP-CHANGE] Réinitialisation des priorités lors du changement d\'étape:', {
      newStep,
      currentStep: sodWorkflow.state.currentStep,
      timestamp: new Date().toISOString()
    });
    
    // Réinitialiser les priorités avant le changement d'étape
    resetPriorityRoles();
    
    // Changer l'étape
    sodWorkflow.actions.setCurrentStep(newStep);
  }, [resetPriorityRoles, sodWorkflow.actions, sodWorkflow.state.currentStep]);

  // 🎯 PRIORITY-BASED LAZY LOADING : Timer automatique supprimé
  // La réinitialisation se fait maintenant uniquement lors des changements de page/étape
  // useEffect(() => {
  //   // Timer automatique supprimé - réinitialisation basée sur l'activité utilisateur
  // }, []);

  const handleStartRemediation = useCallback(async () => {
    await sodWorkflow.actions.startAutomaticRemediation();
  }, [sodWorkflow.actions]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* En-tête moderne et épuré */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 6,
        pb: 3,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Box>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
              letterSpacing: '-0.02em',
            }}
          >
            Analyse SoD (Segregation of Duties)
            {isSodAnalysisLoading && <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}>🔄 Chargement TanStack Query...</span>}
            {isSimplePaginationFetching && <span style={{ marginLeft: '10px', fontSize: '0.7em', color: '#28a745', fontWeight: 'bold' }}>⚡ Cache TanStack Query</span>}
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '1.1rem',
              fontWeight: 400,
            }}
          >
            Remédiation automatique des risques de ségrégation des tâches
          </Typography>
        </Box>
      </Box>


      {/* Affichage des erreurs */}
      {sodWorkflow.state.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {sodWorkflow.state.error}
        </Alert>
      )}


      {/* Layout 2 cartes avec proportions ajustées - Toujours visibles */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Carte 1 : Upload des fichiers - Plus large */}
        <Grid size={{ xs: 12, md: 8 }}>
          <SodFileUploadSection
            importType={sodWorkflow.state.importType}
            loading={sodWorkflow.state.loading}
            error={sodWorkflow.state.error}
            user={user}
            onImportTypeChange={sodWorkflow.actions.setImportType}
            onFileUpload={(file) => sodWorkflow.actions.startNewAnalysis(file)}
            onLoadSavedAnalysis={sodWorkflow.actions.loadSavedAnalysis}
            onResumeFromFile={sodWorkflow.actions.resumeFromFile}
            onResetBeforeUpload={resetAllSodStates}
          />
        </Grid>

        {/* Carte 2 : Sélection automatique - Plus étroite */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SodAutoSelectionSection
            enableUsageAnalysis={sodWorkflow.state.enableUsageAnalysis}
            onUsageAnalysisChange={sodWorkflow.actions.setEnableUsageAnalysis}
            disabled={!sodWorkflow.state.session}
            onStartRemediation={handleStartRemediation}
          />
        </Grid>
      </Grid>

      {/* Barre de progression détaillée pendant le parsing */}
      <SodParsingProgressDetailed
        parsing={sodWorkflow.state.parsing}
        progress={sodWorkflow.state.parsingProgress}
        message={sodWorkflow.state.parsingMessage}
        error={sodWorkflow.state.parsingError}
      />


      {/* Résultats d'analyse */}
      {sodWorkflow.state.session && (
        <SodAnalysisResults
          session={sodWorkflow.state.session}
          currentStep={sodWorkflow.state.currentStep}
          onStepChange={sodWorkflow.actions.setCurrentStep}
          simpleRoles={simpleRoles}
          compositeRoles={compositeRoles}
          loading={sodWorkflow.state.loading}
          renderSimpleRoles={() => (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
                  <Typography variant="body2" color="text.secondary">
                    {simpleRoles.length} rôle(s) simple(s) • Affichage de {paginatedSimpleRoles.length} rôle(s) par page
                  </Typography>
                </Box>
                <TablePagination
                  component="div"
                  count={simpleRoles.length}
                  page={simplePagination.currentPage}
                  onPageChange={simplePagination.handlePageChange}
                  rowsPerPage={simplePagination.pageSize}
                  onRowsPerPageChange={simplePagination.handlePageSizeChange}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="Rôles par page:"
                  labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${simplePagination.currentPage + 1}/${Math.ceil(count / simplePagination.pageSize)}`}
                  showFirstButton
                  showLastButton
                />
              </Box>

              {/* Rôles simples - Pagination optimiste INSTANTANÉE */}
              {isSimplePaginationLoading || visibleSimpleRoles.length === 0 || simplePagination.showSkeletons ? (
                <Box>
                  <SkeletonGrid 
                    count={simplePagination.pageSize} 
                    type="simple"
                    animated={true}
                    variant="default"
                  />
                </Box>
              ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Rôles visibles (chargés) */}
                    {visibleSimpleRoles.map((role) => (
                  <React.Suspense 
                        key={role.roleName}
                        fallback={<SodSimpleRoleCardSkeleton />}
                      >
                        <SodSimpleRoleCardSuspense
                    role={role}
                          onDeleteAction={sodMutations.deleteAction}
                          onRestrictAction={sodMutations.restrictAction}
                          onRestrictResource={sodMutations.restrictResource}
                      onDeleteRisk={undefined}
                      onNextStep={undefined}
                      showNextStepButton={false}
                    />
                  </React.Suspense>
                ))}
                    
                    {/* Placeholders pour rôles non encore chargés (lazy loading) */}
                    {hasMoreSimple && (
                      <>
                        {Array.from({ length: remainingSimpleCount }).map((_, i) => (
                          <SodSimpleRoleCardSkeleton key={`skeleton-simple-${i}`} />
                        ))}
                        
                        {/* Sentinel pour Intersection Observer */}
                        <div 
                          ref={simpleObserverRef} 
                          style={{ height: '1px', width: '100%' }} 
                          aria-hidden="true"
                        />
                      </>
                    )}
              </Box>
              )}

              {/* Pagination en bas */}
              {simpleRoles.length > 5 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <TablePagination
                    component="div"
                    count={simpleRoles.length}
                    page={simplePagination.currentPage}
                    onPageChange={simplePagination.handlePageChange}
                    rowsPerPage={simplePagination.pageSize}
                    onRowsPerPageChange={simplePagination.handlePageSizeChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Rôles par page:"
                    labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${simplePagination.currentPage + 1}/${Math.ceil(count / simplePagination.pageSize)}`}
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
              </Box>
            )}
          renderCompositeRoles={() => (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {compositeRoles.length} rôle(s) composite(s) • Affichage de {paginatedCompositeRoles.length} rôle(s) par page
                </Typography>
                </Box>
                <TablePagination
                  component="div"
                  count={compositeRoles.length}
                  page={compositePagination.currentPage}
                  onPageChange={compositePagination.handlePageChange}
                  rowsPerPage={compositePagination.pageSize}
                  onRowsPerPageChange={compositePagination.handlePageSizeChange}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="Rôles par page:"
                  labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${compositePagination.currentPage + 1}/${Math.ceil(count / compositePagination.pageSize)}`}
                  showFirstButton
                  showLastButton
                />
              </Box>

              {/* Rôles composites - Pagination optimiste INSTANTANÉE */}
              {isCompositePaginationLoading || visibleCompositeRoles.length === 0 || compositePagination.showSkeletons ? (
                <Box>
                  <SkeletonGrid 
                    count={compositePagination.pageSize} 
                    type="composite"
                    animated={true}
                    variant="default"
                  />
                </Box>
              ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Rôles visibles (chargés) */}
                    {visibleCompositeRoles.map((role) => (
                    <React.Suspense 
                        key={role.roleName}
                        fallback={<SodCompositeRoleCardSkeleton />}
                      >
                        <SodCompositeRoleCardSuspense
                        role={role}
                          onDeleteAction={sodMutations.deleteAction}
                          onRestrictAction={sodMutations.restrictAction}
                        onRestrictResource={handleCompositeRestrictResourceWrapped}
                        onExcludeRole={sodMutations.excludeRole}
                        onDeleteRisk={undefined}
                        onNextStep={undefined}
                        showNextStepButton={false}
                      />
                    </React.Suspense>
                  ))}
                    
                    {/* Placeholders pour rôles non encore chargés (lazy loading) */}
                    {hasMoreComposite && (
                      <>
                        {Array.from({ length: remainingCompositeCount }).map((_, i) => (
                          <SodCompositeRoleCardSkeleton key={`skeleton-composite-${i}`} />
                        ))}
                        
                        {/* Sentinel pour Intersection Observer */}
                        <div 
                          ref={compositeObserverRef} 
                          style={{ height: '1px', width: '100%' }} 
                          aria-hidden="true"
                        />
                      </>
                    )}
              </Box>
              )}

              {/* Pagination en bas */}
              {compositeRoles.length > 5 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <TablePagination
                    component="div"
                    count={compositeRoles.length}
                    page={compositePagination.currentPage}
                    onPageChange={compositePagination.handlePageChange}
                    rowsPerPage={compositePagination.pageSize}
                    onRowsPerPageChange={compositePagination.handlePageSizeChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Rôles par page:"
                    labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${compositePagination.currentPage + 1}/${Math.ceil(count / compositePagination.pageSize)}`}
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Box>
          )}
        />
      )}

      {/* 🧭 SYSTÈME DE NAVIGATION : Bouton flottant et slider */}
      {sodWorkflow.state.session && (
        <>
          <SodNavigationButton
            nonRemediatedCount={nonRemediatedRisksCount}
            onOpenSlider={sodNavigation.actions.openSlider}
            visible={!!sodWorkflow.state.session}
          />
          
          <SodNavigationSlider
            isOpen={sodNavigation.state.isSliderOpen}
            session={sodWorkflow.state.session}
            mode={sodNavigation.state.mode}
            onClose={sodNavigation.actions.closeSlider}
            onModeChange={sodNavigation.actions.setMode}
            onNavigateToRisk={(roleName: string, riskCode: string, targetStep: number) => {
              // Naviguer vers le risque avec les callbacks appropriés
              sodNavigation.actions.navigateToRisk(
                roleName, 
                riskCode, 
                targetStep,
                sodWorkflow.actions.setCurrentStep,
                handleNavigateToRisk
              );
            }}
          />
        </>
      )}
    </Container>
  );
}



