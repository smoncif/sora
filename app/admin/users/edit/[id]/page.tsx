'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  AlertTitle,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { UserRole } from '@/types/auth';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Données fictives pour la démonstration
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    username: 'admin',
    fullName: 'Administrateur Système',
    role: UserRole.ADMIN,
    status: 'active',
    lastLogin: '2023-10-15T14:30:45Z',
  },
  {
    id: '2',
    email: 'editor@example.com',
    username: 'editor1',
    fullName: 'Jean Editeur',
    role: UserRole.EDITOR,
    status: 'active',
    lastLogin: '2023-10-12T09:15:22Z',
  },
  {
    id: '3',
    email: 'user1@example.com',
    username: 'user1',
    fullName: 'Marie Utilisateur',
    role: UserRole.USER,
    status: 'active',
    lastLogin: '2023-10-10T11:45:18Z',
  },
];

// Schéma de validation pour le formulaire d'édition
const editUserSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  fullName: z.string().min(2, 'Le nom complet doit contenir au moins 2 caractères'),
  role: z.enum([UserRole.ADMIN, UserRole.EDITOR, UserRole.USER]),
  status: z.enum(['active', 'inactive', 'suspended']),
  // Le mot de passe est optionnel pour l'édition
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial')
    .optional()
    .or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  // Vérifier si les mots de passe correspondent, mais uniquement si un mot de passe est fourni
  if (data.password || data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: '',
      username: '',
      fullName: '',
      role: UserRole.USER,
      status: 'active',
      password: '',
      confirmPassword: '',
    }
  });

  // Charger les données de l'utilisateur
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simuler un appel API avec un délai
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dans une vraie application, vous feriez un appel API
        // pour récupérer les détails de l'utilisateur
        const user = mockUsers.find(u => u.id === userId);
        
        if (!user) {
          setError('Utilisateur non trouvé');
          return;
        }
        
        // Mettre à jour le formulaire avec les données existantes
        reset({
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          status: user.status as 'active' | 'inactive' | 'suspended',
          password: '',
          confirmPassword: '',
        });
      } catch (err) {
        setError('Erreur lors du chargement des données de l\'utilisateur');
        console.error('Erreur lors du chargement des données:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, [userId, reset]);

  const onSubmit = async (data: EditUserFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Simuler un appel API avec un délai
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dans une vraie application, vous feriez un appel API
      // pour mettre à jour l'utilisateur
      console.log('Mise à jour de l\'utilisateur:', { id: userId, ...data });
      
      setSuccess(true);
      
      // Redirection après un court délai
      setTimeout(() => {
        router.push('/admin/users');
      }, 1500);
    } catch (err) {
      setError('Une erreur s\'est produite lors de la mise à jour de l\'utilisateur');
      console.error('Erreur lors de la mise à jour:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleCancel = () => {
    router.push('/admin/users');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mr: 2 }}
        >
          Retour
        </Button>
        <Typography variant="h6">Modifier l'utilisateur</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Erreur</AlertTitle>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Succès</AlertTitle>
          L'utilisateur a été mis à jour avec succès. Redirection en cours...
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Adresse email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={isSubmitting || success}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nom d'utilisateur"
                      fullWidth
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      disabled={isSubmitting || success}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nom complet"
                      fullWidth
                      error={!!errors.fullName}
                      helperText={errors.fullName?.message}
                      disabled={isSubmitting || success}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth error={!!errors.role} disabled={isSubmitting || success}>
                  <InputLabel id="role-label">Rôle</InputLabel>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        labelId="role-label"
                        label="Rôle"
                      >
                        <MenuItem value={UserRole.ADMIN}>Administrateur</MenuItem>
                        <MenuItem value={UserRole.EDITOR}>Éditeur</MenuItem>
                        <MenuItem value={UserRole.USER}>Utilisateur</MenuItem>
                      </Select>
                    )}
                  />
                  {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth error={!!errors.status} disabled={isSubmitting || success}>
                  <InputLabel id="status-label">Statut</InputLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        labelId="status-label"
                        label="Statut"
                      >
                        <MenuItem value="active">Actif</MenuItem>
                        <MenuItem value="inactive">Inactif</MenuItem>
                        <MenuItem value="suspended">Suspendu</MenuItem>
                      </Select>
                    )}
                  />
                  {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Modification du mot de passe (optionnel)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Laissez ces champs vides si vous ne souhaitez pas modifier le mot de passe
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      label="Nouveau mot de passe"
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      disabled={isSubmitting || success}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleTogglePasswordVisibility}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Confirmer le nouveau mot de passe"
                      fullWidth
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      disabled={isSubmitting || success}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleToggleConfirmPasswordVisibility}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isSubmitting || success}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting || success}
                  >
                    {isSubmitting ? 'Mise à jour en cours...' : 'Mettre à jour l\'utilisateur'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </>
  );
} 