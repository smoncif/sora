'use client';

/**
 * Modal de partage de lien de validation pour multi-rôles métier
 * Version 1.1 - Support multi-rôles métier
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { addWeeks } from 'date-fns';
import {
  generateDefaultEmailTemplate,
  formatExpirationDate,
  formatBusinessRolesList,
} from 'lib/services/email/emailValidationService';
import { getTransactionModules } from 'lib/services/sap/moduleService';

export interface RoleValidationShareModalProps {
  open: boolean;
  onClose: () => void;
  businessRoles: string[];                          // Multi-rôles métier
  selectedRolesPerBusinessRole: Map<string, Set<string>>;  // Rôles simples par rôle métier
  analysisResult: any;                              // 🆕 Résultat complet de l'analyse (avec descriptions, transactions, etc.)
  currentUserName?: string;
}

export function RoleValidationShareModal({
  open,
  onClose,
  businessRoles,
  selectedRolesPerBusinessRole,
  analysisResult,
  currentUserName = 'Utilisateur',
}: RoleValidationShareModalProps) {
  const theme = useTheme();

  // États locaux
  const [expirationDate, setExpirationDate] = useState<Date>(addWeeks(new Date(), 2)); // Par défaut: +2 semaines
  const [enableTechnicalView, setEnableTechnicalView] = useState(false);
  const [recipients, setRecipients] = useState<string>('');  // Emails séparés par virgule ou ligne
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Calculer le nombre total de rôles simples
  const totalRoleCount = useMemo(() => {
    let count = 0;
    selectedRolesPerBusinessRole.forEach((roles) => {
      count += roles.size;
    });
    return count;
  }, [selectedRolesPerBusinessRole]);

  // Générer le template email par défaut
  const defaultTemplate = useMemo(() => {
    const variables = {
      link: '{LINK}',
      businessRoleCount: businessRoles.length,
      businessRolesList: formatBusinessRolesList(businessRoles),
      roleCount: totalRoleCount,
      expiration: '{EXPIRATION}',
      requester: currentUserName,
    };
    return generateDefaultEmailTemplate(variables);
  }, [businessRoles, totalRoleCount, currentUserName]);

  // Initialiser le template au montage
  React.useEffect(() => {
    if (open && !emailSubject) {
      setEmailSubject(defaultTemplate.subject);
      setEmailBody(defaultTemplate.body);
    }
  }, [open, defaultTemplate, emailSubject]);

  // Handler pour générer le lien
  const handleGenerateLink = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 🆕 Récupérer tous les codes de transactions pour la requête Supabase
      const allTransactionCodes = new Set<string>();
      selectedRolesPerBusinessRole.forEach((selectedRoles, businessRole) => {
        selectedRoles.forEach((roleName) => {
          const roleTransactions = analysisResult.simpleRoleTransactions?.filter(
            (srt: any) => srt.simpleRole === roleName
          ) || [];
          roleTransactions.forEach((srt: any) => {
            allTransactionCodes.add(srt.transaction);
          });
        });
      });

      // 🆕 Récupérer les modules depuis Supabase
      const transactionModulesMap = await getTransactionModules(Array.from(allTransactionCodes));

      // 🆕 Construire un payload enrichi avec les données complètes
      const enrichedSelectedRolesData: Record<string, any[]> = {};
      
      selectedRolesPerBusinessRole.forEach((selectedRoles, businessRole) => {
        // Trouver l'analyse de couverture pour ce rôle métier
        const coverageAnalysis = analysisResult?.coverageAnalyses?.find(
          (analysis: any) => analysis.businessRole === businessRole
        );
        
        if (!coverageAnalysis) {
          return;
        }
        
        // Pour chaque rôle simple sélectionné, récupérer ses données complètes
        const enrichedRoles: any[] = [];
        
        selectedRoles.forEach((roleName) => {
          // Trouver le rôle simple dans l'analyse
          const simpleRoleCoverage = coverageAnalysis.simpleRoles?.find(
            (sr: any) => sr.roleName === roleName
          );
          
          if (!simpleRoleCoverage) {
            return;
          }
          
          // Récupérer la description depuis simpleRoleTransactions
          const roleDescription = analysisResult.simpleRoleTransactions?.find(
            (srt: any) => srt.simpleRole === roleName
          )?.roleDescription;
          
          // 🆕 Récupérer le processus de ce rôle métier
          const roleProcess = analysisResult.businessRoleTransactions?.find(
            (brt: any) => brt.businessRole === businessRole
          )?.process;
          
          // 🆕 Récupérer TOUTES les transactions du rôle simple (pas seulement celles couvertes)
          const allRoleTransactions = analysisResult.simpleRoleTransactions?.filter(
            (srt: any) => srt.simpleRole === roleName
          ) || [];
          
          const transactions = allRoleTransactions.map((srt: any) => {
            // Trouver l'usage dans businessRoleTransactions
            const usage = analysisResult.businessRoleTransactions?.find(
              (brt: any) => brt.businessRole === businessRole && brt.transaction === srt.transaction
            )?.executionCount || 0;
            
            // 🆕 Récupérer le module depuis Supabase avec hiérarchie complète
            const moduleData = transactionModulesMap.get(srt.transaction);
            
            return {
              code: srt.transaction,
              description: srt.transactionDescription || srt.transaction,
              module: moduleData?.module,
              moduleDescription: moduleData?.moduleDescription,
              // 🆕 Hiérarchie complète avec descriptions
              level1Module: moduleData?.level1Module,
              level1Description: moduleData?.level1Description,
              level2Module: moduleData?.level2Module,
              level2Description: moduleData?.level2Description,
              level3Module: moduleData?.level3Module,
              level3Description: moduleData?.level3Description,
              usage,
            };
          });
          
          const previewTransactions = transactions.slice(0, 5);
          const remainingTransactions = transactions.slice(5);
          
          enrichedRoles.push({
            roleId: roleName,
            roleName: roleName,
            description: roleDescription || '',
            process: roleProcess, // 🆕 Ajouter le processus
            totalTransactions: transactions.length,
            previewTransactions,
            remainingTransactions,
            remainingTransactionCount: remainingTransactions.length,
          });
        });
        
        enrichedSelectedRolesData[businessRole] = enrichedRoles;
      });

      // Convertir aussi en format simple pour l'API
      const selectedRolesObject: Record<string, string[]> = {};
      selectedRolesPerBusinessRole.forEach((roles, businessRole) => {
        selectedRolesObject[businessRole] = Array.from(roles);
      });

      // Préparer le payload complet
      const payload = {
        businessRoles,
        selectedRolesData: enrichedSelectedRolesData, // 🆕 Données enrichies
        totalRoleCount,
        createdBy: {
          name: currentUserName,
        },
      };

      const response = await fetch('/api/validation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRoles,
          selectedRoles: selectedRolesObject,
          expirationDate: expirationDate.toISOString(),
          enableTechnicalView,
          payload,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la génération du lien');
      }

      setGeneratedLink(result.data.link);

      // Mettre à jour le template email avec le vrai lien et la date
      const formattedExpiration = formatExpirationDate(expirationDate);
      const updatedBody = emailBody
        .replace(/{LINK}/g, result.data.link)
        .replace(/{EXPIRATION}/g, formattedExpiration);
      setEmailBody(updatedBody);
    } catch (err) {
      console.error('Erreur génération lien:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsGenerating(false);
    }
  }, [
    businessRoles,
    selectedRolesPerBusinessRole,
    analysisResult,
    expirationDate,
    enableTechnicalView,
    totalRoleCount,
    currentUserName,
    emailBody,
  ]);

  // Handler pour copier le lien
  const handleCopyLink = useCallback(async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Erreur copie lien:', err);
      alert('Impossible de copier le lien. Veuillez le sélectionner manuellement.');
    }
  }, [generatedLink]);

  // Handler pour envoyer l'email
  const handleSendEmail = useCallback(async () => {
    if (!generatedLink) {
      setError('Veuillez d\'abord générer le lien');
      return;
    }

    // Parser les destinataires (virgules ou lignes)
    const recipientsList = recipients
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (recipientsList.length === 0) {
      setError('Veuillez entrer au moins un destinataire');
      return;
    }

    setIsSendingEmail(true);
    setError(null);

    try {
      const response = await fetch('/api/email/send-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientsList,
          subject: emailSubject,
          body: emailBody,
          link: generatedLink,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      alert(`✅ Email envoyé avec succès à ${recipientsList.length} destinataire(s) !`);
      onClose();
    } catch (err) {
      console.error('Erreur envoi email:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSendingEmail(false);
    }
  }, [generatedLink, recipients, emailSubject, emailBody, onClose]);

  // Reset au close
  const handleClose = useCallback(() => {
    setGeneratedLink(null);
    setError(null);
    setCopiedToClipboard(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
            Partager pour Validation
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Configuration du lien */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Configuration du lien
          </Typography>

          {/* Date d'expiration */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <DatePicker
              label="Date d'expiration"
              value={expirationDate}
              onChange={(newValue) => newValue && setExpirationDate(newValue)}
              minDate={new Date()}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'Le lien expirera à la fin de cette date',
                  sx: { mb: 2 },
                },
              }}
            />
          </LocalizationProvider>

          {/* Switch Vue Technique */}
          <FormControlLabel
            control={
              <Switch
                checked={enableTechnicalView}
                onChange={(e) => setEnableTechnicalView(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Activer la vue technique</Typography>
                <Tooltip title="Si activé, les validateurs pourront afficher les détails techniques (IDs, modules, sous-modules)" arrow>
                  <InfoIcon fontSize="small" color="action" />
                </Tooltip>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Configuration de l'email */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Configuration de l'email
          </Typography>

          {/* Destinataires */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Destinataires"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="email1@example.com, email2@example.com&#10;Ou un email par ligne"
            helperText="Entrez les emails séparés par des virgules ou un par ligne"
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                },
                '&.Mui-focused': {
                  bgcolor: theme.palette.background.paper,
                },
              },
            }}
          />

          {/* Sujet */}
          <TextField
            fullWidth
            label="Sujet de l'email"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                },
                '&.Mui-focused': {
                  bgcolor: theme.palette.background.paper,
                },
              },
            }}
          />

          {/* Corps du message */}
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Corps du message"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            helperText="Variables disponibles: {LINK}, {BUSINESS_ROLE_COUNT}, {BUSINESS_ROLES_LIST}, {ROLE_COUNT}, {EXPIRATION}, {REQUESTER}"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                },
                '&.Mui-focused': {
                  bgcolor: theme.palette.background.paper,
                },
              },
            }}
          />
        </Box>

        {/* Affichage du lien généré */}
        {generatedLink && (
          <>
            <Divider sx={{ my: 3 }} />
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.success.main }}>
                ✅ Lien généré avec succès !
              </Typography>
              
              {/* URL */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  value={generatedLink}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <Tooltip title={copiedToClipboard ? "Copié !" : "Copier le lien"} arrow>
                        <IconButton onClick={handleCopyLink} size="small">
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    },
                  }}
                />
              </Box>

              {/* Informations */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={`${businessRoles.length} rôle(s) métier`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${totalRoleCount} rôle(s) simple(s)`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Expire le ${new Date(expirationDate).toLocaleDateString('fr-FR')}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </>
        )}

        {/* Erreur */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          Annuler
        </Button>

        {!generatedLink ? (
          <Button
            onClick={handleGenerateLink}
            variant="contained"
            disabled={isGenerating || businessRoles.length === 0}
            startIcon={isGenerating ? <CircularProgress size={16} /> : null}
          >
            {isGenerating ? 'Génération...' : 'Générer le lien'}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleCopyLink}
              variant="outlined"
              startIcon={<CopyIcon />}
            >
              {copiedToClipboard ? 'Copié !' : 'Copier le lien'}
            </Button>
            <Button
              onClick={handleSendEmail}
              variant="contained"
              color="success"
              disabled={isSendingEmail || !recipients.trim()}
              startIcon={isSendingEmail ? <CircularProgress size={16} /> : <EmailIcon />}
            >
              {isSendingEmail ? 'Envoi...' : 'Envoyer par email'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

