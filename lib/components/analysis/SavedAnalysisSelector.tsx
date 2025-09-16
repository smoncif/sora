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
  TextField,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  AccountTree as RoleIcon,
  Timeline as TransactionIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SavedAnalysisMetadata, getSavedAnalyses, deleteSavedAnalysis, updateSavedAnalysis } from 'lib/services/analysis/savedAnalysisService';

interface SavedAnalysisSelectorProps {
  userId: string;
  onAnalysisSelect: (analysisId: string) => void;
  loading?: boolean;
  mode?: 'roles' | 'users';
}

export function SavedAnalysisSelector({ userId, onAnalysisSelect, loading = false, mode }: SavedAnalysisSelectorProps) {
  const theme = useTheme();
  const [analyses, setAnalyses] = useState<SavedAnalysisMetadata[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<SavedAnalysisMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // États pour l'édition
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [analysisToEdit, setAnalysisToEdit] = useState<SavedAnalysisMetadata | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSavedAnalyses();
  }, [userId, mode]);

  const loadSavedAnalyses = async () => {
    try {
      setLoadingAnalyses(true);
      setError(null);
      const data = await getSavedAnalyses(userId, mode);
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    
    if (diffInMinutes < 1) {
      return 'À l\'instant';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}min`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays === 1) {
      return '1 jour';
    } else if (diffInDays < 7) {
      return `${diffInDays} jours`;
    } else if (diffInWeeks === 1) {
      return '1 semaine';
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks} semaines`;
    } else if (diffInMonths === 1) {
      return '1 mois';
    } else if (diffInMonths < 12) {
      return `${diffInMonths} mois`;
    } else {
      return formatDate(dateString).split(' ')[0];
    }
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

  const handleEditClick = (analysis: SavedAnalysisMetadata, event: React.MouseEvent) => {
    event.stopPropagation();
    setAnalysisToEdit(analysis);
    setEditTitle(analysis.title);
    setEditDescription(analysis.description || '');
    setEditDialogOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!analysisToEdit) return;

    try {
      setUpdating(true);
      await updateSavedAnalysis(analysisToEdit.id, userId, {
        title: editTitle,
        description: editDescription
      });
      
      // Recharger la liste des analyses
      await loadSavedAnalyses();
      
      // Fermer la boîte de dialogue
      setEditDialogOpen(false);
      setAnalysisToEdit(null);
      setEditTitle('');
      setEditDescription('');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'analyse';
      setError(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setAnalysisToEdit(null);
    setEditTitle('');
    setEditDescription('');
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
          {mode ? `Aucune analyse ${mode === 'roles' ? 'de rôles' : 'd\'utilisateurs'} sauvegardée` : 'Aucune analyse sauvegardée'}
        </Typography>
        <Typography variant="body2" sx={{ 
          color: alpha(theme.palette.text.secondary, 0.7),
        }}>
          {mode ? `Vos analyses ${mode === 'roles' ? 'de rôles' : 'd\'utilisateurs'} apparaîtront ici` : 'Vos analyses sauvegardées apparaîtront ici'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2.5 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ 
            color: theme.palette.text.primary,
            fontWeight: 600,
            fontSize: '1.1rem',
          }}>
            Analyses sauvegardées {mode ? `(${mode === 'roles' ? 'Rôles' : 'Utilisateurs'})` : ''}
          </Typography>
          <Tooltip title="Actualiser la liste">
            <IconButton
              size="small"
              onClick={loadSavedAnalyses}
              disabled={loadingAnalyses}
              sx={{
                color: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip
          label={`${analyses.length} analyse${analyses.length > 1 ? 's' : ''}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ 
            fontSize: '0.75rem',
            height: 24,
          }}
        />
      </Box>

      <Box sx={{
        maxHeight: 280,
        overflowY: 'auto',
        overflowX: 'hidden',
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        width: '100%',
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
                p: 1.5,
                display: 'flex',
                alignItems: 'stretch',
                gap: 1.5,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: 65,
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
              {/* Section titre et description */}
              <Box sx={{ 
                width: 180,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                py: 0.3,
                pr: 1,
              }}>
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
                  }}>
                    {analysis.description}
                  </Typography>
                )}
              </Box>

              {/* Section boutons d'action */}
              <Box sx={{ 
                width: 120,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 1,
                py: 0.3,
              }}>
                {/* Icônes d'action */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 0.6,
                  alignItems: 'center',
                }}>
                <Tooltip title="Modifier cette analyse">
                  <IconButton
                    size="small"
                    onClick={(e: React.MouseEvent) => handleEditClick(analysis, e)}
                    disabled={loading || updating}
                    sx={{
                      color: alpha(theme.palette.primary.main, 0.7),
                      padding: '4px',
                      '&:hover': {
                        color: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <EditIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Supprimer cette analyse">
                  <IconButton
                    size="small"
                    onClick={(e: React.MouseEvent) => handleDeleteClick(analysis, e)}
                    disabled={loading || deleting}
                    sx={{
                      color: alpha(theme.palette.error.main, 0.7),
                      padding: '4px',
                      '&:hover': {
                        color: theme.palette.error.main,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                </Box>

                {/* Date de dernière mise à jour */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                }}>
                  <ScheduleIcon sx={{ 
                    fontSize: 10,
                    color: alpha(theme.palette.text.secondary, 0.6),
                  }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.65rem',
                    color: alpha(theme.palette.text.secondary, 0.8),
                    fontWeight: 500,
                  }}>
                    {formatRelativeTime(analysis.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {index < analyses.length - 1 && (
              <Divider sx={{ opacity: 0.3 }} />
            )}
          </Box>
        ))}
      </Box>

      {/* 🗑️ Boîte de dialogue de confirmation de suppression */}
      {/* Boîte de dialogue d'édition */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          color: theme.palette.primary.main,
          pb: 1,
        }}>
          <EditIcon />
          Modifier l'analyse
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Titre de l'analyse"
            value={editTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
            fullWidth
            required
            margin="normal"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description (optionnelle)"
            value={editDescription}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleEditCancel}
            disabled={updating}
            sx={{ textTransform: 'none' }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleEditConfirm}
            disabled={updating || !editTitle.trim()}
            variant="contained"
            color="primary"
            startIcon={updating ? <CircularProgress size={16} /> : <EditIcon />}
            sx={{ textTransform: 'none' }}
          >
            {updating ? 'Mise à jour...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue de suppression */}
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


