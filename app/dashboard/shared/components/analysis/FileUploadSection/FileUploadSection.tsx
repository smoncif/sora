'use client';

import React from 'react';
import { 
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  Tooltip,
  Fade,
  useTheme,
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { FileUpload } from '@/components/common/FileUpload';
import { SavedAnalysisSelector } from '@/components/analysis/SavedAnalysisSelector';

export interface FileUploadSectionProps {
  // États
  importType: 'new' | 'saved' | 'resume';
  loading: boolean;
  error: string | null;
  user: any;

  // Handlers
  onImportTypeChange: (type: 'new' | 'saved' | 'resume') => void;
  onFileUpload: (file: File) => Promise<void>;
  onLoadSavedAnalysis: (analysisId: string) => Promise<void>;
  onResumeFromFile: (file: File) => Promise<void>;
}

export function FileUploadSection({
  importType,
  loading,
  error,
  user,
  onImportTypeChange,
  onFileUpload,
  onLoadSavedAnalysis,
  onResumeFromFile,
}: FileUploadSectionProps) {
  const theme = useTheme();

  return (
    <Fade in timeout={600}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          mb: 4,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        {/* En-tête avec sélection du type d'import */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 3,
          }}>
            Comment souhaitez-vous commencer ?
          </Typography>
          
          {/* Boutons de sélection du type d'import */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            mb: 3,
            flexWrap: 'nowrap',
            overflowX: 'auto',
          }}>
            <Button
              variant={importType === 'new' ? 'contained' : 'outlined'}
              onClick={() => onImportTypeChange('new')}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
              }}
            >
              Nouveau fichier Excel
            </Button>
            <Button
              variant={importType === 'saved' ? 'contained' : 'outlined'}
              onClick={() => onImportTypeChange('saved')}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
              }}
            >
              Analyse sauvegardée
            </Button>
            <Button
              variant={importType === 'resume' ? 'contained' : 'outlined'}
              onClick={() => onImportTypeChange('resume')}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
              }}
            >
              Reprendre travail
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4} alignItems="stretch">
          {/* Section Import - Contenu dynamique selon le type */}
          <Grid size={{ xs: 12 }}>
            {importType === 'new' && (
              <Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 2,
                  fontSize: '1rem',
                }}>
                  Import des données brutes
                </Typography>
                
                <FileUpload
                  accept=".xlsx,.xls"
                  maxSize={100}
                  onFileSelect={onFileUpload}
                  loading={loading}
                  error={error}
                  disabled={loading}
                  title="Glissez-déposez votre fichier Excel ici"
                  subtitle="Formats supportés: .xlsx, .xls (max 100MB)"
                  buttonText="Parcourir les fichiers"
                />
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Tooltip title="Téléchargez le modèle Excel à remplir pour l'analyse des rôles métier">
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<DownloadIcon />}
                      href="/templates/template_role_analysis.xlsx"
                      download
                      sx={{ 
                        borderRadius: 1.5,
                        px: 3,
                        py: 1,
                      }}
                    >
                      Télécharger le template
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            )}

            {importType === 'saved' && (
              <Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 2,
                  fontSize: '1rem',
                }}>
                  Charger une analyse sauvegardée
                </Typography>
                
                {!user?.id ? (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Vous devez être connecté pour accéder aux analyses sauvegardées.
                  </Alert>
                ) : (
                  <SavedAnalysisSelector
                    userId={user.id}
                    onAnalysisSelect={onLoadSavedAnalysis}
                    loading={loading}
                  />
                )}
              </Box>
            )}
        
            {importType === 'resume' && (
              <Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 2,
                  fontSize: '1rem',
                }}>
                  Reprendre depuis un fichier de sauvegarde
                </Typography>
                
                <FileUpload
                  accept=".xlsx,.xls"
                  maxSize={100}
                  onFileSelect={onResumeFromFile}
                  loading={loading}
                  error={error}
                  disabled={loading}
                  title="Glissez-déposez votre fichier de sauvegarde ici"
                  subtitle="Fichier Excel exporté précédemment avec votre avancement"
                  buttonText="Parcourir les fichiers"
                />
                
                <Alert 
                  severity="info" 
                  sx={{ 
                    mt: 2,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2">
                    <strong>Info :</strong> Ce fichier doit contenir vos sélections de rôles précédemment exportées. 
                    Il vous permettra de reprendre exactement là où vous vous étiez arrêté.
                  </Typography>
                </Alert>
              </Box>
            )}
          </Grid>


        </Grid>
      </Paper>
    </Fade>
  );
} 