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
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from 'lib/components/common/ThemeToggle';
import { FileUploadSection } from '@/dashboard/shared/components/analysis/FileUploadSection';
import { ConfigurationSection } from '@/dashboard/shared/components/analysis/ConfigurationSection';
import { ActionsSection } from '@/dashboard/shared/components/analysis/ActionsSection';
import { OverviewStatsSection } from '@/dashboard/shared/components/analysis/OverviewStatsSection';
import { AnalysisResultsSection } from '@/dashboard/shared/components/analysis/AnalysisResultsSection';
import { BusinessRoleAnalysisCard } from '@/dashboard/shared/components/analysis/BusinessRoleAnalysisCard';
import { useAnalysisDataManager } from '@/dashboard/shared/hooks/useAnalysisDataManager';
import { useAnalysisProcessor } from '@/dashboard/shared/hooks/useAnalysisProcessor';
import { exportResultsToExcel } from 'lib/services/analysis/exportResultsService';

/**
 * Page d'analyse des rôles métier simplifiée
 * Interface unique pour upload, analyse et sélection des rôles
 */
export default function RoleAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();
  
  // 🚀 NOUVEAU : Hook de gestion des données et interface
  const dataManager = useAnalysisDataManager();
  
  // 🚀 NOUVEAU : Hook de traitement et analyse
  const processor = useAnalysisProcessor({
    analysisResult: dataManager.state.analysisResult,
    coverageWeight: dataManager.state.coverageWeight,
    sizeWeight: dataManager.state.sizeWeight,
    usageWeight: dataManager.state.usageWeight,
    includeFrequency: dataManager.state.includeFrequency,
  });



  // Fonction d'export des résultats
  const handleExportResults = React.useCallback(async () => {
    if (!dataManager.state.analysisResult) {
      return;
    }

    try {
      await exportResultsToExcel(
        dataManager.state.analysisResult,
        processor.state.selectedRoles
      );
    } catch {
      // Erreur silencieuse - l'utilisateur sera notifié par l'UI
    }
  }, [dataManager.state.analysisResult, processor.state.selectedRoles]);



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
            Architecture simplifiée avec 2 hooks consolidés
        </Typography>
        </Box>
        <ThemeToggle />
      </Box>

      {/* Layout côte à côte : Upload + Configuration */}
      <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
        {/* Zone d'import moderne */}
        <Box sx={{ flex: 2 }}>
          <FileUploadSection
            importType={dataManager.state.importType}
            loading={dataManager.state.loading}
            error={dataManager.state.error}
            user={user}
            onImportTypeChange={dataManager.setImportType}
            onFileUpload={dataManager.handleFileUpload}
            onLoadSavedAnalysis={dataManager.handleLoadSavedAnalysis}
            onResumeFromFile={dataManager.handleResumeFromFile}
          />
                  </Box>

        {/* Section Configuration */}
        <Box sx={{ flex: 1 }}>
          <ConfigurationSection
            coverageWeight={dataManager.state.coverageWeight}
            sizeWeight={dataManager.state.sizeWeight}
            usageWeight={dataManager.state.usageWeight}
            isComputing={dataManager.state.loading}
            onCoverageWeightChange={dataManager.setCoverageWeight}
            onSizeWeightChange={dataManager.setSizeWeight}
            onUsageWeightChange={dataManager.setUsageWeight}
          />
                        </Box>
                      </Box>

      {/* Section Actions */}
      <ActionsSection
        analysisResult={dataManager.state.analysisResult}
        loading={dataManager.state.loading}
        processingStep={dataManager.state.processingStep}
        progress={dataManager.state.progress}
        onSaveClick={() => dataManager.setSaveDialogOpen(true)}
        onExportExcel={dataManager.handleExportExcel}
        onExportResults={handleExportResults}
        onReset={dataManager.handleReset}

      />

      {/* Résultats d'analyse */}
      {dataManager.state.analysisResult && (
        <Fade in timeout={800}>
        <Box>
            {/* Section Vue d'ensemble */}
            <OverviewStatsSection
              analysisResult={dataManager.state.analysisResult}
              totalBusinessRoles={processor.totalBusinessRoles}
              uncoveredTransactionsData={processor.uncoveredTransactionsData}
            />

            {/* Analyses par rôle métier - VERSION SIMPLIFIÉE */}
            <AnalysisResultsSection
              analysisResult={dataManager.state.analysisResult}
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
        open={dataManager.state.saveDialogOpen} 
        onClose={() => dataManager.setSaveDialogOpen(false)} 
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
            value={dataManager.state.analysisName}
            onChange={(e) => dataManager.setAnalysisName(e.target.value)}
            sx={{ mb: 3 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnel)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={dataManager.state.analysisDescription}
            onChange={(e) => dataManager.setAnalysisDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => dataManager.setSaveDialogOpen(false)}
            sx={{ mr: 1 }}
          >
            Annuler
          </Button>
          <Button 
            onClick={async () => {
              try {
                await dataManager.handleSaveAnalysis();
                dataManager.setSaveDialogOpen(false);
                dataManager.setAnalysisName('');
                dataManager.setAnalysisDescription('');
                      } catch {
          // Erreur silencieuse - l'utilisateur sera notifié par l'UI
        }
            }}
            variant="contained"
            disabled={!dataManager.state.analysisName.trim()}
            sx={{ borderRadius: 2 }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


