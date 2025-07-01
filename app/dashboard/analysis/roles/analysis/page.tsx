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
} from '@mui/material';
import { useAuth } from 'lib/hooks/useAuth';
import { ThemeToggle } from 'lib/components/common/ThemeToggle';
import { FileUploadSection } from 'lib/components/analysis/FileUploadSection';
import { ConfigurationSection } from 'lib/components/analysis/ConfigurationSection';
import { ActionsSection } from 'lib/components/analysis/ActionsSection';
import { OverviewStatsSection } from 'lib/components/analysis/OverviewStatsSection';
import { AnalysisResultsSection } from 'lib/components/analysis/AnalysisResultsSection';
import { BusinessRoleAnalysisCard } from 'lib/components/analysis/BusinessRoleAnalysisCard';
import { useAnalysisWorkflow } from 'lib/hooks/analysis/useAnalysisWorkflow';
import { exportResultsToExcel } from 'lib/services/analysis/exportResultsService';
import { FocusProvider } from 'lib/contexts/FocusContext';
import { SaveAnalysisDialog } from 'lib/components/analysis/SaveAnalysisDialog';

/**
 * Page d'analyse des rôles métier optimisée
 * Interface unique avec workflow refactorisé et hooks spécialisés
 */
export default function RoleAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();
  
  // 🚀 WORKFLOW UNIFIÉ : Hook principal avec tous les sous-hooks intégrés
  const workflow = useAnalysisWorkflow(undefined, {
    userId: user?.id, // Passer l'userId pour les fonctions d'authentification
  });
  
  // 🔒 MÉMORISATION : Props partagées pour éviter les re-renders en boucle
  const sharedBusinessRoleProps = React.useMemo(() => {
    return workflow.getSharedBusinessRoleProps();
  }, [workflow]);

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
  }, [workflow.fileManager.state.analysisResult, workflow.selections.state.selectedRoles]);

  // 🚀 OPTIMISÉ : Handler pour le Context Focus
  const handleFocusChange = React.useCallback((businessRole: string | null) => {
    if (businessRole) {
      workflow.localState.actions.handleFocusBusinessRole(businessRole);
    } else {
      workflow.localState.actions.handleExitFocus();
    }
  }, [workflow.localState.actions]);

  // 🔧 DIAGNOSTIC temporaire (à supprimer en production)
  const testOptimizations = async () => {
    if (!user?.id) return;
    
    try {
      const { diagnostics } = await import('lib/services/analysis/savedAnalysisService');
      
      // Diagnostic silencieux - logs supprimés
      const connection = await diagnostics.testConnection();
      const count = await diagnostics.getUserAnalysesCount(user.id);
      
    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
    }
  };

  // 🚀 NOUVEAU : Déterminer les valeurs initiales selon le contexte
  const isUpdateMode = workflow.fileManager.state.importType === 'saved' && !!workflow.fileManager.state.loadedAnalysisId;
  const initialAnalysisName = React.useMemo(() => {
    if (isUpdateMode && workflow.fileManager.state.analysisResult) {
      // Mode mise à jour : utiliser le nom de l'analyse chargée
      return workflow.fileManager.state.analysisResult.name || '';
    }
    // Mode nouvelle sauvegarde : utiliser la configuration locale
    return workflow.configuration.state.analysisName || '';
  }, [isUpdateMode, workflow.fileManager.state.analysisResult, workflow.configuration.state.analysisName]);

  const initialAnalysisDescription = React.useMemo(() => {
    if (isUpdateMode && workflow.fileManager.state.analysisResult) {
      // Mode mise à jour : utiliser la description de l'analyse chargée
      return workflow.fileManager.state.analysisResult.description || '';
    }
    // Mode nouvelle sauvegarde : utiliser la configuration locale
    return workflow.configuration.state.analysisDescription || '';
  }, [isUpdateMode, workflow.fileManager.state.analysisResult, workflow.configuration.state.analysisDescription]);

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

      {/* Layout côte à côte : Upload + Configuration */}
      <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
        {/* Zone d'import moderne */}
        <Box sx={{ flex: 2 }}>
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
        </Box>

        {/* Section Configuration */}
        <Box sx={{ flex: 1 }}>
          <ConfigurationSection
            coverageWeight={workflow.configuration.state.coverageWeight}
            sizeWeight={workflow.configuration.state.sizeWeight}
            usageWeight={workflow.configuration.state.usageWeight}
            isComputing={workflow.fileManager.state.loading}
            onCoverageWeightChange={workflow.configuration.actions.setCoverageWeight}
            onSizeWeightChange={workflow.configuration.actions.setSizeWeight}
            onUsageWeightChange={workflow.configuration.actions.setUsageWeight}
          />
        </Box>
      </Box>

      {/* Section Actions */}
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

      {/* Résultats d'analyse */}
      {workflow.fileManager.state.analysisResult && (
        <Fade in timeout={800}>
        <Box>
            {/* Section Vue d'ensemble */}
            <OverviewStatsSection
              analysisResult={workflow.fileManager.state.analysisResult}
              totalBusinessRoles={workflow.calculations.totalBusinessRoles}
              uncoveredTransactionsData={workflow.calculations.uncoveredTransactionsData}
            />

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