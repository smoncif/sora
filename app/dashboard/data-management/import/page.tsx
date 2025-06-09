'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Card,
  CardContent,
  Alert,
  Grid,
  Tab,
  Tabs,
  Link
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Description as TemplateIcon,
  History as HistoryIcon,
  Check as CheckIcon
} from '@mui/icons-material';

import FileUpload from '@/components/common/FileUpload';
import ValidationResults from '@/components/features/fileUpload/ValidationResults';
import ProgressIndicator, { ImportStep } from '@/components/common/ProgressIndicator';
import { parseExcelFile } from '@/services/excel/excelService';
import { validateExcelFile } from '@/services/excel/validationService';
import { ValidationResult, ValidationError } from 'lib/types/validation';

export default function ImportPage() {
  // États pour la gestion des fichiers
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [activeStep, setActiveStep] = useState<ImportStep>(ImportStep.UPLOAD);
  const [activeTab, setActiveTab] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Gérer la sélection de fichiers
  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setValidationResult(null);
    setIsComplete(false);
    setActiveStep(ImportStep.UPLOAD);
    setUploadError(undefined);
    setUploadProgress(0);
  };

  // Gérer la suppression d'un fichier
  const handleFileRemoved = (file: File) => {
    setSelectedFiles([]);
    setValidationResult(null);
    setIsComplete(false);
    setUploadError(undefined);
  };

  // Valider le fichier Excel
  const validateFile = async () => {
    if (selectedFiles.length === 0) return;

    setIsValidating(true);
    setActiveStep(ImportStep.VALIDATE);
    
    try {
      // Simuler un délai pour montrer l'indicateur de progression
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Analyser puis valider le fichier Excel
      const parsedData = await parseExcelFile(selectedFiles[0]);
      const result = await validateExcelFile(parsedData, {
        validateReferentialIntegrity: true
      });
      
      setValidationResult(result);
      
      if (result.valid) {
        setActiveStep(ImportStep.TRANSFORM);
      }
    } catch (error) {

      setUploadError(`Erreur lors de la validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Simuler l'importation complète
  const simulateImport = async () => {
    if (!validationResult || !validationResult.valid || selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setActiveStep(ImportStep.TRANSFORM);
    
    try {
      // Simuler la transformation des données
      for (let i = 0; i <= 100; i += 5) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Passer à l'étape du stockage
      setActiveStep(ImportStep.STORE);
      setUploadProgress(0);
      
      // Simuler le stockage
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Terminer l'importation
      setActiveStep(ImportStep.COMPLETE);
      setIsComplete(true);
      
    } catch (error) {

      setUploadError(`Erreur lors de l'importation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Gérer les corrections automatiques des erreurs
  const handleFixError = (error: ValidationError) => {

    // Dans un cas réel, vous implémenteriez la logique de correction ici
    alert(`Correction automatique pour: ${error.message}`);
  };

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Afficher un modèle Excel
  const downloadTemplate = () => {
    // Dans un cas réel, vous téléchargeriez un fichier de modèle
    alert('Téléchargement du modèle (à implémenter)');
  };

  // Effets pour la validation automatique lors du changement de fichier
  useEffect(() => {
    if (selectedFiles.length > 0) {
      validateFile();
    }
  }, [selectedFiles]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Importation de données
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Importez vos fichiers Excel contenant les données d'analyse de rôles
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab label="Importer des données" />
          <Tab label="Historique des importations" />
          <Tab label="Documentation" />
        </Tabs>
      </Box>
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              md: 7
            }}>
            <Box mb={3}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  1. Sélectionner le fichier Excel
                </Typography>
                
                <Typography variant="body2" paragraph>
                  Choisissez un fichier Excel contenant vos données d'analyse de rôles. Le fichier doit respecter la structure attendue.
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <FileUpload 
                    onFilesSelected={handleFilesSelected}
                    onFileRemoved={handleFileRemoved}
                    maxFiles={1}
                    uploading={isUploading}
                    uploadProgress={uploadProgress}
                    uploadError={uploadError}
                    selectedFiles={selectedFiles}
                  />
                </Box>
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<DownloadIcon />}
                    onClick={downloadTemplate}
                  >
                    Télécharger le modèle
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    startIcon={<HistoryIcon />}
                    onClick={() => setActiveTab(1)}
                  >
                    Importations précédentes
                  </Button>
                </Box>
              </Paper>
              
              {/* Résultats de validation */}
              {validationResult && (
                <ValidationResults 
                  validationResult={validationResult}
                  onFix={handleFixError}
                  isProcessing={isValidating}
                />
              )}
              
              {/* Actions d'importation */}
              {validationResult && validationResult.valid && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    3. Importer les données
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    Le fichier a été validé avec succès. Vous pouvez maintenant importer les données.
                  </Typography>
                  
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<CloudUploadIcon />}
                    onClick={simulateImport}
                    disabled={isUploading || isComplete}
                    fullWidth
                    size="large"
                    sx={{ mt: 2 }}
                  >
                    {isComplete ? 'Importation terminée' : 'Importer les données'}
                  </Button>
                  
                  {isComplete && (
                    <Alert 
                      icon={<CheckIcon fontSize="inherit" />} 
                      severity="success"
                      sx={{ mt: 2 }}
                    >
                      L'importation a été effectuée avec succès.{' '}
                      <Link href="/dashboard/analysis/roles/analysis" underline="always">
                        Voir les résultats
                      </Link>
                    </Alert>
                  )}
                </Paper>
              )}
            </Box>
          </Grid>
          
          <Grid
            size={{
              xs: 12,
              md: 5
            }}>
            {/* Informations et indicateur de progression */}
            <ProgressIndicator 
              activeStep={activeStep}
              progress={uploadProgress}
              error={uploadError}
              isComplete={isComplete}
            />
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Informations
              </Typography>
              
              <Typography variant="body2" paragraph>
                L'importation de données vous permet d'analyser vos rôles métier à partir de fichiers Excel structurés.
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Structure du fichier
              </Typography>
              
              <Typography variant="body2" component="div">
                Le fichier Excel doit contenir les feuilles suivantes:
                <ul>
                  <li><strong>Transactions</strong> - Liste des transactions ou permissions</li>
                  <li><strong>Roles</strong> - Liste des rôles métier</li>
                  <li><strong>RoleMapping</strong> - Associations entre rôles et transactions</li>
                  <li><strong>Users</strong> (optionnel) - Assignations des utilisateurs</li>
                </ul>
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="text" 
                  onClick={() => setActiveTab(2)}
                >
                  Voir la documentation complète
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Historique des importations
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Vous n'avez pas encore effectué d'importation.
          </Typography>
          
          {/* Ici, vous afficheriez la liste des importations précédentes */}
        </Paper>
      )}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentation
          </Typography>
          
          <Typography variant="body2" paragraph>
            Guide détaillé pour l'importation et l'analyse de données.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Structure du fichier Excel
          </Typography>
          
          <Typography variant="body2" component="div">
            <ul>
              <li>
                <strong>Feuille Transactions</strong>
                <ul>
                  <li>TransactionID (obligatoire) - Identifiant unique de la transaction</li>
                  <li>Code (obligatoire) - Code court de la transaction</li>
                  <li>Description (obligatoire) - Description détaillée</li>
                  <li>Category (obligatoire) - Catégorie de la transaction</li>
                  <li>Criticality (obligatoire) - Niveau de criticité (low, medium, high)</li>
                  <li>IsCore (optionnel) - Indique si la transaction est critique</li>
                  <li>Tags (optionnel) - Tags séparés par des virgules</li>
                </ul>
              </li>
              <li>
                <strong>Feuille Roles</strong>
                <ul>
                  <li>RoleID (obligatoire) - Identifiant unique du rôle</li>
                  <li>RoleName (obligatoire) - Nom du rôle</li>
                  <li>Description (obligatoire) - Description détaillée</li>
                  <li>UserCount (optionnel) - Nombre d'utilisateurs</li>
                  <li>IsCustom (optionnel) - Indique si le rôle est personnalisé</li>
                  <li>CreatedAt (optionnel) - Date de création</li>
                  <li>CreatedBy (optionnel) - Créateur du rôle</li>
                </ul>
              </li>
              <li>
                <strong>Feuille RoleMapping</strong>
                <ul>
                  <li>RoleID (obligatoire) - Référence à un RoleID dans la feuille Roles</li>
                  <li>TransactionID (obligatoire) - Référence à un TransactionID dans la feuille Transactions</li>
                </ul>
              </li>
              <li>
                <strong>Feuille Users (optionnelle)</strong>
                <ul>
                  <li>UserID (obligatoire) - Identifiant unique de l'utilisateur</li>
                  <li>Username (optionnel) - Nom d'utilisateur</li>
                  <li>RoleIDs (obligatoire) - Liste d'IDs de rôles séparés par des virgules</li>
                </ul>
              </li>
            </ul>
          </Typography>
        </Paper>
      )}
    </Container>
  );
} 

