'use client';

/**
 * Page de suivi des validations
 * Permet de voir et gérer tous les liens de validation créés
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  useTheme,
  alpha,
  Stack,
  Avatar,
  Alert,
} from '@mui/material';
import {
  AssignmentTurnedIn as AssignmentIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { ValidationTrackingTable } from 'lib/components/validation/ValidationTrackingTable';
import { useValidationLinks } from 'lib/hooks/validation/useValidationLinks';

export default function ValidationTrackingPage() {
  const theme = useTheme();
  const router = useRouter();
  const {
    links,
    isLoading,
    error,
    isAdmin,
    fetchLinks,
    deleteLink,
    extendLink,
    openLink,
  } = useValidationLinks();

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.success.main,
              width: 48,
              height: 48,
            }}
          >
            <AssignmentIcon />
          </Avatar>
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.info.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Suivi des Validations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gérez tous vos liens de validation créés
              {isAdmin && ' (Vue administrateur)'}
            </Typography>
          </Box>
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLinks}
            disabled={isLoading}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/analysis/roles')}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`,
              },
            }}
          >
            Créer un nouveau lien
          </Button>
        </Stack>
      </Box>

      {/* Erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => window.location.reload()}>
          {error}
        </Alert>
      )}

      {/* Badge Admin */}
      {isAdmin && (
        <Paper
          sx={{
            mb: 3,
            p: 2,
            bgcolor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            borderRadius: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
              ℹ️ Mode Administrateur
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - Vous pouvez voir et gérer tous les liens de validation de tous les utilisateurs
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Tableau */}
      <ValidationTrackingTable
        links={links}
        isAdmin={isAdmin}
        isLoading={isLoading}
        onRefresh={fetchLinks}
        onDelete={deleteLink}
        onExtend={extendLink}
        onOpen={openLink}
      />

      {/* Aide */}
      {!isLoading && links.length > 0 && (
        <Paper
          sx={{
            mt: 4,
            p: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            💡 Aide
          </Typography>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              • <strong>Ouvrir</strong> : Consulte le lien de validation dans un nouvel onglet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • <strong>Prolonger</strong> : Modifie la date d'expiration du lien
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • <strong>Supprimer</strong> : Supprime définitivement le lien et toutes les données associées
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • <strong>Processus</strong> : ✓ = Soumis / 💾 = Brouillon
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

