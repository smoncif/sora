'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper, Container, Snackbar, Alert } from '@mui/material';
import FileUpload from '@/components/common/FileUpload';
import ProgressIndicator, { ImportStep } from '@/components/common/ProgressIndicator';
import ValidationResults from '@/components/features/fileUpload/ValidationResults';
import { uploadFile } from '@/services/excel/uploadService';
import type { UploadResult } from '@/services/excel/uploadService';
import { parseExcelFile } from '@/services/excel/excelService';
import type { ExcelParseResult } from '@/services/excel/excelService';
import { validateExcelFile, ValidationRules } from '@/services/excel/validationService';
import type { ValidationResult, ValidationOptions } from '@/types/validation';

// Ancien format de ValidationResult attendu par le composant ValidationResults
interface LegacyValidationResult {
  isValid: boolean;
  structureValid: boolean;
  dataValid: boolean;
  structureErrors: string[];
  dataErrors: { sheetName: string; row: number; column: string; message: string }[];
  isProcessing?: boolean;
}

// Configuration personnalisée pour la validation
interface CustomSheetValidation {
  sheetName: string;
  requiredColumns: string[];
  columnValidations: Array<{
    column: string;
    rules: Array<any>;
  }>;
}

// Configuration de validation pour les fichiers Excel
const excelValidationSchema: CustomSheetValidation[] = [
  {
    sheetName: 'Transactions',
    requiredColumns: ['ID', 'Date', 'Montant', 'Description', 'Catégorie'],
    columnValidations: [
      {
        column: 'ID',
        rules: [ValidationRules.required('L\'ID de transaction est requis')]
      },
      {
        column: 'Montant',
        rules: [
          ValidationRules.required('Le montant est requis'),
          ValidationRules.numericFormat('Le montant doit être un nombre valide')
        ]
      },
      {
        column: 'Date',
        rules: [
          ValidationRules.required('La date est requise'),
          ValidationRules.dateFormat('Format de date invalide')
        ]
      }
    ]
  },
  {
    sheetName: 'Roles',
    requiredColumns: ['RoleID', 'RoleName', 'Description', 'Permissions'],
    columnValidations: [
      {
        column: 'RoleID',
        rules: [ValidationRules.required('L\'ID de rôle est requis')]
      },
      {
        column: 'RoleName',
        rules: [ValidationRules.required('Le nom du rôle est requis')]
      }
    ]
  }
];

/**
 * Convertit le nouveau format ValidationResult en format legacy
 */
function adaptValidationResult(result: ValidationResult): LegacyValidationResult {
  const structureErrors = result.errors
    .filter(error => error.column === undefined)
    .map(error => error.message);
  
  const dataErrors = result.errors
    .filter(error => error.column !== undefined)
    .map(error => ({
      sheetName: error.sheet || 'Unknown',
      row: error.row !== undefined ? error.row : 0,
      column: error.column || 'Unknown',
      message: error.message
    }));
  
  return {
    isValid: result.valid,
    structureValid: structureErrors.length === 0,
    dataValid: dataErrors.length === 0,
    structureErrors,
    dataErrors,
    isProcessing: false
  };
}

export default function FilesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>(ImportStep.UPLOAD);
  const [progress, setProgress] = useState(0);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [validationResult, setValidationResult] = useState<LegacyValidationResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const resetState = () => {
    setIsLoading(false);
    setError(null);
    setSuccess(null);
    setUploadResult(null);
    setCurrentStep(ImportStep.UPLOAD);
    setProgress(0);
    setParseResult(null);
    setValidationResult(null);
    setFileName('');
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Réinitialiser l'état pour un nouveau fichier
    resetState();
    setIsLoading(true);
    setFileName(files[0].name);
    
    try {
      // Étape 1: Téléchargement du fichier
      setCurrentStep(ImportStep.UPLOAD);
      
      const result = await uploadFile(files[0], {
        bucketName: 'excel-files',
        folderPath: 'uploads'
      });
      
      setUploadResult(result);
      setProgress(33);
      
      // Étape 2: Analyse du fichier Excel
      setCurrentStep(ImportStep.PARSE);
      
      const parsedData = await parseExcelFile(files[0], {
        onProgress: (parseProgress) => {
          // Mapper la progression du parsing (0-100) à la plage 33-66
          setProgress(33 + (parseProgress * 0.33));
        }
      });
      
      setParseResult(parsedData);
      setProgress(66);
      
      // Étape 3: Validation du fichier
      setCurrentStep(ImportStep.VALIDATE);
      
      // Simuler un temps de traitement pour la validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const validationOptions: ValidationOptions = {
        strictMode: true,
        validateReferentialIntegrity: true,
        // Adapter notre schéma personnalisé au format attendu
        // Note: Ceci est simplifié, l'implémentation réelle nécessiterait plus d'adaptation
      };
      
      const validationResult = await validateExcelFile(parsedData, validationOptions);
      // Adapter le résultat pour le composant ValidationResults
      const adaptedResult = adaptValidationResult(validationResult);
      setValidationResult(adaptedResult);
      setProgress(100);
      
      // Étape 4: Terminer le processus
      setCurrentStep(adaptedResult.isValid ? ImportStep.COMPLETE : ImportStep.STORE);
      
      if (!adaptedResult.isValid) {
        setError('Le fichier contient des erreurs. Veuillez consulter le rapport de validation.');
      } else {
        setSuccess(`Fichier "${files[0].name}" validé avec succès!`);
      }
      
    } catch (err) {

      setCurrentStep(ImportStep.STORE);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du traitement du fichier. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!validationResult) return;
    
    // Génération du rapport HTML et création du blob
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport de validation - ${fileName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1 { color: #333; }
          .summary { margin-bottom: 20px; }
          .error { color: red; }
          .success { color: green; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Rapport de validation - ${fileName}</h1>
        <div class="summary">
          <p class="${validationResult.isValid ? 'success' : 'error'}">
            ${validationResult.isValid ? 'Le fichier est valide' : 'Le fichier contient des erreurs'}
          </p>
          <p>Structure: ${validationResult.structureValid ? 'Valide' : 'Invalide'}</p>
          <p>Données: ${validationResult.dataValid ? 'Valides' : 'Invalides'}</p>
        </div>
        
        ${validationResult.structureErrors.length > 0 ? `
          <h2>Erreurs de structure</h2>
          <ul class="error">
            ${validationResult.structureErrors.map(err => `<li>${err}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${validationResult.dataErrors.length > 0 ? `
          <h2>Erreurs de données</h2>
          <table>
            <thead>
              <tr>
                <th>Feuille</th>
                <th>Ligne</th>
                <th>Colonne</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              ${validationResult.dataErrors.map(err => `
                <tr>
                  <td>${err.sheetName}</td>
                  <td>${err.row + 1}</td>
                  <td>${err.column}</td>
                  <td>${err.message}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `validation-${fileName.replace(/\.[^/.]+$/, '')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Import de fichiers Excel
        </Typography>

        {/* Zone de dépôt de fichiers */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            supportedFormats=".xlsx, .xls"
            maxFiles={1}
            maxFileSize={10 * 1024 * 1024} // 10MB
            acceptedFileTypes={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls']
            }}
            uploading={isLoading}
          />
        </Paper>

        {/* Affichage de la progression */}
        {(isLoading || currentStep !== ImportStep.UPLOAD) && (
          <ProgressIndicator 
            activeStep={currentStep}
            progress={progress}
            error={error || undefined}
          />
        )}

        {/* Résultats de la validation */}
        {validationResult && (
          <ValidationResults 
            validationResult={validationResult as any}
            fileName={fileName}
            onDownloadReport={handleDownloadReport}
          />
        )}

        {/* Messages de succès/erreur */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess(null)}
        >
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
} 
