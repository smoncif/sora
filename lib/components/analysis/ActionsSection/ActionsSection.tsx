'use client';

import React from 'react';
import { 
  Box,
  Button,
  Divider,
  Slide,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { AnalysisParsingProgress } from 'lib/components/analysis/ParsingProgress/AnalysisParsingProgress';
import type { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

export interface ActionsSectionProps {
  // États
  analysisResult: SimplifiedAnalysisResult | null;
  loading: boolean;
  processingStep?: string;
  progress?: number;
  
  // Handlers
  onSaveClick: () => void;
  onExportExcel: () => void;
  onExportResults: () => void;
  onReset: () => void;
  onShareForValidation?: () => void;  // 🆕 Handler pour partage validation
  hasSelectedRoles?: boolean;          // 🆕 Pour désactiver si aucun rôle sélectionné
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
  onShareForValidation,
  hasSelectedRoles = false,
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
                Exporter Avancement
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
                Exporter Spéc
              </Button>
              
              {/* 🆕 Bouton Partager pour Validation - Violet moderne */}
              {onShareForValidation && (
                <Button
                  variant="contained"
                  startIcon={<ShareIcon />}
                  onClick={onShareForValidation}
                  disabled={loading || !hasSelectedRoles}
                  sx={{ 
                    borderRadius: 3,
                    px: 3,
                    py: 1.2,
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    boxShadow: `0 4px 14px ${alpha('#8b5cf6', 0.25)}`,
                    border: 'none',
                    color: '#fff',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${alpha('#8b5cf6', 0.35)}`,
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
                  Partager pour validation
                </Button>
              )}
              
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

      <AnalysisParsingProgress
        loading={loading}
        progress={progress}
        message={processingStep || 'Traitement en cours...'}
      />
    </>
  );
} 


