/**
 * Composant pour afficher une ressource avec ses ressources externes et valeurs
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BlockIcon from '@mui/icons-material/Block';
// import FolderIcon from '@mui/icons-material/Folder'; // Supprimé
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Supprimé
import { SodResource } from 'lib/types/sodAnalysis';
// import { SodValueList } from './SodValueChip'; // Plus utilisé

export interface SodResourceItemProps {
  /** Ressource */
  resource: SodResource;
  
  /** Niveau d'indentation */
  level?: number;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Désactiver les boutons d'action (ex: rôle exclu) */
  disableButtons?: boolean;
  
  /** Callback pour restreindre la ressource */
  onRestrict?: (resourceCode: string, externalResourceCode: string, values: string[]) => void;
}

/**
 * Affiche une ressource avec ses ressources externes et valeurs
 * 🚀 OPTIMISÉ : Mémoïsé pour éviter les re-rendus inutiles
 */
export const SodResourceItem: React.FC<SodResourceItemProps> = React.memo(({
  resource,
  level = 0,
  defaultExpanded = false,
  disableButtons = false,
  onRestrict,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { code, description, externalResources, isDeleted, isRestricted } = resource;
  
  const hasExternalResources = externalResources.length > 0;
  const isTCode = code === 'S_TCODE'; // Ne pas permettre de restreindre S_TCODE
  
  /**
   * Normalise une valeur (retire les zéros devant pour les nombres, uppercase pour les lettres)
   */
  const normalizeValue = (value: string): string => {
    const trimmed = value.trim();
    
    // Si c'est un nombre pur, retirer les zéros devant
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10).toString(); // "01" → "1"
    }
    
    // Sinon, mettre en majuscules
    return trimmed.toUpperCase(); // "abc" → "ABC"
  };

  /**
   * Expand un intervalle en liste de valeurs
   */
  const expandInterval = (from: string, to: string): string[] => {
    const normFrom = normalizeValue(from);
    const normTo = normalizeValue(to);
    
    // Cas 1 : Intervalle numérique pur (01 → 05)
    if (/^\d+$/.test(normFrom) && /^\d+$/.test(normTo)) {
      const start = parseInt(normFrom, 10);
      const end = parseInt(normTo, 10);
      
      // Vérifier l'ordre croissant
      if (start > end) {
        console.warn('expandInterval: ordre inversé ignoré', { from, to });
        return [normFrom, normTo]; // Retourner tel quel
      }
      
      const values: string[] = [];
      for (let i = start; i <= end; i++) {
        values.push(i.toString());
      }
      return values;
    }
    
    // Cas 2 : Intervalle alphabétique pur (A → E)
    if (/^[A-Z]$/.test(normFrom) && /^[A-Z]$/.test(normTo)) {
      const start = normFrom.charCodeAt(0);
      const end = normTo.charCodeAt(0);
      
      // Vérifier l'ordre croissant
      if (start > end) {
        console.warn('expandInterval: ordre inversé ignoré', { from, to });
        return [normFrom, normTo]; // Retourner tel quel
      }
      
      const values: string[] = [];
      for (let i = start; i <= end; i++) {
        values.push(String.fromCharCode(i));
      }
      return values;
    }
    
    // Cas 3 : Alphanumérique ou types incompatibles → Ignorer (pas de propagation)
    console.warn('expandInterval: intervalle alphanumérique ou incompatible ignoré', { from, to });
    return [normFrom, normTo]; // Retourner les deux valeurs telles quelles
  };

  /**
   * Extrait toutes les valeurs de la ressource (pour la propagation)
   * Avec expansion des intervalles et normalisation
   * ✅ CORRECTION : Traiter toutes les ressources externes séparément
   */
  const extractAllValues = (): { externalResourceCode: string; values: string[] } => {
    const allValues: string[] = [];
    let extResCode = '';
    
    // Vérifier que externalResources existe et est un tableau
    if (!externalResources || !Array.isArray(externalResources) || externalResources.length === 0) {
      return { externalResourceCode: extResCode, values: allValues };
    }
    
    // ✅ CORRECTION : Traiter TOUTES les ressources externes
    for (const extRes of externalResources) {
      if (!extRes.values || !Array.isArray(extRes.values)) continue;
      
      // Prendre le code de la première ressource externe comme référence
      if (!extResCode) {
        extResCode = extRes.code || '';
      }
      
      // Extraire les valeurs de cette ressource externe spécifique
      for (const value of extRes.values) {
        // Cas 1 : Intervalle (valueTo existe et est différent de valueFrom)
        if (value && value.valueFrom && value.valueTo && value.valueFrom !== value.valueTo) {
          const expandedValues = expandInterval(value.valueFrom, value.valueTo);
          allValues.push(...expandedValues);
        }
        // Cas 2 : Valeur(s) simple(s) (peut contenir des virgules)
        else if (value && value.valueFrom) {
          const fromValues = value.valueFrom
            .split(',')
            .map((v: string) => normalizeValue(v))
            .filter(Boolean);
          allValues.push(...fromValues);
        }
      }
    }
    
    return { externalResourceCode: extResCode, values: allValues };
  };
  
  const handleRestrict = () => {
    if (!onRestrict) return;
    
    // ✅ CORRECTION : Appeler onRestrict pour CHAQUE ressource externe séparément
    externalResources.forEach((extRes) => {
      if (!extRes.values || !Array.isArray(extRes.values)) return;
      
      const values: string[] = [];
      
      // Extraire les valeurs de cette ressource externe spécifique
      for (const value of extRes.values) {
        // Cas 1 : Intervalle (valueTo existe et est différent de valueFrom)
        if (value && value.valueFrom && value.valueTo && value.valueFrom !== value.valueTo) {
          const expandedValues = expandInterval(value.valueFrom, value.valueTo);
          values.push(...expandedValues);
        }
        // Cas 2 : Valeur(s) simple(s) (peut contenir des virgules)
        else if (value && value.valueFrom) {
          const fromValues = value.valueFrom
            .split(',')
            .map((v: string) => normalizeValue(v))
            .filter(Boolean);
          values.push(...fromValues);
        }
      }
      
      // Appeler onRestrict pour cette ressource externe spécifique
      if (values.length > 0) {
        onRestrict(code, extRes.code, values);
      }
    });
  };
  
  return (
    <Box sx={{ ml: level * 2 }}>
      {/* Bloc unique regroupant ressource et ressources externes */}
      <Box
        sx={{
          borderRadius: 1.5,
          backgroundColor: isDeleted
            ? alpha(theme.palette.error.main, 0.08)
            : isRestricted
            ? alpha(theme.palette.warning.main, 0.08)
            : alpha(theme.palette.grey[300], 0.04),
          border: `1px solid ${
            isDeleted
              ? alpha(theme.palette.error.main, 0.3)
              : isRestricted
              ? alpha(theme.palette.warning.main, 0.3)
              : alpha(theme.palette.grey[300], 0.15)
          }`,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isDeleted
              ? alpha(theme.palette.error.main, 0.12)
              : isRestricted
              ? alpha(theme.palette.warning.main, 0.12)
              : alpha(theme.palette.grey[300], 0.08),
            border: `1px solid ${
              isDeleted
                ? alpha(theme.palette.error.main, 0.4)
                : isRestricted
                ? alpha(theme.palette.warning.main, 0.4)
                : alpha(theme.palette.grey[300], 0.25)
            }`,
          },
        }}
      >
        {/* En-tête de la ressource */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 2,
          }}
        >
          {/* Partie gauche : Expand + Code */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Icône expandable */}
            {hasExternalResources && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ p: 0.5 }}
              >
                {expanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            )}
            
            {!hasExternalResources && (
              <Box sx={{ width: 28 }} /> // Spacer
            )}
            
            {/* Code de la ressource */}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: theme.palette.grey[600],
                fontSize: '0.875rem',
              }}
            >
              {code}
            </Typography>
          </Box>

          {/* Partie droite : Bouton Restreindre (sauf pour S_TCODE) */}
          {!isTCode && onRestrict && (
            <Tooltip 
              title={
                disableButtons 
                  ? "Rôle exclu de l'analyse"
                  : isRestricted 
                    ? "Annuler la restriction" 
                    : "Restreindre cette ressource"
              } 
              arrow
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleRestrict}
                  disabled={disableButtons}
                  sx={{
                    p: 0.5,
                    color: theme.palette.warning.main,
                    backgroundColor: isRestricted ? alpha(theme.palette.warning.main, 0.15) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    },
                    '&:disabled': {
                      color: theme.palette.grey[400],
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
        
        {/* Ressources externes (dans le même bloc) */}
        {hasExternalResources && (
          <Collapse in={expanded} timeout="auto">
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {externalResources.map((externalResource, index: number) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1,
                    px: 2,
                    pl: 8,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  }}
                >
                  {/* Code de la ressource externe avec ":" et valeurs */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    <Box component="span" sx={{ color: theme.palette.grey[600], fontWeight: 600 }}>
                      {externalResource.code}
                    </Box>
                    {externalResource.values.length > 0 && (
                      <>
                        <Box component="span" sx={{ mx: 0.5 }}>:</Box>
                        {externalResource.values.map((val, idx: number) => {
                          const hasRange = val.valueTo && val.valueTo !== val.valueFrom;
                          if (hasRange) {
                            return `${val.valueFrom} → ${val.valueTo}`;
                          }
                          return val.valueFrom;
                        }).join(', ')}
                      </>
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        )}
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  // 🚀 Comparaison personnalisée : ne re-rendre que si la ressource change vraiment
  return (
    prevProps.resource.code === nextProps.resource.code &&
    prevProps.resource.isDeleted === nextProps.resource.isDeleted &&
    prevProps.resource.isRestricted === nextProps.resource.isRestricted &&
    prevProps.resource.externalResources === nextProps.resource.externalResources &&
    prevProps.disableButtons === nextProps.disableButtons &&
    prevProps.defaultExpanded === nextProps.defaultExpanded
  );
});

SodResourceItem.displayName = 'SodResourceItem';

