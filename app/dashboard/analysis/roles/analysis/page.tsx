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
import { useAnalysisProcessor } from 'lib/hooks/analysis/useAnalysisProcessor';
import { exportResultsToExcel } from 'lib/services/analysis/exportResultsService';

/**
 * Page d'analyse des rôles métier simplifiée
 * Interface unique pour upload, analyse et sélection des rôles
 */
export default function RoleAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();
  
  // 🚀 NOUVEAU : Hook orchestrateur principal avec architecture spécialisée
  const workflow = useAnalysisWorkflow();
  
  // 🚀 NOUVEAU : Hook de traitement et analyse
  const processor = useAnalysisProcessor({
    analysisResult: workflow.fileManager.state.analysisResult,
    coverageWeight: workflow.configuration.state.coverageWeight,
    sizeWeight: workflow.configuration.state.sizeWeight,
    usageWeight: workflow.configuration.state.usageWeight,
    includeFrequency: workflow.configuration.state.includeFrequency,
  });



  // Fonction d'export des résultats via le nouveau workflow
  const handleExportResults = React.useCallback(async () => {
    if (!workflow.fileManager.state.analysisResult) {
      return;
    }

    try {
      await exportResultsToExcel(
        workflow.fileManager.state.analysisResult,
        processor.state.selectedRoles
      );
    } catch {
      // Erreur silencieuse - l'utilisateur sera notifié par l'UI
    }
  }, [workflow.fileManager.state.analysisResult, processor.state.selectedRoles]);



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
              totalBusinessRoles={processor.totalBusinessRoles}
              uncoveredTransactionsData={processor.uncoveredTransactionsData}
            />

            {/* Analyses par rôle métier - VERSION SIMPLIFIÉE */}
            <AnalysisResultsSection
              analysisResult={workflow.fileManager.state.analysisResult}
              businessRolesToShow={processor.businessRolesToShow}
              totalBusinessRolePages={processor.totalBusinessRolePages}
              currentBusinessRolePage={processor.state.currentBusinessRolePage}
              focusedBusinessRole={processor.state.focusedBusinessRole}
              businessRoleFilter={processor.state.businessRoleFilter}
              simpleRoleFilter={processor.state.simpleRoleFilter}
              showFilters={processor.state.showFilters}
              sharedBusinessRoleProps={processor.getSharedBusinessRoleProps()}
              uiSelectedRoles={processor.state.selectedRoles}
              onBusinessRoleFilterChange={processor.setBusinessRoleFilter}
              onSimpleRoleFilterChange={processor.setSimpleRoleFilter}
              onToggleFilters={processor.toggleFilters}
              onClearFilters={processor.clearFilters}
              onPageChange={processor.setCurrentBusinessRolePage}
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
            autoFocus
            margin="dense"
            label="Nom de l'analyse"
            fullWidth
            variant="outlined"
            value={workflow.configuration.state.analysisName}
            onChange={(e) => workflow.configuration.actions.setAnalysisName(e.target.value)}
            sx={{ mb: 3 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnel)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={workflow.configuration.state.analysisDescription}
            onChange={(e) => workflow.configuration.actions.setAnalysisDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => workflow.exportManager.actions.setSaveDialogOpen(false)}
            sx={{ mr: 1 }}
          >
            Annuler
          </Button>
          <Button 
            onClick={async () => {
              try {
                await workflow.saveCurrentAnalysis();
                workflow.exportManager.actions.setSaveDialogOpen(false);
                workflow.configuration.actions.setAnalysisName('');
                workflow.configuration.actions.setAnalysisDescription('');
                      } catch {
          // Erreur silencieuse - l'utilisateur sera notifié par l'UI
        }
            }}
            variant="contained"
            disabled={!workflow.configuration.state.analysisName.trim()}
            sx={{ borderRadius: 2 }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


