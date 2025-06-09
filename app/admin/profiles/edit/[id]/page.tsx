'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Switch,
  TextField,
  Typography,
  Alert,
  Breadcrumbs,
  Link
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Types pour les profils
interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

// Données mockées pour les profils (utilisé pour récupérer un profil existant)
const mockProfiles: Profile[] = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Administrateur', lastActive: '2023-10-15', status: 'active' },
  { id: '2', name: 'Editor User', email: 'editor@example.com', role: 'Éditeur', lastActive: '2023-10-14', status: 'active' },
  { id: '3', name: 'Viewer User', email: 'viewer@example.com', role: 'Lecteur', lastActive: '2023-10-10', status: 'inactive' },
  { id: '4', name: 'Manager User', email: 'manager@example.com', role: 'Gestionnaire', lastActive: '2023-10-12', status: 'active' },
  { id: '5', name: 'Guest User', email: 'guest@example.com', role: 'Invité', lastActive: '2023-09-30', status: 'inactive' },
];

// Rôles disponibles
const availableRoles = ['Administrateur', 'Éditeur', 'Lecteur', 'Gestionnaire', 'Invité'];

export default function ProfileEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const isNewProfile = id === 'new';

  // État du formulaire
  const [formData, setFormData] = useState<Omit<Profile, 'id' | 'lastActive'> & { id?: string }>({
    name: '',
    email: '',
    role: '',
    status: 'active',
  });

  // États de l'UI
  const [loading, setLoading] = useState(!isNewProfile);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Validation
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    role?: string;
  }>({});

  // Charger les données du profil existant
  useEffect(() => {
    const loadProfileData = async () => {
      if (isNewProfile) return;

      try {
        // Dans une implémentation réelle, ceci serait un appel API
        // const response = await fetch(`/api/profiles/${id}`);
        // const data = await response.json();
        
        // Simuler la récupération des données
        setTimeout(() => {
          const profile = mockProfiles.find(p => p.id === id);
          
          if (profile) {
            setFormData({
              name: profile.name,
              email: profile.email,
              role: profile.role,
              status: profile.status,
            });
          } else {
            setError(`Profil avec l'ID ${id} introuvable.`);
          }
          
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Erreur lors du chargement du profil:", error);
        setError("Erreur lors du chargement des données du profil.");
        setLoading(false);
      }
    };

    loadProfileData();
  }, [id, isNewProfile]);

  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      role?: string;
    } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'L\'email est invalide';
    }
    
    if (!formData.role) {
      newErrors.role = 'Le rôle est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.checked ? 'active' : 'inactive'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valider le formulaire
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Dans une implémentation réelle, ceci serait un appel API
      // const url = isNewProfile ? '/api/profiles' : `/api/profiles/${id}`;
      // const method = isNewProfile ? 'POST' : 'PUT';
      // await fetch(url, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage(isNewProfile 
        ? 'Profil créé avec succès!' 
        : 'Profil mis à jour avec succès!'
      );
      
      // Redirection après quelques secondes
      setTimeout(() => {
        router.push('/admin/profiles');
      }, 1500);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du profil:", error);
      setError("Une erreur s'est produite lors de l'enregistrement du profil.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" separator="›" sx={{ mb: 1 }}>
          <Link
            color="inherit"
            href="/admin/profiles"
            onClick={(e) => {
              e.preventDefault();
              router.push('/admin/profiles');
            }}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <ArrowBackIcon sx={{ mr: 0.5 }} fontSize="small" />
            Liste des profils
          </Link>
          <Typography color="text.primary">
            {isNewProfile ? 'Nouveau profil' : `Éditer le profil: ${formData.name}`}
          </Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          {isNewProfile ? 'Créer un nouveau profil' : 'Modifier le profil'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Card sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Nom"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                  />
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                  />
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth error={!!errors.role}>
                    <InputLabel id="role-label">Rôle</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={formData.role}
                      label="Rôle"
                      onChange={handleInputChange}
                      required
                    >
                      {availableRoles.map(role => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
                  </FormControl>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl sx={{ mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.status === 'active'}
                          onChange={handleStatusChange}
                        />
                      }
                      label="Profil actif"
                    />
                    <FormHelperText>Activez/désactivez l'accès de ce profil</FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={submitting}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={submitting}
                    >
                      {submitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          )}
        </Card>
      </Box>
    </Box>
  );
}