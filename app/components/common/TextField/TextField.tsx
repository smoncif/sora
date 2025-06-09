'use client';

import React from 'react';
import { TextField as MuiTextField, StandardTextFieldProps } from '@mui/material';

/**
 * Interface des props du composant TextField
 * 
 * @property {boolean} [showCharCount] - Si true, affiche le nombre de caractères saisis en dessous du champ
 * @property {string} [variant] - Variante visuelle du champ ('outlined', 'filled', 'standard')
 * @property {boolean} [fullWidth] - Si true, le champ prendra toute la largeur disponible de son conteneur
 * @property {string | number} [value] - Valeur actuelle du champ
 * @property {object} [inputProps] - Props spécifiques à l'élément input interne
 * @property {string} [helperText] - Texte d'aide affiché sous le champ
 * @property {string} [label] - Libellé du champ
 * @property {string} [placeholder] - Texte d'exemple affiché quand le champ est vide
 * @property {function} [onChange] - Fonction appelée quand la valeur change
 * @property {boolean} [required] - Si true, le champ sera marqué comme requis
 * @property {boolean} [disabled] - Si true, le champ sera désactivé
 * @property {boolean} [error] - Si true, le champ sera affiché en état d'erreur
 */
export interface TextFieldProps extends StandardTextFieldProps {
  /** Si true, affiche le nombre de caractères saisis en dessous du champ */
  showCharCount?: boolean;
}

/**
 * Composant TextField personnalisé qui étend le TextField de Material-UI
 * avec des fonctionnalités supplémentaires comme le compteur de caractères.
 * 
 * Ce composant est une surcouche du composant TextField de Material-UI,
 * offrant une API cohérente avec les standards du projet tout en
 * conservant toutes les fonctionnalités de base de MUI.
 * 
 * @example
 * // Champ texte simple
 * <TextField label="Nom" />
 * 
 * // Champ texte avec compteur de caractères
 * <TextField
 *   label="Description"
 *   multiline
 *   rows={4}
 *   showCharCount
 *   placeholder="Entrez la description ici..."
 *   onChange={handleChange}
 * />
 * 
 * // Champ texte avec validation
 * <TextField
 *   label="Email"
 *   type="email"
 *   required
 *   error={!!emailError}
 *   helperText={emailError || "Nous ne partagerons jamais votre email"}
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 * />
 */
const TextField: React.FC<TextFieldProps> = ({
  variant = 'outlined',
  fullWidth = true,
  showCharCount = false,
  value = '',
  inputProps,
  helperText,
  ...props
}) => {
  // Calcul du nombre de caractères si nécessaire
  const charCount = showCharCount && typeof value === 'string' ? value.length : 0;
  
  // Afficher le compte de caractères dans le helperText si demandé
  const displayHelperText = showCharCount 
    ? helperText 
      ? `${helperText} (${charCount} caractères)`
      : `${charCount} caractères`
    : helperText;

  return (
    <MuiTextField
      variant={variant as 'outlined' | 'filled' | 'standard'}
      fullWidth={fullWidth}
      value={value}
      inputProps={inputProps}
      helperText={displayHelperText}
      {...props}
    />
  );
};

export default TextField; 

