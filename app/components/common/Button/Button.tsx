'use client';

import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

/**
 * Interface des props du composant Button
 * 
 * @property {boolean} [fullWidth] - Si true, le bouton prendra toute la largeur disponible de son conteneur
 * @property {boolean} [loading] - Si true, le bouton sera désactivé pour indiquer un chargement en cours
 * @property {React.ReactNode} [children] - Contenu du bouton
 * @property {string} [variant] - Variante visuelle du bouton ('contained', 'outlined', 'text')
 * @property {string} [color] - Couleur du bouton ('primary', 'secondary', 'error', etc.)
 * @property {boolean} [disabled] - Si true, le bouton sera désactivé et non cliquable
 */
export interface ButtonProps extends MuiButtonProps {
  /** Si true, le bouton prendra toute la largeur disponible */
  fullWidth?: boolean;
  /** Si true, le bouton sera désactivé pour indiquer un chargement en cours */
  loading?: boolean;
}

/**
 * Composant Button personnalisé qui étend le Button de Material-UI
 * avec des fonctionnalités supplémentaires comme l'état de chargement.
 * 
 * Ce composant est une surcouche du composant Button de Material-UI,
 * offrant une API cohérente avec les standards du projet tout en
 * conservant toutes les fonctionnalités de base de MUI.
 * 
 * @example
 * // Bouton simple
 * <Button>Cliquez-moi</Button>
 * 
 * // Bouton avec état de chargement
 * <Button loading={isLoading} onClick={handleSubmit}>
 *   Soumettre
 * </Button>
 * 
 * // Bouton avec style personnalisé
 * <Button 
 *   variant="outlined" 
 *   color="secondary" 
 *   fullWidth 
 *   startIcon={<SaveIcon />}
 * >
 *   Enregistrer
 * </Button>
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'contained',
  color = 'primary',
  disabled,
  loading = false,
  fullWidth = false,
  ...props
}) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button; 

