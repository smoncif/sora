'use client';

import React from 'react';
import { 
  Box,
  Button,
  Typography,
  Divider,
  Slide,
  Fade,
  Paper,
  CircularProgress,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';

export interface ActionsSectionProps {
  // États
  analysisResult: any;
  loading: boolean;
  processingStep?: string;
  progress?: number;
  
  // Handlers
  onSaveClick: () => void;
  onExportExcel: () => void;
  onExportResults: () => void;
  onReset: () => void;
}

export function ActionsSection({
  analysisResult,
  loading,
  processingStep,
  progress,
  onSaveClick,
  onExportExcel,
  onExportResults,
  onReset,
}: ActionsSectionProps) {
  const theme = useTheme();

  return (
    <>
      {/* Actions - Design moderne et épuré */}
      {analysisResult && (
        <Slide direction="up" in={!!analysisResult} timeout={500}>
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 4, opacity: 0.1 }} />
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-start',
              mb: 6, // 🎯 AJOUT : Espacement avec la section Vue d'ensemble
            }}>
              <Typography variant="subtitle2" sx={{ 
                color: theme.palette.text.secondary,
                mr: 1,
                fontWeight: 500,
                fontSize: '0.9rem',
              }}>
                Actions :
              </Typography>
              
              {/* Bouton Sauvegarder - Vert sophistiqué */}
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={onSaveClick}
                disabled={loading}
                sx={{ 
                  borderRadius: 3,
                  px: 3,
                  py: 1.2,
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: `0 4px 14px ${alpha('#10b981', 0.25)}`,
                  border: 'none',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha('#10b981', 0.35)}`,
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                  '&:disabled': {
                    background: alpha(theme.palette.action.disabled, 0.12),
                    color: theme.palette.action.disabled,
                    boxShadow: 'none',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Sauvegarder
              </Button>
              
              {/* Bouton Exporter - Orange moderne */}
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={onExportExcel}
                disabled={loading}
                sx={{ 
                  borderRadius: 3,
                  px: 3,
                  py: 1.2,
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  boxShadow: `0 4px 14px ${alpha('#f59e0b', 0.25)}`,
                  border: 'none',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha('#f59e0b', 0.35)}`,
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                  '&:disabled': {
                    background: alpha(theme.palette.action.disabled, 0.12),
                    color: theme.palette.action.disabled,
                    boxShadow: 'none',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Exporter Excel
              </Button>
              
              {/* Bouton Exporter Résultats - Bleu moderne */}
              <Button
                variant="contained"
                startIcon={<TableChartIcon />}
                onClick={onExportResults}
                disabled={loading}
                sx={{ 
                  borderRadius: 3,
                  px: 3,
                  py: 1.2,
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: `0 4px 14px ${alpha('#3b82f6', 0.25)}`,
                  border: 'none',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha('#3b82f6', 0.35)}`,
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                  '&:disabled': {
                    background: alpha(theme.palette.action.disabled, 0.12),
                    color: theme.palette.action.disabled,
                    boxShadow: 'none',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Exporter Résultats
              </Button>
              
              {/* Bouton Réinitialiser - Gris moderne */}
              <Button
                variant="text"
                startIcon={<RefreshIcon />}
                onClick={onReset}
                disabled={loading}
                sx={{ 
                  borderRadius: 3,
                  px: 3,
                  py: 1.2,
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  color: theme.palette.text.secondary,
                  background: 'transparent',
                  '&:hover': {
                    background: alpha(theme.palette.text.secondary, 0.08),
                    color: theme.palette.text.primary,
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                  '&:disabled': {
                    color: theme.palette.action.disabled,
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Réinitialiser
              </Button>
                

            </Box>
          </Box>
        </Slide>
      )}

      {/* Indicateur de progression - Design moderne */}
      {loading && (
        <Fade in timeout={300}>
          <Paper 
            elevation={1}
            sx={{ 
              p: 3, 
              mb: 4,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.secondary.main, 0.02),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />
              <Typography variant="body1" sx={{ 
                fontWeight: 500,
                color: theme.palette.text.primary,
              }}>
                {processingStep || 'Traitement en cours...'}
              </Typography>
            </Box>
            {progress && progress > 0 && (
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    borderRadius: 3,
                  }
                }}
              />
            )}
          </Paper>
        </Fade>
      )}
    </>
  );
} 


