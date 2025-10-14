'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, Alert, Paper, Button, TablePagination, Accordion, AccordionSummary, AccordionDetails, Chip, Grid, alpha, useTheme, Fade } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useAuth } from 'lib/hooks/useAuth';
import { ThemeToggle } from 'lib/components/common/ThemeToggle';
import { SodStepperNavigation } from 'lib/components/sod/navigation/SodStepperNavigation';
import { SodFileUploadSection } from 'lib/components/sod/upload/SodFileUploadSection';
import { SodAutoSelectionSection } from 'lib/components/sod/autoselection/SodAutoSelectionSection';
import { SodParsingProgress as SodParsingProgressNew } from 'lib/components/sod/progress/SodParsingProgress';
import { SodAnalysisResults } from 'lib/components/sod/results/SodAnalysisResults';
import { SodNavigationButton, SodNavigationSlider } from 'lib/components/sod';
import { SodSimpleRoleCardSuspense, SodCompositeRoleCardSuspense } from 'lib/components/sod/suspense/SodAnalysisResultsSuspense';
import { useSodWorkflowOptimized } from 'lib/hooks/sod/useSodWorkflowOptimized';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';
import { useSodNavigation } from 'lib/hooks/sod/useSodNavigation';
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';
import { useSodAnalysisData } from 'lib/hooks/sod/useSodAnalysisDataQuery';
import { useSodPaginationPrefetch } from 'lib/hooks/sod/useSodPaginationPrefetch';
import { useSodOptimisticUpdates } from 'lib/hooks/sod/useSodOptimisticUpdates';
import { useQueryClient } from '@tanstack/react-query';
import { applyStateToSimpleRoles, applyStateToCompositeRoles } from 'lib/utils/sodStateApplication';
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';


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

  // ⚡ NOUVEAU : Hook pour prefetch de pagination
  const { prefetchNextPage, prefetchPreviousPage, prefetchAdjacentPages } = useSodPaginationPrefetch();
  const queryClient = useQueryClient();

  // 🧪 DEBUG : État du prefetch pour monitoring
  const [prefetchStatus, setPrefetchStatus] = useState<{ simple: string; composite: string }>({
    simple: 'Prêt',
    composite: 'Prêt'
  });


  // 🚀 NOUVELLE ARCHITECTURE : État global + Pagination pure
  const simpleRoles = (sodWorkflow.state.session?.simpleRoles?.roles || []) as SodSimpleRole[];
  const compositeRoles = (sodWorkflow.state.session?.compositeRoles?.roles || []) as SodCompositeRole[];


  // Pagination pour rôles simples (index 0-based pour TablePagination)
  const [simpleRolePage, setSimpleRolePage] = useState(0);
  const [simpleRolesPerPage, setSimpleRolesPerPage] = useState(5);
  
  // Pagination pour rôles composites (index 0-based pour TablePagination)
  const [compositeRolePage, setCompositeRolePage] = useState(0);
  const [compositeRolesPerPage, setCompositeRolesPerPage] = useState(5);

  
  // ✅ Callbacks de pagination mémorisés avec prefetch
  const handleSimplePageChange = useCallback((_event: unknown, newPage: number) => {
    
    setSimpleRolePage(newPage);
    setPrefetchStatus(prev => ({ ...prev, simple: '⚡ Prefetch...' }));
    
    // ⚡ Prefetch les pages adjacentes après changement (UNE SEULE FOIS)
    setTimeout(() => {
      const totalPages = Math.ceil(simpleRoles.length / simpleRolesPerPage);
      
      if (newPage + 1 < totalPages) {
        prefetchNextPage(newPage, simpleRolesPerPage, simpleRoles);
      }
      if (newPage > 0) {
        prefetchPreviousPage(newPage, simpleRolesPerPage, simpleRoles);
      }
      
      // ✅ Marquer comme terminé
      setTimeout(() => {
        setPrefetchStatus(prev => ({ ...prev, simple: '✅ Prêt' }));
      }, 50);
    }, 0);
  }, [simpleRoles, simpleRolesPerPage, prefetchNextPage, prefetchPreviousPage, simpleRolePage]);
  
  const handleSimpleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    setSimpleRolesPerPage(newPageSize);
    setSimpleRolePage(0);
    
    // ⚡ Prefetch la première page avec la nouvelle taille
    setTimeout(() => {
      prefetchNextPage(0, newPageSize, simpleRoles);
    }, 0);
  }, [prefetchNextPage, simpleRoles]);
  
  const handleCompositePageChange = useCallback((_event: unknown, newPage: number) => {
    setCompositeRolePage(newPage);
    setPrefetchStatus(prev => ({ ...prev, composite: '⚡ Prefetch...' }));
    
    // ⚡ Prefetch les pages adjacentes après changement
    setTimeout(() => {
      const totalPages = Math.ceil(compositeRoles.length / compositeRolesPerPage);
      if (newPage + 1 < totalPages) {
        prefetchNextPage(newPage, compositeRolesPerPage, compositeRoles);
      }
      if (newPage > 0) {
        prefetchPreviousPage(newPage, compositeRolesPerPage, compositeRoles);
      }
      
      // ✅ Marquer comme terminé
      setTimeout(() => {
        setPrefetchStatus(prev => ({ ...prev, composite: '✅ Prêt' }));
      }, 50);
    }, 0);
  }, [compositeRoles, compositeRolesPerPage, prefetchNextPage, prefetchPreviousPage]);
  
  const handleCompositeRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    setCompositeRolesPerPage(newPageSize);
    setCompositeRolePage(0);
    
    // ⚡ Prefetch la première page avec la nouvelle taille
    setTimeout(() => {
      prefetchNextPage(0, newPageSize, compositeRoles);
    }, 0);
  }, [prefetchNextPage, compositeRoles]);
  
  // ✅ Déstructurer le contexte pour avoir des références stables
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
    resetState, // ✅ Ajouter resetState pour l'upload
    version, // Pour forcer le re-calcul des useMemo
    deletedActions,
    restrictedActions,
    restrictedResources
  } = actionsContext;
  
  // 🗺️ Construire la Map globale des ressources par action (UNE SEULE FOIS)
  // ✅ OPTIMISÉ : Construction de la Map globale des ressources au chargement
  useEffect(() => {
    if (simpleRoles.length > 0 || compositeRoles.length > 0) {
      buildActionResourcesMap(simpleRoles, compositeRoles);
    }
  }, [simpleRoles, compositeRoles, buildActionResourcesMap]);
  
  // 🐛 Calculer toutes les actions VISUELLEMENT restreintes (en utilisant la même logique que applyStateToAction)
  // 🚀 OPTIMISÉ : Ne se calcule pas pendant le parsing pour éviter de ralentir le chargement
  // ⚡ CACHE INCRÉMENTAL : Évite de recalculer si rien n'a changé
  const restrictedActionsCache = useRef(new Map<string, Map<string, { directlyRestricted: boolean; viaResources: boolean }>>());
  
  const allRestrictedActions = useMemo(() => {
    // ⚡ Skip pendant le parsing pour ne pas ralentir le chargement
    if (sodWorkflow.state.parsing) {
      return new Map<string, { directlyRestricted: boolean; viaResources: boolean }>();
    }
    
    // ✅ Créer une clé de cache basée sur les dépendances
    const cacheKey = `${version}-${simpleRoles.length}-${compositeRoles.length}-${restrictedActions.size}-${restrictedResources.size}`;
    
    // ✅ Retourner le cache si rien n'a changé
    if (restrictedActionsCache.current.has(cacheKey)) {
      return restrictedActionsCache.current.get(cacheKey)!;
    }
    
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
  
  
  // 🚀 OPTIMISATION 1 : Pagination AVANT d'appliquer l'état
  // Slice ultra-rapide (< 1ms) sur les données brutes
  const paginatedSimpleRolesRaw = useMemo(() => {
    const start = simpleRolePage * simpleRolesPerPage;
    const end = start + simpleRolesPerPage;
    return simpleRoles.slice(start, end);
  }, [simpleRoles, simpleRolePage, simpleRolesPerPage]);

  const paginatedCompositeRolesRaw = useMemo(() => {
    const start = compositeRolePage * compositeRolesPerPage;
    const end = start + compositeRolesPerPage;
    return compositeRoles.slice(start, end);
  }, [compositeRoles, compositeRolePage, compositeRolesPerPage]);
  
  // 🚀 OPTIMISATION 2 : Appliquer l'état UNIQUEMENT aux rôles de la page actuelle
  // Seulement 5 rôles au lieu de 1000 !
  // ✅ Créer l'objet state avec les fonctions nécessaires
  const actionsState = useMemo(() => ({
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
  }), [isActionDeleted, isActionRestricted, isResourceRestricted]);
  
  const paginatedSimpleRoles = useMemo(() => {
    return applyStateToSimpleRoles(paginatedSimpleRolesRaw, actionsState);
  }, [paginatedSimpleRolesRaw, actionsState, version]); // ✅ Dépend de version pour se recalculer

  const paginatedCompositeRoles = useMemo(() => {
    return applyStateToCompositeRoles(paginatedCompositeRolesRaw, actionsState);
  }, [paginatedCompositeRolesRaw, actionsState, version]); // ✅ Dépend de version pour se recalculer
  
  // ⚡ OPTIMISATION PREFETCH : Prefetch des pages adjacentes pour navigation instantanée
  // ✅ NOUVEAU : Prefetch intelligent des données de pagination
  
  // ⚡ PREFETCH INITIAL : Charger les premières pages au démarrage
  useEffect(() => {
    if (sodWorkflow.state.parsing || !sodWorkflow.state.session || simpleRoles.length === 0) return;
    
    // ✅ Prefetch initial : charger les 3 premières pages (1, 2, 3) car on est sur page 0
    const pagesToPrefetch = [1, 2, 3]; // Pages suivantes de la page courante (0)
    const totalPages = Math.ceil(simpleRoles.length / simpleRolesPerPage);
    
    pagesToPrefetch.forEach(page => {
      if (page < totalPages) {
        // Utiliser prefetchSodPage directement pour les pages spécifiques
        queryClient.prefetchQuery({
          queryKey: ['analysis', 'sod', 'page', page, simpleRolesPerPage],
          queryFn: async () => {
            const start = page * simpleRolesPerPage;
            const end = start + simpleRolesPerPage;
            return {
              roles: simpleRoles.slice(start, end),
              totalCount: simpleRoles.length,
              page,
              pageSize: simpleRolesPerPage,
              totalPages: Math.ceil(simpleRoles.length / simpleRolesPerPage),
              lastUpdated: new Date().toISOString(),
            };
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    });
    
  }, [sodWorkflow.state.parsing, sodWorkflow.state.session, simpleRoles.length, simpleRolesPerPage, queryClient]);

  // ❌ SUPPRIMÉ : Prefetch automatique (causait double prefetch)
  // Le prefetch est maintenant géré uniquement dans handleSimplePageChange
  
  // ⚡ PREFETCH INITIAL COMPOSITE : Charger les premières pages au démarrage
  useEffect(() => {
    if (sodWorkflow.state.parsing || !sodWorkflow.state.session || compositeRoles.length === 0) return;
    
    // ✅ Prefetch initial : charger les 3 premières pages (1, 2, 3) car on est sur page 0
    const pagesToPrefetch = [1, 2, 3]; // Pages suivantes de la page courante (0)
    const totalPages = Math.ceil(compositeRoles.length / compositeRolesPerPage);
    
    pagesToPrefetch.forEach(page => {
      if (page < totalPages) {
        // Utiliser prefetchSodPage directement pour les pages spécifiques
        queryClient.prefetchQuery({
          queryKey: ['analysis', 'sod', 'composite-page', page, compositeRolesPerPage],
          queryFn: async () => {
            const start = page * compositeRolesPerPage;
            const end = start + compositeRolesPerPage;
            return {
              roles: compositeRoles.slice(start, end),
              totalCount: compositeRoles.length,
              page,
              pageSize: compositeRolesPerPage,
              totalPages: Math.ceil(compositeRoles.length / compositeRolesPerPage),
              lastUpdated: new Date().toISOString(),
            };
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    });
    
  }, [sodWorkflow.state.parsing, sodWorkflow.state.session, compositeRoles.length, compositeRolesPerPage, queryClient]);

  // ❌ SUPPRIMÉ : Prefetch automatique (causait double prefetch)
  // Le prefetch est maintenant géré uniquement dans handleCompositePageChange
  
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
        const targetPage = Math.floor(roleIndex / simpleRolesPerPage);
        if (targetPage !== simpleRolePage) {
          setSimpleRolePage(targetPage);
        }
      }
    } else if (correctedTargetStep === 2) {
      // Étape 2 : Rôles composites
      const roleIndex = compositeRoles.findIndex(role => role.roleName === roleName);
      if (roleIndex !== -1) {
        const targetPage = Math.floor(roleIndex / compositeRolesPerPage);
        if (targetPage !== compositeRolePage) {
          setCompositeRolePage(targetPage);
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
  }, [sodWorkflow, simpleRoles, simpleRolesPerPage, simpleRolePage, compositeRoles, compositeRolesPerPage, compositeRolePage]);
  

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
            <span style={{ marginLeft: '10px', fontSize: '0.7em', color: '#28a745', fontWeight: 'bold' }}>
              ⚡ Prefetch: Simple {prefetchStatus.simple} | Composite {prefetchStatus.composite}
            </span>
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

      {/* Barre de progression pendant le parsing */}
      <SodParsingProgressNew
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
                  page={simpleRolePage}
                  onPageChange={handleSimplePageChange}
                  rowsPerPage={simpleRolesPerPage}
                  onRowsPerPageChange={handleSimpleRowsPerPageChange}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="Rôles par page:"
                  labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${simpleRolePage + 1}/${Math.ceil(count / simpleRolesPerPage)}`}
                  showFirstButton
                  showLastButton
                />
              </Box>

              {/* Rôles simples */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {paginatedSimpleRoles.map((role, index) => (
                  <React.Suspense 
                    key={`${simpleRolePage}-${index}`}
                    fallback={
                      <Box sx={{ 
                        p: 4, 
                        textAlign: 'center', 
                        border: '1px solid rgba(0,0,0,0.1)', 
                        borderRadius: 3 
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          Chargement du rôle...
                </Typography>
                      </Box>
                    }
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
              </Box>

              {/* Pagination en bas */}
              {simpleRoles.length > 5 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <TablePagination
                    component="div"
                    count={simpleRoles.length}
                    page={simpleRolePage}
                    onPageChange={handleSimplePageChange}
                    rowsPerPage={simpleRolesPerPage}
                    onRowsPerPageChange={handleSimpleRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Rôles par page:"
                    labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${simpleRolePage + 1}/${Math.ceil(count / simpleRolesPerPage)}`}
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
                  page={compositeRolePage}
                  onPageChange={handleCompositePageChange}
                  rowsPerPage={compositeRolesPerPage}
                  onRowsPerPageChange={handleCompositeRowsPerPageChange}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="Rôles par page:"
                  labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${compositeRolePage + 1}/${Math.ceil(count / compositeRolesPerPage)}`}
                  showFirstButton
                  showLastButton
                />
              </Box>

              {/* Rôles composites */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {paginatedCompositeRoles.map((role, index) => (
                    <React.Suspense 
                      key={`${compositeRolePage}-${index}`}
                      fallback={
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center', 
                          border: '1px solid rgba(0,0,0,0.1)', 
                          borderRadius: 3 
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            Chargement du rôle...
                </Typography>
                        </Box>
                      }
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
              </Box>

              {/* Pagination en bas */}
              {compositeRoles.length > 5 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <TablePagination
                    component="div"
                    count={compositeRoles.length}
                    page={compositeRolePage}
                    onPageChange={handleCompositePageChange}
                    rowsPerPage={compositeRolesPerPage}
                    onRowsPerPageChange={handleCompositeRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Rôles par page:"
                    labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count} • Page ${compositeRolePage + 1}/${Math.ceil(count / compositeRolesPerPage)}`}
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




