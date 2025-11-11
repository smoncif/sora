'use client';

/**
 * Dialog pour prolonger la date d'expiration d'un lien de validation
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format, addDays } from 'date-fns';

export interface ExtendExpirationDialogProps {
  open: boolean;
  onClose: () => void;
  linkId: string;
  mission: string;
  currentExpiration: Date;
  onSuccess: () => void;
}

export function ExtendExpirationDialog({
  open,
  onClose,
  linkId,
  mission,
  currentExpiration,
  onSuccess,
}: ExtendExpirationDialogProps) {
  const theme = useTheme();
  const [newDate, setNewDate] = useState<Date | null>(
    addDays(new Date(currentExpiration), 7)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/validation/links/${linkId}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newExpirationDate: newDate.toISOString(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la prolongation');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Prolonger la date d'expiration
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* Informations du lien */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Mission :
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {mission}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Date d'expiration actuelle :{' '}
              <strong>{format(new Date(currentExpiration), 'dd/MM/yyyy HH:mm', { locale: fr })}</strong>
            </Typography>
          </Box>

          {/* Date picker */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <DateTimePicker
              label="Nouvelle date d'expiration"
              value={newDate}
              onChange={setNewDate}
              minDateTime={new Date()}
              format="dd/MM/yyyy HH:mm"
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  helperText: 'Sélectionnez une nouvelle date et heure d\'expiration',
                },
              }}
            />
          </LocalizationProvider>

          {/* Erreur */}
          {error && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: alpha(theme.palette.error.main, 0.05),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
            >
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading || !newDate}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Prolongation...' : 'Prolonger'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

