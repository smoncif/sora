'use client';

/**
 * Contenu principal de la page de validation (Client Component)
 * Gère l'état et la soumission des validations
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import { CheckCircle as CheckIcon, Info as InfoIcon } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { ProcessValidationPanel } from '../ProcessValidationPanel/ProcessValidationPanel';
import type { RoleData } from '../RoleValidationTable/RoleValidationTable';
import type { ValidationLinkData, ValidationResult } from 'lib/services/validation/validationLinkService';
import {
  useValidationLinkQuery,
  useSubmittedProcessesQuery,
  usePrefetchProcessResults,
} from 'lib/hooks/validation';
import type { TransactionPreview } from 'lib/types/sapModule';

export interface RoleValidationContentProps {
  data: ValidationLinkData;
  token: string;
}

interface PayloadRoleData {
  roleId?: string;
  roleName?: string;
  description?: string;
  process?: string;
  transactionCount?: number;
  previewTransactions?: TransactionPreview[];
  remainingTransactionCount?: number;
  transactionCodes?: string[];
  transactionDescriptions?: Record<string, string>;
  transactionUsage?: Record<string, number>;
}

export function RoleValidationContent({ data, token }: RoleValidationContentProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const prefetchProcessResults = usePrefetchProcessResults();

  const {
    data: validationData,
    isLoading: isValidationLoading,
    error: validationError,
  } = useValidationLinkQuery(token, { initialData: data });

  const {
    data: submittedProcessesData,
    isLoading: isSubmittedLoading,
  } = useSubmittedProcessesQuery(token);

  const [showTechnicalView, setShowTechnicalView] = useState(
    () => validationData?.technicalViewEnabled ?? false
  );
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (validationData?.technicalViewEnabled !== undefined) {
      setShowTechnicalView(validationData.technicalViewEnabled);
    }
  }, [validationData?.technicalViewEnabled]);

  const { rolesData, rolesByProcess } = useMemo(() => {
    const selectedRolesData = validationData?.payload?.selectedRolesData;
    const allRoles: RoleData[] = [];
    const processDictionary = new Map<string, { roles: RoleData[]; businessRoles: Set<string> }>();

    if (selectedRolesData) {
      const payloadEntries = selectedRolesData as Record<string, PayloadRoleData[]>;

      Object.entries(payloadEntries).forEach(([businessRole, roles]) => {
        if (!Array.isArray(roles)) {
          return;
        }

        roles.forEach((rawRole) => {
          const role = rawRole ?? {};
          const roleName = typeof role.roleName === 'string' ? role.roleName : undefined;
          if (!roleName) {
            return;
          }

          const processName =
            typeof role.process === 'string' && role.process.trim().length > 0
              ? role.process
              : 'Non assigné';

          const transactionCodes = Array.isArray(role.transactionCodes)
            ? role.transactionCodes.filter((code: unknown): code is string => typeof code === 'string')
            : [];
          const transactionDescriptions =
            typeof role.transactionDescriptions === 'object' && role.transactionDescriptions !== null
              ? (role.transactionDescriptions as Record<string, string>)
              : {};
          const transactionUsage =
            typeof role.transactionUsage === 'object' && role.transactionUsage !== null
              ? (role.transactionUsage as Record<string, number>)
              : {};
          const previewTransactionsSource = Array.isArray(role.previewTransactions)
            ? role.previewTransactions
            : [];
          const previewTransactions =
            previewTransactionsSource.length > 0
              ? previewTransactionsSource
              : transactionCodes.slice(0, 5).map((code) => ({
                  code,
                  description: transactionDescriptions[code] ?? code,
                  usage: transactionUsage[code] ?? 0,
                }));
          const inferredTransactionCount = Math.max(
            typeof role.transactionCount === 'number' ? role.transactionCount : 0,
            transactionCodes.length,
            previewTransactions.length
          );
          const remainingTransactionCount = Math.max(
            typeof role.remainingTransactionCount === 'number'
              ? role.remainingTransactionCount
              : inferredTransactionCount - previewTransactions.length,
            inferredTransactionCount - previewTransactions.length,
            0
          );

          const roleData: RoleData = {
            roleId: typeof role.roleId === 'string' ? role.roleId : roleName,
            roleName,
            businessRole,
            description: typeof role.description === 'string' ? role.description : '',
            transactionCount: inferredTransactionCount,
            previewTransactions,
            remainingTransactionCount,
            transactionCodes,
            transactionDescriptions,
            transactionUsage,
          };

          allRoles.push(roleData);

          if (!processDictionary.has(processName)) {
            processDictionary.set(processName, {
              roles: [],
              businessRoles: new Set(),
            });
          }

          const processGroup = processDictionary.get(processName)!;
          processGroup.roles.push(roleData);
          processGroup.businessRoles.add(businessRole);
        });
      });
    }

    return {
      rolesData: allRoles,
      rolesByProcess: processDictionary,
    };
  }, [validationData?.payload?.selectedRolesData]);

  const processes = useMemo(() => {
    return Array.from(rolesByProcess.keys()).sort();
  }, [rolesByProcess]);

  const submittedProcessesSet = useMemo(() => {
    return new Set(submittedProcessesData ?? []);
  }, [submittedProcessesData]);

  const handleSubmitProcess = useCallback(
    async (
      processName: string,
      validatorName: string,
      validatorEmail: string,
      results: ValidationResult[]
    ) => {
      try {
        const response = await fetch('/api/validation/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            process: processName,
            validatorEmail: validatorEmail.trim() || undefined,
            validatorName: validatorName.trim() || undefined,
            results,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de la soumission');
        }

        queryClient.setQueryData<string[] | undefined>(
          ['validation', token, 'submitted-processes'],
          (previous) => {
            const next = new Set(previous ?? []);
            next.add(processName);
            return Array.from(next);
          }
        );

        await prefetchProcessResults(token, processName);
      } catch (error) {
        console.error('Erreur soumission:', error);
        throw error;
      }
    },
    [prefetchProcessResults, queryClient, token]
  );

  if (validationError) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" icon={<InfoIcon />}>
          Impossible de charger cette validation. Merci de réessayer plus tard.
        </Alert>
      </Container>
    );
  }

  if (!validationData || isValidationLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
          <Skeleton variant="text" width="45%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="30%" height={24} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" width="100%" height={220} />
        </Paper>
      </Container>
    );
  }

  const submittedIndicator =
    isSubmittedLoading && submittedProcessesSet.size === 0 ? (
      <CircularProgress size={16} />
    ) : null;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Validation de Rôles Métier
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Vous êtes invité(e) à valider {rolesData.length} rôle(s) simple(s)
            </Typography>
            <Chip
              label={`Expire le ${new Date(validationData.expiresAt).toLocaleDateString('fr-FR')}`}
              color="warning"
              variant="outlined"
              size="small"
            />
          </Box>

          {validationData.technicalViewEnabled && (
            <FormControlLabel
              control={
                <Switch
                  checked={showTechnicalView}
                  onChange={(event) => setShowTechnicalView(event.target.checked)}
                  color="primary"
                />
              }
              label="Vue technique"
            />
          )}
        </Box>
      </Paper>

      {processes.length > 1 ? (
        <>
          <Paper elevation={1} sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(event, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                },
              }}
            >
              {processes.map((processName, index) => {
                const processRoles = rolesByProcess.get(processName)!;
                const isSubmitted = submittedProcessesSet.has(processName);
                const businessRoleCount = processRoles.businessRoles.size;

                return (
                  <Tab
                    key={processName}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {processName}
                        <Chip
                          label={`${businessRoleCount} rôle${businessRoleCount > 1 ? 's' : ''}`}
                          size="small"
                          color={isSubmitted ? 'success' : 'default'}
                        />
                        {isSubmitted && <CheckIcon fontSize="small" color="success" />}
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
          </Paper>

          {processes.map((processName, index) => {
            const processRoles = rolesByProcess.get(processName)?.roles ?? [];
            const isSubmitted = submittedProcessesSet.has(processName);

            return (
              <Box
                key={processName}
                role="tabpanel"
                hidden={activeTab !== index}
                sx={{ display: activeTab === index ? 'block' : 'none' }}
              >
                {activeTab === index && (
                  <ProcessValidationPanel
                    processName={processName}
                    roles={processRoles}
                    showTechnicalView={showTechnicalView && validationData.technicalViewEnabled}
                    isSubmitted={isSubmitted}
                    token={token}
                    onSubmit={handleSubmitProcess}
                  />
                )}
              </Box>
            );
          })}
        </>
      ) : (
        <ProcessValidationPanel
          processName={processes[0] || 'Non assigné'}
          roles={rolesByProcess.get(processes[0])?.roles || rolesData}
          showTechnicalView={showTechnicalView && validationData.technicalViewEnabled}
          isSubmitted={submittedProcessesSet.has(processes[0])}
          token={token}
          onSubmit={handleSubmitProcess}
        />
      )}

      {submittedIndicator && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>{submittedIndicator}</Box>
      )}
    </Container>
  );
}

