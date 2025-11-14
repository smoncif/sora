'use client';

import React, { useState } from 'react';
import { 
  Box,
  Container,
  Button,
  Grid,
  useTheme,
} from '@mui/material';
import { useAuth } from 'lib/hooks/useAuth';
import { FileUploadSection } from 'lib/components/analysis/FileUploadSection';
import { ConfigurationSection } from 'lib/components/analysis/ConfigurationSection';
import { AutoSelectionSection } from 'lib/components/analysis/AutoSelectionSection';
import { ResultsSection } from 'lib/components/analysis/ResultsSection';
import { AnalysisCard } from 'lib/components/analysis/AnalysisCard';
import { useAnalysisWorkflow } from 'lib/hooks/analysis/useAnalysisWorkflow';
import { exportResultsToExcel } from 'lib/services/analysis/exportResultsService';
import { FocusProvider } from 'lib/contexts/FocusContext';
import { SaveAnalysisDialog } from 'lib/components/analysis/SaveAnalysisDialog';
import { useFocus } from 'lib/contexts';
import { RoleValidationShareModal } from 'lib/components/validation/RoleValidationShareModal/RoleValidationShareModal';

// Import redesigned components
import {
  HeroHeader,
  createMetric,
  MetricIcons,
  WorkflowStep,
  ProgressArrow,
  CompactStatsCard,
  FloatingActionBar,
  createAction,
  ActionIcons,
} from 'lib/components/analysis/redesign';

import {
  Business as BusinessIcon,
  AccountTree as RoleIcon,
  Receipt as TransactionIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

/**
 * Composant interne pour le bouton Quitter Focus fixe
 */
function FixedExitFocusButton() {
  const theme = useTheme();
  const { focusedItem, setFocusedItem } = useFocus();

  const handleExitFocus = React.useCallback(() => {
    setFocusedItem(null);
  }, [setFocusedItem]);

  if (!focusedItem) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1200,
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
          borderRadius: 2,
          border: `3px solid ${theme.palette.text.primary}`,
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.25)',
          },
        }}
      >
        Quitter Focus
      </Button>
    </Box>
  );
}

/**
 * Page d'analyse des rôles métier - VERSION REDESIGN
 */
export default function RoleAnalysisRedesignPage() {
  const { user } = useAuth();
  const theme = useTheme();

  // Workflow configuration
  const stableWorkflowConfig = React.useMemo(() => ({
    userId: user?.id || 'anonymous'
  }), [user?.id]);
  
  const workflow = useAnalysisWorkflow('roles', stableWorkflowConfig);
  const focusedItem = workflow.localState.state.focusedItem;
  const [shareValidationModalOpen, setShareValidationModalOpen] = useState(false);

  // Extract stable values
  const coverageWeight = workflow.configuration.state.coverageWeight;
  const sizeWeight = workflow.configuration.state.sizeWeight;
  const usageWeight = workflow.configuration.state.usageWeight;
  const includeFrequency = workflow.configuration.state.includeFrequency;
  const showLicenses = workflow.configuration.state.showLicenses;
  const targetRoleFilter = workflow.localState.state.targetRoleFilter;
  const showZeroCoverageRoles = workflow.localState.state.showZeroCoverageRoles;
  const analysisResultId = workflow.fileManager.state.analysisResult?.id;
  
  // Shared props
  const sharedBusinessRoleProps = React.useMemo(() => {
    return workflow.getSharedBusinessRoleProps() || {};
  }, [
    coverageWeight,
    sizeWeight,
    usageWeight,
    includeFrequency,
    showLicenses,
    targetRoleFilter,
    showZeroCoverageRoles,
    analysisResultId
  ]);

  // Export handler
  const handleExportResults = React.useCallback(async () => {
    if (!workflow.fileManager.state.analysisResult) return;
    try {
      await exportResultsToExcel(
        workflow.fileManager.state.analysisResult,
        workflow.selections.state.selectedRoles,
        { mode: 'roles' },
        workflow.configuration.state.showLicenses
      );
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [
    workflow.fileManager.state.analysisResult?.id,
    workflow.selections.state.selectedRoles,
    workflow.configuration.state.showLicenses
  ]);

  // Focus handler
  const handleFocusChange = React.useCallback((item: string | null) => {
    if (item) {
      workflow.localState.actions.handleFocusItem(item);
    } else {
      workflow.localState.actions.handleExitFocus();
    }
  }, [
    workflow.localState.actions.handleFocusItem,
    workflow.localState.actions.handleExitFocus
  ]);

  // Share validation handler
  const handleOpenShareValidation = React.useCallback(() => {
    setShareValidationModalOpen(true);
  }, []);

  // Business roles with selections
  const businessRolesWithSelections = React.useMemo(() => {
    const rolesMap = new Map<string, Set<string>>();
    
    if (workflow.fileManager.state.analysisResult?.coverageAnalyses) {
      workflow.fileManager.state.analysisResult.coverageAnalyses.forEach((analysis: any) => {
        const businessRole = analysis.businessRole;
        const selectedRoles = workflow.selections.state.selectedRoles.get(businessRole);
        
        if (selectedRoles && selectedRoles.size > 0) {
          rolesMap.set(businessRole, selectedRoles);
        }
      });
    }
    
    return rolesMap;
  }, [
    workflow.fileManager.state.analysisResult,
    workflow.selections.state.selectedRoles
  ]);

  const hasSelectedRoles = businessRolesWithSelections.size > 0;

  // Save/Update mode
  const isUpdateMode = workflow.fileManager.state.importType === 'saved' && !!workflow.fileManager.state.loadedAnalysisId;
  const initialAnalysisName = React.useMemo(() => {
    if (isUpdateMode && workflow.fileManager.state.analysisResult) {
      return workflow.fileManager.state.analysisResult.name || '';
    }
    return workflow.configuration.state.analysisName || '';
  }, [
    isUpdateMode,
    workflow.fileManager.state.analysisResult?.id,
    workflow.fileManager.state.analysisResult?.name,
    workflow.configuration.state.analysisName
  ]);

  const initialAnalysisDescription = React.useMemo(() => {
    if (isUpdateMode && workflow.fileManager.state.analysisResult) {
      return workflow.fileManager.state.analysisResult.description || '';
    }
    return workflow.configuration.state.analysisDescription || '';
  }, [
    isUpdateMode,
    workflow.fileManager.state.analysisResult?.id,
    workflow.fileManager.state.analysisResult?.description,
    workflow.configuration.state.analysisDescription
  ]);

  // Save handler
  const handleSaveAnalysis = async (name: string, description: string) => {
    try {
      await workflow.saveCurrentAnalysis({
        name: name.trim(),
        description: description.trim(),
        mode: 'roles'
      });
      
      workflow.configuration.actions.setAnalysisName(name.trim());
      workflow.configuration.actions.setAnalysisDescription(description.trim());
      workflow.exportManager.actions.setSaveDialogOpen(false);
      
    } catch (error) {
      console.error('[PAGE] ❌ Erreur lors de la sauvegarde:', error);
    }
  };

  // Calculate metrics for HeroHeader
  const heroMetrics = React.useMemo(() => {
    if (!workflow.fileManager.state.analysisResult) return [];
    
    const totalBusinessRoles = workflow.calculations.totalItems || 0;
    const totalTransactions = workflow.fileManager.state.analysisResult.transactions?.length || 0;
    const uncoveredCount = workflow.calculations.uncoveredTransactionsData?.count || 0;

    return [
      createMetric(
        'RÔLES MÉTIER',
        totalBusinessRoles,
        theme.palette.primary.main,
        <BusinessIcon sx={{ fontSize: '1.2rem' }} />
      ),
      createMetric(
        'TRANSACTIONS',
        totalTransactions,
        theme.palette.info.main,
        <TransactionIcon sx={{ fontSize: '1.2rem' }} />
      ),
      createMetric(
        'NON COUVERTES',
        uncoveredCount,
        uncoveredCount > 0 ? theme.palette.warning.main : theme.palette.success.main,
        uncoveredCount > 0 ? <WarningIcon sx={{ fontSize: '1.2rem' }} /> : MetricIcons.Check
      ),
    ];
  }, [
    workflow.fileManager.state.analysisResult,
    workflow.calculations.totalItems,
    workflow.calculations.uncoveredTransactionsData,
    theme.palette,
  ]);

  // Workflow steps status
  const hasFile = !!workflow.fileManager.state.analysisResult;
  const hasConfiguration = hasFile;
  const hasActions = hasFile;

  // Floating action bar actions
  const floatingActions = React.useMemo(() => {
    if (!hasFile) return [];
    
    return [
      createAction(
        'Sauvegarder',
        ActionIcons.Save,
        () => workflow.exportManager.actions.setSaveDialogOpen(true),
        { disabled: !hasFile }
      ),
      createAction(
        'Exporter Excel',
        ActionIcons.Export,
        handleExportResults,
        { disabled: !hasFile, color: 'secondary' }
      ),
      createAction(
        'Partager',
        ActionIcons.Share,
        handleOpenShareValidation,
        { disabled: !hasSelectedRoles, color: 'success' }
      ),
      createAction(
        'Réinitialiser',
        ActionIcons.Reset,
        workflow.resetWorkflow,
        { disabled: !hasFile, color: 'warning' }
      ),
    ];
  }, [
    hasFile,
    hasSelectedRoles,
    handleExportResults,
    handleOpenShareValidation,
    workflow.exportManager.actions,
    workflow.resetWorkflow,
  ]);

  return (
    <FocusProvider onFocusChange={handleFocusChange}>
      <FixedExitFocusButton />

      <Container maxWidth="xl" sx={{ py: 4, pb: 12 }}>
        {/* Hero Header - Hidden in focus mode */}
        {!focusedItem && (
          <HeroHeader
            title="ANALYSE DES RÔLES MÉTIER"
            subtitle="Optimisation intelligente des couvertures de transactions"
            metrics={heroMetrics}
            loading={workflow.fileManager.state.loading}
          />
        )}

        {/* Workflow Steps - Hidden in focus mode */}
        {!focusedItem && (
          <Box sx={{ mb: 6 }}>
            <Grid container spacing={2} alignItems="stretch">
              {/* Step 1: Import */}
              <Grid size={{ xs: 12, md: 4.5 }}>
                <WorkflowStep
                  stepNumber={1}
                  title="Importer les données"
                  description="Fichier Excel ou analyse sauvegardée"
                  isActive={!hasFile}
                  isCompleted={hasFile}
                  color={theme.palette.primary.main}
                  delay={100}
                >
                  <FileUploadSection
                    mode="roles"
                    importType={workflow.fileManager.state.importType}
                    loading={workflow.fileManager.state.loading}
                    error={workflow.fileManager.state.error}
                    user={user}
                    onImportTypeChange={workflow.fileManager.actions.setImportType}
                    onFileUpload={workflow.startNewAnalysis}
                    onLoadSavedAnalysis={workflow.loadSavedAnalysis}
                    onResumeFromFile={workflow.fileManager.actions.handleResumeFromFile}
                  />
                </WorkflowStep>
              </Grid>

              {/* Arrow 1 */}
              <Grid size={{ xs: 0, md: 0.5 }}>
                <ProgressArrow isActive={hasFile} delay={200} />
              </Grid>

              {/* Step 2: Configuration */}
              <Grid size={{ xs: 12, md: 3 }}>
                <WorkflowStep
                  stepNumber={2}
                  title="Configurer"
                  description="Pondérations et options"
                  isActive={hasFile && !hasConfiguration}
                  isCompleted={hasConfiguration}
                  color={theme.palette.secondary.main}
                  delay={200}
                >
                  <ConfigurationSection
                    mode="roles"
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
                </WorkflowStep>
              </Grid>

              {/* Arrow 2 */}
              <Grid size={{ xs: 0, md: 0.5 }}>
                <ProgressArrow isActive={hasConfiguration} delay={300} />
              </Grid>

              {/* Step 3: Auto Selection */}
              <Grid size={{ xs: 12, md: 3.5 }}>
                <WorkflowStep
                  stepNumber={3}
                  title="Sélection automatique"
                  description="Optimisation par IA"
                  isActive={hasConfiguration}
                  isCompleted={hasActions}
                  color={theme.palette.success.main}
                  delay={300}
                >
                  <AutoSelectionSection
                    mode="roles"
                    autoSelection={workflow.autoSelection}
                    disabled={!workflow.fileManager.state.analysisResult}
                    show={true}
                  />
                </WorkflowStep>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Stats Dashboard - Hidden in focus mode */}
        {!focusedItem && workflow.fileManager.state.analysisResult && (
          <Box className="neo-animate-fade neo-delay-400" sx={{ mb: 6 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CompactStatsCard
                  label="RÔLES MÉTIER"
                  value={workflow.calculations.totalItems || 0}
                  icon={<BusinessIcon />}
                  color={theme.palette.primary.main}
                  delay={100}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CompactStatsCard
                  label="RÔLES SIMPLES"
                  value={workflow.fileManager.state.analysisResult.roles?.length || 0}
                  icon={<RoleIcon />}
                  color={theme.palette.secondary.main}
                  delay={200}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CompactStatsCard
                  label="TRANSACTIONS"
                  value={workflow.fileManager.state.analysisResult.transactions?.length || 0}
                  icon={<TransactionIcon />}
                  color={theme.palette.info.main}
                  delay={300}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CompactStatsCard
                  label="NON COUVERTES"
                  value={workflow.calculations.uncoveredTransactionsData?.count || 0}
                  icon={
                    (workflow.calculations.uncoveredTransactionsData?.count || 0) > 0 
                      ? <WarningIcon /> 
                      : MetricIcons.Check
                  }
                  color={
                    (workflow.calculations.uncoveredTransactionsData?.count || 0) > 0
                      ? theme.palette.warning.main
                      : theme.palette.success.main
                  }
                  delay={400}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Results Section */}
        {workflow.fileManager.state.analysisResult && (
          <Box className="neo-animate-slide-up neo-delay-500">
            <ResultsSection
              mode="roles"
              analysisResult={workflow.fileManager.state.analysisResult}
              itemsToShow={workflow.calculations.itemsToShow}
              totalPages={workflow.calculations.totalPages}
              currentPage={workflow.localState.state.currentPage}
              primaryFilter={workflow.localState.state.primaryFilter}
              targetRoleFilter={workflow.localState.state.targetRoleFilter}
              showFilters={workflow.localState.state.showFilters}
              sharedBusinessRoleProps={sharedBusinessRoleProps}
              onPrimaryFilterChange={workflow.localState.actions.setPrimaryFilter}
              onTargetRoleFilterChange={workflow.localState.actions.setTargetRoleFilter}
              onToggleFilters={workflow.localState.actions.toggleFilters}
              onClearFilters={workflow.localState.actions.clearFilters}
              onPageChange={workflow.localState.actions.setCurrentPage}
              AnalysisCardComponent={AnalysisCard}
            />
          </Box>
        )}
      </Container>

      {/* Floating Action Bar */}
      <FloatingActionBar
        actions={floatingActions}
        visible={hasFile && !focusedItem}
      />

      {/* Dialogs */}
      <SaveAnalysisDialog
        open={workflow.exportManager.state.saveDialogOpen}
        onClose={() => workflow.exportManager.actions.setSaveDialogOpen(false)}
        onSave={handleSaveAnalysis}
        initialName={initialAnalysisName}
        initialDescription={initialAnalysisDescription}
        isUpdate={isUpdateMode}
        saving={workflow.exportManager.state.saving}
      />

      <RoleValidationShareModal
        open={shareValidationModalOpen}
        onClose={() => setShareValidationModalOpen(false)}
        businessRoles={Array.from(businessRolesWithSelections.keys())}
        selectedRolesPerBusinessRole={businessRolesWithSelections}
        analysisResult={workflow.fileManager.state.analysisResult}
        currentUserName={(user as any)?.user_metadata?.full_name || user?.email || 'Utilisateur'}
      />
    </FocusProvider>
  );
}

