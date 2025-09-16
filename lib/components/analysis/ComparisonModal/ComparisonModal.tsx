import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  CompareArrows as CompareArrowsIcon,
  Visibility as VisibilityIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { SimpleRole } from '../../../types';

export interface ComparisonModalProps {
  open: boolean;
  onClose: () => void;
  selectedRoles: SimpleRole[];
  businessRoleTransactions: string[];
}

export const ComparisonModal: React.FC<ComparisonModalProps> = React.memo(({
  open,
  onClose,
  selectedRoles,
  businessRoleTransactions
}) => {
  const theme = useTheme();
  const [currentView, setCurrentView] = useState<'overview' | 'details' | 'graph'>('overview');

  // 🚀 OPTIMISATION : Mémoisation de la fonction calculateMetrics
  const calculateMetrics = useCallback((role: SimpleRole) => {
    // 🎯 Utiliser les données déjà calculées dans role.details
    const roleData = role as any;
    const details = roleData.details || {};
    
    const covered = details.covered?.length || 0;
    const nonCouvertes = details.nonCouvertes?.length || 0;
    const nonUtilisees = details.nonUtilisees?.length || 0;

    // Score d'efficacité : (couvertes / (couvertes + non utilisées)) * 100
    const efficiency = covered > 0 ? 
      Math.round((covered / (covered + nonUtilisees)) * 100) : 0;

    return {
      covered,
      notCovered: nonCouvertes,
      notUsed: nonUtilisees,
      efficiency
    };
  }, []);

  // 🏆 Calcul du rôle optimal pour chaque métrique
  const getOptimalRole = (metric: 'covered' | 'notCovered' | 'notUsed' | 'efficiency') => {
    if (selectedRoles.length === 0) return '';
    
    const metricsData = selectedRoles.map(role => ({
      name: (role as any).roleName || role.name,
      metrics: calculateMetrics(role)
    }));

    let optimalRole = '';
    
    switch (metric) {
      case 'covered':
        optimalRole = metricsData.reduce((max, current) => 
          current.metrics.covered > max.metrics.covered ? current : max
        ).name;
        break;
      case 'notCovered':
        optimalRole = metricsData.reduce((min, current) => 
          current.metrics.notCovered < min.metrics.notCovered ? current : min
        ).name;
        break;
      case 'notUsed':
        optimalRole = metricsData.reduce((min, current) => 
          current.metrics.notUsed < min.metrics.notUsed ? current : min
        ).name;
        break;
      case 'efficiency':
        optimalRole = metricsData.reduce((max, current) => 
          current.metrics.efficiency > max.metrics.efficiency ? current : max
        ).name;
        break;
    }
    
    return optimalRole;
  };

  const renderOverview = () => (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
        📊 Vue d'ensemble
      </Typography>
      
      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}></TableCell>
              {selectedRoles.map((role, index) => (
                <TableCell 
                  key={(role as any).roleName || role.name} 
                  align="center" 
                  sx={{ fontWeight: 600, minWidth: 100 }}
                >
                  {(role as any).roleName || role.name}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 600, color: 'primary.main' }}>
                🏆 Optimal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                🟢 Couvertes
              </TableCell>
              {selectedRoles.map(role => {
                const metrics = calculateMetrics(role);
                const roleName = (role as any).roleName || role.name;
                const isOptimal = roleName === getOptimalRole('covered');
                return (
                  <TableCell key={roleName} align="center">
                    <Chip 
                      label={metrics.covered}
                      size="small"
                      color={isOptimal ? 'success' : 'default'}
                      variant={isOptimal ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                );
              })}
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  {getOptimalRole('covered')}
                </Typography>
              </TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                🔴 Non Couvertes
              </TableCell>
              {selectedRoles.map(role => {
                const metrics = calculateMetrics(role);
                const roleName = (role as any).roleName || role.name;
                const isOptimal = roleName === getOptimalRole('notCovered');
                return (
                  <TableCell key={roleName} align="center">
                    <Chip 
                      label={metrics.notCovered}
                      size="small"
                      color={isOptimal ? 'success' : 'default'}
                      variant={isOptimal ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                );
              })}
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                  {getOptimalRole('notCovered')}
                </Typography>
              </TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚫ Non Utilisées
              </TableCell>
              {selectedRoles.map(role => {
                const metrics = calculateMetrics(role);
                const roleName = (role as any).roleName || role.name;
                const isOptimal = roleName === getOptimalRole('notUsed');
                return (
                  <TableCell key={roleName} align="center">
                    <Chip 
                      label={metrics.notUsed}
                      size="small"
                      color={isOptimal ? 'success' : 'default'}
                      variant={isOptimal ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                );
              })}
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                  {getOptimalRole('notUsed')}
                </Typography>
              </TableCell>
            </TableRow>
            
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          onClick={() => setCurrentView('details')}
        >
          🔍 Voir Détails
        </Button>
        <Button
          variant="outlined"
          startIcon={<BarChartIcon />}
          onClick={() => setCurrentView('graph')}
        >
          📊 Graphique
        </Button>
      </Box>

      
    </Box>
  );

  const renderDetails = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
          🔍 Vue Détaillée
        </Typography>
        <Button 
          onClick={() => setCurrentView('overview')} 
          variant="outlined"
          size="small"
        >
          ← Retour à la vue d'ensemble
        </Button>
      </Box>

      {/* Grid des rôles */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${selectedRoles.length}, 1fr)`,
        gap: 2,
        mb: 3
      }}>
        {selectedRoles.map((role, index) => {
          const roleData = role as any;
          const roleName = roleData.roleName || role.name;
          const details = roleData.details || {};
          
          return (
            <Paper 
              key={roleName} 
              elevation={2} 
              sx={{ 
                p: 2, 
                border: '2px solid',
                borderColor: index === 0 ? 'primary.main' : index === 1 ? 'secondary.main' : 'grey.400'
              }}
            >
              {/* Header du rôle */}
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                mb: 2, 
                textAlign: 'center',
                color: index === 0 ? 'primary.main' : index === 1 ? 'secondary.main' : 'text.primary'
              }}>
                {roleName}
              </Typography>

              {/* Transactions Couvertes */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  mb: 1,
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1 
                }}>
                  🟢 Couvertes ({details.covered?.length || 0})
                </Typography>
                <Box sx={{ 
                  maxHeight: 120, 
                  overflow: 'auto',
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  borderRadius: 1,
                  p: 1
                }}>
                  {details.covered?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {details.covered.map((tx: string) => (
                        <Chip 
                          key={tx}
                          label={tx}
                          size="small"
                          sx={{ 
                            bgcolor: theme.palette.success.main,
                            color: theme.palette.success.contrastText,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Aucune transaction couverte
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Transactions Non Couvertes */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  mb: 1,
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1 
                }}>
                  🔴 Non Couvertes ({details.nonCouvertes?.length || 0})
                </Typography>
                <Box sx={{ 
                  maxHeight: 120, 
                  overflow: 'auto',
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  borderRadius: 1,
                  p: 1
                }}>
                  {details.nonCouvertes?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {details.nonCouvertes.map((tx: string) => (
                        <Chip 
                          key={tx}
                          label={tx}
                          size="small"
                          sx={{ 
                            bgcolor: theme.palette.warning.main,
                            color: theme.palette.warning.contrastText,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Toutes les transactions sont couvertes
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Transactions Non Utilisées */}
              <Box>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  mb: 1,
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1 
                }}>
                  ⚫ Non Utilisées ({details.nonUtilisees?.length || 0})
                </Typography>
                <Box sx={{ 
                  maxHeight: 120, 
                  overflow: 'auto',
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  borderRadius: 1,
                  p: 1
                }}>
                  {details.nonUtilisees?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {details.nonUtilisees.map((tx: string) => (
                        <Chip 
                          key={tx}
                          label={tx}
                          size="small"
                          sx={{ 
                            bgcolor: theme.palette.error.main,
                            color: theme.palette.error.contrastText,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Aucune transaction non utilisée
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>

      
    </Box>
  );

  const renderCommonTransactions = () => {
    // Calcul des transactions communes couvertes
    const allCovered = selectedRoles.map(role => {
      const details = (role as any).details || {};
      return (details.covered || []) as string[];
    });

    if (allCovered.length === 0) return null;

    return null;
  };

  const renderGraphView = () => {
    // Calculer les données pour le diagramme de Venn
    const vennData = calculateVennData();
    
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            📊 Vue Graphique - Analyse des Transactions
          </Typography>
          <Button 
            onClick={() => setCurrentView('overview')} 
            variant="outlined"
            size="small"
          >
            ← Retour à la vue d'ensemble
          </Button>
        </Box>

        {/* Diagramme de Venn */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          {selectedRoles.length === 2 ? renderVenn2() : renderVenn3()}
        </Box>

      </Box>
    );
  };

  const calculateVennData = () => {
    const allCovered = selectedRoles.map(role => {
      const details = (role as any).details || {};
      return new Set<string>(details.covered || []);
    });

    if (allCovered.length === 0) {
      return {
        totalUnique: 0,
        allCommon: 0,
        overlapRate: 0,
        recommendation: "Aucune donnée disponible"
      };
    }

    // Union de toutes les transactions
    const allTransactions = new Set<string>();
    allCovered.forEach(set => {
      Array.from(set).forEach((tx: string) => allTransactions.add(tx));
    });

    // Intersection de toutes les transactions
    const commonToAll = allCovered.reduce((common, current) => 
      new Set(Array.from(common).filter((tx: string) => current.has(tx)))
    );

    const totalUnique = allTransactions.size;
    const allCommon = commonToAll.size;
    const overlapRate = totalUnique > 0 ? Math.round((allCommon / totalUnique) * 100) : 0;

    let recommendation = "";
    if (overlapRate > 60) {
      recommendation = "Fort recouvrement - Rôles très similaires";
    } else if (overlapRate > 30) {
      recommendation = "Recouvrement modéré - Complémentarité intéressante";
    } else {
      recommendation = "Faible recouvrement - Rôles très spécialisés";
    }

    return {
      totalUnique,
      allCommon,
      overlapRate,
      recommendation
    };
  };

  const renderVenn2 = () => {
    const role1Data = (selectedRoles[0] as any).details || {};
    const role2Data = (selectedRoles[1] as any).details || {};
    const role1Name = (selectedRoles[0] as any).roleName || selectedRoles[0].name;
    const role2Name = (selectedRoles[1] as any).roleName || selectedRoles[1].name;
    
    const set1 = new Set<string>(role1Data.covered || []);
    const set2 = new Set<string>(role2Data.covered || []);
    
    const intersection = new Set(Array.from(set1).filter((tx: string) => set2.has(tx)));
    const only1 = new Set(Array.from(set1).filter((tx: string) => !set2.has(tx)));
    const only2 = new Set(Array.from(set2).filter((tx: string) => !set1.has(tx)));

    return (
      <Box sx={{ position: 'relative', width: 500, height: 350 }}>
        <svg width="500" height="350" viewBox="0 0 500 350">
          {/* Cercle 1 */}
          <circle
            cx="160"
            cy="175"
            r="100"
            fill="rgba(25, 118, 210, 0.6)"
            stroke="rgba(25, 118, 210, 0.8)"
            strokeWidth="2"
          />
          {/* Cercle 2 */}
          <circle
            cx="340"
            cy="175"
            r="100"
            fill="rgba(156, 39, 176, 0.6)"
            stroke="rgba(156, 39, 176, 0.8)"
            strokeWidth="2"
          />
          
          {/* Labels des rôles */}
          <text x="110" y="120" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1976d2">
            {role1Name}
          </text>
          <text x="390" y="120" textAnchor="middle" fontSize="12" fontWeight="600" fill="#9c27b0">
            {role2Name}
          </text>
          
          {/* Nombres */}
          <text x="120" y="180" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">
            {only1.size}
          </text>
          <text x="250" y="180" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">
            {intersection.size}
          </text>
          <text x="380" y="180" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">
            {only2.size}
          </text>
        </svg>
      </Box>
    );
  };

  const renderVenn3 = () => {
    const role1Data = (selectedRoles[0] as any).details || {};
    const role2Data = (selectedRoles[1] as any).details || {};
    const role3Data = (selectedRoles[2] as any).details || {};
    const role1Name = (selectedRoles[0] as any).roleName || selectedRoles[0].name;
    const role2Name = (selectedRoles[1] as any).roleName || selectedRoles[1].name;
    const role3Name = (selectedRoles[2] as any).roleName || selectedRoles[2].name;
    
    const set1 = new Set<string>(role1Data.covered || []);
    const set2 = new Set<string>(role2Data.covered || []);
    const set3 = new Set<string>(role3Data.covered || []);
    
    // Calculs des intersections
    const all3 = new Set(Array.from(set1).filter((tx: string) => set2.has(tx) && set3.has(tx)));
    const only12 = new Set(Array.from(set1).filter((tx: string) => set2.has(tx) && !set3.has(tx)));
    const only13 = new Set(Array.from(set1).filter((tx: string) => !set2.has(tx) && set3.has(tx)));
    const only23 = new Set(Array.from(set2).filter((tx: string) => !set1.has(tx) && set3.has(tx)));
    const only1 = new Set(Array.from(set1).filter((tx: string) => !set2.has(tx) && !set3.has(tx)));
    const only2 = new Set(Array.from(set2).filter((tx: string) => !set1.has(tx) && !set3.has(tx)));
    const only3 = new Set(Array.from(set3).filter((tx: string) => !set1.has(tx) && !set2.has(tx)));

    return (
      <Box sx={{ position: 'relative', width: 500, height: 400 }}>
        <svg width="500" height="400" viewBox="0 0 500 400">
          {/* Cercle 1 */}
          <circle
            cx="180"
            cy="150"
            r="90"
            fill="rgba(25, 118, 210, 0.5)"
            stroke="rgba(25, 118, 210, 0.8)"
            strokeWidth="2"
          />
          {/* Cercle 2 */}
          <circle
            cx="320"
            cy="150"
            r="90"
            fill="rgba(156, 39, 176, 0.5)"
            stroke="rgba(156, 39, 176, 0.8)"
            strokeWidth="2"
          />
          {/* Cercle 3 */}
          <circle
            cx="250"
            cy="240"
            r="90"
            fill="rgba(76, 175, 80, 0.5)"
            stroke="rgba(76, 175, 80, 0.8)"
            strokeWidth="2"
          />
          
          {/* Labels des rôles */}
          <text x="140" y="90" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1976d2">
            {role1Name}
          </text>
          <text x="360" y="90" textAnchor="middle" fontSize="11" fontWeight="600" fill="#9c27b0">
            {role2Name}
          </text>
          <text x="250" y="350" textAnchor="middle" fontSize="11" fontWeight="600" fill="#4caf50">
            {role3Name}
          </text>
          
          {/* Nombres dans les zones */}
          <text x="140" y="130" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {only1.size}
          </text>
          <text x="360" y="130" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {only2.size}
          </text>
          <text x="250" y="280" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {only3.size}
          </text>
          <text x="250" y="120" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {only12.size}
          </text>
          <text x="200" y="210" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {only13.size}
          </text>
          <text x="300" y="210" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {only23.size}
          </text>
          <text x="250" y="180" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {all3.size}
          </text>
        </svg>
      </Box>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'details':
        return renderDetails();
      case 'graph':
        return renderGraphView();
      default:
        return renderOverview();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrowsIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Comparaison : {selectedRoles.length} Rôles Sélectionnés
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {renderCurrentView()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          ❌ Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}, (prevProps, nextProps) => {
  // 🚀 OPTIMISATION : Comparaison personnalisée pour éviter les re-renders
  return (
    prevProps.open === nextProps.open &&
    prevProps.selectedRoles.length === nextProps.selectedRoles.length &&
    prevProps.selectedRoles.every((role, index) => {
      const prevId = (role as any).roleName || (role as any).name || (role as any).id || '';
      const nextRole = nextProps.selectedRoles[index];
      if (!nextRole) return false;
      const nextId = (nextRole as any).roleName || (nextRole as any).name || (nextRole as any).id || '';
      return prevId === nextId;
    })
  );
});

export default ComparisonModal;
