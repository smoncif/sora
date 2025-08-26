'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from '@mui/material';

interface LicenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  formData: {
    simpleRole: string;
    licenceType: string;
    licenceOrder: number;
  };
  onFormChange: (field: keyof LicenseDialogProps['formData'], value: string | number) => void;
}

export const LicenseDialog: React.FC<LicenseDialogProps> = ({
  open,
  onClose,
  onSave,
  title,
  formData,
  onFormChange,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Rôle simple"
            value={formData.simpleRole}
            onChange={(e) => onFormChange('simpleRole', e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Type de licence"
            value={formData.licenceType}
            onChange={(e) => onFormChange('licenceType', e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Ordre de priorité"
            type="number"
            value={formData.licenceOrder}
            onChange={(e) => onFormChange('licenceOrder', parseInt(e.target.value) || 1)}
            fullWidth
            inputProps={{ min: 1 }}
            helperText="Plus le nombre est élevé, plus la licence est prioritaire"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={onSave} variant="contained">
          {title.includes('Ajouter') ? 'Ajouter' : 'Modifier'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
