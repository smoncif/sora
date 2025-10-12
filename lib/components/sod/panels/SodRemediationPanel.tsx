/**
 * Panneau latéral pour la remédiation automatique SOD
 * Affiche le plan de remédiation avec preview, boutons d'action et export
 */

'use client';

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  Collapse,
  Card,
  CardContent,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Undo as UndoIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { RemediationPlan } from 'lib/services/sod/sodRemediationService';

export interface SodRemediationPanelProps {
  /** Ouverture du panneau */
  open: boolean;
  /** Fermeture du panneau */
  onClose: () => void;
  /** Plan de remédiation */
  plan: RemediationPlan | null;
  /** État de génération */
  isGenerating: boolean;
  /** État d'application */
  isApplying: boolean;
  /** Nombre de modifications appliquées */
  appliedModifications: number;
  /** Erreur */
  error: string | null;
  /** Callback pour appliquer le plan */
  onApply: () => void;
  /** Callback pour annuler */
  onUndo: () => void;
  /** Callback pour exporter */
  onExport: () => void;
}

export const SodRemediationPanel: React.FC<SodRemediationPanelProps> = ({
  open,
  onClose,
  plan,
  isGenerating,
  isApplying,
  appliedModifications,
  error,
  onApply,
  onUndo,
  onExport,
}) => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = React.useState({
    restrictions: true,
    deletions: false,
    summary: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'minimal': return 'success';
      case 'modéré': return 'warning';
      case 'important': return 'error';
      case 'critique': return 'error';
      default: return 'default';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'minimal': return <SecurityIcon />;
      case 'modéré': return <WarningIcon />;
      case 'important': return <BlockIcon />;
      case 'critique': return <DeleteIcon />;
      default: return null;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 600 },
          bgcolor: theme.palette.background.paper,
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* En-tête */}
        <Box sx={{ 
          p: 3, 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Plan de Remédiation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aperçu des modifications automatiques
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Contenu */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {/* État de génération */}
          {isGenerating && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Génération du plan de remédiation...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* État d'application */}
          {isApplying && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Application des modifications...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Erreur */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Plan de remédiation */}
          {plan && (
            <>
              {/* Résumé */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {getImpactIcon(plan.estimatedImpact)}
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Résumé du Plan
                    </Typography>
                    <Chip 
                      label={plan.estimatedImpact.toUpperCase()} 
                      color={getImpactColor(plan.estimatedImpact)}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Modifications totales
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {plan.totalModifications}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Rôles affectés
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {plan.rolesAffected}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Risques remédiés
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {plan.risksRemediated}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Modifications appliquées
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {appliedModifications}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Restrictions de ressources */}
              {plan.resourceRestrictions.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleSection('restrictions')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon color="info" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Restrictions de Ressources
                        </Typography>
                        <Chip 
                          label={plan.resourceRestrictions.length} 
                          color="info" 
                          size="small" 
                        />
                      </Box>
                      {expandedSections.restrictions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Box>
                    
                    <Collapse in={expandedSections.restrictions}>
                      <List sx={{ mt: 2 }}>
                        {plan.resourceRestrictions.slice(0, 5).map((restriction, index) => (
                          <ListItem key={index} sx={{ py: 1 }}>
                            <ListItemIcon>
                              <BlockIcon color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${restriction.roleName} → ${restriction.actionCode}`}
                              secondary={`${restriction.resourceCode}: ${restriction.values.join(', ')}`}
                            />
                          </ListItem>
                        ))}
                        {plan.resourceRestrictions.length > 5 && (
                          <ListItem>
                            <ListItemText
                              primary={`... et ${plan.resourceRestrictions.length - 5} autres restrictions`}
                              sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Collapse>
                  </CardContent>
                </Card>
              )}

              {/* Suppressions d'actions */}
              {plan.actionDeletions.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleSection('deletions')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteIcon color="error" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Suppressions d'Actions
                        </Typography>
                        <Chip 
                          label={plan.actionDeletions.length} 
                          color="error" 
                          size="small" 
                        />
                      </Box>
                      {expandedSections.deletions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Box>
                    
                    <Collapse in={expandedSections.deletions}>
                      <List sx={{ mt: 2 }}>
                        {plan.actionDeletions.slice(0, 5).map((deletion, index) => (
                          <ListItem key={index} sx={{ py: 1 }}>
                            <ListItemIcon>
                              <DeleteIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${deletion.roleName} → ${deletion.actionCode}`}
                              secondary={deletion.reason}
                            />
                          </ListItem>
                        ))}
                        {plan.actionDeletions.length > 5 && (
                          <ListItem>
                            <ListItemText
                              primary={`... et ${plan.actionDeletions.length - 5} autres suppressions`}
                              sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Collapse>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Message si aucun plan */}
          {!plan && !isGenerating && !error && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Aucun plan de remédiation généré
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Cliquez sur "Démarrer" pour générer un plan de remédiation automatique
              </Typography>
            </Box>
          )}
        </Box>

        {/* Actions */}
        {plan && (
          <Box sx={{ 
            p: 3, 
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            gap: 2,
          }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={onApply}
              disabled={isApplying}
              sx={{ flex: 1 }}
            >
              Appliquer
            </Button>
            <Button
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={onUndo}
              disabled={isApplying || appliedModifications === 0}
            >
              Annuler
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={onExport}
              disabled={!plan}
            >
              Exporter
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
