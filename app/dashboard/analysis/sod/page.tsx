'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, Container, Typography, Alert, Paper, Button, Pagination } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from 'lib/hooks/useAuth';
import { SodStepperNavigation } from 'lib/components/sod/navigation/SodStepperNavigation';
import { useSodSession } from 'lib/hooks/sod/useSodSession';
import { useSodActionState } from 'lib/hooks/sod/useSodActionState';
import { useSodExcelParser } from 'lib/hooks/sod/useSodExcelParser';
import { SodParsingProgress } from 'lib/components/sod/upload/SodParsingProgress';
import { SodSimpleRoleCard, SodCompositeRoleCard } from 'lib/components/sod';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';

const ROLES_PER_PAGE = 5;

export default function SodAnalysisPage() {
  const { user } = useAuth();
  const {
    session,
    currentStep,
    setCurrentStep,
    isLoading,
    error,
    warnings,
    uploadFile,
  } = useSodSession({ userId: user?.id || 'anonymous' });

  // Hook pour le parsing Excel asynchrone avec progression
  const {
    parsing,
    progress,
    error: parsingError,
    parsedData,
    parseFile,
    cancelParsing,
  } = useSodExcelParser();

  // Pagination pour rôles simples
  const [simpleRolePage, setSimpleRolePage] = useState(1);
  // Pagination pour rôles composites
  const [compositeRolePage, setCompositeRolePage] = useState(1);

  const simpleRoles = (session?.simpleRoles?.roles || []) as SodSimpleRole[];
  const compositeRoles = (session?.compositeRoles?.roles || []) as SodCompositeRole[];
  
  const { 
    roles: simpleRolesWithState, 
    handleDeleteAction, 
    handleRestrictAction,
    handleRestrictResource: handleRestrictResourceBase
  } = useSodActionState(simpleRoles);
  const {
    roles: compositeRolesWithState,
    handleDeleteAction: handleCompositeDeleteAction,
    handleRestrictAction: handleCompositeRestrictAction,
    handleRestrictResource: handleCompositeRestrictResourceBase
  } = useSodActionState(compositeRoles);
  // Wrappers pour adapter les signatures des callbacks
  const handleRestrictResourceWrapped = useCallback((
    roleName: string,
    _riskId: string,
    _actionCode: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    handleRestrictResourceBase(roleName, resourceCode, externalResourceCode, values);
}, [handleRestrictResourceBase]);

  const handleCompositeRestrictResourceWrapped = useCallback((
    roleName: string,
    _riskId: string,
    _actionCode: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    handleCompositeRestrictResourceBase(roleName, resourceCode, externalResourceCode, values);
}, [handleCompositeRestrictResourceBase]);
  // Pagination pour rôles simples
  const paginatedSimpleRoles = useMemo(() => {
    const start = (simpleRolePage - 1) * ROLES_PER_PAGE;
    const end = start + ROLES_PER_PAGE;
    return (simpleRolesWithState as SodSimpleRole[]).slice(start, end);
  }, [simpleRolesWithState, simpleRolePage]);

  const simpleRolesTotalPages = Math.ceil(simpleRolesWithState.length / ROLES_PER_PAGE);

  // Pagination pour rôles composites
  const paginatedCompositeRoles = useMemo(() => {
    const start = (compositeRolePage - 1) * ROLES_PER_PAGE;
    const end = start + ROLES_PER_PAGE;
    return (compositeRolesWithState as SodCompositeRole[]).slice(start, end);
  }, [compositeRolesWithState, compositeRolePage]);

  const compositeRolesTotalPages = Math.ceil(compositeRolesWithState.length / ROLES_PER_PAGE);

  // Quand le parsing est terminé, uploader le fichier pour créer la session
  useEffect(() => {
    if (parsedData && !parsing && !session) {
      // Le parsing est terminé, maintenant on peut créer la session
      // (Note: uploadFile gère déjà le parsing en interne, donc on peut juste attendre)
    }
  }, [parsedData, parsing, session]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // D'abord, parser avec le Web Worker pour montrer la progression
      await parseFile(file);
      // Ensuite, uploader pour créer la session
      await uploadFile(file);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Analyse SoD (Segregation of Duties)
      </Typography>

      {session && (
        <SodStepperNavigation currentStep={currentStep} onStepChange={setCurrentStep} />
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      )}

      {parsingError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {parsingError}
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="h6">Avertissements:</Typography>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Barre de progression pendant le parsing */}
      {parsing && progress && (
        <Box sx={{ mt: 3 }}>
          <SodParsingProgress
            progress={progress.progress}
            message={progress.message}
            parsing={parsing}
            error={parsingError}
            onCancel={cancelParsing}
          />
        </Box>
      )}

      {/* Upload de fichier */}
      {!session && !isLoading && !parsing && (
        <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
          <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Importez votre fichier Excel d'analyse SoD
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Le fichier doit contenir 28 colonnes avec les informations de risques, rôles, fonctions et actions.
            <br />
            <strong>Gère jusqu'à 1 million de lignes sans bloquer le navigateur !</strong>
          </Typography>
          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />}>
            Choisir un fichier
            <input type="file" hidden accept=".xlsx,.xls" onChange={handleFileUpload} />
          </Button>
        </Paper>
      )}

      {/* Étape 1 : Rôles Simples avec pagination */}
      {currentStep === 1 && session?.simpleRoles && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Étape 1: Rôles Simples
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {simpleRolesWithState.length} rôle(s) simple(s) • Affichage de {paginatedSimpleRoles.length} rôle(s) par page
              </Typography>
            </Box>
            {simpleRolesTotalPages > 1 && (
              <Pagination
                count={simpleRolesTotalPages}
                page={simpleRolePage}
                onChange={(_event: unknown, page: number) => setSimpleRolePage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {paginatedSimpleRoles.map((role, index) => (
              <SodSimpleRoleCard
                key={`${simpleRolePage}-${index}`}
                role={role}
                onDeleteAction={handleDeleteAction}
                onRestrictAction={handleRestrictAction}
                onRestrictResource={handleRestrictResourceWrapped}
              />
            ))}
          </Box>

          {/* Pagination en bas aussi */}
          {simpleRolesTotalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={simpleRolesTotalPages}
                page={simpleRolePage}
                onChange={(_event: unknown, page: number) => setSimpleRolePage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}

      {/* Étape 2 : Rôles Composites avec pagination */}
      {currentStep === 2 && session?.compositeRoles && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Étape 2: Rôles Composites
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {compositeRolesWithState.length} rôle(s) composite(s) • Affichage de {paginatedCompositeRoles.length} rôle(s) par page
              </Typography>
            </Box>
            {compositeRolesTotalPages > 1 && (
              <Pagination
                count={compositeRolesTotalPages}
                page={compositeRolePage}
                onChange={(_event: unknown, page: number) => setCompositeRolePage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {paginatedCompositeRoles.map((role, index) => (
              <SodCompositeRoleCard
                key={`${compositeRolePage}-${index}`}
                role={role}
                onDeleteAction={handleCompositeDeleteAction}
                onRestrictAction={handleCompositeRestrictAction}
                onRestrictResource={handleCompositeRestrictResourceWrapped}
              />
            ))}
          </Box>

          {/* Pagination en bas aussi */}
          {compositeRolesTotalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={compositeRolesTotalPages}
                page={compositeRolePage}
                onChange={(_event: unknown, page: number) => setCompositeRolePage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}

      {/* Étape 3 : Analyse par Utilisateur */}
      {currentStep === 3 && (
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
      {currentStep === 4 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Étape 4: Rapport SoD
          </Typography>
          <Alert severity="info">
            Cette fonctionnalité sera disponible prochainement.
          </Alert>
        </Box>
      )}
    </Container>
  );
}




