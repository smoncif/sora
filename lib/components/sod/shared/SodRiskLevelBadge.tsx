/**
 * Badge coloré pour afficher le niveau de risque SoD
 * 
 * Affichage visuel avec code couleur :
 * - CRITICAL : Rouge vif 🔴
 * - HIGH : Orange 🟠
 * - MEDIUM : Jaune 🟡
 * - LOW : Gris ⚪
 */

'use client';

import React from 'react';
import { Chip, alpha, useTheme } from '@mui/material';
import { SodRiskLevel, SOD_RISK_LEVEL_COLORS } from 'lib/types/sodAnalysis';

/**
 * Labels français pour les niveaux de risque
 */
const RISK_LEVEL_LABELS: Record<SodRiskLevel, string> = {
  CRITICAL: 'Critique',
  HIGH: 'Élevé',
  MEDIUM: 'Moyen',
  LOW: 'Faible',
};

/**
 * Icônes pour les niveaux de risque
 */
const RISK_LEVEL_ICONS: Record<SodRiskLevel, string> = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '⚪',
};

export interface SodRiskLevelBadgeProps {
  /** Niveau de risque */
  level: SodRiskLevel;
  
  /** Afficher l'icône */
  showIcon?: boolean;
  
  /** Taille du badge */
  size?: 'small' | 'medium';
  
  /** Variante du badge */
  variant?: 'filled' | 'outlined';
  
  /** Props additionnelles pour le Chip */
  chipProps?: React.ComponentProps<typeof Chip>;
}

/**
 * Badge coloré pour afficher le niveau de risque SoD
 */
export const SodRiskLevelBadge: React.FC<SodRiskLevelBadgeProps> = ({
  level,
  showIcon = true,
  size = 'small',
  variant = 'filled',
  chipProps = {},
}) => {
  const theme = useTheme();
  
  const color = SOD_RISK_LEVEL_COLORS[level];
  const label = RISK_LEVEL_LABELS[level];
  const icon = RISK_LEVEL_ICONS[level];
  
  // Style personnalisé selon la variante
  const customStyles = variant === 'filled' ? {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    fontWeight: 600,
    borderRadius: 1,
    '&:hover': {
      backgroundColor: alpha(color, 0.8),
    },
  } : {
    borderColor: color,
    color: color,
    backgroundColor: alpha(color, 0.1),
    fontWeight: 600,
    borderWidth: 2,
    borderRadius: 1,
    '&:hover': {
      backgroundColor: alpha(color, 0.2),
    },
  };
  
  return (
    <Chip
      label={showIcon ? `${icon} ${label}` : label}
      size={size}
      variant={variant}
      sx={{
        ...customStyles,
        textTransform: 'none',
        letterSpacing: 0.5,
        ...chipProps?.sx,
      }}
      {...chipProps}
    />
  );
};

/**
 * Badge compact (icône seule)
 */
export const SodRiskLevelIcon: React.FC<{
  level: SodRiskLevel;
  size?: number;
}> = ({ level, size = 20 }) => {
  const icon = RISK_LEVEL_ICONS[level];
  
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={RISK_LEVEL_LABELS[level]}
    >
      {icon}
    </span>
  );
};

/**
 * Badge textuel avec couleur de fond
 */
export const SodRiskLevelText: React.FC<{
  level: SodRiskLevel;
  showIcon?: boolean;
}> = ({ level, showIcon = true }) => {
  const color = SOD_RISK_LEVEL_COLORS[level];
  const label = RISK_LEVEL_LABELS[level];
  const icon = RISK_LEVEL_ICONS[level];
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        backgroundColor: alpha(color, 0.15),
        color: color,
        fontWeight: 600,
        fontSize: '0.875rem',
      }}
    >
      {showIcon && <span>{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

