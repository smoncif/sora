'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  alpha,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import type { JobDescriptionWebhookResponse } from 'lib/services/analysis/generateJobDescriptionService';
import { Chip } from '@mui/material';

interface JobDescriptionModalProps {
  open: boolean;
  onClose: () => void;
  response: JobDescriptionWebhookResponse | null;
  profileName: string;
  fromCache?: boolean;
  cachedAt?: number | null;
  onRegenerate?: () => void;
}

/**
 * Fonction pour télécharger en PDF
 */
async function downloadPDF(jobDescription: string, profileName: string): Promise<void> {
  // Créer un document HTML pour convertir en PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Fiche de poste - ${profileName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #1976d2;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
          }
          h2 {
            color: #333;
            margin-top: 30px;
          }
          strong {
            color: #555;
          }
          ul {
            margin-left: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <pre>${jobDescription.replace(/\*\*/g, '').replace(/\n/g, '<br>')}</pre>
      </body>
    </html>
  `;

  // Utiliser window.print() pour permettre l'impression en PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      // Optionnel : fermer la fenêtre après l'impression
      // printWindow.close();
    }, 250);
  }
}

/**
 * Fonction pour télécharger en Word (format simple .docx via HTML)
 */
async function downloadWord(jobDescription: string, profileName: string): Promise<void> {
  // Convertir le markdown en HTML pour Word
  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
          </w:WordDocument>
        </xml>
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          ${jobDescription
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*/g, '')}
        </div>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Fiche_de_poste_${profileName.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function JobDescriptionModal({
  open,
  onClose,
  response,
  profileName,
  fromCache = false,
  cachedAt = null,
  onRegenerate,
}: JobDescriptionModalProps) {
  const theme = useTheme();

  console.log('✅ JobDescriptionModal - Props:', { open, response, profileName, fromCache, cachedAt });

  const handleDownloadPDF = React.useCallback(async () => {
    if (!response?.jobDescription) return;
    await downloadPDF(response.jobDescription, profileName);
  }, [response, profileName]);

  const handleDownloadWord = React.useCallback(async () => {
    if (!response?.jobDescription) return;
    await downloadWord(response.jobDescription, profileName);
  }, [response, profileName]);

  if (!response) {
    console.log('⚠️ JobDescriptionModal - Pas de réponse');
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Fiche de poste - {profileName}
            </Typography>
            {fromCache && (
              <Chip
                label="📋 Cache"
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Métadonnées */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Informations de génération
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: fromCache ? 2 : 0 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Modèle:</strong> {response.sourceModel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Fournisseur:</strong> {response.provider}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Mots:</strong> {response.wordCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Généré le:</strong>{' '}
              {new Date(response.createdAt * 1000).toLocaleString('fr-FR')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Statut:</strong> {response.success ? '✅ Succès' : '❌ Échec'}
            </Typography>
          </Box>
          
          {fromCache && cachedAt && (
            <Box sx={{ 
              mt: 2, 
              pt: 2, 
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                📋 Chargée depuis le cache le {new Date(cachedAt).toLocaleString('fr-FR')}
              </Typography>
              {onRegenerate && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={onRegenerate}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Régénérer
                </Button>
              )}
            </Box>
          )}
        </Paper>

        {/* Description du poste */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: 2,
            maxHeight: '50vh',
            overflowY: 'auto',
            '& pre': {
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              lineHeight: 1.8,
              margin: 0,
            },
          }}
        >
          <Typography
            component="pre"
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: theme.typography.fontFamily,
            }}
          >
            {response.jobDescription}
          </Typography>
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
        <Button
          onClick={handleDownloadWord}
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          disabled={!response?.jobDescription}
        >
          Télécharger Word
        </Button>
        <Button
          onClick={handleDownloadPDF}
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!response?.jobDescription}
        >
          Télécharger PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

