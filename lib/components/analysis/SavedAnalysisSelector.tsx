'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Grid,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  AccountTree as RoleIcon,
  Timeline as TransactionIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { SavedAnalysisMetadata, getSavedAnalyses, deleteSavedAnalysis } from 'lib/services/analysis/savedAnalysisService';

interface SavedAnalysisSelectorProps {
  userId: string;
  onAnalysisSelect: (analysisId: string) => void;
  loading?: boolean;
}

export function SavedAnalysisSelector({ userId, onAnalysisSelect, loading = false }: SavedAnalysisSelectorProps) {
  const theme = useTheme();
  const [analyses, setAnalyses] = useState<SavedAnalysisMetadata[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<SavedAnalysisMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSavedAnalyses();
  }, [userId]);

  const loadSavedAnalyses = async () => {
    try {
      setLoadingAnalyses(true);
      setError(null);
      const data = await getSavedAnalyses(userId);
      setAnalyses(data);
    } catch (err) {

      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des analyses';
      setError(errorMessage);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'error';
    if (progress < 30) return 'warning';
    if (progress < 80) return 'info';
    return 'success';
  };

  const getProgressLabel = (progress: number) => {
    if (progress === 0) return 'Non commencée';
    if (progress < 30) return 'Débutée';
    if (progress < 80) return 'En cours';
    if (progress === 100) return 'Terminée';
    return 'Avancée';
  };

  const handleAnalysisSelect = (analysisId: string) => {
    onAnalysisSelect(analysisId);
  };

  const handleDeleteClick = (analysis: SavedAnalysisMetadata, event: React.MouseEvent) => {
    event.stopPropagation();
    setAnalysisToDelete(analysis);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!analysisToDelete) return;

    try {
      setDeleting(true);
      await deleteSavedAnalysis(analysisToDelete.id, userId);
      
      // Recharger la liste des analyses
      await loadSavedAnalyses();
      
      // Fermer la boîte de dialogue
      setDeleteDialogOpen(false);
      setAnalysisToDelete(null);


    } catch (err) {

      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'analyse';
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAnalysisToDelete(null);
  };

  if (loadingAnalyses) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 200,
        gap: 2,
      }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Chargement des analyses sauvegardées...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ borderRadius: 2 }}
        action={
          <Button size="small" onClick={loadSavedAnalyses}>
            Réessayer
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (analyses.length === 0) {
    return (
      <Box sx={{ 
        textAlign: 'center',
        py: 6,
        border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.neutral.main, 0.02),
      }}>
        <AssignmentIcon sx={{ 
          fontSize: 64, 
          color: alpha(theme.palette.text.secondary, 0.3),
          mb: 2,
        }} />
        <Typography variant="h6" sx={{ 
          color: theme.palette.text.secondary,
          mb: 1,
        }}>
          Aucune analyse sauvegardée
        </Typography>
        <Typography variant="body2" sx={{ 
          color: alpha(theme.palette.text.secondary, 0.7),
        }}>
          Vos analyses sauvegardées apparaîtront ici
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body1" sx={{ 
        mb: 3,
        color: theme.palette.text.primary,
        fontWeight: 500,
      }}>
        {analyses.length} analyse{analyses.length > 1 ? 's' : ''} sauvegardée{analyses.length > 1 ? 's' : ''}
      </Typography>

      <Box sx={{
        maxHeight: 280,
        overflowY: 'auto',
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: alpha(theme.palette.divider, 0.1),
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.primary.main, 0.3),
          borderRadius: '4px',
          '&:hover': {
            background: alpha(theme.palette.primary.main, 0.5),
          },
        },
      }}>
        {analyses.map((analysis, index) => (
          <Box key={analysis.id}>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  transform: 'translateX(4px)',
                },
                ...(loading && {
                  opacity: 0.6,
                  pointerEvents: 'none',
                }),
              }}
              onClick={() => !loading && handleAnalysisSelect(analysis.id)}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mb: 0.3,
                  fontSize: '0.95rem',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {analysis.title}
                </Typography>
                
                {analysis.description && (
                  <Typography variant="body2" sx={{ 
                    color: alpha(theme.palette.text.secondary, 0.8),
                    fontSize: '0.8rem',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.8,
                  }}>
                    {analysis.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <RoleIcon sx={{ fontSize: 13, color: alpha(theme.palette.text.secondary, 0.6) }} />
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.7rem',
                      color: alpha(theme.palette.text.secondary, 0.8),
                    }}>
                      {analysis.metadata.totalBusinessRoles} rôles métier
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <AssignmentIcon sx={{ fontSize: 13, color: alpha(theme.palette.text.secondary, 0.6) }} />
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.7rem',
                      color: alpha(theme.palette.text.secondary, 0.8),
                    }}>
                      {analysis.metadata.totalSimpleRoles} rôles simples
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <TransactionIcon sx={{ fontSize: 13, color: alpha(theme.palette.text.secondary, 0.6) }} />
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.7rem',
                      color: alpha(theme.palette.text.secondary, 0.8),
                    }}>
                      {analysis.metadata.totalTransactions} transactions
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ 
                minWidth: 180,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.8,
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                }}>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                  }}>
                    Avancement
                  </Typography>
                  <Chip
                    label={getProgressLabel(analysis.progress)}
                    color={getProgressColor(analysis.progress)}
                    size="small"
                    sx={{ 
                      fontSize: '0.65rem',
                      height: 18,
                      '& .MuiChip-label': { px: 0.8 },
                    }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analysis.progress}
                  color={getProgressColor(analysis.progress)}
                  sx={{
                    height: 5,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.divider, 0.1),
                  }}
                />
                <Typography variant="caption" sx={{ 
                  fontSize: '0.65rem',
                  color: alpha(theme.palette.text.secondary, 0.7),
                  textAlign: 'center',
                }}>
                  {analysis.selectedRolesCount} / {analysis.metadata.totalBusinessRoles} rôles sélectionnés
                </Typography>
              </Box>

              <Box sx={{ 
                minWidth: 140,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 0.8,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <ScheduleIcon sx={{ fontSize: 13, color: alpha(theme.palette.text.secondary, 0.6) }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.7rem',
                    color: alpha(theme.palette.text.secondary, 0.8),
                  }}>
                    {formatDate(analysis.updated_at).split(' ')[0]}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                  <Tooltip title="Supprimer cette analyse">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteClick(analysis, e)}
                      disabled={loading || deleting}
                      sx={{
                        color: alpha(theme.palette.error.main, 0.7),
                        padding: '4px',
                        '&:hover': {
                          color: theme.palette.error.main,
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                        },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalysisSelect(analysis.id);
                    }}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={12} /> : <CheckCircleIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      px: 1.5,
                      py: 0.4,
                      minWidth: 'auto',
                    }}
                  >
                    {loading ? 'Chargement...' : 'Charger'}
                  </Button>
                </Box>

                {analysis.metadata.fileName && (
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.65rem',
                    color: alpha(theme.palette.text.secondary, 0.6),
                    fontStyle: 'italic',
                    textAlign: 'right',
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {analysis.metadata.fileName}
                  </Typography>
                )}
              </Box>
            </Box>

            {index < analyses.length - 1 && (
              <Divider sx={{ opacity: 0.3 }} />
            )}
          </Box>
        ))}
      </Box>

      {/* 🗑️ Boîte de dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: theme.palette.error.main,
        }}>
          <WarningIcon />
          Supprimer l'analyse
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Êtes-vous sûr de vouloir supprimer l'analyse <strong>"{analysisToDelete?.title}"</strong> ?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cette action est irréversible. Toutes les données de cette analyse seront définitivement perdues.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            disabled={deleting}
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ textTransform: 'none' }}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 


