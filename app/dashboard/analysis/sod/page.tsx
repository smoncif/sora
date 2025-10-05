'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, Alert, Paper, Button, TablePagination } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from 'lib/hooks/useAuth';
import { SodStepperNavigation } from 'lib/components/sod/navigation/SodStepperNavigation';
import { useSodSession } from 'lib/hooks/sod/useSodSession';
import { useSodExcelParser } from 'lib/hooks/sod/useSodExcelParser';
import { SodParsingProgress } from 'lib/components/sod/upload/SodParsingProgress';
import { SodSimpleRoleCard, SodCompositeRoleCard } from 'lib/components/sod';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';
import { applyStateToSimpleRoles, applyStateToCompositeRoles } from 'lib/utils/sodStateApplication';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';


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
  const simpleRoles = (session?.simpleRoles?.roles || []) as SodSimpleRole[];
  const compositeRoles = (session?.compositeRoles?.roles || []) as SodCompositeRole[];
  
  // Contexte global pour l'état des actions
  const actionsContext = useSodActionsContext();
  
  
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
  const paginatedSimpleRoles = useMemo(() => {
    return applyStateToSimpleRoles(paginatedSimpleRolesRaw, actionsContext);
  }, [paginatedSimpleRolesRaw, actionsContext]);

  const paginatedCompositeRoles = useMemo(() => {
    return applyStateToCompositeRoles(paginatedCompositeRolesRaw, actionsContext);
  }, [paginatedCompositeRolesRaw, actionsContext]);
  
  
  // 🚀 OPTIMISATION 3 : Callbacks stables depuis le contexte
  const handleDeleteAction = useCallback((roleName: string, _riskId: string, actionCode: string) => {
    actionsContext.toggleDeleteAction(roleName, actionCode);
  }, [actionsContext]);

  const handleRestrictAction = useCallback((roleName: string, _riskId: string, actionCode: string) => {
    actionsContext.toggleRestrictAction(roleName, actionCode);
  }, [actionsContext]);

  const handleRestrictResourceWrapped = useCallback((
    roleName: string,
    _riskId: string,
    _actionCode: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    actionsContext.toggleRestrictResource(roleName, resourceCode, externalResourceCode, values);
  }, [actionsContext]);

  const handleCompositeRestrictResourceWrapped = useCallback((
    roleName: string,
    _riskId: string,
    _actionCode: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    actionsContext.toggleRestrictResource(roleName, resourceCode, externalResourceCode, values);
  }, [actionsContext]);
  
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
      // 🚀 Réinitialiser l'état global avant de charger un nouveau fichier
      actionsContext.resetState();
      
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
      {currentStep === 2 && session?.compositeRoles && (
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




