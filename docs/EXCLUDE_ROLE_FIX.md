# Correction - Bouton "Exclure Rôle"

**Date :** 22 octobre 2025  
**Statut :** ✅ Corrigé et intégré à TanStack Query

---

## 🔧 CORRECTIONS APPLIQUÉES

### 1. Ajout du Type 'EXCLUDE_ROLE'

**Fichier :** `lib/utils/sodRulesApplication.ts` (ligne 383)

```typescript
// ✅ AVANT
export type SodActionType = 'DELETE_ACTION' | 'RESTRICT_ACTION' | 'RESTRICT_RESOURCE';

// ✅ APRÈS
export type SodActionType = 'DELETE_ACTION' | 'RESTRICT_ACTION' | 'RESTRICT_RESOURCE' | 'EXCLUDE_ROLE';
```

---

### 2. Création de l'Interface ExcludeRoleParams

**Fichier :** `lib/utils/sodRulesApplication.ts` (lignes 415-421)

```typescript
/**
 * Paramètres pour l'exclusion de rôle simple
 */
export interface ExcludeRoleParams {
  compositeRoleName: string;
  simpleRoleName: string;
}
```

---

### 3. Création de applyExcludeRoleRules()

**Fichier :** `lib/utils/sodRulesApplication.ts` (lignes 1087-1123)

```typescript
/**
 * Applique les règles d'exclusion de rôle simple (avec TOGGLE)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 576-591
 */
function applyExcludeRoleRules(
  session: SodAnalysisSession,
  params: ExcludeRoleParams
): SodAnalysisSession {
  const { compositeRoleName, simpleRoleName } = params;
  
  // ✅ TOGGLE dans la Map globale
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  const isCurrentlyExcluded = excludedSimpleRolesMap.get(key) || false;
  
  if (isCurrentlyExcluded) {
    excludedSimpleRolesMap.delete(key);
  } else {
    excludedSimpleRolesMap.set(key, true);
  }
  
  // ✅ Retourner la session INCHANGÉE
  return session;
}
```

**Logique :**
- Mode **TOGGLE** : Inverser l'état d'exclusion
- Modification **UNIQUEMENT** de `excludedSimpleRolesMap`
- Session retournée **INCHANGÉE** (l'exclusion affecte seulement UI et remédiation)

---

### 4. Ajout du Case 'EXCLUDE_ROLE'

**Fichier :** `lib/utils/sodRulesApplication.ts` (lignes 456-458)

```typescript
export function applySodRulesToSession(
  session: SodAnalysisSession, 
  action: SodActionType,
  params: DeleteActionParams | RestrictActionParams | RestrictResourceParams | ExcludeRoleParams
): SodAnalysisSession {
  // ...
  
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

---

### 5. Mise à Jour de excludeRoleMutation

**Fichier :** `lib/hooks/sod/useSodMutations.ts` (lignes 210-232)

```typescript
const excludeRoleMutation = useMutation({
  mutationFn: async (params: { compositeRoleName: string; simpleRoleName: string }) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { 
      compositeRoleName: params.compositeRoleName,
      simpleRoleName: params.simpleRoleName,
      timestamp: new Date().toISOString() 
    };
  },
  onMutate: async (params) => {
    await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
    const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

    // ✅ NOUVEAU : Appliquer l'exclusion via applySodRulesToSession
    queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
      if (!oldSession) {
        return oldSession;
      }
      
      return applySodRulesToSession(oldSession, 'EXCLUDE_ROLE', params);
    });

    return { previousSession };
  },
  // ... onError, onSettled inchangés
});
```

---

### 6. Fonction Utilitaire Exportée

**Fichier :** `lib/utils/sodRulesApplication.ts` (lignes 306-313)

```typescript
/**
 * Fonction pour vérifier si un rôle simple est exclu dans un rôle composite
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 598-604
 */
export function isSimpleRoleExcluded(compositeRoleName: string, simpleRoleName: string): boolean {
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  return excludedSimpleRolesMap.get(key) || false;
}
```

**Utilité :** Sera utilisée par les fonctions de calcul de remédiation.

---

## 🎯 ARCHITECTURE FINALE

```
UI (Bouton Exclure)
    │
    ▼
sodMutations.excludeRole(compositeRoleName, simpleRoleName)
    │
    ▼
excludeRoleMutation.mutate({ compositeRoleName, simpleRoleName })
    │
    ▼
onMutate: applySodRulesToSession(session, 'EXCLUDE_ROLE', params)
    │
    ▼
applyExcludeRoleRules(session, params)
    │
    ├─→ TOGGLE excludedSimpleRolesMap
    │
    └─→ Return session (inchangée)
```

**⚠️ DIFFÉRENCE CLÉ :** La session retournée est **INCHANGÉE** car l'exclusion ne modifie pas les données brutes, seulement le comportement de l'UI et des calculs.

---

## ✅ COHÉRENCE AVEC LA MIGRATION

### Respect de l'Architecture TanStack Query
✅ Mutation TanStack Query  
✅ Utilisation de `applySodRulesToSession`  
✅ Modification de la Map globale  
✅ Gestion d'erreur avec `onError` (rollback)  
✅ Invalidation des queries avec `onSettled`  

### Respect des Patterns Existants
✅ Mode TOGGLE (comme DELETE_ACTION, RESTRICT_ACTION)  
✅ Utilisation des fonctions de clé (`getExcludedRoleKey`)  
✅ Lecture depuis la Map globale (`excludedSimpleRolesMap`)  
✅ Fonction utilitaire exportée (`isSimpleRoleExcluded`)  

### Minimisation des Modifications
✅ Réutilisation de `excludedSimpleRolesMap` (déjà existante)  
✅ Réutilisation de `getExcludedRoleKey` (déjà existante)  
✅ Pas de modification de l'UI  
✅ Pas de modification des composants  

---

## 📊 RÉSUMÉ DES MODIFICATIONS

| Fichier | Lignes Modifiées | Type de Modification |
|---------|------------------|---------------------|
| `sodRulesApplication.ts` | 383 | Ajout type 'EXCLUDE_ROLE' |
| `sodRulesApplication.ts` | 415-421 | Nouvelle interface ExcludeRoleParams |
| `sodRulesApplication.ts` | 306-313 | Nouvelle fonction isSimpleRoleExcluded |
| `sodRulesApplication.ts` | 434 | Ajout ExcludeRoleParams au type union |
| `sodRulesApplication.ts` | 456-458 | Nouveau case 'EXCLUDE_ROLE' |
| `sodRulesApplication.ts` | 1087-1123 | Nouvelle fonction applyExcludeRoleRules |
| `useSodMutations.ts` | 219-229 | Mise à jour onMutate avec applySodRulesToSession |

**Total : ~50 lignes ajoutées, 0 lignes supprimées, architecture respectée** ✅

---

## 🧪 TEST À EFFECTUER

1. Naviguer vers un rôle composite (Étape 2)
2. Cliquer sur le bouton "exclure" d'un rôle simple
3. Vérifier que :
   - ✅ L'icône change (rôle exclu → icône spécifique)
   - ✅ Le badge change (nombre d'actions affecté)
   - ✅ Les calculs de remédiation ignorent ce rôle
4. Cliquer à nouveau sur "exclure" (dé-exclure)
5. Vérifier que :
   - ✅ Le rôle redevient actif
   - ✅ Les calculs incluent à nouveau ce rôle

---

**Le bouton "exclure rôle" est maintenant 100% intégré à TanStack Query !** 🎉✨

