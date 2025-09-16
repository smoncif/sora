'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  LinearProgress,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from 'lib/hooks/auth/useAuth';
import { UserRole } from 'lib/types/auth';
import { SimpleRoleLicense, SimpleRoleLicenseWithType } from 'lib/types/roleAnalysis';
import { LicenseTable, LicenseDialog } from 'lib/components/admin/LicenseManagement';

export default function LicensesManagementPage() {
  const theme = useTheme();
  const { userRole, user } = useAuth();
  
  // États
  const [licenses, setLicenses] = useState<SimpleRoleLicenseWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // États pour les dialogues
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingLicense, setEditingLicense] = useState<SimpleRoleLicenseWithType | null>(null);
  
  // États pour le formulaire
  const [formData, setFormData] = useState({
    simpleRole: '',
    licenceType: '',
    licenceOrder: 1,
  });
  
  // États pour l'upload Excel
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // Vérification des permissions admin
  useEffect(() => {
    if (userRole !== UserRole.ADMIN) {
      setError('Accès refusé : droits administrateur requis');
      setLoading(false);
    } else {
      fetchLicenses();
    }
  }, [userRole]);

  // Charger les licences
  const fetchLicenses = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer le token d'authentification
      const { data: { session } } = await (await import('lib/utils/supabase/client')).createClient().auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      const response = await fetch('/api/admin/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement des licences');
      }
      
      const data = await response.json();
      setLicenses(data.licenses || []);
    } catch (error) {
      console.error('Erreur lors du chargement des licences:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  // Ajouter une nouvelle licence
  const handleAddLicense = useCallback(async () => {
    if (!formData.simpleRole || !formData.licenceType) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          simple_role: formData.simpleRole,
          licence_type: formData.licenceType,
          licence_order: formData.licenceOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout de la licence');
      }

      setSuccess('Licence ajoutée avec succès');
      setOpenAddDialog(false);
      setFormData({ simpleRole: '', licenceType: '', licenceOrder: 1 });
      fetchLicenses();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }, [formData, fetchLicenses]);

  // Modifier une licence existante
  const handleEditLicense = useCallback(async () => {
    if (!editingLicense || !formData.simpleRole || !formData.licenceType) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const response = await fetch(`/api/admin/licenses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingLicense.id,
          simple_role: formData.simpleRole,
          licence_type: formData.licenceType,
          licence_order: formData.licenceOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification de la licence');
      }

      setSuccess('Licence modifiée avec succès');
      setOpenEditDialog(false);
      setEditingLicense(null);
      setFormData({ simpleRole: '', licenceType: '', licenceOrder: 1 });
      fetchLicenses();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }, [editingLicense, formData, fetchLicenses]);

  // Supprimer une licence
  const handleDeleteLicense = useCallback(async (license: SimpleRoleLicenseWithType) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la licence pour "${license.simpleRole}" ?`)) {
      return;
    }

    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await (await import('lib/utils/supabase/client')).createClient().auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`/api/admin/licenses`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: license.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la suppression de la licence');
      }

      setSuccess('Licence supprimée avec succès');
      fetchLicenses();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }, [fetchLicenses]);

  // Upload Excel
  const handleExcelUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('DEBUG: Upload Excel démarré avec fichier:', file.name, file.size);

    try {
      setUploadingExcel(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      console.log('DEBUG: FormData créé, appel API en cours...');

      // Récupérer le token d'authentification
      const { data: { session } } = await (await import('lib/utils/supabase/client')).createClient().auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('DEBUG: Réponse API reçue:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('DEBUG: Erreur API:', errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'upload du fichier Excel');
      }

      const result = await response.json();
      console.log('DEBUG: Résultat succès:', result);
      setSuccess(`${result.count} licences importées avec succès`);
      fetchLicenses();
    } catch (error) {
      console.error('Erreur lors de l\'upload Excel:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setUploadingExcel(false);
      // Reset input
      event.target.value = '';
    }
  }, [fetchLicenses]);

  // Ouvrir le dialogue d'édition
  const openEditDialogHandler = useCallback((license: SimpleRoleLicenseWithType) => {
    setEditingLicense(license);
    setFormData({
      simpleRole: license.simpleRole,
      licenceType: license.licenseType.name,
      licenceOrder: license.licenseType.displayOrder,
    });
    setOpenEditDialog(true);
  }, []);

  // Gérer les changements du formulaire
  const handleFormChange = useCallback((field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Fermer les alertes
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  if (userRole !== UserRole.ADMIN) {
    return (
      <Box sx={{ py: 2, px: 3 }}>
        <Alert severity="error">
          Accès refusé : vous devez être administrateur pour accéder à cette page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2, px: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
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
          Gestion des licences
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
          Gérez les associations entre rôles simples et types de licences
        </Typography>
      </Box>

      {/* Messages d'alerte */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearMessages}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={clearMessages}>
          {success}
        </Alert>
      )}

      {/* Actions */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
              sx={{ flexShrink: 0 }}
            >
              Ajouter une licence
            </Button>
            
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            
            <Button
              variant="outlined"
              component="label"
              startIcon={uploadingExcel ? <LinearProgress size={20} /> : <UploadIcon />}
              disabled={uploadingExcel}
              sx={{ flexShrink: 0 }}
            >
              {uploadingExcel ? 'Import en cours...' : 'Importer Excel'}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
              />
            </Button>
            
          </Stack>
        </CardContent>
      </Card>

      {/* Tableau des licences */}
      <Card sx={{ borderRadius: 3 }}>
        {loading && <LinearProgress />}
        <LicenseTable
          licenses={licenses}
          loading={loading}
          onEdit={openEditDialogHandler}
          onDelete={handleDeleteLicense}
        />
      </Card>

      {/* Dialogues */}
      <LicenseDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onSave={handleAddLicense}
        title="Ajouter une nouvelle licence"
        formData={formData}
        onFormChange={handleFormChange}
      />
      
      <LicenseDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onSave={handleEditLicense}
        title="Modifier la licence"
        formData={formData}
        onFormChange={handleFormChange}
      />
    </Box>
  );
}
