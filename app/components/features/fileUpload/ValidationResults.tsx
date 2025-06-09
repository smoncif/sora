'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Accordion, 
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Badge,
  LinearProgress,
  Button
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpOutlineIcon,
  Description as DescriptionIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { ValidationResult, ValidationError, ValidationSeverity } from 'lib/types/validation';

// Interface pour les props du composant
interface ValidationResultsProps {
  validationResult: ValidationResult;
  fileName?: string;
  onDownloadReport?: () => void;
  onFix?: (error: ValidationError) => void;
  isProcessing?: boolean;
}

/**
 * Composant pour afficher les résultats de validation Excel
 */
const ValidationResults: React.FC<ValidationResultsProps> = ({
  validationResult,
  fileName,
  onDownloadReport,
  onFix,
  isProcessing
}) => {
  const [expandedSheets, setExpandedSheets] = useState<Record<string, boolean>>({});
  
  // Pas de résultats à afficher
  if (!validationResult) {
    return null;
  }
  
  // Résultats en cours de traitement
  if (isProcessing || validationResult.isProcessing) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Validation en cours...
        </Typography>
        <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
          <LinearProgress />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Veuillez patienter pendant que nous analysons votre fichier...
        </Typography>
      </Paper>
    );
  }

  // Aucune erreur trouvée
  if (validationResult.isValid && validationResult.structureValid && validationResult.dataValid) {
    return (
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.light' }}>
        <Box display="flex" alignItems="center">
          <CheckIcon color="success" sx={{ mr: 2 }} />
          <Typography variant="h6">
            Le fichier est valide!
          </Typography>
        </Box>
        
        {validationResult.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {validationResult.warnings.length} avertissement(s) trouvé(s) mais le fichier peut être importé.
          </Alert>
        )}
        
        <Typography variant="body2" sx={{ mt: 2 }}>
          Statistiques: {validationResult.stats.totalInfos} info(s), {validationResult.stats.totalWarnings} avertissement(s), 0 erreur(s)
        </Typography>
      </Paper>
    );
  }

  // Organiser les erreurs par feuille
  const errorsBySheet: Record<string, ValidationError[]> = {};
  const warningsBySheet: Record<string, ValidationError[]> = {};
  const infosBySheet: Record<string, ValidationError[]> = {};
  
  // Erreurs non liées à une feuille spécifique
  const generalErrors: ValidationError[] = [];
  const generalWarnings: ValidationError[] = [];
  const generalInfos: ValidationError[] = [];
  
  // Répartir les erreurs
  validationResult.errors.forEach(error => {
    if (error.sheet) {
      if (!errorsBySheet[error.sheet]) {
        errorsBySheet[error.sheet] = [];
      }
      errorsBySheet[error.sheet].push(error);
    } else {
      generalErrors.push(error);
    }
  });
  
  validationResult.warnings.forEach(warning => {
    if (warning.sheet) {
      if (!warningsBySheet[warning.sheet]) {
        warningsBySheet[warning.sheet] = [];
      }
      warningsBySheet[warning.sheet].push(warning);
    } else {
      generalWarnings.push(warning);
    }
  });
  
  validationResult.infos.forEach(info => {
    if (info.sheet) {
      if (!infosBySheet[info.sheet]) {
        infosBySheet[info.sheet] = [];
      }
      infosBySheet[info.sheet].push(info);
    } else {
      generalInfos.push(info);
    }
  });
  
  // Toutes les feuilles uniques
  const allSheets = Array.from(new Set([
    ...Object.keys(errorsBySheet),
    ...Object.keys(warningsBySheet),
    ...Object.keys(infosBySheet)
  ]));
  
  // Gérer l'expansion des accordéons
  const handleSheetToggle = (sheet: string) => {
    setExpandedSheets(prev => ({
      ...prev,
      [sheet]: !prev[sheet]
    }));
  };
  
  // Rendre l'icône appropriée pour la sévérité
  const renderSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case ValidationSeverity.ERROR:
        return <ErrorIcon color="error" />;
      case ValidationSeverity.WARNING:
        return <WarningIcon color="warning" />;
      case ValidationSeverity.INFO:
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };
  
  // Rendre un élément de validation avec les actions possibles
  const renderValidationItem = (item: ValidationError) => (
    <ListItem 
      key={item.id}
      alignItems="flex-start"
      secondaryAction={
        <>
          {(item.onFix || onFix) && item.severity === ValidationSeverity.ERROR && (
            <Tooltip title="Corriger automatiquement">
              <IconButton 
                edge="end" 
                aria-label="fix" 
                onClick={() => {
                  if (onFix) {
                    onFix(item);
                  } else if (item.onFix) {
                    item.onFix(item);
                  }
                }}
                size="small"
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {item.onIgnore && (
            <Tooltip title="Ignorer cette erreur">
              <IconButton 
                edge="end" 
                aria-label="ignore" 
                onClick={() => item.onIgnore && item.onIgnore(item)}
                size="small"
                sx={{ ml: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      }
    >
      <ListItemIcon>
        {renderSeverityIcon(item.severity)}
      </ListItemIcon>
      <ListItemText
        primary={item.message}
        secondary={
          <>
            {item.row && `Ligne: ${item.row}`}
            {item.row && item.column && ' | '}
            {item.column && `Colonne: ${item.column}`}
            {(item.row || item.column) && item.value && ' | '}
            {item.value && `Valeur: ${item.value}`}
            {item.expected && <Typography component="span" variant="body2" sx={{ display: 'block' }}>
              Attendu: {item.expected}
            </Typography>}
            {item.suggestions && item.suggestions.length > 0 && (
              <Typography component="span" variant="body2" sx={{ display: 'block', mt: 1 }}>
                Suggestions: {item.suggestions.join(', ')}
              </Typography>
            )}
          </>
        }
      />
    </ListItem>
  );
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Résultats de la validation{fileName ? ` - ${fileName}` : ''}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography color={validationResult.isValid ? 'success.main' : 'error.main'} gutterBottom>
          {validationResult.isValid ? 'Le fichier est valide' : 'Le fichier contient des erreurs'}
        </Typography>
        <Typography>Structure: {validationResult.structureValid ? 'Valide' : 'Invalide'}</Typography>
        <Typography>Données: {validationResult.dataValid ? 'Valides' : 'Invalides'}</Typography>
      </Box>

      {validationResult.structureErrors && validationResult.structureErrors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Erreurs de structure:
          </Typography>
          <ul>
            {validationResult.structureErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Box>
      )}

      {validationResult.dataErrors && validationResult.dataErrors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Erreurs de données:
          </Typography>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Feuille</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Ligne</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Colonne</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {validationResult.dataErrors.map((error: any, index: number) => (
                <tr key={index}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{error.sheetName}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{error.row + 1}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{error.column}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {onDownloadReport && (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownloadReport}
          >
            Télécharger le rapport
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default ValidationResults; 

