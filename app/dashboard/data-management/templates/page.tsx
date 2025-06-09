'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Chip, 
  Alert, 
  CircularProgress, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Snackbar
} from '@mui/material';
import { 
  CloudDownload as DownloadIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/auth/useAuth';
import { ProfileType, UserRole } from 'lib/types/auth';

interface Template {
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export default function TemplatesPage() {
  const { user, userRole } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [templateType, setTemplateType] = useState('full');
  const [customFilename, setCustomFilename] = useState('');
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });

  // Fonction pour formater la taille de fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Fonction pour charger les modèles
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/templates');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError('Erreur lors du chargement des modèles. Veuillez réessayer.');

    } finally {
      setLoading(false);
    }
  };

  // Charger les modèles au chargement de la page
  useEffect(() => {
    loadTemplates();
  }, []);

  // Fonction pour générer un nouveau modèle
  const generateTemplate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: templateType,
          filename: customFilename || undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du modèle');
      }
      
      setNotification({
        open: true,
        message: 'Modèle généré avec succès',
        type: 'success'
      });
      
      // Recharger la liste des modèles
      loadTemplates();
      
      // Fermer le dialog
      setOpenDialog(false);
    } catch (err) {

      setNotification({
        open: true,
        message: err instanceof Error ? err.message : 'Erreur lors de la génération du modèle',
        type: 'error'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Fonction pour obtenir une couleur pour le type de modèle
  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'primary';
      case 'role': return 'success';
      case 'transaction': return 'info';
      case 'user': return 'warning';
      default: return 'default';
    }
  };

  // Fonction pour obtenir le libellé du type de modèle
  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'full': return 'Complet';
      case 'role': return 'Rôles';
      case 'transaction': return 'Transactions';
      case 'user': return 'Utilisateurs';
      default: return 'Inconnu';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component="h1" gutterBottom>
          Modèles d'importation Excel
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={loadTemplates} 
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Actualiser
          </Button>
          
          {userRole === UserRole.ADMIN && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />} 
              onClick={() => setOpenDialog(true)}
              disabled={loading}
            >
              Nouveau modèle
            </Button>
          )}
        </Box>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            Aucun modèle disponible. {userRole === UserRole.ADMIN ? 'Cliquez sur "Nouveau modèle" pour en générer un.' : ''}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid
              key={template.name}
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Card variant="outlined">
                <CardContent>
                  <Box mb={1} display="flex" justifyContent="space-between" alignItems="center">
                    <FileIcon fontSize="large" color="action" />
                    <Chip 
                      label={getTemplateTypeLabel(template.type)} 
                      color={getTemplateTypeColor(template.type) as any}
                      size="small" 
                    />
                  </Box>
                  <Typography variant="h6" component="h3" noWrap title={template.name}>
                    {template.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Taille: {formatFileSize(template.size)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Créé le: {new Date(template.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    fullWidth
                    variant="contained" 
                    color="primary" 
                    startIcon={<DownloadIcon />}
                    href={template.url}
                    download
                  >
                    Télécharger
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {/* Dialog pour générer un nouveau modèle */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Générer un nouveau modèle</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="template-type-label">Type de modèle</InputLabel>
            <Select
              labelId="template-type-label"
              value={templateType}
              label="Type de modèle"
              onChange={(e) => setTemplateType(e.target.value)}
              disabled={generating}
            >
              <MenuItem value="full">Modèle complet</MenuItem>
              <MenuItem value="role">Modèle de rôles</MenuItem>
              <MenuItem value="transaction">Modèle de transactions</MenuItem>
              <MenuItem value="user">Modèle d'utilisateurs</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Nom du fichier (optionnel)"
            variant="outlined"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="Laissez vide pour un nom automatique"
            disabled={generating}
            helperText="Extension .xlsx automatiquement ajoutée si nécessaire"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={generating}>
            Annuler
          </Button>
          <Button 
            onClick={generateTemplate} 
            color="primary" 
            variant="contained"
            disabled={generating}
            startIcon={generating ? <CircularProgress size={20} /> : null}
          >
            {generating ? 'Génération...' : 'Générer'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.type}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 


