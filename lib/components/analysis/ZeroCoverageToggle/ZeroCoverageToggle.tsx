import React from 'react';
import { 
  Box, 
  FormControlLabel, 
  Switch, 
  Typography 
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  VisibilityOff as VisibilityOffIcon 
} from '@mui/icons-material';

interface ZeroCoverageToggleProps {
  businessRole: string;
  isChecked: boolean;
  zeroCoverageCount: number;
  onToggle: (businessRole: string, show: boolean) => void;
}

/**
 * Composant Switch indépendant pour afficher/masquer les rôles à 0% de couverture
 * Ce composant n'est PAS dans React.memo pour garantir la réactivité immédiate
 */
export const ZeroCoverageToggle: React.FC<ZeroCoverageToggleProps> = ({
  businessRole,
  isChecked,
  zeroCoverageCount,
  onToggle
}) => {
  
  const handleToggle = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(businessRole, event.target.checked);
  }, [businessRole, onToggle]);

  return (
    <FormControlLabel
      control={
        <Switch
          checked={isChecked}
          onChange={handleToggle}
          size="small"
        />
      }
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isChecked ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
          <Typography variant="caption">
            Afficher rôles 0% ({zeroCoverageCount})
          </Typography>
        </Box>
      }
      sx={{ mr: 2 }}
    />
  );
};

export default ZeroCoverageToggle; 