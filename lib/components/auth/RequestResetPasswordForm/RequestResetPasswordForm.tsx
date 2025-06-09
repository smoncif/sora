'use client';

import { useState } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  TextField, 
  Alert
} from '@mui/material';
import { useAuth } from 'lib/hooks/auth/useAuth';

export interface RequestResetPasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RequestResetPasswordForm = ({ onSuccess, onCancel }: RequestResetPasswordFormProps) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'L\'email est requis';
    }
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setApiError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      // Demande de réinitialisation du mot de passe
      const { success, error } = await resetPassword(email);
      
      if (!success) {
        throw new Error(error);
      }
      
      // Requête envoyée avec succès
      setRequestSent(true);
      
      // Appeler le callback de succès si fourni
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {

      if (error.message?.includes('rate limited')) {
        setApiError('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
      } else {
        setApiError('Impossible de traiter votre demande. Veuillez réessayer plus tard.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Si la requête a été envoyée avec succès
  if (requestSent) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Instructions envoyées !
        </Alert>
        <Box sx={{ mb: 2 }}>
          Si un compte est associé à l'adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
        </Box>
        <Box sx={{ mb: 3 }}>
          Vérifiez votre boîte de réception et vos spams. Le lien est valide pendant 1 heure.
        </Box>
        <Button 
          variant="outlined" 
          onClick={onCancel}
          sx={{ mt: 1 }}
        >
          Retour à la connexion
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Box sx={{ mb: 3 }}>
        Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </Box>

      {apiError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {apiError}
        </Alert>
      )}

      <TextField
        label="Adresse email"
        variant="outlined"
        fullWidth
        margin="normal"
        value={email}
        onChange={handleEmailChange}
        error={!!emailError}
        helperText={emailError}
        disabled={isLoading}
        autoComplete="email"
        type="email"
        autoFocus
      />

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          color="inherit"
          disabled={isLoading}
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Envoi en cours...' : 'Envoyer les instructions'}
        </Button>
      </Box>
    </Box>
  );
}; 


