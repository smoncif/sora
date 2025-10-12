/**
 * Composant d'upload de fichier Excel pour l'analyse SOD
 * Inspiré du pattern des autres analyses (user/role)
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';

export interface SodFileUploadSectionProps {
  /** Mode d'import */
  importType: 'new' | 'import' | 'resume';
  /** État de chargement */
  loading: boolean;
  /** Erreur de parsing */
  error: string | null;
  /** Utilisateur connecté */
  user: any;
  /** Callback pour changer le type d'import */
  onImportTypeChange: (type: 'new' | 'import' | 'resume') => void;
  /** Callback pour upload de fichier */
  onFileUpload: (file: File) => void;
  /** Callback pour charger une analyse sauvegardée */
  onLoadSavedAnalysis: () => void;
  /** Callback pour reprendre depuis un fichier */
  onResumeFromFile: () => void;
}

export const SodFileUploadSection: React.FC<SodFileUploadSectionProps> = ({
  importType,
  loading,
  error,
  user,
  onImportTypeChange,
  onFileUpload,
  onLoadSavedAnalysis,
  onResumeFromFile,
}) => {
  const theme = useTheme();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDownloadTemplate = () => {
    // TODO: Implémenter le téléchargement du template SOD
    console.log('Téléchargement du template SOD...');
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 4, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Comment souhaitez-vous commencer ?
      </Typography>

      {/* Boutons de sélection du mode */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          variant={importType === 'new' ? 'contained' : 'outlined'}
          color={importType === 'new' ? 'primary' : 'inherit'}
          size="small"
          onClick={() => onImportTypeChange('new')}
          sx={{ 
            flex: 1,
            textTransform: 'none',
            fontWeight: importType === 'new' ? 600 : 400,
          }}
        >
          Nouveau fichier
        </Button>
        <Button
          variant={importType === 'import' ? 'contained' : 'outlined'}
          color={importType === 'import' ? 'primary' : 'inherit'}
          size="small"
          onClick={() => onImportTypeChange('import')}
          sx={{ 
            flex: 1,
            textTransform: 'none',
            fontWeight: importType === 'import' ? 600 : 400,
          }}
        >
          Importer
        </Button>
        <Button
          variant={importType === 'resume' ? 'contained' : 'outlined'}
          color={importType === 'resume' ? 'primary' : 'inherit'}
          size="small"
          onClick={() => onImportTypeChange('resume')}
          sx={{ 
            flex: 1,
            textTransform: 'none',
            fontWeight: importType === 'resume' ? 600 : 400,
          }}
        >
          Reprendre
        </Button>
      </Box>

      {/* Zone d'upload */}
      <Box
        sx={{
          border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          },
        }}
      >
        <CloudUploadIcon 
          sx={{ 
            fontSize: 48, 
            color: theme.palette.primary.main, 
            mb: 2,
            opacity: 0.7,
          }} 
        />
        
        <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
          Glissez-déposez votre fichier Excel ici
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          ou cliquez pour sélectionner
        </Typography>

        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          component="label"
          disabled={loading}
          sx={{
            mb: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Parcourir les fichiers
          <input 
            type="file" 
            hidden 
            accept=".xlsx,.xls" 
            onChange={handleFileUpload}
            disabled={loading}
          />
        </Button>

        <Typography variant="caption" color="text.secondary">
          Formats supportés: .xlsx, .xls
          <br />
          Taille max: 100MB
        </Typography>
      </Box>

      {/* Template téléchargeable */}
      <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Télécharger le template
        </Button>
      </Box>

      {/* Affichage des erreurs */}
      {error && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
