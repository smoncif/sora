'use client';

import React from 'react';
import { 
  Box,
  Typography,
  Button,
  Collapse,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Pagination,
  Slide,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useFocus } from '../../../contexts/FocusContext';

export interface AnalysisResultsSectionProps {
  // États des données
  analysisResult: any;
  businessRolesToShow: any[];
  totalBusinessRolePages: number;
  currentBusinessRolePage: number;
  
  // Filtres
  businessRoleFilter: string;
  simpleRoleFilter: string;
  showFilters: boolean;
  
  // Props partagées pour BusinessRoleAnalysisCard
  sharedBusinessRoleProps: any;
  
  // Handlers
  onBusinessRoleFilterChange: (filter: string) => void;
  onSimpleRoleFilterChange: (filter: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  
  // Composant BusinessRoleAnalysisCard
  BusinessRoleAnalysisCardComponent: React.ComponentType<any>;
}

export function AnalysisResultsSection({
  analysisResult,
  businessRolesToShow,
  totalBusinessRolePages,
  currentBusinessRolePage,
  businessRoleFilter,
  simpleRoleFilter,
  showFilters,
  sharedBusinessRoleProps,
  onBusinessRoleFilterChange,
  onSimpleRoleFilterChange,
  onToggleFilters,
  onClearFilters,
  onPageChange,
  BusinessRoleAnalysisCardComponent,
}: AnalysisResultsSectionProps) {
  const theme = useTheme();
  
  // 🚀 OPTIMISÉ : Hook Focus Context pour gérer l'état du focus
  const { focusedBusinessRole } = useFocus();

  // 🚀 OPTIMISÉ : Fonction stable pour récupérer les rôles sélectionnés par rôle métier
  // Utilise directement la fonction fournie par sharedBusinessRoleProps pour éviter les re-renders
  const getSelectedRolesForBusinessRole = React.useCallback((businessRole: string): Set<string> => {
    return sharedBusinessRoleProps.getSelectedRoles(businessRole);
  }, [sharedBusinessRoleProps.getSelectedRoles]);

  if (!analysisResult) return null;

  return (
    <Fade in timeout={800}>
      <Box>
        {/* Analyses par rôle métier - Design moderne */}
        <Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3 
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: theme.palette.text.primary,
              letterSpacing: '-0.01em',
            }}>
              Analyse détaillée par rôle métier
            </Typography>
            
            {/* Bouton pour afficher/masquer les filtres */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterIcon />}
              onClick={onToggleFilters}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Filtres
            </Button>
          </Box>
          
          {/* Section des filtres */}
          <Collapse in={showFilters}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                mb: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.neutral.main, 0.02),
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Filtrer les rôles métier..."
                    value={businessRoleFilter}
                    onChange={(e) => onBusinessRoleFilterChange(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                      endAdornment: businessRoleFilter && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => onBusinessRoleFilterChange('')}
                            sx={{ p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Filtrer les rôles simples..."
                    value={simpleRoleFilter}
                    onChange={(e) => onSimpleRoleFilterChange(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                      endAdornment: simpleRoleFilter && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => onSimpleRoleFilterChange('')}
                            sx={{ p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={onClearFilters}
                      disabled={!businessRoleFilter && !simpleRoleFilter}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Effacer les filtres
                    </Button>
                    
                    {(businessRoleFilter || simpleRoleFilter) && (
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.text.secondary,
                        fontSize: '0.75rem',
                      }}>
                        Filtres actifs
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Collapse>
          
          {businessRolesToShow.length > 0 ? (
            businessRolesToShow
              .filter(analysis => 
                analysis && 
                analysis.businessRole && 
                analysis.simpleRoles && 
                Array.isArray(analysis.simpleRoles)
              )
              .map((analysis, index) => (
                <Slide 
                  key={`${analysis.businessRole}-${index}`}
                  direction="up" 
                  in 
                  timeout={600 + (index * 100)}
                >
                  <Box>
                    <BusinessRoleAnalysisCardComponent
                      analysis={analysis}
                      globalSelectedRoles={getSelectedRolesForBusinessRole(analysis.businessRole)}
                      {...sharedBusinessRoleProps}
                    />
                  </Box>
                </Slide>
              ))
          ) : (
            <Paper sx={{ 
              p: 4, 
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}>
              <Alert 
                severity="info"
                sx={{
                  border: 'none',
                  bgcolor: 'transparent',
                  '& .MuiAlert-icon': {
                    color: theme.palette.info.main,
                  }
                }}
              >
                {businessRoleFilter ? 
                  `Aucun rôle métier trouvé correspondant au filtre "${businessRoleFilter}"` : 
                  'Aucune analyse de couverture disponible'
                }
              </Alert>
            </Paper>
          )}

          {totalBusinessRolePages > 1 && !focusedBusinessRole && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalBusinessRolePages}
                page={currentBusinessRolePage}
                onChange={(_, page) => onPageChange(page)}
                color="primary"
                size="large"
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: 1.5,
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
} 


