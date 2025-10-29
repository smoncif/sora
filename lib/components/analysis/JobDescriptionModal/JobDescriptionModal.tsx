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
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';

export interface JobDescriptionResponse {
  success: boolean;
  timestamp: string;
  data: {
    profileName: string;
    jobDescription: string;
    metadata: {
      wordCount: number;
      lineCount: number;
      generatedAt: string;
      isWithinLimit: boolean;
      model: string;
    };
  };
}

interface JobDescriptionModalProps {
  open: boolean;
  onClose: () => void;
  response: JobDescriptionResponse | null;
  profileName: string;
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
}: JobDescriptionModalProps) {
  const theme = useTheme();

  const handleDownloadPDF = React.useCallback(async () => {
    if (!response?.data.jobDescription) return;
    await downloadPDF(response.data.jobDescription, profileName);
  }, [response, profileName]);

  const handleDownloadWord = React.useCallback(async () => {
    if (!response?.data.jobDescription) return;
    await downloadWord(response.data.jobDescription, profileName);
  }, [response, profileName]);

  if (!response) return null;

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
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            Fiche de poste - {response.data.profileName}
          </Typography>
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Modèle:</strong> {response.data.metadata.model}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Mots:</strong> {response.data.metadata.wordCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Lignes:</strong> {response.data.metadata.lineCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Généré le:</strong>{' '}
              {new Date(response.data.metadata.generatedAt).toLocaleString('fr-FR')}
            </Typography>
          </Box>
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
            {response.data.jobDescription}
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
          disabled={!response?.data.jobDescription}
        >
          Télécharger Word
        </Button>
        <Button
          onClick={handleDownloadPDF}
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!response?.data.jobDescription}
        >
          Télécharger PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

