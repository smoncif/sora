'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Typography, Alert, AlertTitle, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ProfileForm } from 'lib/components/features/admin';
import { ProfileType } from 'lib/types/auth';

export default function CreateProfilePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: Omit<ProfileType, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Simuler un appel API avec un délai
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ici, nous simulons le succès, mais dans une vraie application,
      // vous feriez un appel API pour créer le profil

      setSuccess(true);
      
      // Redirection après un court délai
      setTimeout(() => {
        router.push('/admin/profiles');
      }, 1500);
    } catch (err) {
      setError('Une erreur s\'est produite lors de la création du profil.');

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/profiles');
  };

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
        <Typography variant="h6">Créer un nouveau profil</Typography>
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
          Le profil a été créé avec succès. Redirection en cours...
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <ProfileForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Paper>
    </>
  );
} 



