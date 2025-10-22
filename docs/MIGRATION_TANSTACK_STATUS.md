# État de la Migration : SodActionsContext → TanStack Query

**Date :** 22 octobre 2025  
**Statut :** ✅ Migration majeure complétée - Finalisation en cours

---

## 📊 Vue d'ensemble

### Architecture Actuelle

```
┌─────────────────────────────────────────────────────────────────┐
│                     TANSTACK QUERY (Cache)                      │
│                  ✅ Source unique de vérité                     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │   Mutations       │
                    │   - deleteAction  │
                    │   - restrictAction│
                    │   - restrictResource│
                    └─────────┬─────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SODRULES APPLICATION (Logique métier)              │
│                     lib/utils/sodRulesApplication.ts            │
│                                                                 │
│  Maps Globales (Single Source of Truth) :                      │
│  ✅ deletedActionsMap        : Map<string, boolean>            │
│  ✅ restrictedActionsMap      : Map<string, {...}>             │
│  ✅ restrictedResourcesMap    : Map<string, Set<string>>       │
│  ✅ actionResourcesMap        : Map<string, {...}>             │
│  ✅ excludedSimpleRolesMap    : Map<string, boolean>           │
│                                                                 │
│  Fonctions principales :                                        │
│  ✅ applySodRulesToSession()                                   │
│  ✅ applyDeleteActionRules()      (avec TOGGLE)                │
│  ✅ applyRestrictActionRules()    (avec TOGGLE)                │
│  ✅ applyRestrictResourceRules()  (avec TOGGLE + FORCE)        │
│  ✅ forceResourceRestrictionState() (pour "restreindre tout")  │
│  ✅ applyResourceRestriction()    (pour clics individuels)     │
│                                                                 │
│  Fonctions de reconstruction session :                          │
│  ✅ applyDeleteActionToRole()                                  │
│  ✅ applyRestrictActionToRole()                                │
│  ✅ applyRestrictResourceToRole()                              │
│  ✅ applyDeleteActionToCompositeRole()                         │
│  ✅ applyRestrictActionToCompositeRole()                       │
│  ✅ applyRestrictResourceToCompositeRole()                     │
│                                                                 │
│  Utilitaires :                                                  │
│  ✅ buildActionResourcesMap()                                  │
│  ✅ isActionRestricted() (direct + indirect)                   │
│  ✅ isResourceRestricted()                                     │
│  ✅ updateActionRestrictionState() (ex-cleanupActionIfNeeded)  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              │ Lit depuis
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     COMPOSANTS UI                               │
│                                                                 │
│  ✅ SodActionItem.tsx           (React.memo optimisé)          │
│  ✅ SodResourceItem.tsx         (appels séparés par ext res)   │
│  ✅ SodSimpleRoleCard.tsx                                      │
│  ✅ SodSimpleRoleInCompositeItem.tsx (bouton "restreindre tout")│
│  ✅ SodCompositeRoleCard.tsx                                   │
│  ✅ SodRiskSection.tsx                                         │
│  ✅ SodCompositeRiskSection.tsx                                │
│  ✅ SodRemediationTable.tsx                                    │
│  ✅ SodFunctionGrid.tsx                                        │
│  ✅ SodCompositeFunctionGrid.tsx                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Fonctionnalités Migrées

### 1. Suppression d'Action (DELETE_ACTION)
- ✅ Mutation TanStack Query implémentée
- ✅ Logique de TOGGLE (supprimer/restaurer)
- ✅ Règle métier : S_TCODE supprimées, autres ressources **restreintes**
- ✅ Propagation : Restauration → Dé-restriction automatique
- ✅ Lecture depuis `deletedActionsMap`

### 2. Restriction d'Action (RESTRICT_ACTION)
- ✅ Mutation TanStack Query implémentée
- ✅ Logique de TOGGLE (restreindre/dérestreindre)
- ✅ Délégation à `forceResourceRestrictionState`
- ✅ Propagation : Restriction → Ressources non-S_TCODE restreintes
- ✅ Propagation : Dé-restriction → Ressources dé-restreintes
- ✅ Lecture depuis `restrictedActionsMap` (direct + indirect via ressources)

### 3. Restriction de Ressource (RESTRICT_RESOURCE)
- ✅ Mutation TanStack Query implémentée
- ✅ **Deux modes** :
  - **Mode TOGGLE** : Clic individuel sur une ressource (`applyResourceRestriction`)
  - **Mode FORCE** : Bouton "restreindre tout" (`forceResourceRestrictionState`)
- ✅ Paramètre `shouldRestrict?: boolean` pour différencier les modes
- ✅ Propagation globale : Restriction d'une ressource/valeur → Toutes les instances
- ✅ Nettoyage automatique : `updateActionRestrictionState` pour actions parentes
- ✅ Lecture depuis `restrictedResourcesMap`

### 4. Exclusion de Rôle Simple (EXCLUDE_ROLE)
- ✅ Mutation TanStack Query implémentée
- ✅ Lecture depuis `excludedSimpleRolesMap`

---

## 🔧 Corrections Appliquées

### Problème 1 : Transmission de `shouldRestrict`
- **Cause** : Wrappers dans `page.tsx` n'avaient que 6 paramètres au lieu de 7
- **Solution** : ✅ Ajout de `shouldRestrict?: boolean` dans :
  - `handleRestrictResourceWrapped`
  - `handleCompositeRestrictResourceWrapped`

### Problème 2 : Propagation des Restrictions
- **Cause** : Reconstruction de session ne lisait pas correctement depuis les Maps
- **Solution** : ✅ Correction de `applyRestrictActionToRole` et `applyRestrictActionToCompositeRole`
- **Amélioration** : ✅ Reconstruire **TOUTES** les actions du rôle (pas seulement celle cliquée)

### Problème 3 : Ressources à Plusieurs Externes (S_TRANSPRT)
- **Cause** : `actionResourcesMap` écrasait les ressources externes au lieu de les fusionner
- **Solution** : ✅ Implémentation de `mergeExternalResources` dans `buildActionResourcesMap`

### Problème 4 : Valeurs Mélangées (ACTVT + TTYPE)
- **Cause** : `extractAllValues` dans `SodResourceItem` fusionnait toutes les valeurs
- **Solution** : ✅ `handleRestrict` appelle `onRestrict` **séparément** pour chaque ressource externe

### Problème 5 : Normalisation des Valeurs
- **Cause** : Incohérence entre ajout et lecture des valeurs dans les Maps
- **Solution** : ✅ `normalizeValue` appliquée systématiquement partout

### Problème 6 : Mutual Exclusivity (Deleted ⊕ Restricted)
- **Cause** : Actions pouvaient être marquées deleted ET restricted
- **Solution** : ✅ Suppression automatique de l'état opposé lors des toggles

### Problème 7 : Cleanup des Actions
- **Cause** : Actions restaient marquées restreintes même si ressources dé-restreintes
- **Solution** : ✅ `updateActionRestrictionState` (ex-`cleanupActionIfNeeded`)
  - Vérifie restriction directe + indirecte
  - Met à jour `restrictedActionsMap` automatiquement

### Problème 8 : Tooltip "Restreindre Tout"
- **Cause** : Logique du tooltip différente de la logique du bouton
- **Solution** : ✅ Harmonisation de `buttonMode` et `handleRestrictAllActions`

---

## 🎯 Fonctionnalités Opérationnelles

### Étape 1 - Rôles Simples
- ✅ Supprimer action (TOGGLE)
- ✅ Restreindre action (TOGGLE)
- ✅ Restreindre ressource (TOGGLE)
- ✅ Propagation action → ressources
- ✅ Propagation ressource → actions (indirect)
- ✅ Propagation globale des ressources/valeurs

### Étape 2 - Rôles Composites
- ✅ Supprimer action (TOGGLE)
- ✅ Restreindre action (TOGGLE)
- ✅ Restreindre ressource (TOGGLE)
- ✅ **Restreindre tout** (MODE FORCE) 🎉
- ✅ **Dérestreindre tout** (MODE FORCE) 🎉
- ✅ Exclure rôle simple
- ✅ Propagation complète
- ✅ Tooltip dynamique

### Debug Panel
- ✅ Comparaison Maps vs Session vs UI
- ✅ Détection des divergences
- ✅ Affichage des valeurs normalisées
- ✅ Comptage des actions/ressources restreintes

---

## ⚠️ Dépendances Restantes au Context

Le `SodActionsContext` est **encore utilisé** pour :

### Fonctions de Calcul de Remédiation
- `calculateRiskRemediation()` - Calcule si un risque est remedié
- `calculateCompositeRiskRemediation()` - Version pour rôles composites
- `calculateFunctionRemediation()` - Calcule si une fonction est remediée
- `calculateCompositeFunctionRemediation()` - Version pour rôles composites
- `calculateRoleRemediation()` - Calcule si un rôle est remedié
- `calculateCompositeRoleRemediation()` - Version pour rôles composites

### Problème Actuel

Ces fonctions lisent depuis les **Refs du contexte** :
```typescript
deletedActionsRef.current.get(key)
restrictedActionsRef.current.get(key)
restrictedResourcesRef.current.get(key)
```

Mais ces Refs **ne sont plus synchronisées** avec les Maps globales de `sodRulesApplication.ts` !

---

## 🔄 Migration Restante

### Option 1 : Migrer les Fonctions de Remédiation vers sodRulesApplication.ts
**Avantages :**
- ✅ Lecture depuis les Maps globales (source unique)
- ✅ Cohérence complète
- ✅ Plus de synchronisation nécessaire
- ✅ Suppression complète du contexte

**Inconvénients :**
- ⚠️ Nécessite migration des 6 fonctions
- ⚠️ Nécessite mise à jour de tous les appelants

### Option 2 : Synchroniser le Context avec TanStack Query
**Avantages :**
- ✅ Pas de changement dans les appelants
- ✅ Migration progressive

**Inconvénients :**
- ❌ Maintient deux sources de vérité
- ❌ Complexité de synchronisation
- ❌ Risque de divergence

### Option 3 : Créer des Hooks TanStack Query pour la Remédiation
**Avantages :**
- ✅ Architecture cohérente avec TanStack Query
- ✅ Cache des calculs de remédiation
- ✅ Optimisation des performances

**Inconvénients :**
- ⚠️ Nécessite refactoring complet
- ⚠️ Plus de temps de développement

---

## 📋 Plan de Finalisation Recommandé

### Phase 4A : Migrer les Fonctions de Remédiation (RECOMMANDÉ)

1. **Créer les fonctions dans sodRulesApplication.ts** :
   ```typescript
   export function calculateFunctionRemediation(roleName: string, actions: any[]): {...}
   export function calculateRiskRemediation(roleName: string, functions: any[]): {...}
   export function calculateRoleRemediation(roleName: string, risks: any[]): {...}
   export function calculateCompositeFunctionRemediation(compositeRoleName: string, func: any): {...}
   export function calculateCompositeRiskRemediation(compositeRoleName: string, functions: any[]): {...}
   export function calculateCompositeRoleRemediation(compositeRoleName: string, risks: any[]): {...}
   ```

2. **Modifier page.tsx** :
   - Importer les fonctions depuis `sodRulesApplication.ts`
   - Supprimer l'import et l'utilisation de `useSodActionsContext`

3. **Supprimer le Provider** :
   - Retirer `SodActionsProvider` de `app/dashboard/layout.tsx`

4. **Supprimer les fichiers** :
   - `lib/contexts/SodActionsContext.tsx`
   - `lib/contexts/SodActionsContextNew.tsx`

### Phase 4B : Tests Complets

1. **Tester tous les scénarios** :
   - Suppression/restauration d'action
   - Restriction/dé-restriction d'action
   - Restriction/dé-restriction de ressource
   - Bouton "restreindre tout"
   - Bouton "dérestreindre tout"
   - Exclusion de rôle simple
   - Calcul de remédiation

2. **Vérifier la cohérence** :
   - Maps vs Session vs UI
   - Propagation des restrictions
   - Nettoyage automatique

3. **Tests de performance** :
   - Pagination avec TanStack Query
   - Prefetching
   - Cache invalidation

---

## ✅ Règles Métier Implémentées

### Suppression d'Action
1. ✅ **S_TCODE** : Marquées comme `isDeleted: true`
2. ✅ **Autres ressources** : Marquées comme `isRestricted: true`
3. ✅ **Mutual exclusivity** : Supprimer → Retire la restriction
4. ✅ **Restauration** : Dé-restreint automatiquement les ressources

### Restriction d'Action
1. ✅ **Propagation** : Restreindre action → Restreindre ressources non-S_TCODE
2. ✅ **Mutual exclusivity** : Restreindre → Retire la suppression
3. ✅ **Dé-restriction** : Dé-restreint automatiquement les ressources
4. ✅ **Mode FORCE** : Utilisé par "restreindre tout"

### Restriction de Ressource
1. ✅ **Propagation globale** : Une ressource/valeur restreinte → Toutes les instances
2. ✅ **Nettoyage** : Dé-restriction ressource → Nettoyage actions parentes
3. ✅ **Restriction indirecte** : Action restreinte si ≥1 ressource non-S_TCODE restreinte
4. ✅ **S_TCODE immunité** : Jamais restreintes, seulement supprimées
5. ✅ **Ressources multiples externes** : Traitement séparé (ACTVT, TTYPE)
6. ✅ **Mode TOGGLE** : Clic individuel
7. ✅ **Mode FORCE** : Bouton "restreindre tout"

### Normalisation
1. ✅ Suppression des zéros initiaux : `'01'` → `'1'`
2. ✅ Uppercasing : `'piec'` → `'PIEC'`
3. ✅ Expansion des intervalles : `'01' to '92'` → `['1', '2', ..., '92']`

---

## 🎯 État Actuel vs Plan Initial

| Composant | Plan Initial | État Actuel | Statut |
|-----------|-------------|-------------|--------|
| **Maps Globales** | Répliquer architecture du context | ✅ Répliquées dans sodRulesApplication.ts | ✅ COMPLET |
| **Mutations TanStack Query** | 3 mutations principales | ✅ deleteAction, restrictAction, restrictResource, excludeRole | ✅ COMPLET |
| **UI Components** | Lire depuis session TanStack | ✅ Tous les composants migrés | ✅ COMPLET |
| **Propagation** | Action ↔ Ressources | ✅ Bidirectionnelle et globale | ✅ COMPLET |
| **Mode TOGGLE** | Supprimer/Restreindre | ✅ Tous les boutons | ✅ COMPLET |
| **Mode FORCE** | "Restreindre tout" | ✅ Paramètre shouldRestrict | ✅ COMPLET |
| **Debug Panel** | Comparaison Maps/Session/UI | ✅ Tableau comparatif complet | ✅ COMPLET |
| **Pagination** | Prefetching TanStack | ✅ useSodPagedRoles, useSodPagedCompositeRoles | ✅ COMPLET |
| **Calcul Remédiation** | ❓ Non spécifié | ⚠️ Encore dans SodActionsContext | ⚠️ À FINALISER |
| **Suppression Context** | Supprimer SodActionsContext | ⚠️ Encore présent (pour remédiation) | ⚠️ À FINALISER |

---

## 🚀 Prochaines Étapes Recommandées

### Étape 1 : Migrer les Fonctions de Remédiation
**Temps estimé :** 30-45 minutes  
**Priorité :** HAUTE

Créer dans `sodRulesApplication.ts` :
1. `calculateFunctionRemediation()`
2. `calculateRiskRemediation()`
3. `calculateRoleRemediation()`
4. `calculateCompositeFunctionRemediation()`
5. `calculateCompositeRiskRemediation()`
6. `calculateCompositeRoleRemediation()`

### Étape 2 : Mettre à Jour page.tsx
**Temps estimé :** 10 minutes  
**Priorité :** HAUTE

Remplacer les appels à `actionsContext.calculateXXX()` par les nouvelles fonctions exportées.

### Étape 3 : Supprimer le Context
**Temps estimé :** 5 minutes  
**Priorité :** HAUTE

1. Supprimer `SodActionsProvider` de `layout.tsx`
2. Supprimer les fichiers du contexte
3. Nettoyer les imports

### Étape 4 : Tests Complets
**Temps estimé :** 1 heure  
**Priorité :** CRITIQUE

Tests de tous les scénarios avant commit final.

---

## 📊 Métriques de Migration

| Métrique | Valeur |
|----------|--------|
| **Composants UI migrés** | 10/10 (100%) ✅ |
| **Mutations implémentées** | 4/4 (100%) ✅ |
| **Maps globales créées** | 5/5 (100%) ✅ |
| **Règles métier migrées** | 100% ✅ |
| **Fonctions utilitaires** | 15+ ✅ |
| **Logs de debug supprimés** | ~77 ✅ |
| **Context encore utilisé** | Oui (remédiation) ⚠️ |
| **Migration complète** | ~95% ⚠️ |

---

## 💡 Recommandation

**La migration est presque complète !** Il ne reste que les fonctions de calcul de remédiation à migrer pour atteindre 100% d'intégration TanStack Query et supprimer complètement le `SodActionsContext`.

**Action recommandée :** Procéder à la **Phase 4A** (migration des fonctions de remédiation) pour finaliser la migration et supprimer définitivement le contexte.

---

**Voulez-vous que je procède à la migration finale des fonctions de remédiation ?** 🚀

