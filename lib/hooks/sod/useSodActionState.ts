/**
 * Hook pour gérer l'état des actions SoD (suppression/restriction)
 * 
 * NOUVELLE VERSION : Restriction par valeurs (sous-ensembles)
 * 
 * La restriction se propage par:
 * - Clé: (roleName, resourceCode, externalResourceCode, valeurs[])
 * - Règle: Les sous-ensembles de valeurs sont automatiquement restreints
 * 
 * Optimisé avec Immer pour des performances maximales sur de gros datasets
 */

import { useCallback, useEffect, useRef } from 'react';
import { useImmer } from 'use-immer';
import { 
  SodSimpleRole, 
  SodCompositeRole, 
  SodAction,
  SodResource,
  SodExternalResource,
  SodSimpleRoleFunction,
  SodCompositeRoleFunction 
} from 'lib/types/sodAnalysis';

/**
 * Map globale des restrictions par valeurs
 * Key: "roleName|resourceCode|externalResourceCode"
 * Value: Set de valeurs restreintes
 */
type RestrictionMap = Map<string, Set<string>>;

export function useSodActionState(initialRoles: SodSimpleRole[] | SodCompositeRole[]) {
  const [roles, updateRoles] = useImmer(initialRoles);
  
  // Map des restrictions par valeurs (persistante entre renders)
  const restrictionsMapRef = useRef<RestrictionMap>(new Map());

  // Réinitialiser l'état UNIQUEMENT lors du premier chargement ou changement de fichier
  const previousLengthRef = useRef(initialRoles.length);
  
  useEffect(() => {
    const currentLength = initialRoles.length;
    const previousLength = previousLengthRef.current;
    
    // Réinitialiser UNIQUEMENT si :
    // 1. Nouveau fichier uploadé (passage de 0 à N rôles)
    // 2. Changement drastique du nombre de rôles (fichier différent)
    const isNewFileUpload = previousLength === 0 && currentLength > 0;
    const isDifferentFile = Math.abs(currentLength - previousLength) > 10;
    
    if (isNewFileUpload || isDifferentFile) {
      console.log('🔄 [RESET] Nouveau fichier détecté - Réinitialisation complète', { 
        previousLength, 
        currentLength,
        raison: isNewFileUpload ? 'Nouveau fichier' : 'Fichier différent'
      });
      updateRoles(initialRoles);
      restrictionsMapRef.current.clear();
    } else if (currentLength !== previousLength) {
      // Mise à jour légère (pagination, etc.) - SANS vider la Map
      console.log('♻️ [UPDATE] Mise à jour des rôles (Map préservée)', { 
        previousLength, 
        currentLength 
      });
      updateRoles(initialRoles);
    }
    
    previousLengthRef.current = currentLength;
  }, [initialRoles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Type guard pour vérifier si une fonction est simple (avec actions directes)
   */
  const isSimpleRoleFunction = (func: SodSimpleRoleFunction | SodCompositeRoleFunction): func is SodSimpleRoleFunction => {
    return 'actions' in func;
  };

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
   * Génère la clé de restriction pour une ressource
   */
  const getRestrictionKey = (roleName: string, resourceCode: string, externalResourceCode: string | null): string => {
    return `${roleName}|${resourceCode}|${externalResourceCode || 'NULL'}`;
  };

  /**
   * Extrait toutes les valeurs d'une ressource (normalisées + expansion des intervalles)
   */
  const extractValues = (resource: SodResource): string[] => {
    const allValues: string[] = [];
    
    for (const extRes of resource.externalResources || []) {
      for (const value of extRes.values || []) {
        // Cas 1 : Intervalle (valueTo existe et est différent de valueFrom)
        if (value.valueFrom && value.valueTo && value.valueFrom !== value.valueTo) {
          const expandedValues = expandInterval(value.valueFrom, value.valueTo);
          allValues.push(...expandedValues);
        }
        // Cas 2 : Valeur(s) simple(s) (peut contenir des virgules)
        else if (value.valueFrom) {
          const fromValues = value.valueFrom
            .split(',')
            .map((v: string) => normalizeValue(v))
            .filter(Boolean);
          allValues.push(...fromValues);
        }
      }
    }
    
    return allValues;
  };

  /**
   * Vérifie si un ensemble de valeurs est un sous-ensemble des valeurs restreintes
   */
  const isSubsetRestricted = (
    targetValues: string[],
    restrictedValues: Set<string>
  ): boolean => {
    if (restrictedValues.size === 0) return false;
    // Toutes les valeurs de target doivent être dans restricted
    return targetValues.length > 0 && targetValues.every(val => restrictedValues.has(val));
  };

  /**
   * Supprime une action et propage dans tout le rôle
   */
  const handleDeleteAction = useCallback((
    roleName: string, 
    _riskId: string, 
    actionCode: string
  ) => {
    updateRoles(draft => {
      const role = draft.find(r => r.roleName === roleName);
      if (!role || !role.risks) return;

      let modifiedCount = 0;
      const maxModifications = 10; // Limite de sécurité

      riskLoop: for (const risk of role.risks) {
        if (!risk.functions) continue;

        for (const func of risk.functions) {
          if (isSimpleRoleFunction(func) && func.actions) {
            // Rôle simple : actions directes
            for (const action of func.actions) {
              if (action.code === actionCode) {
                action.isDeleted = !action.isDeleted;
                action.isRestricted = false;
                modifiedCount++;
                if (modifiedCount >= maxModifications) break riskLoop;
              }
            }
          } else if ('simpleRoles' in func && func.simpleRoles) {
            // Rôle composite : actions dans simpleRoles
            for (const simpleRole of func.simpleRoles) {
              if (simpleRole.roleName === roleName && simpleRole.actions) {
                for (const action of simpleRole.actions) {
                  if (action.code === actionCode) {
                    (action as any).isDeleted = !(action as any).isDeleted;
                    (action as any).isRestricted = false;
                    modifiedCount++;
                    if (modifiedCount >= maxModifications) break riskLoop;
                  }
                }
              }
            }
          }
        }
      }
    });
  }, [updateRoles]);

  /**
   * Restreint une action (parent → enfants + mise à jour de la Map)
   */
  const handleRestrictAction = useCallback((
    roleName: string, 
    _riskId: string, 
    actionCode: string
  ) => {
    // Étape 1 : Trouver l'action et déterminer son état futur
    const role = roles.find(r => r.roleName === roleName);
    if (!role || !role.risks) return;

    let targetAction: any = null;
    let currentIsRestricted = false;

    // Chercher la première occurrence de l'action pour connaître son état actuel
    findAction: for (const risk of role.risks) {
      if (!risk.functions) continue;
      for (const func of risk.functions) {
        if (isSimpleRoleFunction(func) && func.actions) {
          for (const action of func.actions) {
            if (action.code === actionCode) {
              targetAction = action;
              currentIsRestricted = action.isRestricted || false;
              break findAction;
            }
          }
        } else if ('simpleRoles' in func && func.simpleRoles) {
          for (const simpleRole of func.simpleRoles) {
            if (simpleRole.roleName === roleName && simpleRole.actions) {
              for (const action of simpleRole.actions) {
                if (action.code === actionCode) {
                  targetAction = action;
                  currentIsRestricted = (action as any).isRestricted || false;
                  break findAction;
                }
              }
            }
          }
        }
      }
    }

    if (!targetAction) return;

    const willBeRestricted = !currentIsRestricted;

    console.log('🎬 [ACTION RESTRICT]', {
      actionCode,
      currentIsRestricted,
      willBeRestricted
    });

    // Étape 2 : Mettre à jour la Map globale
    if (targetAction.resources) {
      for (const resource of targetAction.resources) {
        if (resource.code !== 'S_TCODE') {
          const values = extractValues(resource);
          const key = getRestrictionKey(roleName, resource.code, resource.code);
          const restrictedValuesSet = restrictionsMapRef.current.get(key) || new Set<string>();

          if (willBeRestricted) {
            // Ajouter toutes les valeurs à la Map
            values.forEach(v => restrictedValuesSet.add(v));
            restrictionsMapRef.current.set(key, restrictedValuesSet);
            console.log('➕ [MAP UPDATE] Ajout des valeurs', {
              key,
              values,
              mapAprès: Array.from(restrictedValuesSet)
            });
          } else {
            // Retirer toutes les valeurs de la Map
            values.forEach(v => restrictedValuesSet.delete(v));
            if (restrictedValuesSet.size === 0) {
              restrictionsMapRef.current.delete(key);
            }
            console.log('➖ [MAP UPDATE] Retrait des valeurs', {
              key,
              values,
              mapAprès: Array.from(restrictedValuesSet)
            });
          }
        }
      }
    }

    // Étape 3 : Re-calculer tous les états du rôle
    updateRoles(draft => {
      const draftRole = draft.find(r => r.roleName === roleName);
      if (!draftRole || !draftRole.risks) return;

      for (const risk of draftRole.risks) {
        if (!risk.functions) continue;
        for (const func of risk.functions) {
          if (isSimpleRoleFunction(func) && func.actions) {
            for (const action of func.actions) {
              let actionHasRestrictedResource = false;

              if (action.resources) {
                for (const resource of action.resources) {
                  if (resource.code !== 'S_TCODE') {
                    const targetValues = extractValues(resource);
                    const key = getRestrictionKey(roleName, resource.code, resource.code);
                    const restrictedValuesSet = restrictionsMapRef.current.get(key) || new Set<string>();
                    const isRestricted = isSubsetRestricted(targetValues, restrictedValuesSet);
                    
                    resource.isRestricted = isRestricted;
                    if (isRestricted) {
                      resource.isDeleted = false;
                      actionHasRestrictedResource = true;
                    }
                  }
                }
              }

              // Enfant → Parent
              if (actionHasRestrictedResource) {
                action.isRestricted = true;
                action.isDeleted = false;
                // Si c'est l'action cliquée, marquer restrictedByAction
                if (action.code === actionCode) {
                  action.restrictedByAction = willBeRestricted;
                }
              } else {
                const hasOtherRestrictedResources = action.resources?.some(
                  r => r.code !== 'S_TCODE' && r.isRestricted
                );
                if (!hasOtherRestrictedResources) {
                  action.isRestricted = false;
                  action.restrictedByAction = false;
                }
              }
            }
          } else if ('simpleRoles' in func && func.simpleRoles) {
            for (const simpleRole of func.simpleRoles) {
              if (simpleRole.roleName === roleName && simpleRole.actions) {
                for (const action of simpleRole.actions) {
                  let actionHasRestrictedResource = false;

                  if ((action as any).resources) {
                    for (const resource of (action as any).resources) {
                      if (resource.code !== 'S_TCODE') {
                        const targetValues = extractValues(resource);
                        const key = getRestrictionKey(roleName, resource.code, resource.code);
                        const restrictedValuesSet = restrictionsMapRef.current.get(key) || new Set<string>();
                        const isRestricted = isSubsetRestricted(targetValues, restrictedValuesSet);
                        
                        resource.isRestricted = isRestricted;
                        if (isRestricted) {
                          resource.isDeleted = false;
                          actionHasRestrictedResource = true;
                        }
                      }
                    }
                  }

                  if (actionHasRestrictedResource) {
                    (action as any).isRestricted = true;
                    (action as any).isDeleted = false;
                    // Si c'est l'action cliquée, marquer restrictedByAction
                    if ((action as any).code === actionCode) {
                      (action as any).restrictedByAction = willBeRestricted;
                    }
                  } else {
                    const hasOtherRestrictedResources = (action as any).resources?.some(
                      (r: any) => r.code !== 'S_TCODE' && r.isRestricted
                    );
                    if (!hasOtherRestrictedResources) {
                      (action as any).isRestricted = false;
                      (action as any).restrictedByAction = false;
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }, [roles, updateRoles]);

  /**
   * Restreint une ressource spécifique et propage par valeurs
   * 
   * Logique:
   * 1. Enfant → Parent : La ressource restreinte rend l'action restreinte
   * 2. Propagation globale par valeurs dans tout le rôle
   * 
   * @param roleName - Nom du rôle
   * @param resourceCode - Code de la ressource (ex: S_ADMI_FCD)
   * @param externalResourceCode - Code de la ressource externe (ex: S_ADMI_FCD)
   * @param values - Valeurs de la ressource cliquée (ex: ["PADM"])
   */
  const handleRestrictResource = useCallback((
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    // Vérification de sécurité : values doit être un tableau
    if (!Array.isArray(values)) {
      console.error('handleRestrictResource: values is not an array', { roleName, resourceCode, externalResourceCode, values });
      return;
    }

    // Si aucune valeur, ne rien faire
    if (values.length === 0) {
      console.warn('handleRestrictResource: no values provided', { roleName, resourceCode, externalResourceCode });
      return;
    }

    // ⚠️ IMPORTANT : Gérer la Map EN DEHORS de updateRoles pour éviter le double passage
    const key = getRestrictionKey(roleName, resourceCode, externalResourceCode);
    const restrictedValuesSet = restrictionsMapRef.current.get(key) || new Set<string>();

    console.log('🚫 [RESTRICTION] Avant:', {
      key,
      valuesCliquées: values,
      mapActuelle: Array.from(restrictedValuesSet),
      tailleDeLaMap: restrictedValuesSet.size
    });

    // Vérifier si ces valeurs sont déjà restreintes
    const alreadyRestricted = values.every(v => restrictedValuesSet.has(v));

    if (!alreadyRestricted) {
      // Ajouter les valeurs à la map
      values.forEach(v => restrictedValuesSet.add(v));
      restrictionsMapRef.current.set(key, restrictedValuesSet);
      console.log('✅ [AJOUT]', {
        ajoutées: values,
        mapAprès: Array.from(restrictedValuesSet)
      });
    } else {
      // Retirer les valeurs de la map
      values.forEach(v => restrictedValuesSet.delete(v));
      if (restrictedValuesSet.size === 0) {
        restrictionsMapRef.current.delete(key);
      }
      console.log('❌ [RETRAIT]', {
        retirées: values,
        mapAprès: Array.from(restrictedValuesSet)
      });
    }

    // Étape 2 : Propager dans tout le rôle (MAINTENANT la Map est à jour)
    updateRoles(draft => {
      const role = draft.find(r => r.roleName === roleName);
      if (!role || !role.risks) return;

      for (const risk of role.risks) {
        if (!risk.functions) continue;
        for (const func of risk.functions) {
          if (isSimpleRoleFunction(func) && func.actions) {
            for (const action of func.actions) {
              let actionHasRestrictedResource = false;

              if (action.resources) {
                for (const resource of action.resources) {
                  if (resource.code === resourceCode && resource.code !== 'S_TCODE') {
                    // Vérifier si les valeurs de cette ressource sont un sous-ensemble
                    const targetValues = extractValues(resource);
                    const isRestricted = isSubsetRestricted(targetValues, restrictedValuesSet);
                    
                    resource.isRestricted = isRestricted;
                    if (isRestricted) {
                      resource.isDeleted = false;
                      actionHasRestrictedResource = true;
                    }
                  }
                }
              }

              // Enfant → Parent : Si au moins une ressource non-S_TCODE est restreinte, l'action l'est aussi
              if (actionHasRestrictedResource) {
                action.isRestricted = true;
                action.isDeleted = false;
                // NE PAS mettre restrictedByAction (restriction via ressource, pas via action)
                action.restrictedByAction = false;
              } else {
                // Vérifier s'il reste d'autres ressources restreintes
                const hasOtherRestrictedResources = action.resources?.some(
                  r => r.code !== 'S_TCODE' && r.isRestricted
                );
                if (!hasOtherRestrictedResources) {
                  action.isRestricted = false;
                  action.restrictedByAction = false;
                }
              }
            }
          } else if ('simpleRoles' in func && func.simpleRoles) {
            for (const simpleRole of func.simpleRoles) {
              if (simpleRole.roleName === roleName && simpleRole.actions) {
                for (const action of simpleRole.actions) {
                  let actionHasRestrictedResource = false;

                  if ((action as any).resources) {
                    for (const resource of (action as any).resources) {
                      if (resource.code === resourceCode && resource.code !== 'S_TCODE') {
                        const targetValues = extractValues(resource);
                        const isRestricted = isSubsetRestricted(targetValues, restrictedValuesSet);
                        
                        resource.isRestricted = isRestricted;
                        if (isRestricted) {
                          resource.isDeleted = false;
                          actionHasRestrictedResource = true;
                        }
                      }
                    }
                  }

                  if (actionHasRestrictedResource) {
                    (action as any).isRestricted = true;
                    (action as any).isDeleted = false;
                    // NE PAS mettre restrictedByAction (restriction via ressource, pas via action)
                    (action as any).restrictedByAction = false;
                  } else {
                    const hasOtherRestrictedResources = (action as any).resources?.some(
                      (r: SodResource) => r.code !== 'S_TCODE' && r.isRestricted
                    );
                    if (!hasOtherRestrictedResources) {
                      (action as any).isRestricted = false;
                      (action as any).restrictedByAction = false;
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }, [updateRoles]);

  return {
    roles,
    handleDeleteAction,
    handleRestrictAction,
    handleRestrictResource,
  };
}
