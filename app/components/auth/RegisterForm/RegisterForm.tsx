'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Box,
  Grid as MuiGrid
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '@/hooks/auth/useAuth';
import { UserRole } from '@/types/auth';

// Pour résoudre le problème de linter avec Grid
const Grid = MuiGrid;

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface RegisterFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export const RegisterForm = ({ onSuccess, redirectTo = '/login' }: RegisterFormProps) => {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [formValues, setFormValues] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
    
    // Clear errors when user types
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors({
        ...formErrors,
        [name]: undefined
      });
    }
    
    // Clear auth error when user makes changes
    if (authError) setAuthError(null);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // First name validation
    if (!formValues.firstName.trim()) {
      errors.firstName = 'Le prénom est requis';
      isValid = false;
    }

    // Last name validation
    if (!formValues.lastName.trim()) {
      errors.lastName = 'Le nom est requis';
      isValid = false;
    }

    // Email validation
    if (!formValues.email) {
      errors.email = 'L\'email est requis';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formValues.email)) {
      errors.email = 'Format d\'email invalide';
      isValid = false;
    }

    // Password validation
    if (!formValues.password) {
      errors.password = 'Le mot de passe est requis';
      isValid = false;
    } else if (formValues.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formValues.password)) {
      errors.password = 'Le mot de passe doit contenir au moins une lettre majuscule, une minuscule et un chiffre';
      isValid = false;
    }

    // Confirm password validation
    if (!formValues.confirmPassword) {
      errors.confirmPassword = 'Veuillez confirmer votre mot de passe';
      isValid = false;
    } else if (formValues.password !== formValues.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setAuthError(null);
    
    try {
      // Création d'un utilisateur avec la méthode signUp du contexte d'authentification
      const { success, error } = await signUp(
        formValues.email,
        formValues.password,
        {
          first_name: formValues.firstName,
          last_name: formValues.lastName,
          full_name: `${formValues.firstName} ${formValues.lastName}`,
          role: UserRole.USER,
        }
      );
      
      if (!success) {
        throw new Error(error);
      }
      
      // Inscription réussie
      setRegistrationSuccess(true);
      
      // Appeler la fonction de callback en cas de succès
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {

      if (error.message?.includes('User already registered')) {
        setAuthError('Un compte avec cet email existe déjà.');
      } else if (error.message?.includes('Password')) {
        setAuthError('Le mot de passe ne respecte pas les exigences de sécurité minimales.');
      } else {
        setAuthError('Une erreur est survenue lors de l\'inscription. Veuillez réessayer plus tard.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  // Si l'inscription est réussie, afficher un message de succès
  if (registrationSuccess) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Inscription réussie !
        </Alert>
        <Box sx={{ mb: 3 }}>
          Votre compte a été créé avec succès. Veuillez vérifier votre boîte de réception pour confirmer votre adresse email.
        </Box>
        <Button
          variant="contained"
          onClick={() => router.push(redirectTo)}
        >
          Aller à la page de connexion
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {authError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {authError}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="firstName"
            label="Prénom"
            name="firstName"
            autoComplete="given-name"
            autoFocus
            value={formValues.firstName}
            onChange={handleInputChange}
            error={!!formErrors.firstName}
            helperText={formErrors.firstName}
            disabled={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="lastName"
            label="Nom"
            name="lastName"
            autoComplete="family-name"
            value={formValues.lastName}
            onChange={handleInputChange}
            error={!!formErrors.lastName}
            helperText={formErrors.lastName}
            disabled={loading}
          />
        </Grid>
      </Grid>
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Adresse email"
        name="email"
        autoComplete="email"
        value={formValues.email}
        onChange={handleInputChange}
        error={!!formErrors.email}
        helperText={formErrors.email}
        disabled={loading}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Mot de passe"
        type={showPassword ? 'text' : 'password'}
        id="password"
        autoComplete="new-password"
        value={formValues.password}
        onChange={handleInputChange}
        error={!!formErrors.password}
        helperText={formErrors.password}
        disabled={loading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => togglePasswordVisibility('password')}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="confirmPassword"
        label="Confirmer le mot de passe"
        type={showConfirmPassword ? 'text' : 'password'}
        id="confirmPassword"
        autoComplete="new-password"
        value={formValues.confirmPassword}
        onChange={handleInputChange}
        error={!!formErrors.confirmPassword}
        helperText={formErrors.confirmPassword}
        disabled={loading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? 'Inscription en cours...' : 'S\'inscrire'}
      </Button>
    </Box>
  );
}; 
