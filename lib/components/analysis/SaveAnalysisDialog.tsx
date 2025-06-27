'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  useTheme,
} from '@mui/material';

interface SaveAnalysisDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  initialName?: string;
  initialDescription?: string;
  isUpdate?: boolean;
  saving?: boolean;
}

/**
 * Dialog optimisé pour la saisie du nom et description d'analyse
 * Complètement isolé du workflow principal pour éviter les re-renders
 */
export function SaveAnalysisDialog({
  open,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
  isUpdate = false,
  saving = false
}: SaveAnalysisDialogProps) {
  const theme = useTheme();
  
  // État local complètement isolé
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Initialiser les valeurs quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialName,
        description: initialDescription
      });
    }
  }, [open, initialName, initialDescription]);

  // Handlers optimisés avec debouncing pour la performance
  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, name: value }));
  }, []);

  const handleDescriptionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, description: value }));
  }, []);

  // Handler de sauvegarde
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) return;
    
    try {
      await onSave(formData.name.trim(), formData.description.trim());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }, [formData, onSave]);

  // Handler pour la touche Entrée
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && formData.name.trim()) {
      event.preventDefault();
      handleSave();
    }
  }, [formData.name, handleSave]);

  const isNameValid = formData.name.trim().length > 0;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
      // Empêcher la fermeture pendant la sauvegarde
      disableEscapeKeyDown={saving}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          color: theme.palette.text.primary 
        }}>
          {isUpdate ? 'Mettre à jour l\'analyse' : 'Sauvegarder l\'analyse'}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          fullWidth
          label="Nom de l'analyse"
          value={formData.name}
          onChange={handleNameChange}
          onKeyPress={handleKeyPress}
          variant="outlined"
          autoFocus
          disabled={saving}
          error={!isNameValid && formData.name.length > 0}
          helperText={!isNameValid && formData.name.length > 0 ? 'Le nom est requis' : ''}
          sx={{ 
            mb: 3,
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              }
            }
          }}
        />
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description (optionnelle)"
          value={formData.description}
          onChange={handleDescriptionChange}
          variant="outlined"
          disabled={saving}
          placeholder="Décrivez brièvement cette analyse..."
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              }
            }
          }}
        />
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button 
          onClick={onClose}
          disabled={saving}
          sx={{ 
            textTransform: 'none',
            color: theme.palette.text.secondary
          }}
        >
          Annuler
        </Button>
        
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={saving || !isNameValid}
          sx={{ 
            textTransform: 'none',
            minWidth: 120,
            fontWeight: 500
          }}
        >
          {saving 
            ? (isUpdate ? 'Mise à jour...' : 'Sauvegarde...') 
            : (isUpdate ? 'Mettre à jour' : 'Sauvegarder')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
} 