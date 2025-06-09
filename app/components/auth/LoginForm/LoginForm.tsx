'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';

/**
 * Formulaire de connexion
 * 
 * Composant qui gère la connexion des utilisateurs avec email et mot de passe.
 * Inclut la validation des champs, la gestion des erreurs et la redirection après connexion.
 */
export interface LoginFormProps {
  redirectAfterLogin?: string;
}

export const LoginForm = ({ redirectAfterLogin }: LoginFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  
  // Récupérer l'URL de redirection depuis les paramètres d'URL si présente
  const returnUrl = searchParams?.get('returnUrl') || redirectAfterLogin || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour la validation
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const validateEmail = () => {
    if (!email) {
      setEmailError('L&apos;email est requis');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Format d&apos;email invalide');
      return false;
    }
    setEmailError('');
    return true;
  };
  
  const validatePassword = () => {
    if (!password) {
      setPasswordError('Le mot de passe est requis');
      return false;
    }
    setPasswordError('');
    return true;
  };
  
  const validateForm = () => {
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    return isEmailValid && isPasswordValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Réinitialiser les erreurs
    setError(null);
    
    // Valider le formulaire
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        // Redirection vers la page demandée ou la page par défaut
        router.push(returnUrl);
      } else {
        // Afficher l'erreur retournée par le service d'authentification
        setError(result.error || 'Échec de la connexion');
      }
    } catch (error: any) {

      // Gestion des différents types d'erreurs
      if (error.message?.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter');
      } else if (error.message?.includes('Too many requests')) {
        setError('Trop de tentatives de connexion. Veuillez réessayer plus tard');
      } else if (error.message?.includes('Network')) {
        setError('Problème de connexion réseau. Vérifiez votre connexion internet');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer plus tard');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Adresse email"
        name="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (emailError) validateEmail();
          if (error) setError(null);
        }}
        error={!!emailError}
        helperText={emailError}
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
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (passwordError) validatePassword();
          if (error) setError(null);
        }}
        error={!!passwordError}
        helperText={passwordError}
        disabled={loading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                disabled={loading}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
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
        {loading ? 'Connexion en cours...' : 'Se connecter'}
      </Button>
    </Box>
  );
}; 
