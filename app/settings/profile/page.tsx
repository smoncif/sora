'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  useTheme,
  alpha,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAuth } from 'lib/hooks/auth/useAuth';

export default function ProfilePage() {
  const theme = useTheme();
  const { user, userMetadata, changePassword } = useAuth();

  // États pour l'édition du profil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: userMetadata?.first_name || '',
    lastName: userMetadata?.last_name || '',
    email: user?.email || '',
    fullName: userMetadata?.full_name || '',
  });

  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // États de chargement et messages
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleProfileInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Ici on appellerait l'API pour sauvegarder le profil
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
      setIsEditingProfile(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde du profil' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    // Validation : vérifier que le mot de passe actuel est renseigné
    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: 'Veuillez saisir votre mot de passe actuel' });
      return;
    }

    // Validation : vérifier que les mots de passe correspondent
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    // Validation : longueur minimale
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' });
      return;
    }

    // Validation : complexité du mot de passe
    if (!/[A-Z]/.test(passwordData.newPassword) || !/[0-9]/.test(passwordData.newPassword)) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins une majuscule et un chiffre' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Erreur lors du changement de mot de passe' });
        return;
      }
      
      setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès !' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileData({
      firstName: userMetadata?.first_name || '',
      lastName: userMetadata?.last_name || '',
      email: user?.email || '',
      fullName: userMetadata?.full_name || '',
    });
    setMessage(null);
  };

  const handleCancelPassword = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setMessage(null);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: 'default' };
    if (password.length < 6) return { strength: 1, label: 'Faible', color: 'error' };
    if (password.length < 8) return { strength: 2, label: 'Moyen', color: 'warning' };
    
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 3, label: 'Fort', color: 'success' };
    }
    return { strength: 2, label: 'Moyen', color: 'warning' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <Box>
      {/* En-tête moderne */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Profil et sécurité
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700 }}>
          Modifiez vos informations personnelles et gérez la sécurité de votre compte
        </Typography>
      </Box>

      {/* Messages */}
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 4 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informations du profil */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: 'none', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Informations personnelles
                </Typography>
                
                {!isEditingProfile && (
                  <IconButton
                    onClick={() => setIsEditingProfile(true)}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Prénom"
                    value={profileData.firstName}
                    onChange={(e) => handleProfileInputChange('firstName', e.target.value)}
                    disabled={!isEditingProfile}
                    variant={isEditingProfile ? 'outlined' : 'filled'}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Nom"
                    value={profileData.lastName}
                    onChange={(e) => handleProfileInputChange('lastName', e.target.value)}
                    disabled={!isEditingProfile}
                    variant={isEditingProfile ? 'outlined' : 'filled'}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={profileData.email}
                    disabled={true} // L'email ne peut pas être modifié
                    variant="filled"
                    helperText="L'adresse email ne peut pas être modifiée"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Nom complet"
                    value={profileData.fullName}
                    onChange={(e) => handleProfileInputChange('fullName', e.target.value)}
                    disabled={!isEditingProfile}
                    variant={isEditingProfile ? 'outlined' : 'filled'}
                  />
                </Grid>
              </Grid>

              {isEditingProfile && (
                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon fontSize="small" />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                  >
                    Sauvegarder
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CancelIcon fontSize="small" />}
                    onClick={handleCancelEdit}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                  >
                    Annuler
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Changement de mot de passe */}
          <Card elevation={0} sx={{ borderRadius: 3, border: 'none' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Changer le mot de passe
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Mot de passe actuel"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('current')}
                            edge="end"
                          >
                            {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Nouveau mot de passe"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                    helperText="Au moins 8 caractères, avec majuscules et chiffres"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('new')}
                            edge="end"
                          >
                            {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {passwordData.newPassword && (
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={`Force du mot de passe: ${passwordStrength.label}`}
                        color={passwordStrength.color as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Confirmer le nouveau mot de passe"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                    error={passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword}
                    helperText={passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword ? 'Les mots de passe ne correspondent pas' : ''}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('confirm')}
                            edge="end"
                          >
                            {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon fontSize="small" />}
                  onClick={handleSavePassword}
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                  sx={{ textTransform: 'none' }}
                >
                  Changer le mot de passe
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CancelIcon fontSize="small" />}
                  onClick={handleCancelPassword}
                  disabled={loading}
                  sx={{ textTransform: 'none' }}
                >
                  Annuler
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Avatar et informations du compte */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: 'none' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  margin: '0 auto',
                  mb: 2,
                  bgcolor: theme.palette.primary.main,
                  fontSize: '1.75rem',
                  fontWeight: 600,
                }}
              >
                {userMetadata?.first_name?.[0] || user?.email?.[0] || 'U'}
              </Avatar>
              
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {userMetadata?.full_name || 'Utilisateur'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                {user?.email}
              </Typography>

              <Chip
                label="COMPTE ACTIF"
                color="success"
                size="small"
                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}