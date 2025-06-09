'use client';

import { useState } from 'react';
import {
  TextField, 
  Button, 
  CircularProgress, 
  Alert,
  InputAdornment,
  IconButton,
  Box
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '@/hooks/auth/useAuth';

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

export interface ConfirmResetPasswordFormProps {
  onSuccess?: () => void;
  tokenError?: boolean;
}

export const ConfirmResetPasswordForm = ({ 
  onSuccess,
  tokenError = false
}: ConfirmResetPasswordFormProps) => {
  const { confirmPasswordReset } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // Validation du mot de passe
    if (!password) {
      errors.password = 'Le mot de passe est requis';
      isValid = false;
    } else if (password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      isValid = false;
    }

    // Validation de la confirmation du mot de passe
    if (!confirmPassword) {
      errors.confirmPassword = 'Veuillez confirmer votre mot de passe';
      isValid = false;
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setApiError('');

    try {
      // Mise à jour du mot de passe via le contexte d'authentification
      const { success, error } = await confirmPasswordReset(password);
      
      if (!success) {
        throw new Error(error);
      }
      
      // Réinitialisation réussie
      setResetSuccess(true);
      
      // Appeler le callback de succès si fourni
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {

      if (error.message?.includes('minimal')) {
        setApiError('Le mot de passe ne respecte pas les exigences de sécurité minimales.');
      } else {
        setApiError('Impossible de réinitialiser votre mot de passe. Le lien a peut-être expiré.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // En cas d'erreur de token
  if (tokenError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          Lien de réinitialisation invalide
        </Alert>
        <Box sx={{ mb: 3 }}>
          Le lien que vous avez utilisé est invalide ou a expiré.
        </Box>
        <Box sx={{ mb: 2 }}>
          Veuillez demander un nouveau lien de réinitialisation.
        </Box>
        <Button 
          variant="contained" 
          fullWidth
          onClick={onSuccess}
          sx={{ mt: 2 }}
        >
          Demander un nouveau lien
        </Button>
      </Box>
    );
  }

  // En cas de succès
  if (resetSuccess) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Mot de passe mis à jour !
        </Alert>
        <Box sx={{ mb: 3 }}>
          Votre mot de passe a été réinitialisé avec succès.
        </Box>
        <Button 
          variant="contained" 
          onClick={onSuccess}
          sx={{ mt: 2 }}
        >
          Se connecter
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Box sx={{ mb: 3 }}>
        Créez un nouveau mot de passe pour votre compte.
      </Box>

      {apiError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {apiError}
        </Alert>
      )}

      <TextField
        label="Nouveau mot de passe"
        variant="outlined"
        fullWidth
        margin="normal"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setFormErrors({...formErrors, password: undefined});
          setApiError('');
        }}
        error={!!formErrors.password}
        helperText={formErrors.password}
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={togglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      <TextField
        label="Confirmer le mot de passe"
        variant="outlined"
        fullWidth
        margin="normal"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setFormErrors({...formErrors, confirmPassword: undefined});
          setApiError('');
        }}
        error={!!formErrors.confirmPassword}
        helperText={formErrors.confirmPassword}
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={toggleConfirmPasswordVisibility}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        {isLoading ? 'Traitement en cours...' : 'Réinitialiser le mot de passe'}
      </Button>
    </Box>
  );
}; 
