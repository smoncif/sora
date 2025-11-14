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
  const [graphType, setGraphType] = useState<'radar' | 'progress'>('radar');

  // 🚀 OPTIMISATION : Mémoisation de la fonction calculateMetrics
  const calculateMetrics = useCallback((role: SimpleRole) => {
    // 🎯 Utiliser les données déjà calculées dans role.details
    const roleData = role as any;
    const details = roleData.details || {};
    
    const covered = details.covered?.length || 0;
    const usage = roleData.remainingUsageScore || 0; // Nombre total d'exécutions
    const nonUtilisees = details.nonUtilisees?.length || 0;
    const nonCouvertes = details.nonCouvertes?.length || 0;

    // Efficacité = Score Global (remplace l'ancien calcul)
    const efficiency = roleData.globalScore || 0;

    return {
      covered,
      usage,
      notUsed: nonUtilisees,
      nonCovered: nonCouvertes,
      efficiency
    };
  }, []);

  // 🏆 Calcul du rôle optimal pour chaque métrique
  const getOptimalRole = (metric: 'covered' | 'usage' | 'notUsed' | 'efficiency') => {
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
      case 'usage':
        optimalRole = metricsData.reduce((max, current) => 
          current.metrics.usage > max.metrics.usage ? current : max
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
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Vue d'ensemble
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
                Optimal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                Couvertes
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
              <TableCell sx={{ fontWeight: 600 }}>
                Usage
              </TableCell>
              {selectedRoles.map(role => {
                const metrics = calculateMetrics(role);
                const roleName = (role as any).roleName || role.name;
                const isOptimal = roleName === getOptimalRole('usage');
                return (
                  <TableCell key={roleName} align="center">
                    <Chip 
                      label={`${metrics.usage}`}
                      size="small"
                      color={isOptimal ? 'success' : 'default'}
                      variant={isOptimal ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                );
              })}
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                  {getOptimalRole('usage')}
                </Typography>
              </TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                Non Utilisées
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
    </Box>
  );

  const renderDetails = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Vue Détaillée
        </Typography>
        <Button 
          onClick={() => setCurrentView('overview')} 
          variant="outlined"
          size="small"
        >
          Retour à la vue d'ensemble
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
                  mb: 1
                }}>
                  Couvertes ({details.covered?.length || 0})
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
                  mb: 1
                }}>
                  Non Couvertes ({details.nonCouvertes?.length || 0})
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
                  mb: 1
                }}>
                  Non Utilisées ({details.nonUtilisees?.length || 0})
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

  const renderGraphView = () => {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Vue Graphique - Comparaison des Rôles
          </Typography>
          <Button 
            onClick={() => setCurrentView('overview')} 
            variant="outlined"
            size="small"
          >
            Retour à la vue d'ensemble
          </Button>
        </Box>

        {/* Sélecteur de type de graphique */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'center' }}>
          <Button
            variant={graphType === 'radar' ? 'contained' : 'outlined'}
            onClick={() => setGraphType('radar')}
            size="small"
          >
            Radar
          </Button>
          <Button
            variant={graphType === 'progress' ? 'contained' : 'outlined'}
            onClick={() => setGraphType('progress')}
            size="small"
          >
            Progression
          </Button>
        </Box>

        {/* Affichage du graphique sélectionné */}
        <Box sx={{ mb: 4 }}>
          {graphType === 'radar' && renderRadarChart()}
          {graphType === 'progress' && renderProgressBars()}
        </Box>
      </Box>
    );
  };

  // Graphique radar pour comparer plusieurs dimensions
  const renderRadarChart = () => {
    const metrics = selectedRoles.map(role => {
      const m = calculateMetrics(role);
      const roleName = (role as any).roleName || role.name;
      return {
        name: roleName,
        covered: m.covered,
        usage: m.usage,
        notUsed: m.notUsed,
        efficiency: m.efficiency,
      };
    });

    // Calcul des maxValues avec une valeur minimale pour éviter les divisions par 0
    // Pour notUsed, on utilise le maximum réel ou 1, mais on s'assure d'avoir une échelle cohérente
    const maxValues = {
      covered: Math.max(...metrics.map(m => m.covered), 1),
      usage: Math.max(...metrics.map(m => m.usage), 1),
      notUsed: Math.max(...metrics.map(m => m.notUsed), 1), // Minimum 1 pour éviter division par 0
      efficiency: Math.max(...metrics.map(m => m.efficiency), 100), // Score global max (min 100)
    };

    // Couleurs distinctes et vibrantes pour chaque rôle (jusqu'à 3 rôles)
    const colors = [
      '#1976d2', // Bleu vif pour Rôle1
      '#9c27b0', // Violet pour Rôle2
      '#f57c00', // Orange pour Rôle3
    ];

    const dimensions = [
      { key: 'covered', label: 'Couvertes' },
      { key: 'usage', label: 'Usage' },
      { key: 'efficiency', label: 'Efficacité' },
      { key: 'notUsed', label: 'Taux d\'utilisation' }, // Inversé : plus c'est loin du centre, moins il y a de non utilisées
    ];

    const centerX = 300; // Décalé vers la droite pour laisser de l'espace à gauche
    const centerY = 200;
    const radius = 150;

    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
          Comparaison Multi-Dimensionnelle
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="600" height="400" viewBox="0 0 600 400">
            {/* Grille circulaire */}
            {[0.25, 0.5, 0.75, 1].map((scale, i) => (
              <circle
                key={i}
                cx={centerX}
                cy={centerY}
                r={radius * scale}
                fill="none"
                stroke={alpha(theme.palette.text.primary, 0.1)}
                strokeWidth="1"
              />
            ))}

            {/* Lignes radiales */}
            {dimensions.map((dim, i) => {
              const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              return (
                <line
                  key={dim.key}
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke={alpha(theme.palette.text.primary, 0.2)}
                  strokeWidth="1"
                />
              );
            })}

            {/* Labels des dimensions */}
            {dimensions.map((dim, i) => {
              const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
              // Augmenter la distance pour éviter que les labels entrent dans le graphique
              const labelDistance = radius + 50;
              const x = centerX + labelDistance * Math.cos(angle);
              const y = centerY + labelDistance * Math.sin(angle);
              
              // Ajuster l'alignement selon la position de l'axe
              let textAnchor: 'start' | 'middle' | 'end' = 'middle';
              let dominantBaseline: 'auto' | 'middle' | 'hanging' | 'baseline' = 'middle';
              
              // Ajustements selon la position (haut, droite, bas, gauche)
              if (i === 0) { // Couvertes (haut)
                dominantBaseline = 'hanging';
              } else if (i === 1) { // Usage (droite)
                textAnchor = 'start';
              } else if (i === 2) { // Efficacité (bas)
                dominantBaseline = 'baseline';
              } else if (i === 3) { // Taux d'utilisation (gauche)
                textAnchor = 'end';
              }
              
              return (
                <text
                  key={dim.key}
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  dominantBaseline={dominantBaseline}
                  fontSize="12"
                  fontWeight="600"
                  fill={theme.palette.text.primary}
                >
                  {dim.label}
                </text>
              );
            })}

            {/* Polygones pour chaque rôle */}
            {metrics.map((m, roleIndex) => {
              const points = dimensions.map((dim, i) => {
                const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
                const value = m[dim.key as keyof typeof m] as number;
                const maxValue = maxValues[dim.key as keyof typeof maxValues];
                
                // Inverser l'axe "Non Utilisées" : moins c'est mieux
                // Plus il y a de transactions non utilisées, plus c'est proche du centre (mauvais)
                const normalizedValue = dim.key === 'notUsed' 
                  ? (maxValue - value) / maxValue  // Inversé : 0 non utilisées = 1 (bord), max = 0 (centre)
                  : value / maxValue;               // Normal : plus c'est mieux
                
                const r = radius * normalizedValue;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                return `${x},${y}`;
              }).join(' ');

              return (
                <polygon
                  key={m.name}
                  points={points}
                  fill={alpha(colors[roleIndex % colors.length], 0.3)}
                  stroke={colors[roleIndex % colors.length]}
                  strokeWidth="2"
                />
              );
            })}

            {/* Légende - Positionnée à l'extrême gauche */}
            <g transform={`translate(5, 20)`}>
              {metrics.map((m, roleIndex) => (
                <g key={m.name} transform={`translate(0, ${roleIndex * 25})`}>
                  <rect
                    width="15"
                    height="15"
                    fill={colors[roleIndex % colors.length]}
                  />
                  <text
                    x="20"
                    y="12"
                    fontSize="12"
                    fill={theme.palette.text.primary}
                  >
                    {m.name}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </Box>
      </Paper>
    );
  };

  // Barres de progression horizontales avec sections multiples
  const renderProgressBars = () => {
    const metrics = selectedRoles.map(role => {
      const m = calculateMetrics(role);
      return {
        name: (role as any).roleName || role.name,
        covered: m.covered,
        nonCovered: m.nonCovered || 0,
        notUsed: m.notUsed,
        usage: m.usage,
      };
    });

    // Échelle commune : maximum de toutes les métriques combinées pour tous les rôles
    const maxScale = Math.max(
      ...metrics.map(m => m.covered + m.nonCovered + m.notUsed + m.usage),
      1
    );

    // Couleurs distinctes et vibrantes pour chaque rôle (jusqu'à 3 rôles)
    const colors = [
      '#1976d2', // Bleu vif pour Rôle1
      '#9c27b0', // Violet pour Rôle2
      '#f57c00', // Orange pour Rôle3
    ];

    // Couleurs pour les sections
    const sectionColors = {
      covered: theme.palette.success.main,      // Vert pour couvertes
      nonCovered: theme.palette.warning.main,   // Orange pour non couvertes
      notUsed: theme.palette.error.main,        // Rouge pour non utilisées
      usage: theme.palette.info.main,           // Bleu pour usage
    };

    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
          Comparaison Visuelle des Performances
        </Typography>
        
        {/* Légende des sections */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: sectionColors.covered, borderRadius: 1 }} />
            <Typography variant="caption">Couvertes</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: sectionColors.nonCovered, borderRadius: 1 }} />
            <Typography variant="caption">Non Couvertes</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: sectionColors.notUsed, borderRadius: 1 }} />
            <Typography variant="caption">Non Utilisées</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: sectionColors.usage, borderRadius: 1 }} />
            <Typography variant="caption">Usage</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {metrics.map((m, roleIndex) => {
            const isOptimal = m.name === getOptimalRole('covered');
            
            // Calcul des largeurs en pourcentage basées sur l'échelle commune
            const coveredWidth = (m.covered / maxScale) * 100;
            const nonCoveredWidth = (m.nonCovered / maxScale) * 100;
            const notUsedWidth = (m.notUsed / maxScale) * 100;
            const usageWidth = (m.usage / maxScale) * 100;
            
            // Positions cumulatives pour placer les sections côte à côte
            const coveredLeft = 0;
            const nonCoveredLeft = coveredWidth;
            const notUsedLeft = coveredWidth + nonCoveredWidth;
            const usageLeft = coveredWidth + nonCoveredWidth + notUsedWidth;
            
            return (
              <Box key={m.name}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors[roleIndex % colors.length] }}>
                    {m.name}
                    {isOptimal && ' ⭐ Optimal'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: {m.covered + m.nonCovered + m.notUsed + m.usage}
                  </Typography>
                </Box>
                
                <Box
                  sx={{
                    width: '100%',
                    height: 50,
                    bgcolor: alpha(theme.palette.grey[300], 0.2),
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    border: isOptimal ? `2px solid ${colors[roleIndex % colors.length]}` : '1px solid',
                    borderColor: isOptimal ? colors[roleIndex % colors.length] : 'divider',
                  }}
                >
                  {/* Section Couvertes */}
                  {coveredWidth > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${coveredLeft}%`,
                        top: 0,
                        height: '100%',
                        width: `${coveredWidth}%`,
                        bgcolor: sectionColors.covered,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.3s ease',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {coveredWidth > 5 && (
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                          {m.covered}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {/* Section Non Couvertes */}
                  {nonCoveredWidth > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${nonCoveredLeft}%`,
                        top: 0,
                        height: '100%',
                        width: `${nonCoveredWidth}%`,
                        bgcolor: sectionColors.nonCovered,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.3s ease',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {nonCoveredWidth > 5 && (
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                          {m.nonCovered}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {/* Section Non Utilisées */}
                  {notUsedWidth > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${notUsedLeft}%`,
                        top: 0,
                        height: '100%',
                        width: `${notUsedWidth}%`,
                        bgcolor: sectionColors.notUsed,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.3s ease',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {notUsedWidth > 5 && (
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                          {m.notUsed}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {/* Section Usage */}
                  {usageWidth > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${usageLeft}%`,
                        top: 0,
                        height: '100%',
                        width: `${usageWidth}%`,
                        bgcolor: sectionColors.usage,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.3s ease',
                      }}
                    >
                      {usageWidth > 5 && (
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                          {m.usage}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Couvertes: ${m.covered}`}
                    size="small"
                    sx={{ bgcolor: alpha(sectionColors.covered, 0.1), color: sectionColors.covered }}
                  />
                  <Chip
                    label={`Non Couvertes: ${m.nonCovered}`}
                    size="small"
                    sx={{ bgcolor: alpha(sectionColors.nonCovered, 0.1), color: sectionColors.nonCovered }}
                  />
                  <Chip
                    label={`Non Utilisées: ${m.notUsed}`}
                    size="small"
                    sx={{ bgcolor: alpha(sectionColors.notUsed, 0.1), color: sectionColors.notUsed }}
                  />
                  <Chip
                    label={`Usage: ${m.usage}`}
                    size="small"
                    sx={{ bgcolor: alpha(sectionColors.usage, 0.1), color: sectionColors.usage }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>
    );
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

      <DialogActions sx={{ px: 3, pb: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => setCurrentView('details')}
          disabled={currentView === 'details'}
        >
          Voir Détails
        </Button>
        <Button
          variant="outlined"
          onClick={() => setCurrentView('graph')}
          disabled={currentView === 'graph'}
        >
          Graphique
        </Button>
        <Button onClick={onClose} variant="contained" color="primary">
          Fermer
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
