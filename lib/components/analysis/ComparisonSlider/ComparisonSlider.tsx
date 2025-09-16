import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Slide,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';
import { SimpleRole } from '../../../types';

export interface ComparisonSliderProps {
  isOpen: boolean;
  selectedRoles: SimpleRole[];
  onClose: () => void;
  onCompare: () => void;
  onRemoveRole: (roleId: string) => void;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  isOpen,
  selectedRoles,
  onClose,
  onCompare,
  onRemoveRole
}) => {
  const canCompare = selectedRoles.length >= 2;
  const isMaxSelection = selectedRoles.length >= 3;

  return (
    <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          maxHeight: '40vh',
          overflow: 'hidden'
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 3,
            borderRadius: '16px 16px 0 0',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderBottom: 'none'
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CompareArrowsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Comparaison des Rôles
              </Typography>
            </Box>
            
            <IconButton 
              onClick={onClose}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Content */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2 
          }}>
            {/* Instructions */}
            <Typography variant="body2" color="text.secondary">
              {selectedRoles.length === 0 && "Sélectionnez un rôle pour commencer la comparaison"}
              {selectedRoles.length === 1 && "Sélectionnez un deuxième rôle pour activer la comparaison"}
              {selectedRoles.length === 2 && "Vous pouvez comparer ces rôles ou ajouter un troisième"}
              {selectedRoles.length === 3 && "Maximum de 3 rôles sélectionnés pour la comparaison"}
            </Typography>

            {/* Selected Roles */}
            {selectedRoles.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Rôles sélectionnés ({selectedRoles.length}/3) :
                </Typography>
                
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1,
                  mb: 2 
                }}>
                  {selectedRoles.map((role, index) => (
                    <Chip
                      key={role.roleName}
                      label={role.roleName}
                      onDelete={() => onRemoveRole(role.roleName)}
                      color={index === 0 ? 'primary' : index === 1 ? 'secondary' : 'default'}
                      variant="outlined"
                      sx={{
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1rem'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              pt: 1
            }}>
              <Typography variant="caption" color="text.secondary">
                {isMaxSelection && "Les autres icônes de comparaison sont désactivées"}
                {!isMaxSelection && selectedRoles.length > 0 && `Vous pouvez sélectionner ${3 - selectedRoles.length} rôle(s) supplémentaire(s)`}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={onClose}
                  size="small"
                >
                  Fermer
                </Button>
                
                <Button
                  variant="contained"
                  onClick={onCompare}
                  disabled={!canCompare}
                  startIcon={<CompareArrowsIcon />}
                  size="small"
                >
                  Comparer {selectedRoles.length > 0 ? `(${selectedRoles.length})` : ''}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Slide>
  );
};

export default ComparisonSlider;
