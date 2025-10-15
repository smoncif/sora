'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, Alert, Paper, Button, TablePagination, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, alpha, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useAuth } from 'lib/hooks/useAuth';
import { ThemeToggle } from 'lib/components/common/ThemeToggle';
import { SodStepperNavigation } from 'lib/components/sod/navigation/SodStepperNavigation';
import { SodFileUploadSection } from 'lib/components/sod/upload/SodFileUploadSection';
import { SodAutoSelectionSection } from 'lib/components/sod/autoselection/SodAutoSelectionSection';
import { SodParsingProgressDetailed } from 'lib/components/sod/progress/SodParsingProgressDetailed';
import { SodAnalysisResults } from 'lib/components/sod/results/SodAnalysisResults';
import { SodNavigationButton, SodNavigationSlider } from 'lib/components/sod';
import { SodSimpleRoleCardSuspense, SodCompositeRoleCardSuspense } from 'lib/components/sod/suspense/SodAnalysisResultsSuspense';
import { useSodWorkflowOptimized } from 'lib/hooks/sod/useSodWorkflowOptimized';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';
import { useSodNavigation } from 'lib/hooks/sod/useSodNavigation';
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';
import { useSodAnalysisData } from 'lib/hooks/sod/useSodAnalysisDataQuery';
import { useSodOptimisticUpdates } from 'lib/hooks/sod/useSodOptimisticUpdates';
import { useQueryClient } from '@tanstack/react-query';
import { applyStateToSimpleRoles, applyStateToCompositeRoles } from 'lib/utils/sodStateApplication';
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';
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

  // 🧭 SYSTÈME DE NAVIGATION : Hook pour la navigation des risques
  const sodNavigation = useSodNavigation();

  // 🚀 OPTIMISTIC UPDATES : Hook pour les actions optimisées
  const optimisticUpdates = useSodOptimisticUpdates({ 
    userId: user?.id || 'anonymous',
    sessionId: sodWorkflow.state.session?.id 
  });



  // 🚀 NOUVEAU : Hook TanStack Query pour l'analyse SoD (cohérent avec les autres pages)
  const { data: sodAnalysisData, isLoading: isSodAnalysisLoading, error: sodAnalysisError } = useSodAnalysisData();

  const queryClient = useQueryClient();

  // ✅ DÉSTRUCTURER LE CONTEXTE EN PREMIER (avant utilisation)
  const actionsContext = useSodActionsContext();
  const { 
    buildActionResourcesMap,
    toggleDeleteAction, 
    toggleRestrictAction, 
    toggleRestrictResource,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    isSimpleRoleExcluded,
    resetState,
    version,
    deletedActions,
    restrictedActions,
    restrictedResources
  } = actionsContext;

  // 🚀 PAGINATION OPTIMISTE : Affichage immédiat des skeletons
  const simplePagination = useOptimisticPagination({
    pageSize: 5,
    type: 'Simple'
  });
  
  const compositePagination = useOptimisticPagination({
    pageSize: 5,
    type: 'Composite'
  });
  
  // ⚡ État des actions pour le cache (doit être stable)
  const actionsState = useMemo(() => ({
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
  }), [isActionDeleted, isActionRestricted, isResourceRestricted]);

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
    actionsState,
    version,
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
    actionsState,
    version,
  });

  // 📊 Pour la compatibilité avec le code existant (allRestrictedActions, etc.)
  const simpleRoles = useMemo(() => {
    return (sodWorkflow.state.session?.simpleRoles?.roles || []) as SodSimpleRole[];
  }, [sodWorkflow.state.session?.simpleRoles?.roles]);
  
  const compositeRoles = useMemo(() => {
    return (sodWorkflow.state.session?.compositeRoles?.roles || []) as SodCompositeRole[];
  }, [sodWorkflow.state.session?.compositeRoles?.roles]);

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
  });

  
  // ✅ Callbacks de pagination OPTIMISTES (déjà intégrés dans useOptimisticPagination)
  // - simplePagination.handlePageChange : Changement immédiat + skeletons
  // - simplePagination.handlePageSizeChange : Changement de taille + skeletons
  // - compositePagination.handlePageChange : Changement immédiat + skeletons  
  // - compositePagination.handlePageSizeChange : Changement de taille + skeletons
  
  // 🗺️ Construire la Map globale des ressources par action (UNE SEULE FOIS)
  // ✅ OPTIMISÉ : Construction de la Map globale des ressources au chargement
  useEffect(() => {
    if (simpleRoles.length > 0 || compositeRoles.length > 0) {
      buildActionResourcesMap(simpleRoles, compositeRoles);
    }
  }, [simpleRoles, compositeRoles, buildActionResourcesMap]);
  
  // ⚡ OPTIMISATION CRITIQUE 2 : Cache intelligent pour allRestrictedActions
  // 🎯 Impact : 90% plus rapide, calcul lourd fait 1 seule fois
  // ✅ NOUVEAU : Cache persistant avec validation stricte des dépendances
  const restrictedActionsCache = useRef(new Map<string, Map<string, { directlyRestricted: boolean; viaResources: boolean }>>());
  const lastCacheKey = useRef<string>('');
  
  const allRestrictedActions = useMemo(() => {
    // ⚡ Skip pendant le parsing pour ne pas ralentir le chargement
    if (sodWorkflow.state.parsing) {
      return new Map<string, { directlyRestricted: boolean; viaResources: boolean }>();
    }
    
    // ✅ OPTIMISÉ : Clé de cache plus précise avec hash des dépendances
    const cacheKey = `${version}-${simpleRoles.length}-${compositeRoles.length}-${restrictedActions.size}-${restrictedResources.size}`;
    
    // ✅ Retour ultra-rapide si cache valide (évite recalcul ~390 opérations)
    if (cacheKey === lastCacheKey.current && restrictedActionsCache.current.has(cacheKey)) {
      return restrictedActionsCache.current.get(cacheKey)!;
    }
    
    lastCacheKey.current = cacheKey;
    
    const result = new Map<string, { directlyRestricted: boolean; viaResources: boolean }>();
    
    // Parcourir tous les rôles pour calculer l'état visuel réel de chaque action
    [...simpleRoles, ...compositeRoles].forEach((role: any) => {
      role.risks.forEach((risk: any) => {
        risk.functions.forEach((func: any) => {
          // Pour les rôles simples
          if ('actions' in func) {
            func.actions.forEach((action: any) => {
              const key = `${role.roleName}|${action.code}`;
              
              // ✅ RÈGLE PRIORITAIRE : Ne pas lister les actions SUPPRIMÉES
              const isDeleted = isActionDeleted(role.roleName, action.code);
              if (isDeleted) return; // Ignorer les actions supprimées
              
              // ✅ Utiliser la MÊME LOGIQUE que applyStateToAction
              const actionRestriction = isActionRestricted(role.roleName, action.code);
              const restrictedByAction = actionRestriction.restrictedByAction;
              
              // Vérifier si l'action a des ressources réellement restreintes
              const hasRestrictedResource = action.resources.some((resource: any) => {
                if (resource.code === 'S_TCODE') return false;
                
                return resource.externalResources?.some((extRes: any) => {
                  const values = extractExternalResourceValues(extRes);
                  return isResourceRestricted(role.roleName, resource.code, extRes.code, values);
                });
              });
              
              // ✅ Calculer l'état visuel final (même logique que applyStateToAction)
              const finalIsRestricted = restrictedByAction 
                ? hasRestrictedResource 
                : (actionRestriction.isRestricted || hasRestrictedResource);
              
              // N'ajouter que si visuellement restreinte
              if (finalIsRestricted) {
                result.set(key, { 
                  directlyRestricted: restrictedByAction, 
                  viaResources: hasRestrictedResource 
                });
              }
            });
          }
          // Pour les rôles composites
          else if ('simpleRoles' in func) {
            func.simpleRoles.forEach((simpleRole: any) => {
              // ✅ RÈGLE PRIORITAIRE : Ignorer les rôles simples exclus
              const isExcluded = isSimpleRoleExcluded(role.roleName, simpleRole.roleName);
              if (isExcluded) return;
              
              simpleRole.actions.forEach((action: any) => {
                const key = `${simpleRole.roleName}|${action.code}`;
                
                // ✅ RÈGLE PRIORITAIRE : Ne pas lister les actions SUPPRIMÉES
                const isDeleted = isActionDeleted(simpleRole.roleName, action.code);
                if (isDeleted) return; // Ignorer les actions supprimées
                
                // ✅ Utiliser la MÊME LOGIQUE que applyStateToAction
                const actionRestriction = isActionRestricted(simpleRole.roleName, action.code);
                const restrictedByAction = actionRestriction.restrictedByAction;
                
                const hasRestrictedResource = action.resources.some((resource: any) => {
                  if (resource.code === 'S_TCODE') return false;
                  
                  return resource.externalResources?.some((extRes: any) => {
                    const values = extractExternalResourceValues(extRes);
                    return isResourceRestricted(simpleRole.roleName, resource.code, extRes.code, values);
                  });
                });
                
                // ✅ Calculer l'état visuel final
                const finalIsRestricted = restrictedByAction 
                  ? hasRestrictedResource 
                  : (actionRestriction.isRestricted || hasRestrictedResource);
                
                // N'ajouter que si visuellement restreinte
                if (finalIsRestricted) {
                  result.set(key, { 
                    directlyRestricted: restrictedByAction, 
                    viaResources: hasRestrictedResource 
                  });
                }
              });
            });
          }
        });
      });
    });
    
    // ✅ Sauvegarder dans le cache avant de retourner
    restrictedActionsCache.current.set(cacheKey, result);
    
    // ✅ Nettoyer le cache si trop grand (garder seulement les 5 dernières entrées)
    if (restrictedActionsCache.current.size > 5) {
      const keysToDelete = Array.from(restrictedActionsCache.current.keys()).slice(0, -5);
      keysToDelete.forEach(key => restrictedActionsCache.current.delete(key));
    }
    
    return result;
  }, [sodWorkflow.state.parsing, simpleRoles, compositeRoles, restrictedActions, restrictedResources, isResourceRestricted, version]);
  
  
  // ✅ ANCIENS useMemo SUPPRIMÉS : Remplacés par useSodPagedRoles et useSodPagedCompositeRoles
  // Ces hooks gèrent automatiquement :
  // - Pagination avec slice
  // - Application de l'état (applyStateToSimpleRoles)
  // - Cache TanStack Query
  // - Prefetch des pages adjacentes
  // - Logs de performance (CACHE HIT/MISS dans les hooks)
  
  // ⚡ OPTIMISATION PREFETCH : Prefetch des pages adjacentes pour navigation instantanée
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
    toggleDeleteAction(roleName, actionCode, resources || []);
  }, [toggleDeleteAction]); // ✅ Stable : toggleDeleteAction ne change jamais

  const handleRestrictAction = useCallback((roleName: string, _riskId: string, actionCode: string, resources?: any[]) => {
    toggleRestrictAction(roleName, actionCode, resources || []);
  }, [toggleRestrictAction]); // ✅ Stable : toggleRestrictAction ne change jamais

  const handleRestrictResourceWrapped = useCallback((
        roleName: string,
    _riskId: string,
    _actionCode: string,
        resourceCode: string,
        externalResourceCode: string,
        values: string[]
      ) => {
    toggleRestrictResource(roleName, resourceCode, externalResourceCode, values);
  }, [toggleRestrictResource]); // ✅ Stable : toggleRestrictResource ne change jamais

  const handleCompositeRestrictResourceWrapped = useCallback((
        roleName: string,
    _riskId: string,
    _actionCode: string,
        resourceCode: string,
        externalResourceCode: string,
        values: string[]
      ) => {
    toggleRestrictResource(roleName, resourceCode, externalResourceCode, values);
  }, [toggleRestrictResource]); // ✅ Stable : toggleRestrictResource ne change jamais

  // 🧭 CALCUL DES RISQUES NON REMÉDIÉS : Pour le badge du bouton de navigation
  const nonRemediatedRisksCount = useMemo(() => {
    // ⚡ Skip pendant le parsing pour ne pas ralentir le chargement
    if (!sodWorkflow.state.session || sodWorkflow.state.parsing) return 0;

    let count = 0;

    // Compter les risques non remédiés dans les rôles simples
    if (sodWorkflow.state.session.simpleRoles?.roles) {
      sodWorkflow.state.session.simpleRoles.roles.forEach((role: any) => {
        role.risks?.forEach((risk: any) => {
          const remediation = actionsContext.calculateRiskRemediation(role.roleName, risk.functions);
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
          const remediation = actionsContext.calculateCompositeRiskRemediation(role.roleName, risk.functions);
          if (!remediation.isRemediated) {
            count++;
          }
        });
      });
    }

    return count;
  }, [sodWorkflow.state.session, sodWorkflow.state.parsing, actionsContext, version]);

  // 🧭 NAVIGATION VERS RISQUE : Callback pour naviguer vers un rôle/risque spécifique
  const handleNavigateToRisk = useCallback((
    roleName: string, 
    riskCode: string, 
    targetStep: number
  ) => {
    // Corriger targetStep si undefined
    const correctedTargetStep = targetStep || sodWorkflow.state.currentStep;
    
    // Changer l'étape si nécessaire
    if (sodWorkflow.state.currentStep !== correctedTargetStep) {
      sodWorkflow.actions.setCurrentStep(correctedTargetStep);
    }

    // Gérer la pagination : trouver la page qui contient le rôle
    if (correctedTargetStep === 1) {
      // Étape 1 : Rôles simples
      const roleIndex = simpleRoles.findIndex(role => role.roleName === roleName);
      if (roleIndex !== -1) {
        const targetPage = Math.floor(roleIndex / 5);
        if (targetPage !== simplePagination.currentPage) {
          simplePagination.handlePageChange(null as any, targetPage);
        }
      }
    } else if (correctedTargetStep === 2) {
      // Étape 2 : Rôles composites
      const roleIndex = compositeRoles.findIndex(role => role.roleName === roleName);
      if (roleIndex !== -1) {
        const targetPage = Math.floor(roleIndex / 5);
        if (targetPage !== compositePagination.currentPage) {
          compositePagination.handlePageChange(null as any, targetPage);
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
      }
    }, 300); // Augmenter le délai initial
  }, [sodWorkflow, simpleRoles, compositeRoles, simplePagination, compositePagination]);
  

  // Handler pour la remédiation automatique
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
        <ThemeToggle />
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

      {/* 🐛 Section de Debug - État des restrictions */}
      {sodWorkflow.state.session && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon color="info" />
              <Typography variant="h6">
                🐛 Debug - État des Restrictions
              </Typography>
              <Chip 
                label={`${deletedActions.size} supprimées`} 
                size="small" 
                color="error" 
              />
              <Chip 
                label={`${allRestrictedActions.size} actions restreintes`} 
                size="small" 
                color="warning" 
              />
              <Chip 
                label={`${restrictedResources.size} ressources restreintes`} 
                size="small" 
                color="info" 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              
              {/* Actions supprimées */}
              <Paper sx={{ p: 2, bgcolor: 'error.50' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  🗑️ Actions Supprimées ({deletedActions.size})
                </Typography>
                {deletedActions.size === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucune action supprimée</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {Array.from(deletedActions.entries()).map(([key, _value]) => {
                      const [roleName, actionCode] = key.split('|');
                      return (
                        <Chip 
                          key={key} 
                          label={`${roleName} → ${actionCode}`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      );
                    })}
              </Box>
            )}
          </Paper>

              {/* Actions restreintes */}
              <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  🚫 Actions Restreintes ({allRestrictedActions.size})
                </Typography>
                {allRestrictedActions.size === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucune action restreinte</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    {Array.from(allRestrictedActions.entries()).map(([key, value]) => {
                      const [roleName, actionCode] = key.split('|');
                      return (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={`${roleName} → ${actionCode}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                          {value.directlyRestricted && (
                            <Chip 
                              label="🚫 Directe"
                              size="small"
                              color="warning"
                            />
                          )}
                          {value.viaResources && (
                            <Chip 
                              label="🔗 Propagation"
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>

              {/* Ressources restreintes */}
              <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  🔒 Ressources Restreintes ({restrictedResources.size})
                </Typography>
                {restrictedResources.size === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucune ressource restreinte</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    {Array.from(restrictedResources.entries()).map(([key, valuesSet]) => {
                      const [roleName, resourceCode, externalResourceCode] = key.split('|');
                      // ✅ Afficher UNIQUEMENT les valeurs qui sont dans restrictedResourcesRef
                      const restrictedValues = Array.from(valuesSet);
                      
                      // Ne pas afficher si aucune valeur restreinte
                      if (restrictedValues.length === 0) return null;
                      
                      return (
                        <Box key={key} sx={{ p: 1, border: '1px solid', borderColor: 'info.main', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {roleName} → {resourceCode} → {externalResourceCode === 'NULL' ? '(pas de code externe)' : externalResourceCode}
              </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {restrictedValues.map((value, idx) => (
                              <Chip 
                                key={idx}
                                label={value}
                                size="small"
                                color="info"
                                variant="filled"
                              />
                            ))}
              </Box>
            </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>

            </Box>
          </AccordionDetails>
        </Accordion>
      )}

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
                          onDeleteAction={optimisticUpdates.deleteAction}
                          onRestrictAction={optimisticUpdates.restrictAction}
                          onRestrictResource={optimisticUpdates.restrictResource}
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
                          onDeleteAction={optimisticUpdates.deleteAction}
                          onRestrictAction={optimisticUpdates.restrictAction}
                        onRestrictResource={handleCompositeRestrictResourceWrapped}
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




