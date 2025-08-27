'use client';

import React from 'react';
import { 
  Box,
  Container,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useTheme,
  alpha,
  Fade,
  Grid,
} from '@mui/material';
import { useAuth } from 'lib/hooks/useAuth';
import { ThemeToggle } from 'lib/components/common/ThemeToggle';
import { FileUploadSection } from 'lib/components/analysis/FileUploadSection';
import { ConfigurationSection } from 'lib/components/analysis/ConfigurationSection';
import { AutoSelectionSection } from 'lib/components/analysis/AutoSelectionSection';
import { ActionsSection } from 'lib/components/analysis/ActionsSection';
import { OverviewStatsSection } from 'lib/components/analysis/OverviewStatsSection';
import { AnalysisResultsSection } from 'lib/components/analysis/AnalysisResultsSection';
import { BusinessRoleAnalysisCard } from 'lib/components/analysis/BusinessRoleAnalysisCard';
import { useAnalysisWorkflow } from 'lib/hooks/analysis/useAnalysisWorkflow';
import { exportResultsToExcel } from 'lib/services/analysis/exportResultsService';
import { FocusProvider } from 'lib/contexts/FocusContext';
import { SaveAnalysisDialog } from 'lib/components/analysis/SaveAnalysisDialog';
import { useFocus } from 'lib/contexts/FocusContext';

/**
 * Composant interne pour le bouton Quitter Focus fixe
 * Utilise useFocus() à l'intérieur du FocusProvider
 */
function FixedExitFocusButton() {
  const theme = useTheme();
  const { focusedBusinessRole, setFocusedBusinessRole } = useFocus();

  // ⚡ OPTIMISÉ : Gestion immédiate du clic - scroll géré automatiquement par FocusContext
  const handleExitFocus = React.useCallback(() => {
    setFocusedBusinessRole(null);
    // 🔄 Scroll automatiquement restauré par le FocusContext vers la position sauvegardée
  }, [setFocusedBusinessRole]);

  if (!focusedBusinessRole) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1200,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[8],
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      }}
    >
      <Button
        variant="contained"
        color="primary"
        onClick={handleExitFocus}
        startIcon={<span>↩️</span>}
        sx={{
          minWidth: 180,
          fontWeight: 600,
          textTransform: 'none',
          px: 3,
          py: 1.5,
        }}
      >
        Quitter Focus
      </Button>
    </Box>
  );
}

/**
 * Page d'analyse des rôles métier optimisée
 * Interface unique avec workflow refactorisé et hooks spécialisés
 */
export default function RoleAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();

  // 🔒 STABILISATION ABSOLUE : Utiliser useRef pour éviter les re-initialisations
  const workflowConfigRef = React.useRef({
    userId: user?.id || 'anonymous'
  });
  
  // 🔒 CONFIGURATION STABILISÉE : Utiliser useMemo directement avec user?.id
  const stableWorkflowConfig = React.useMemo(() => ({
    userId: user?.id || 'anonymous'
  }), [user?.id]);
  
  // 🚀 WORKFLOW UNIFIÉ : Hook principal avec tous les sous-hooks intégrés
  const workflow = useAnalysisWorkflow(undefined, stableWorkflowConfig);

  // 🎯 État du focus depuis le workflow local
  const focusedBusinessRole = workflow.localState.state.focusedBusinessRole;

  // 🔒 VALEURS PRIMITIVES STABLES : Extraire les valeurs avant les useMemo
  const coverageWeight = workflow.configuration.state.coverageWeight;
  const sizeWeight = workflow.configuration.state.sizeWeight;
  const usageWeight = workflow.configuration.state.usageWeight;
  const includeFrequency = workflow.configuration.state.includeFrequency;
  const showLicenses = workflow.configuration.state.showLicenses;
  const simpleRoleFilter = workflow.localState.state.simpleRoleFilter;
  const showZeroCoverageRoles = workflow.localState.state.showZeroCoverageRoles;
  const analysisResultId = workflow.fileManager.state.analysisResult?.id;
  
  // ⚡ Scroll géré directement dans useBusinessRoleFocus pour de meilleures performances
  
  // 🔒 MÉMORISATION : Props partagées pour éviter les re-renders en boucle
  const sharedBusinessRoleProps = React.useMemo(() => {
    return workflow.getSharedBusinessRoleProps();
  }, [
    // 🔒 DÉPENDANCES STABLES : Seulement les valeurs primitives qui changent réellement
    coverageWeight,
    sizeWeight,
    usageWeight,
    includeFrequency,
    showLicenses,
    simpleRoleFilter,
    showZeroCoverageRoles,
    // 🔒 ANALYSE : Seulement l'ID pour éviter les re-créations inutiles
    analysisResultId
  ]);

  // Fonction d'export des résultats via le nouveau workflow
  const handleExportResults = React.useCallback(async () => {
    if (!workflow.fileManager.state.analysisResult) {
      return;
    }

    try {
      await exportResultsToExcel(
        workflow.fileManager.state.analysisResult,
        workflow.selections.state.selectedRoles
      );
    } catch {
      // Erreur silencieuse - l'utilisateur sera notifié par l'UI
    }
  }, [
    // 🔒 DÉPENDANCES STABLES : Seulement les valeurs qui changent réellement
    workflow.fileManager.state.analysisResult?.id,
    workflow.selections.state.selectedRoles
  ]);

  // 🚀 OPTIMISÉ : Handler pour le Context Focus
  const handleFocusChange = React.useCallback((businessRole: string | null) => {
    if (businessRole) {
      workflow.localState.actions.handleFocusBusinessRole(businessRole);
    } else {
      workflow.localState.actions.handleExitFocus();
    }
  }, [
    // 🔒 DÉPENDANCES STABLES : Seulement les actions qui changent réellement
    workflow.localState.actions.handleFocusBusinessRole,
    workflow.localState.actions.handleExitFocus
  ]);

  // 🚀 NOUVEAU : Déterminer les valeurs initiales selon le contexte
  const isUpdateMode = workflow.fileManager.state.importType === 'saved' && !!workflow.fileManager.state.loadedAnalysisId;
  const initialAnalysisName = React.useMemo(() => {
    if (isUpdateMode && workflow.fileManager.state.analysisResult) {
      // Mode mise à jour : utiliser le nom de l'analyse chargée
      return workflow.fileManager.state.analysisResult.name || '';
    }
    // Mode nouvelle sauvegarde : utiliser la configuration locale
    return workflow.configuration.state.analysisName || '';
  }, [
    // 🔒 DÉPENDANCES STABLES : Seulement les valeurs qui changent réellement
    isUpdateMode,
    workflow.fileManager.state.analysisResult?.id,
    workflow.fileManager.state.analysisResult?.name,
    workflow.configuration.state.analysisName
  ]);

  const initialAnalysisDescription = React.useMemo(() => {
    if (isUpdateMode && workflow.fileManager.state.analysisResult) {
      // Mode mise à jour : utiliser la description de l'analyse chargée
      return workflow.fileManager.state.analysisResult.description || '';
    }
    // Mode nouvelle sauvegarde : utiliser la configuration locale
    return workflow.configuration.state.analysisDescription || '';
  }, [
    // 🔒 DÉPENDANCES STABLES : Seulement les valeurs qui changent réellement
    isUpdateMode,
    workflow.fileManager.state.analysisResult?.id,
    workflow.fileManager.state.analysisResult?.description,
    workflow.configuration.state.analysisDescription
  ]);

  // Handler pour la sauvegarde optimisé
  const handleSaveAnalysis = async (name: string, description: string) => {
    try {
      // Passer directement les métadonnées à la fonction de sauvegarde
      await workflow.saveCurrentAnalysis({
        name: name.trim(),
        description: description.trim()
      });
      
      // Mettre à jour l'état de configuration pour la cohérence (optionnel)
      workflow.configuration.actions.setAnalysisName(name.trim());
      workflow.configuration.actions.setAnalysisDescription(description.trim());
      
      // Fermer le dialog seulement en cas de succès
      workflow.exportManager.actions.setSaveDialogOpen(false);
      
    } catch (error) {
      console.error('[PAGE] ❌ Erreur lors de la sauvegarde:', error);
      // Ne pas fermer le dialog en cas d'erreur pour que l'utilisateur puisse réessayer
      // L'erreur sera affichée par le composant SaveAnalysisDialog via workflow.exportManager.state.saveError
    }
  };

  return (
    <FocusProvider onFocusChange={handleFocusChange}>
      {/* Bouton Quitter Focus fixe synchronisé avec le FocusContext */}
      <FixedExitFocusButton />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* En-tête moderne et épuré - Masqué en mode focus */}
        {!focusedBusinessRole && (
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
                  Analyse des Rôles Métier
                </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '1.1rem',
                  fontWeight: 400,
                }}
              >
                Architecture optimisée avec hooks spécialisés
            </Typography>
            </Box>
            <ThemeToggle />
          </Box>
        )}

        {/* Layout 3 cartes avec proportions ajustées - Masqué en mode focus */}
        {!focusedBusinessRole && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Carte 1 : Upload des fichiers - Plus large pour les boutons */}
            <Grid size={{ xs: 12, md: 5 }}>
              <FileUploadSection
                importType={workflow.fileManager.state.importType}
                loading={workflow.fileManager.state.loading}
                error={workflow.fileManager.state.error}
                user={user}
                onImportTypeChange={workflow.fileManager.actions.setImportType}
                onFileUpload={workflow.startNewAnalysis}
                onLoadSavedAnalysis={workflow.loadSavedAnalysis}
                onResumeFromFile={workflow.fileManager.actions.handleResumeFromFile}
              />
            </Grid>

            {/* Carte 2 : Configuration des pondérations - Plus étroite */}
            <Grid size={{ xs: 12, md: 3.5 }}>
              <ConfigurationSection
                coverageWeight={workflow.configuration.state.coverageWeight}
                sizeWeight={workflow.configuration.state.sizeWeight}
                usageWeight={workflow.configuration.state.usageWeight}
                showLicenses={workflow.configuration.state.showLicenses}
                isComputing={workflow.fileManager.state.loading}
                onCoverageWeightChange={workflow.configuration.actions.setCoverageWeight}
                onSizeWeightChange={workflow.configuration.actions.setSizeWeight}
                onUsageWeightChange={workflow.configuration.actions.setUsageWeight}
                onShowLicensesChange={workflow.configuration.actions.setShowLicenses}
              />
            </Grid>

            {/* Carte 3 : Sélection automatique - Plus étroite */}
            <Grid size={{ xs: 12, md: 3.5 }}>
              <AutoSelectionSection
                autoSelection={workflow.autoSelection}
                disabled={!workflow.fileManager.state.analysisResult}
                show={true}
              />
            </Grid>
          </Grid>
        )}

        {/* Section Actions - Masquée en mode focus */}
        {!focusedBusinessRole && (
          <ActionsSection
            analysisResult={workflow.fileManager.state.analysisResult}
            loading={workflow.fileManager.state.loading}
            processingStep={workflow.fileManager.state.processingStep}
            progress={workflow.fileManager.state.progress}
            onSaveClick={() => workflow.exportManager.actions.setSaveDialogOpen(true)}
            onExportExcel={() => workflow.exportCurrentAnalysis('excel')}
            onExportResults={handleExportResults}
            onReset={workflow.resetWorkflow}
          />
        )}

      {/* Résultats d'analyse */}
      {workflow.fileManager.state.analysisResult && (
        <Fade in timeout={800}>
        <Box>
            {/* Section Vue d'ensemble - Masquée en mode focus */}
            {!focusedBusinessRole && (
              <OverviewStatsSection
                analysisResult={workflow.fileManager.state.analysisResult}
                totalBusinessRoles={workflow.calculations.totalBusinessRoles}
                uncoveredTransactionsData={workflow.calculations.uncoveredTransactionsData}
              />
            )}

            {/* Titre en mode focus */}
            {focusedBusinessRole && (
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    mb: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Focus : {focusedBusinessRole}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontSize: '1rem',
                    fontWeight: 400,
                  }}
                >
                  Analyse détaillée du rôle métier sélectionné
                </Typography>
              </Box>
            )}

            {/* Analyses par rôle métier - VERSION OPTIMISÉE */}
            <AnalysisResultsSection
              analysisResult={workflow.fileManager.state.analysisResult}
              businessRolesToShow={workflow.calculations.businessRolesToShow}
              totalBusinessRolePages={workflow.calculations.totalBusinessRolePages}
              currentBusinessRolePage={workflow.localState.state.currentBusinessRolePage}
              businessRoleFilter={workflow.localState.state.businessRoleFilter}
              simpleRoleFilter={workflow.localState.state.simpleRoleFilter}
              showFilters={workflow.localState.state.showFilters}
              sharedBusinessRoleProps={sharedBusinessRoleProps}
              onBusinessRoleFilterChange={workflow.localState.actions.setBusinessRoleFilter}
              onSimpleRoleFilterChange={workflow.localState.actions.setSimpleRoleFilter}
              onToggleFilters={workflow.localState.actions.toggleFilters}
              onClearFilters={workflow.localState.actions.clearFilters}
              onPageChange={workflow.localState.actions.setCurrentBusinessRolePage}
              BusinessRoleAnalysisCardComponent={BusinessRoleAnalysisCard}
            />
        </Box>
        </Fade>
      )}

      {/* Dialog de sauvegarde optimisé */}
      <SaveAnalysisDialog
        open={workflow.exportManager.state.saveDialogOpen}
        onClose={() => workflow.exportManager.actions.setSaveDialogOpen(false)}
        onSave={handleSaveAnalysis}
        initialName={initialAnalysisName}
        initialDescription={initialAnalysisDescription}
        isUpdate={isUpdateMode}
        saving={workflow.exportManager.state.saving}
      />
    </Container>
    </FocusProvider>
  );
}