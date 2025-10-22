# Analyse - Bouton "Exclure Rôle" Ne Fonctionne Plus

**Date :** 22 octobre 2025  
**Problème :** Le bouton "exclure rôle" ne fonctionne plus après migration TanStack Query

---

## 🔍 DIAGNOSTIC

### Problème Identifié

La mutation `excludeRoleMutation` existe dans `useSodMutations.ts`, mais elle **ne fait rien** :

```typescript
// lib/hooks/sod/useSodMutations.ts (lignes 220-223)
onMutate: async (params) => {
  await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
  const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

  // ❌ Pas de modification des données de session pour l'exclusion de rôle
  // ❌ L'exclusion est gérée uniquement par SodActionsContext

  return { previousSession };
},
```

**Conséquence :** Le clic sur le bouton déclenche la mutation, mais aucun changement n'est appliqué à la session TanStack Query.

---

## 🔧 CAUSE RACINE

### 1. `SodActionType` Incomplet

**Fichier :** `lib/utils/sodRulesApplication.ts` (ligne 383)

```typescript
// ❌ ACTUEL
export type SodActionType = 'DELETE_ACTION' | 'RESTRICT_ACTION' | 'RESTRICT_RESOURCE';

// ✅ DEVRAIT ÊTRE
export type SodActionType = 'DELETE_ACTION' | 'RESTRICT_ACTION' | 'RESTRICT_RESOURCE' | 'EXCLUDE_ROLE';
```

### 2. Logique d'Exclusion Non Implémentée

**Fichier :** `lib/utils/sodRulesApplication.ts`

Il manque :
- ✅ `excludedSimpleRolesMap` : **Existe déjà** (ligne 63)
- ✅ `getExcludedRoleKey()` : **Existe déjà** (ligne 98)
- ❌ `ExcludeRoleParams` interface : **N'existe pas**
- ❌ `applyExcludeRoleRules()` fonction : **N'existe pas**
- ❌ Case `'EXCLUDE_ROLE'` dans `applySodRulesToSession` : **N'existe pas**

### 3. Mutation Non Connectée

**Fichier :** `lib/hooks/sod/useSodMutations.ts` (ligne 221)

La mutation ne modifie **PAS** la session via `applySodRulesToSession`.

---

## 📋 RÈGLES DE GESTION - EXCLUSION DE RÔLE

### Logique Actuelle dans SodActionsContext (ligne 576-591)

```typescript
const toggleExcludeSimpleRole = useCallback((
  compositeRoleName: string,
  simpleRoleName: string
) => {
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  const isExcluded = excludedSimpleRolesRef.current.get(key);
  const newExcluded = !isExcluded;
  
  if (isExcluded) {
    excludedSimpleRolesRef.current.delete(key);  // ✅ DÉ-EXCLURE (TOGGLE)
  } else {
    excludedSimpleRolesRef.current.set(key, true);  // ✅ EXCLURE (TOGGLE)
  }
  
  incrementVersionDebounced();  // ⚠️ Force re-render
}, [getExcludedRoleKey, incrementVersionDebounced]);
```

### Règles Métier

1. **Mode TOGGLE** : Inverser l'état d'exclusion
   - Si exclu → Dé-exclure (supprimer de la Map)
   - Si non exclu → Exclure (ajouter à la Map)

2. **Clé utilisée** :
   ```typescript
   key = `${compositeRoleName}|${simpleRoleName}`
   ```

3. **Stockage** :
   ```typescript
   excludedSimpleRolesMap.set(key, true)
   // Valeur = true (booléen simple)
   ```

4. **Impact** :
   - Rôle exclu → **IGNORÉ** dans tous les calculs de remédiation
   - Rôle exclu → **NON AFFICHÉ** dans l'UI (ou grisé)
   - Rôle exclu → Ses actions **NE SONT PAS** comptées dans les agrégations

---

## 🔄 SOLUTION À IMPLÉMENTER

### Étape 1 : Ajouter le Type et l'Interface

**Fichier :** `lib/utils/sodRulesApplication.ts`

```typescript
// Ajouter 'EXCLUDE_ROLE' au type
export type SodActionType = 
  | 'DELETE_ACTION' 
  | 'RESTRICT_ACTION' 
  | 'RESTRICT_RESOURCE'
  | 'EXCLUDE_ROLE';  // ✅ NOUVEAU

// Créer l'interface
export interface ExcludeRoleParams {
  compositeRoleName: string;
  simpleRoleName: string;
}
```

### Étape 2 : Créer la Fonction d'Application

**Fichier :** `lib/utils/sodRulesApplication.ts`

```typescript
/**
 * Applique les règles d'exclusion de rôle simple (avec TOGGLE)
 * 
 * RÈGLE MÉTIER :
 * - Si déjà exclu → DÉ-EXCLURE (supprimer de la Map)
 * - Si non exclu → EXCLURE (ajouter à la Map)
 * 
 * @param session - Session SoD actuelle
 * @param params - Paramètres de l'exclusion
 * @returns Session inchangée (exclusion n'affecte pas la session brute, seulement les calculs)
 */
function applyExcludeRoleRules(
  session: SodAnalysisSession, 
  params: ExcludeRoleParams
): SodAnalysisSession {
  const { compositeRoleName, simpleRoleName } = params;
  
  // ✅ ÉTAPE 1 : Toggle dans la Map globale
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  const isCurrentlyExcluded = excludedSimpleRolesMap.get(key) || false;
  
  if (isCurrentlyExcluded) {
    // DÉ-EXCLURE
    excludedSimpleRolesMap.delete(key);
  } else {
    // EXCLURE
    excludedSimpleRolesMap.set(key, true);
  }
  
  // ✅ ÉTAPE 2 : Retourner la session INCHANGÉE
  // L'exclusion n'affecte PAS la session brute, seulement :
  // - Les calculs de remédiation (qui lisent excludedSimpleRolesMap)
  // - L'affichage UI (via isExcluded dans les composants)
  return session;
}
```

### Étape 3 : Ajouter le Case dans applySodRulesToSession

**Fichier :** `lib/utils/sodRulesApplication.ts`

```typescript
export function applySodRulesToSession(
  session: SodAnalysisSession, 
  action: SodActionType,
  params: DeleteActionParams | RestrictActionParams | RestrictResourceParams | ExcludeRoleParams
): SodAnalysisSession {
  
  if (!session) {
    console.warn('⚠️ [SOD RULES] Session non trouvée');
    return session;
  }

  buildActionResourcesMap(session);

  let result: SodAnalysisSession;

  switch (action) {
    case 'DELETE_ACTION':
      result = applyDeleteActionRules(session, params as DeleteActionParams);
      break;
    case 'RESTRICT_ACTION':
      result = applyRestrictActionRules(session, params as RestrictActionParams);
      break;
    case 'RESTRICT_RESOURCE':
      result = applyRestrictResourceRules(session, params as RestrictResourceParams);
      break;
    case 'EXCLUDE_ROLE':  // ✅ NOUVEAU
      result = applyExcludeRoleRules(session, params as ExcludeRoleParams);
      break;
    default:
      console.warn('⚠️ [SOD RULES] Action non supportée:', action);
      return session;
  }

  return result;
}
```

### Étape 4 : Mettre à Jour la Mutation

**Fichier :** `lib/hooks/sod/useSodMutations.ts`

```typescript
const excludeRoleMutation = useMutation({
  mutationFn: async (params: { compositeRoleName: string; simpleRoleName: string }) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...params, timestamp: new Date().toISOString() };
  },
  onMutate: async (params) => {
    await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
    const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

    // ✅ NOUVEAU : Appliquer l'exclusion via sodRulesApplication
    queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
      if (!oldSession) {
        return oldSession;
      }
      
      return applySodRulesToSession(oldSession, 'EXCLUDE_ROLE', params);
    });

    return { previousSession };
  },
  onError: (err, params, context) => {
    if (context?.previousSession) {
      queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ 
      queryKey: ['sod', sessionId, 'roles'], 
      exact: false 
    });
  }
});
```

---

## 🎯 POINTS CRITIQUES

### Point 1 : Session Inchangée
L'exclusion **ne modifie PAS** la session brute. Elle affecte seulement :
- Les calculs de remédiation (qui lisent `excludedSimpleRolesMap`)
- L'affichage UI (icône, badge, style)

### Point 2 : Pas de Reconstruction Nécessaire
Contrairement aux autres actions (DELETE, RESTRICT), l'exclusion ne nécessite **PAS** de reconstruire les rôles/risques/fonctions de la session.

### Point 3 : Invalidation des Queries
L'`onSettled` invalide les queries pour forcer le re-render des composants qui affichent les rôles composites.

---

## 📊 COMPARAISON AVEC AUTRES ACTIONS

| Action | Modifie Maps | Modifie Session | Reconstruction |
|--------|--------------|-----------------|----------------|
| DELETE_ACTION | ✅ `deletedActionsMap` | ✅ Oui | ✅ Oui (applyDeleteActionToRole) |
| RESTRICT_ACTION | ✅ `restrictedActionsMap` | ✅ Oui | ✅ Oui (applyRestrictActionToRole) |
| RESTRICT_RESOURCE | ✅ `restrictedResourcesMap` | ✅ Oui | ✅ Oui (applyRestrictResourceToRole) |
| **EXCLUDE_ROLE** | ✅ `excludedSimpleRolesMap` | ❌ **NON** | ❌ **NON** |

**⚠️ DIFFÉRENCE CLÉ :** `EXCLUDE_ROLE` modifie **UNIQUEMENT** la Map, pas la session !

---

## ✅ PLAN DE CORRECTION

1. Ajouter `'EXCLUDE_ROLE'` à `SodActionType`
2. Créer `ExcludeRoleParams` interface
3. Créer `applyExcludeRoleRules()` fonction (simple TOGGLE)
4. Ajouter case `'EXCLUDE_ROLE'` dans `applySodRulesToSession`
5. Mettre à jour `applySodRulesToSession` signature pour accepter `ExcludeRoleParams`
6. Mettre à jour `excludeRoleMutation.onMutate` pour appeler `applySodRulesToSession`
7. Tester l'exclusion/dé-exclusion

**Temps estimé :** 15 minutes  
**Complexité :** Faible

---

**Voulez-vous que je procède aux corrections maintenant ?** 🚀

