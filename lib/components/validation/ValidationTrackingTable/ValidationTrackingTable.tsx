'use client';

/**
 * Tableau de suivi des liens de validation
 */

import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ValidationLink } from 'lib/hooks/validation/useValidationLinks';
import { ExtendExpirationDialog } from '../ExtendExpirationDialog';

export interface ValidationTrackingTableProps {
  links: ValidationLink[];
  isAdmin: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onExtend: (id: string, newDate: Date) => Promise<void>;
  onOpen: (token: string) => void;
}

export function ValidationTrackingTable({
  links,
  isAdmin,
  isLoading,
  onRefresh,
  onDelete,
  onExtend,
  onOpen,
}: ValidationTrackingTableProps) {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLinkForDelete, setSelectedLinkForDelete] = useState<string | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedLinkForExtend, setSelectedLinkForExtend] = useState<ValidationLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: string) => {
    setSelectedLinkForDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLinkForDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(selectedLinkForDelete);
      setDeleteDialogOpen(false);
      setSelectedLinkForDelete(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression du lien');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExtendClick = (link: ValidationLink) => {
    setSelectedLinkForExtend(link);
    setExtendDialogOpen(true);
  };

  const handleExtendSuccess = () => {
    onRefresh();
    setExtendDialogOpen(false);
    setSelectedLinkForExtend(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (links.length === 0) {
    return (
      <Paper
        sx={{
          p: 6,
          textAlign: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Aucun lien de validation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Créez votre premier lien de validation depuis la page d'analyse des rôles
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <TableCell sx={{ fontWeight: 600 }}>Mission</TableCell>
              {isAdmin && <TableCell sx={{ fontWeight: 600 }}>Créé par</TableCell>}
              <TableCell sx={{ fontWeight: 600 }}>Créé le</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Expire le</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 250 }}>Processus & Statuts</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {links.map((link) => (
              <TableRow
                key={link.id}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.action.hover, 0.04),
                  },
                }}
              >
                {/* Mission */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {link.mission}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {link.businessRoles.length} rôle(s) métier
                  </Typography>
                </TableCell>

                {/* Créé par (admin only) */}
                {isAdmin && (
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {link.creatorEmail || 'Inconnu'}
                    </Typography>
                  </TableCell>
                )}

                {/* Créé le */}
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(link.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(link.createdAt), 'HH:mm', { locale: fr })}
                  </Typography>
                </TableCell>

                {/* Expire le */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      {format(new Date(link.expiresAt), 'dd/MM/yyyy', { locale: fr })}
                    </Typography>
                    {link.isExpired && (
                      <Chip label="Expiré" color="error" size="small" />
                    )}
                    {link.isExpiringSoon && !link.isExpired && (
                      <Chip
                        label={`${link.daysRemaining}j restant${link.daysRemaining > 1 ? 's' : ''}`}
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                </TableCell>

                {/* Processus & Statuts */}
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* Processus soumis */}
                    {link.processes.submitted.map((proc) => (
                      <Box key={proc.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                        <Chip
                          label="✓"
                          size="small"
                          color="success"
                          sx={{ minWidth: 30, height: 20, fontSize: '0.7rem' }}
                        />
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {proc.process}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Par {proc.validator_name || proc.validator_email || 'Anonyme'}{' '}
                            le {format(new Date(proc.submitted_at!), 'dd/MM HH:mm', { locale: fr })}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {/* Brouillons */}
                    {link.processes.drafts.map((proc) => (
                      <Box key={proc.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                        <Chip
                          label="💾"
                          size="small"
                          sx={{ minWidth: 30, height: 20, fontSize: '0.7rem', bgcolor: alpha(theme.palette.grey[500], 0.1) }}
                        />
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {proc.process}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Brouillon (modifié le {format(new Date(proc.updated_at!), 'dd/MM HH:mm', { locale: fr })})
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {/* Aucune activité */}
                    {link.processes.submitted.length === 0 && link.processes.drafts.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Aucune validation commencée
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                {/* Actions */}
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Ouvrir le lien">
                      <IconButton
                        size="small"
                        onClick={() => onOpen(link.token)}
                        sx={{
                          color: theme.palette.primary.main,
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={link.isExpired ? "Ce lien est expiré" : "Prolonger l'expiration"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleExtendClick(link)}
                          disabled={link.isExpired}
                          sx={{
                            color: theme.palette.warning.main,
                            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                          }}
                        >
                          <AccessTimeIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(link.id)}
                        sx={{
                          color: theme.palette.error.main,
                          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Êtes-vous sûr de vouloir supprimer ce lien de validation ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cette action est irréversible. Tous les brouillons et résultats associés seront également supprimés.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de prolongation */}
      {selectedLinkForExtend && (
        <ExtendExpirationDialog
          open={extendDialogOpen}
          onClose={() => setExtendDialogOpen(false)}
          linkId={selectedLinkForExtend.id}
          mission={selectedLinkForExtend.mission}
          currentExpiration={new Date(selectedLinkForExtend.expiresAt)}
          onSuccess={handleExtendSuccess}
        />
      )}
    </>
  );
}

