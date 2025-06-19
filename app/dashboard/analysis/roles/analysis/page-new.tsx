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

/**
 * Page d'analyse des rôles métier optimisée
 * Interface unique avec workflow refactorisé et hooks spécialisés
 */
export default function RoleAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();
  
  // 🚀 WORKFLOW UNIFIÉ : Hook principal avec tous les sous-hooks intégrés
  const workflow = useAnalysisWorkflow();

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
            onFileUpload={workflow.fileManager.actions.handleFileUpload}
            onLoadSavedAnalysis={workflow.fileManager.actions.handleLoadSavedAnalysis}
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
        onReset={workflow.fileManager.actions.handleReset}
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
              focusedBusinessRole={workflow.localState.state.focusedBusinessRole}
              businessRoleFilter={workflow.localState.state.businessRoleFilter}
              simpleRoleFilter={workflow.localState.state.simpleRoleFilter}
              showFilters={workflow.localState.state.showFilters}
              sharedBusinessRoleProps={workflow.getSharedBusinessRoleProps()}
              uiSelectedRoles={workflow.selections.state.selectedRoles}
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

      {/* Dialog de sauvegarde - VERSION SIMPLIFIÉE */}
      <Dialog 
        open={workflow.exportManager.state.saveDialogOpen} 
        onClose={() => workflow.exportManager.actions.setSaveDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            Sauvegarder l&apos;analyse
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nom de l'analyse"
            value={workflow.configuration.state.analysisName}
            onChange={(e) => workflow.configuration.actions.setAnalysisName(e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description (optionnelle)"
            value={workflow.configuration.state.analysisDescription}
            onChange={(e) => workflow.configuration.actions.setAnalysisDescription(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => workflow.exportManager.actions.setSaveDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Annuler
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              await workflow.saveCurrentAnalysis();
              workflow.exportManager.actions.setSaveDialogOpen(false);
            }}
            disabled={workflow.exportManager.state.saving}
            sx={{ 
              textTransform: 'none',
              minWidth: 120
            }}
          >
            {workflow.exportManager.state.saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}