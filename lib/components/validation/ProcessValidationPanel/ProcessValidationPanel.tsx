'use client';

/**
 * Panel de validation pour un processus métier spécifique
 * Contient : infos valideur + tableau des rôles + bouton soumettre
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

import type { RoleData } from '../RoleValidationTable/RoleValidationTable';
import type { ValidationResult } from 'lib/services/validation/validationLinkService';
import {
  useProcessResultsQuery,
  useProcessDraftQuery,
  useSaveValidationDraftMutation,
} from 'lib/hooks/validation';
import { RoleValidationTable } from '../RoleValidationTable/RoleValidationTable';

export interface ProcessValidationPanelProps {
  processName: string;
  roles: RoleData[];
  showTechnicalView: boolean;
  isSubmitted: boolean;
  token: string; // 🆕 Token pour récupérer les résultats soumis
  onSubmit: (processName: string, validatorName: string, validatorEmail: string, results: ValidationResult[]) => Promise<void>;
}

export function ProcessValidationPanel({
  processName,
  roles,
  showTechnicalView,
  isSubmitted,
  token,
  onSubmit,
}: ProcessValidationPanelProps) {
  const theme = useTheme();
  
  // État local pour ce processus
  const [validatorName, setValidatorName] = useState('');
  const [validatorEmail, setValidatorEmail] = useState('');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [submittedResults, setSubmittedResults] = useState<ValidationResult[] | null>(null); // 🆕 Résultats déjà soumis
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false); // 🆕 Pour afficher les erreurs de champs
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const {
    data: processResults,
    isLoading: isProcessResultsLoading,
  } = useProcessResultsQuery(token, processName, {
    enabled: isSubmitted,
  });

  const {
    data: draftData,
    isLoading: isDraftLoading,
  } = useProcessDraftQuery(token, processName, {
    enabled: !isSubmitted,
  });

  const { mutateAsync: saveDraftMutation, isPending: isSavingDraft } =
    useSaveValidationDraftMutation(token);

  const draftHydratedRef = useRef(false);

  useEffect(() => {
    setValidationResults((prev) => {
      const map = new Map(prev.map((result) => [`${result.businessRole}::${result.roleId}`, result] as const));
      let hasChanges = false;

      roles.forEach((role) => {
        const key = `${role.businessRole}::${role.roleId}`;
        if (!map.has(key)) {
          hasChanges = true;
          map.set(key, {
            roleId: role.roleId,
            roleName: role.roleName,
            businessRole: role.businessRole,
            isApproved: null,
            comment: '',
            transactionValidations: (role.previewTransactions ?? []).map((transaction) => ({
              transactionCode: transaction.code,
              isApproved: null,
              comment: '',
            })),
          });
        }
      });

      if (!hasChanges) {
        return prev;
      }

      return Array.from(map.values());
    });
  }, [roles]);

  // 🆕 Charger les résultats soumis si le processus est déjà validé
  useEffect(() => {
    if (isSubmitted) {
      if (processResults) {
        setSubmittedResults(processResults);
        setValidationResults((prev) => {
          const isDifferent = prev.length !== processResults.length || prev.some((item, index) => {
            const nextItem = processResults[index];
            return (
              item.isApproved !== nextItem.isApproved ||
              (item.comment || '') !== (nextItem.comment || '') ||
              (item.transactionValidations?.length || 0) !== (nextItem.transactionValidations?.length || 0)
            );
          });

          return isDifferent ? processResults : prev;
        });
      }
      return;
    }

    setSubmittedResults(null);

    if (draftData && draftData.results && !draftHydratedRef.current) {
      setValidationResults((prev) => {
        const isDifferent = prev.length !== draftData.results.length || prev.some((item, index) => {
          const nextItem = draftData.results[index];
          return (
            item.isApproved !== nextItem.isApproved ||
            (item.comment || '') !== (nextItem.comment || '') ||
            (item.transactionValidations?.length || 0) !== (nextItem.transactionValidations?.length || 0)
          );
        });

        return isDifferent ? draftData.results : prev;
      });
      if (draftData.validatorName !== undefined) {
        setValidatorName(draftData.validatorName);
      }
      if (draftData.validatorEmail !== undefined) {
        setValidatorEmail(draftData.validatorEmail);
      }
      if (draftData.updatedAt) {
        setDraftSavedAt(draftData.updatedAt);
      }
      draftHydratedRef.current = true;
      return;
    }

    if (!isDraftLoading && !draftHydratedRef.current) {
      draftHydratedRef.current = true;
    }
  }, [isSubmitted, processResults, draftData, isDraftLoading]);

  const showSkeleton = isSubmitted ? !submittedResults : (isDraftLoading || !draftHydratedRef.current);

  // Handler pour soumettre ce processus
  const handleSubmit = useCallback(async () => {
    // 🆕 Validation des champs obligatoires
    const hasName = validatorName.trim().length > 0;
    const hasEmail = validatorEmail.trim().length > 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = hasEmail && emailRegex.test(validatorEmail);

    if (!hasName || !hasEmail || !isEmailValid) {
      setShowValidationErrors(true);
      
      // Message d'erreur spécifique
      if (!hasName && !hasEmail) {
        setError('Veuillez renseigner votre nom et votre email');
      } else if (!hasName) {
        setError('Veuillez renseigner votre nom');
      } else if (!hasEmail) {
        setError('Veuillez renseigner votre email');
      } else if (!isEmailValid) {
        setError('Veuillez entrer un email valide');
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setShowValidationErrors(false);

    try {
      await onSubmit(processName, validatorName, validatorEmail, validationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  }, [processName, validatorName, validatorEmail, validationResults, onSubmit]);

  const handleSaveDraft = useCallback(async () => {
    setError(null);
    try {
      const draft = await saveDraftMutation({
        process: processName,
        validatorName: validatorName.trim() || undefined,
        validatorEmail: validatorEmail.trim() || undefined,
        results: validationResults,
      });
      if (draft.updatedAt) {
        setDraftSavedAt(draft.updatedAt);
      } else {
        setDraftSavedAt(new Date().toISOString());
      }
      draftHydratedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    }
  }, [saveDraftMutation, processName, validatorName, validatorEmail, validationResults]);

  const isLoadingDraft = !isSubmitted && (isDraftLoading || (!draftHydratedRef.current && draftData === undefined));
  const isLoadingSubmitted = isSubmitted && (isProcessResultsLoading || submittedResults === null);

  return (
    <Box sx={{ py: 2 }}>
      {/* Informations du valideur */}
      {!isSubmitted && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            👤 Informations du valideur
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <TextField
              label="Nom complet"
              value={validatorName}
              onChange={(e) => {
                setValidatorName(e.target.value);
                if (showValidationErrors && e.target.value.trim()) {
                  setShowValidationErrors(false);
                  setError(null);
                }
              }}
              required
              disabled={isSubmitting}
              placeholder="Ex: Jean Dupont"
              error={showValidationErrors && !validatorName.trim()}
              helperText={showValidationErrors && !validatorName.trim() ? 'Ce champ est obligatoire' : ''}
            />
            <TextField
              label="Email"
              type="email"
              value={validatorEmail}
              onChange={(e) => {
                setValidatorEmail(e.target.value);
                if (showValidationErrors && e.target.value.trim()) {
                  setShowValidationErrors(false);
                  setError(null);
                }
              }}
              required
              disabled={isSubmitting}
              placeholder="Ex: jean.dupont@company.com"
              error={showValidationErrors && (!validatorEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatorEmail))}
              helperText={
                showValidationErrors && !validatorEmail.trim() 
                  ? 'Ce champ est obligatoire' 
                  : showValidationErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatorEmail)
                  ? 'Email invalide'
                  : ''
              }
            />
          </Box>
        </Paper>
      )}

      {/* Tableau des rôles */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          📋 {isSubmitted ? 'Résultats de validation' : 'Rôles à valider'}
          {isSubmitted && isProcessResultsLoading && <CircularProgress size={16} />}
        </Typography>
        {showSkeleton ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: Math.min(roles.length, 4) || 3 }).map((_, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, borderColor: 'divider' }}
              >
                <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={18} />
                <Skeleton variant="rectangular" height={32} sx={{ mt: 2 }} />
              </Paper>
            ))}
          </Box>
        ) : (
          <RoleValidationTable
            roles={roles}
            showTechnicalView={showTechnicalView}
            value={validationResults}
            onChange={setValidationResults}
            readOnly={isSubmitted}
            token={token}
          />
        )}
      </Paper>

      {/* Actions */}
      {!isSubmitted && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="large"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || showSkeleton}
          >
            {isSavingDraft ? 'Sauvegarde en cours...' : 'Sauvegarder l’avancement'}
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {isSubmitting ? 'Envoi en cours...' : `Soumettre la validation de "${processName}"`}
          </Button>
        </Box>
      )}

      {/* Message de succès */}
      {isSubmitted && (
        <Alert severity="success" icon={<CheckIcon />}>
          La validation du processus <strong>"{processName}"</strong> a été soumise avec succès !
        </Alert>
      )}
      {!isSubmitted && draftSavedAt && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Brouillon sauvegardé le {new Date(draftSavedAt).toLocaleString('fr-FR')}. Pense à « Soumettre la validation » pour finaliser.
        </Alert>
      )}

      {/* Erreur */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

