'use client';

import React from 'react';
import { 
  Box,
  Paper,
  Typography,
  Chip,
  useTheme,
  alpha,
  Slider,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  HelpOutline,
} from '@mui/icons-material';

// Composant WeightSlider optimisé avec React.memo
const WeightSlider = React.memo(function WeightSlider({ 
  label, 
  value, 
  onChange, 
  tooltip 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void; 
  tooltip?: React.ReactNode;
}) {
  
  // État local pour le suivi en temps réel du slider
  const [localValue, setLocalValue] = React.useState(value);
  const [isDragging, setIsDragging] = React.useState(false);

  // Synchroniser l'état local avec la valeur externe quand elle change (et qu'on ne fait pas de drag)
  React.useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  // Handler pour le changement en temps réel (pendant le drag)
  const handleChange = React.useCallback((event: Event, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    setLocalValue(val);
    setIsDragging(true);
  }, []);

  // Handler pour la fin du changement (relâchement)
  const handleChangeCommitted = React.useCallback((event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    setIsDragging(false);
    onChange(val); // Déclencher le recalcul seulement maintenant
  }, [onChange]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 0.25,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ 
            fontSize: '0.8rem', 
            fontWeight: 500,
            color: 'text.primary',
          }}>
            {label}
          </Typography>
          {tooltip && (
            <Tooltip
              title={tooltip}
              arrow
              placement="top"
              enterDelay={300}
              leaveDelay={100}
            >
              <HelpOutline sx={{ fontSize: '0.75rem', color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          )}
        </Box>
        <Typography variant="body2" sx={{ 
          fontSize: '0.8rem', 
          fontWeight: 600,
          color: 'primary.main',
          minWidth: '40px',
          textAlign: 'right',
        }}>
          {localValue}%
        </Typography>
      </Box>
      <Slider
        value={localValue}
        onChange={handleChange}
        onChangeCommitted={handleChangeCommitted}
        aria-labelledby={`${label}-slider`}
        valueLabelDisplay="auto"
        step={5}
        marks
        min={0}
        max={100}
        size="small"
        sx={{
          width: '100%',
          mt: 0.25,
          '& .MuiSlider-thumb': {
            width: 16,
            height: 16,
          },
          '& .MuiSlider-track': {
            height: 4,
          },
          '& .MuiSlider-rail': {
            height: 4,
          },
        }}
      />
    </Box>
  );
});

export interface ConfigurationSectionProps {
  // États de pondération
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  isComputing?: boolean;
  showLicenses?: boolean;
  mode?: 'roles' | 'users'; // Mode d'analyse pour conditionner l'affichage

  // Handlers
  onCoverageWeightChange: (value: number) => void;
  onSizeWeightChange: (value: number) => void;
  onUsageWeightChange: (value: number) => void;
  onShowLicensesChange?: (value: boolean) => void;
}

export function ConfigurationSection({
  coverageWeight,
  sizeWeight,
  usageWeight,
  isComputing = false,
  showLicenses = false,
  mode = 'roles',
  onCoverageWeightChange,
  onSizeWeightChange,
  onUsageWeightChange,
  onShowLicensesChange,
}: ConfigurationSectionProps) {
  
  const theme = useTheme();

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, 
        mb: 4,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 4 
      }}>
        <Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                color: theme.palette.primary.main,
                '@keyframes rotateSettings': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
                animation: 'rotateSettings 8s linear infinite',
                '&:hover': {
                  animation: 'rotateSettings 2s linear infinite',
                },
              }}
            >
              <SettingsIcon fontSize="small" />
            </Box>
            Pondération du score
            {/* Indicateur de calcul en cours */}
            {isComputing && (
              <Chip
                label="Calcul..."
                size="small"
                color="primary"
                variant="filled"
                sx={{
                  ml: 1.5,
                  fontSize: '0.65rem',
                  height: 20,
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.6 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.6 },
                  },
                }}
              />
            )}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '0.9rem',
            }}
          >
            Ajustez l'importance relative des critères d'analyse
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 400 }}>
 
        
        {/* Première ligne : Couverture vs Taille */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ mb: 2 }}>
            <WeightSlider 
              label="Couverture" 
              value={coverageWeight} 
              onChange={onCoverageWeightChange}
              tooltip={
                <Box sx={{ p: 1, maxWidth: '400px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    📊 Pondération Couverture
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Définit l'importance accordée au pourcentage de transactions restantes que peut couvrir un rôle.
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Plus élevé :</strong> Privilégie les rôles qui couvrent le plus de transactions restantes
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Plus faible :</strong> Donne moins d'importance à la couverture dans le calcul final
                  </Typography>
                  
                  {/* Illustration */}
                  <Box sx={{ 
                    mt: 2, 
                    mb: 2, 
                    p: 1.5, 
                    bgcolor: 'background.default', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                      💡 Exemple concret :
                    </Typography>
                    
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Table des transactions par code :
                    </Typography>
                    
                    {/* Layout horizontal : Tableau à gauche, Résultats à droite */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                      {/* Tableau des transactions */}
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '38px 45px', 
                        gap: 0.2,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        flexShrink: 0
                      }}>
                        <Box sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>TCode</Box>
                        <Box sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>Usage</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>A</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>4</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>B</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>10</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>C</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>33</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>D</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>99</Box>
                      </Box>

                      {/* Résultats avec médailles à droite */}
                      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600, 
                          display: 'block', 
                          mb: 0.5, 
                          fontSize: '0.63rem',
                          lineHeight: 1.1
                        }}>
                          Le rôle optimal sera celui qui contient le plus de transactions utilisées :
                        </Typography>
                        <Box sx={{ fontSize: '0.58rem', lineHeight: 1.1 }}>
                          <Box sx={{ mb: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#4caf50', fontWeight: 600 }}>🥇 Rôle 1: </span>
                            <span style={{ color: '#4caf50', fontWeight: 600 }}>A B C </span>
                            <span> E F G I → 3 tx</span>
                          </Box>
                          <Box sx={{ mb: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#2196f3', fontWeight: 600 }}>🥈 Rôle 3: </span>
                            <span style={{ color: '#4caf50', fontWeight: 600 }}>B C</span>
                            <span> F → 2 tx</span>
                            
                          </Box>
                          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#9e9e9e', fontWeight: 600 }}>🥉 Rôle 2: </span>
                            <span style={{ color: '#4caf50', fontWeight: 600 }}>D</span>
                            <span> E F G → 1 tx</span>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Exemple : 50% = la couverture compte pour la moitié du score final
                  </Typography>
                </Box>
              }
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <WeightSlider 
              label="Transactions Utiles" 
              value={sizeWeight} 
              onChange={onSizeWeightChange}
              tooltip={
                <Box sx={{ p: 1, maxWidth: '400px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    📏 Pondération Transactions Utiles
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Définit l'importance accordée à l'efficacité d'un rôle (peu de transactions inutiles).
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Plus élevé :</strong> Privilégie les rôles "précis" avec peu de transactions non utilisées
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Plus faible :</strong> Accepte plus facilement les rôles avec des transactions non utilisées
                  </Typography>
                  
                  {/* Illustration */}
                  <Box sx={{ 
                    mt: 2, 
                    mb: 2, 
                    p: 1.5, 
                    bgcolor: 'background.default', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                      💡 Exemple concret :
                    </Typography>
                    
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Comparaison par efficacité :
                    </Typography>
                    
                    {/* Layout horizontal : Tableau à gauche, Résultats à droite */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                      {/* Tableau des transactions */}
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '38px 45px', 
                        gap: 0.2,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        flexShrink: 0
                      }}>
                        <Box sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>TCode</Box>
                        <Box sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>Usage</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>A</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>4</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>B</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>10</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>C</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>33</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>D</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>99</Box>
                      </Box>

                      {/* Résultats avec médailles à droite */}
                      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600, 
                          display: 'block', 
                          mb: 0.4, 
                          fontSize: '0.6rem',
                          lineHeight: 1.1
                        }}>
                          Le rôle optimal sera celui avec le moins de transactions inutiles :
                        </Typography>
                        <Box sx={{ fontSize: '0.55rem', lineHeight: 1.1 }}>
                          <Box sx={{ mb: 0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#4caf50', fontWeight: 600 }}>🥇 Rôle 3: </span>
                            <span>B C </span>
                            <span style={{ color: '#f44336' }}>F </span>
                            <span> → 1 tx non utile</span>
                          </Box>
                          <Box sx={{ mb: 0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#2196f3', fontWeight: 600 }}>🥈 Rôle 2: </span>
                            <span>D </span>
                            <span style={{ color: '#f44336' }}>E F G </span>
                            <span> → 3 tx non utiles</span>
                          </Box>
                          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#9e9e9e', fontWeight: 600 }}>🥉 Rôle 1: </span>
                            <span>A B C </span>
                            <span style={{ color: '#f44336' }}>E F G I </span>
                            <span> → 4 tx non utiles</span>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Évite les rôles "fourre-tout" qui ajoutent beaucoup de permissions inutiles
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>
        
        {/* Deuxième ligne : Usage */}
        <Box sx={{ mb: 2 }}>
            <WeightSlider 
              label="Usage" 
              value={usageWeight} 
              onChange={onUsageWeightChange}
              tooltip={
                <Box sx={{ p: 1, maxWidth: '400px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    📈 Pondération Usage (Fréquence)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Définit l'importance accordée à la fréquence d'utilisation des transactions couvertes.
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Plus élevé :</strong> Privilégie les rôles qui couvrent les transactions les plus utilisées
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Plus faible :</strong> Ignore la fréquence d'usage dans les recommandations
                  </Typography>
                  
                  {/* Illustration */}
                  <Box sx={{ 
                    mt: 2, 
                    mb: 2, 
                    p: 1.5, 
                    bgcolor: 'background.default', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                      💡 Exemple concret :
                    </Typography>
                    
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Comparaison par fréquence d'usage :
                    </Typography>
                    
                    {/* Layout horizontal : Tableau à gauche, Résultats à droite */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                      {/* Tableau des transactions */}
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '38px 45px', 
                        gap: 0.2,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        flexShrink: 0
                      }}>
                        <Box sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>TCode</Box>
                        <Box sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>Usage</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>A</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>4</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>B</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>10</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>C</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>33</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center' }}>D</Box>
                        <Box sx={{ bgcolor: 'success.main', color: 'success.contrastText', p: 0.2, textAlign: 'center', fontWeight: 600, backgroundColor: 'warning.main' }}>99</Box>
                      </Box>

                      {/* Résultats avec médailles à droite */}
                      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600, 
                          display: 'block', 
                          mb: 0.4, 
                          fontSize: '0.6rem',
                          lineHeight: 1.1
                        }}>
                          Le rôle optimal sera celui qui couvre les transactions les plus fréquentes :
                        </Typography>
                        <Box sx={{ fontSize: '0.55rem', lineHeight: 1.1 }}>
                          <Box sx={{ mb: 0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#4caf50', fontWeight: 600 }}>🥇 Rôle 2: </span>
                            <span style={{ color: '#ff9800', fontWeight: 600 }}>D</span>
                            <span> E F G → 99 exec</span>
                          </Box>
                          <Box sx={{ mb: 0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#2196f3', fontWeight: 600 }}>🥈 Rôle 1: </span>
                            <span style={{ color: '#ff9800', fontWeight: 600 }}>A B C</span>
                            <span> E F G I → 47 exec</span>
                          </Box>
                          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#9e9e9e', fontWeight: 600 }}>🥉 Rôle 3: </span>
                            <span style={{ color: '#ff9800', fontWeight: 600 }}>B C </span>
                            <span>F → 43 exec</span>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Optimise la sélection en priorisant les transactions critiques avec beaucoup d'exécutions
                  </Typography>
                </Box>
              }
          />
        </Box>
        

        {/* Section Licences - Masquée pour les analyses utilisateur */}
        {mode === 'roles' && (
          <>
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    color: theme.palette.primary.main,
                    '@keyframes rotateSettings': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                    animation: 'rotateSettings 8s linear infinite',
                    '&:hover': {
                      animation: 'rotateSettings 2s linear infinite',
                    },
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </Box>
                Licences
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '0.9rem',
                }}
              >
                Activer l'analyse des licences
              </Typography>
            </Box>

            <Box sx={{ mb: 3, mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showLicenses}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowLicensesChange?.(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 500,
                    color: 'text.primary',
                  }}>
                    Afficher l'analyse des licences
                  </Typography>
                }
                sx={{ 
                  mx: 0,
                  '& .MuiFormControlLabel-label': {
                    ml: 1,
                  },
                }}
              />
              {showLicenses && (
                <Typography variant="caption" sx={{ 
                  color: alpha(theme.palette.text.secondary, 0.8),
                  fontSize: '0.7rem',
                  lineHeight: 1.3,
                  display: 'block',
                  mt: 0.5,
                  ml: 4.5, // Aligner avec le texte du switch
                }}>
                  Les licences les plus chères seront calculées automatiquement pour chaque rôle métier
                </Typography>
              )}
            </Box>
          </>
        )}
        

      </Box>
    </Paper>
  );
} 


