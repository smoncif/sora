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
import { ComparisonProvider } from '../../../contexts';
import { AnalysisMode, getLabels } from 'lib/types/analysis';
import type { CoverageAnalysis, SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

interface SharedBusinessRolePropsLike {
  getSelectedRoles?: (itemId: string) => Set<string>;
  onGlobalSelectionChange?: (itemId: string, selectedRoles: Set<string>) => void;
  [key: string]: unknown;
}

export interface ResultsSectionProps {
  // États des données
  analysisResult: SimplifiedAnalysisResult | null;
  itemsToShow: CoverageAnalysis[];
  totalPages: number;
  currentPage: number;
  
  // Filtres
  primaryFilter: string;
  targetRoleFilter: string;
  showFilters: boolean;
  
  // Props partagées pour AnalysisCard
  sharedBusinessRoleProps: SharedBusinessRolePropsLike;
  
  // Handlers
  onPrimaryFilterChange: (filter: string) => void;
  onTargetRoleFilterChange: (filter: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  
  // Composant AnalysisCard
  AnalysisCardComponent: React.ComponentType<Record<string, unknown>>;
  
  // Mode d'analyse
  mode?: AnalysisMode;
}

export function ResultsSection({
  analysisResult,
  itemsToShow,
  totalPages,
  currentPage,
  primaryFilter,
  targetRoleFilter,
  showFilters,
  sharedBusinessRoleProps,
  onPrimaryFilterChange,
  onTargetRoleFilterChange,
  onToggleFilters,
  onClearFilters,
  onPageChange,
  AnalysisCardComponent,
  mode = 'roles',
}: ResultsSectionProps) {
  
  const theme = useTheme();

  // Log léger pour comprendre si on rend trop d'éléments (pagination)
  if (itemsToShow?.length > 3) {
    console.log('⏱️ [analysis] ResultsSection render', {
      itemsToShow: itemsToShow.length,
      totalPages,
      currentPage,
      mode,
    });
  }
  
  // Labels selon le mode
  const labels = getLabels(mode);
  
  // 🚀 OPTIMISÉ : Hook Focus Context pour gérer l'état du focus
  const { focusedItem } = useFocus();

  // ⚡ OPTIMISÉ : Fonction stable extraite une seule fois pour éviter les re-créations
  const getSelectedRoles = sharedBusinessRoleProps?.getSelectedRoles;

  if (!analysisResult) return null;

  return (
    <ComparisonProvider>
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
              Analyse détaillée par {labels?.item?.toLowerCase()}
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
                    placeholder={`Filtrer les ${labels?.itemPlural?.toLowerCase()}...`}
                    value={primaryFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPrimaryFilterChange(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                      endAdornment: primaryFilter && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => onPrimaryFilterChange('')}
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
                    placeholder={`Filtrer les ${labels?.targetRolePlural?.toLowerCase()}...`}
                    value={targetRoleFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTargetRoleFilterChange(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                      endAdornment: targetRoleFilter && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => onTargetRoleFilterChange('')}
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
                      disabled={!primaryFilter && !targetRoleFilter}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Effacer les filtres
                    </Button>
                    
                    {(primaryFilter || targetRoleFilter) && (
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
          
          {itemsToShow.length > 0 ? (
            itemsToShow
              .filter(analysis => 
                analysis && 
                analysis.businessRole && 
                analysis.simpleRoles && 
                Array.isArray(analysis.simpleRoles)
              )
              .map((analysis, index) => {
                const itemId = analysis.businessRole;
                return (
                  <Slide 
                    key={`${itemId}-${index}`}
                    direction="up" 
                    in 
                    timeout={600 + (index * 100)}
                  >
                    <Box>
                      <AnalysisCardComponent
                        key={`${itemId}-${index}`}
                        analysis={analysis}
                        globalSelectedRoles={getSelectedRoles?.(itemId)}
                        {...sharedBusinessRoleProps}
                        mode={mode}
                        // 🔍 LOG SUPPLEMENTAIRE : Tracer les props passées
                        onGlobalSelectionChange={(itemId: string, selectedRoles: Set<string>) => {
                          
                          // Appeler la fonction passée en props
                          sharedBusinessRoleProps.onGlobalSelectionChange?.(itemId, selectedRoles);
                        }}
                      />
                    </Box>
                  </Slide>
                );
              })
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
                {primaryFilter ? 
                  `Aucun ${labels?.item?.toLowerCase()} trouvé correspondant au filtre "${primaryFilter}"` : 
                  'Aucune analyse de couverture disponible'
                }
              </Alert>
            </Paper>
          )}

          {totalPages > 1 && !focusedItem && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage + 1}
                onChange={(_: unknown, page: number) => onPageChange(page - 1)}
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
  </ComparisonProvider>
  );
} 


