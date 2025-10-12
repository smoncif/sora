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
import { SodParsingProgress } from 'lib/components/sod/upload/SodParsingProgress';
import { SodSimpleRoleCard, SodCompositeRoleCard } from 'lib/components/sod';
import { useSodWorkflow } from 'lib/hooks/sod/useSodWorkflow';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';
import { applyStateToSimpleRoles, applyStateToCompositeRoles } from 'lib/utils/sodStateApplication';
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';


export default function SodAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();
  
  // 🚀 NOUVEAU WORKFLOW SOD : Utiliser le hook unifié
  const sodWorkflow = useSodWorkflow({ userId: user?.id || 'anonymous' });

  // Pagination pour rôles simples (index 0-based pour TablePagination)
  const [simpleRolePage, setSimpleRolePage] = useState(0);
  const [simpleRolesPerPage, setSimpleRolesPerPage] = useState(5);
  
  // Pagination pour rôles composites (index 0-based pour TablePagination)
  const [compositeRolePage, setCompositeRolePage] = useState(0);
  const [compositeRolesPerPage, setCompositeRolesPerPage] = useState(5);
  
  // ✅ Callbacks de pagination mémorisés
  const handleSimplePageChange = useCallback((_event: unknown, newPage: number) => {
    setSimpleRolePage(newPage);
  }, []);
  
  const handleSimpleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSimpleRolesPerPage(parseInt(event.target.value, 10));
    setSimpleRolePage(0);
  }, []);
  
  const handleCompositePageChange = useCallback((_event: unknown, newPage: number) => {
    setCompositeRolePage(newPage);
  }, []);
  
  const handleCompositeRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCompositeRolesPerPage(parseInt(event.target.value, 10));
    setCompositeRolePage(0);
  }, []);

  // 🚀 NOUVELLE ARCHITECTURE : État global + Pagination pure
  const simpleRoles = (sodWorkflow.state.session?.simpleRoles?.roles || []) as SodSimpleRole[];
  const compositeRoles = (sodWorkflow.state.session?.compositeRoles?.roles || []) as SodCompositeRole[];
  
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
  const allRestrictedActions = useMemo(() => {
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
            func.simpleRoles.forEach(simpleRole => {
              // ✅ RÈGLE PRIORITAIRE : Ignorer les rôles simples exclus
              const isExcluded = isSimpleRoleExcluded(role.roleName, simpleRole.roleName);
              if (isExcluded) return;
              
              simpleRole.actions.forEach(action => {
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
    
    return result;
  }, [simpleRoles, compositeRoles, restrictedActions, isResourceRestricted, version]);
  
  
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
  
  // 🔍 DEBUG 4 : Détecter les changements de callbacks
  const callbackRefId = useRef(0);
  const previousCallbackRef = useRef(handleDeleteAction);
  
  useEffect(() => {
    if (previousCallbackRef.current !== handleDeleteAction) {
      callbackRefId.current++;
      console.error(`
╔════════════════════════════════════════════════════════════════
║ ❌ CALLBACK A CHANGÉ : handleDeleteAction
╠════════════════════════════════════════════════════════════════
║ Callback ID: ${callbackRefId.current}
║ 
║ CAUSE: Le contexte a changé → useCallback se recalcule
║ IMPACT: React.memo échoue → Tous les composants se re-rendent
╚════════════════════════════════════════════════════════════════
      `);
    }
    previousCallbackRef.current = handleDeleteAction;
  }, [handleDeleteAction]);

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

      {/* Navigation par étapes */}
      {sodWorkflow.state.session && (
        <SodStepperNavigation 
          currentStep={sodWorkflow.state.currentStep as 1 | 2 | 3 | 4} 
          onStepChange={sodWorkflow.actions.setCurrentStep} 
        />
      )}

      {/* Affichage des erreurs */}
      {sodWorkflow.state.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {sodWorkflow.state.error}
        </Alert>
      )}

      {/* Layout 2 cartes avec proportions ajustées */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Carte 1 : Upload des fichiers - Plus large */}
        <Grid size={{ xs: 12, md: 8 }}>
          <SodFileUploadSection
            importType={sodWorkflow.state.importType}
            loading={sodWorkflow.state.loading}
            error={sodWorkflow.state.error}
            user={user}
            onImportTypeChange={sodWorkflow.actions.setImportType}
            onFileUpload={sodWorkflow.actions.startNewAnalysis}
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
      {sodWorkflow.state.parsing && sodWorkflow.state.progress && (
        <Box sx={{ mt: 3 }}>
          <SodParsingProgress
            progress={sodWorkflow.state.progress.progress}
            message={sodWorkflow.state.progress.message}
            parsing={sodWorkflow.state.parsing}
            error={sodWorkflow.state.parsingError}
            onCancel={sodWorkflow.actions.cancelParsing}
          />
        </Box>
      )}

      {/* Section de statistiques après chargement */}
      {sodWorkflow.state.session && (
        <Fade in timeout={800}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Résultats de l'analyse
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                    {sodWorkflow.state.session.simpleRoles?.roles?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rôles Simples
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary" sx={{ fontWeight: 700 }}>
                    {sodWorkflow.state.session.compositeRoles?.roles?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rôles Composites
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {sodWorkflow.state.session.simpleRoles?.metrics?.totalRisks || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Risques Identifiés
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                    {sodWorkflow.state.session.simpleRoles?.metrics?.totalActions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Actions Analysées
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {/* Section de test pour vérifier le workflow */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                🧪 Test du workflow :
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Session active : {sodWorkflow.state.session ? '✅' : '❌'}
                <br />
                • Étape courante : {sodWorkflow.state.currentStep}
                <br />
                • Analyse d'usage : {sodWorkflow.state.enableUsageAnalysis ? 'Activée' : 'Désactivée'}
                <br />
                • Type d'import : {sodWorkflow.state.importType}
              </Typography>
            </Box>
            
            {/* Bouton pour réinitialiser et charger un nouveau fichier */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={sodWorkflow.actions.resetWorkflow}
                sx={{ textTransform: 'none' }}
              >
                Charger un nouveau fichier
              </Button>
            </Box>
          </Box>
        </Fade>
      )}

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

      {/* Barre de progression pendant le parsing */}
      {/* TODO: Intégrer SodParsingProgress avec le nouveau workflow */}

      {/* Résultats d'analyse */}
      {sodWorkflow.state.session && (
        <Fade in timeout={800}>
          <Box>

            {/* Étape 1 : Rôles Simples avec pagination */}
            {sodWorkflow.state.currentStep === 1 && sodWorkflow.state.session?.simpleRoles && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Étape 1: Rôles Simples
              </Typography>
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

          {/* 🚀 OPTIMISATION : Lazy rendering avec Suspense */}
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
                <SodSimpleRoleCard
                  role={role}
                  onDeleteAction={handleDeleteAction}
                  onRestrictAction={handleRestrictAction}
                  onRestrictResource={handleRestrictResourceWrapped}
                  onDeleteRisk={undefined}
                  onNextStep={undefined}
                  showNextStepButton={false}
                />
              </React.Suspense>
            ))}
          </Box>

          {/* Pagination en bas aussi */}
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

            {/* Étape 2 : Rôles Composites avec pagination */}
            {sodWorkflow.state.currentStep === 2 && sodWorkflow.state.session?.compositeRoles && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Étape 2: Rôles Composites
              </Typography>
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

          {/* 🚀 OPTIMISATION : Lazy rendering avec Suspense */}
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
                <SodCompositeRoleCard
                  role={role}
                  onDeleteAction={handleDeleteAction}
                  onRestrictAction={handleRestrictAction}
                  onRestrictResource={handleCompositeRestrictResourceWrapped}
                  onDeleteRisk={undefined}
                  onNextStep={undefined}
                  showNextStepButton={false}
                />
              </React.Suspense>
            ))}
          </Box>

          {/* Pagination en bas aussi */}
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

            {/* Étape 3 : Analyse par Utilisateur */}
            {sodWorkflow.state.currentStep === 3 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Étape 3: Analyse par Utilisateur
          </Typography>
          <Alert severity="info">
            Cette fonctionnalité sera disponible prochainement.
          </Alert>
        </Box>
      )}

            {/* Étape 4 : Rapport SoD */}
            {sodWorkflow.state.currentStep === 4 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Étape 4: Rapport SoD
          </Typography>
          <Alert severity="info">
            Cette fonctionnalité sera disponible prochainement.
          </Alert>
        </Box>
      )}

          </Box>
        </Fade>
      )}
    </Container>
  );
}




