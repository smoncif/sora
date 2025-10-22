# Audit Final - Migration TanStack Query

**Date :** 22 octobre 2025  
**Objectif :** Vérifier la conformité avec le plan initial et identifier les optimisations finales

---

## 🎯 Résumé Exécutif

### ✅ Réalisations
- **95% de la migration complétée**
- **Toutes les mutations UI migrées vers TanStack Query**
- **Architecture Maps globales opérationnelle**
- **Bouton "restreindre tout" fonctionnel (MODE FORCE)**
- **Code nettoyé (77 logs supprimés)**

### ⚠️ Points Restants
- **SodActionsContext encore présent** (calcul de remédiation uniquement)
- **Fonctions extraites du contexte non utilisées** (dead code)
- **Synchronisation partielle** (risque de divergence future)

---

## 📊 Analyse Détaillée

### 1. Utilisation Actuelle du SodActionsContext

#### Dans `app/dashboard/analysis/sod/page.tsx`

**Fonctions extraites (ligne 79-90) :**
```typescript
const { 
  buildActionResourcesMap,      // ❌ NON UTILISÉE (existe dans sodRulesApplication.ts)
  toggleDeleteAction,            // ❌ NON UTILISÉE (remplacée par sodMutations.deleteAction)
  toggleRestrictAction,          // ❌ NON UTILISÉE (remplacée par sodMutations.restrictAction)
  toggleRestrictResource,        // ❌ NON UTILISÉE (remplacée par sodMutations.restrictResource)
  isActionDeleted,               // ❌ NON UTILISÉE (état dans session TanStack)
  isActionRestricted,            // ❌ NON UTILISÉE (état dans session TanStack)
  isResourceRestricted,          // ❌ NON UTILISÉE (état dans session TanStack)
  isSimpleRoleExcluded,          // ❌ NON UTILISÉE (état dans session TanStack)
  resetState,                    // ❌ NON UTILISÉE
  version                        // ❌ NON UTILISÉE
} = actionsContext;
```

**Fonctions réellement utilisées :**
```typescript
// Ligne 543
const remediation = actionsContext.calculateRiskRemediation(role.roleName, risk.functions);

// Ligne 555
const remediation = actionsContext.calculateCompositeRiskRemediation(role.roleName, risk.functions);
```

**Conclusion :** 
- ⚠️ **90% du contexte extrait n'est pas utilisé** (dead code)
- ⚠️ **Seulement 2 fonctions sur 12** sont réellement nécessaires

---

### 2. Divergence Potentielle Maps

#### Maps dans sodRulesApplication.ts (Source Unique)
```typescript
export const deletedActionsMap: Map<string, boolean>
export const restrictedActionsMap: Map<string, {...}>
export const restrictedResourcesMap: Map<string, Set<string>>
export const actionResourcesMap: Map<string, {...}>
export const excludedSimpleRolesMap: Map<string, boolean>
```

#### Refs dans SodActionsContext.tsx (Legacy)
```typescript
const deletedActionsRef = useRef<DeletedActionsMap>(new Map());
const restrictedActionsRef = useRef<RestrictedActionsMap>(new Map());
const restrictedResourcesRef = useRef<RestrictionMap>(new Map());
```

**Problème :**
- ❌ **Deux sources de vérité distinctes**
- ❌ **Pas de synchronisation** entre les Maps globales et les Refs du contexte
- ❌ **Calculs de remédiation lisent depuis les Refs (obsolètes)**
- ❌ **Risque de divergence** entre l'état réel (Maps) et les calculs (Refs)

---

### 3. Analyse des Fonctions de Remédiation

#### calculateFunctionRemediation (ligne 713)
**Utilise :**
- `deletedActionsRef.current.get(actionKey)` ❌
- `restrictedActionsRef.current.get(actionKey)` ❌
- `restrictedResourcesRef.current.get(resKey)` ❌

**Devrait utiliser :**
- `deletedActionsMap.get(actionKey)` ✅
- `restrictedActionsMap.get(actionKey)` ✅
- `restrictedResourcesMap.get(resKey)` ✅

#### calculateRiskRemediation (ligne 801)
**Dépend de :** `calculateFunctionRemediation` ❌

#### calculateCompositeFunction Remediation (ligne 876)
**Utilise :**
- `deletedActionsRef.current.get(actionKey)` ❌
- `restrictedActionsRef.current.get(actionKey)` ❌
- `restrictedResourcesRef.current.get(resKey)` ❌

#### calculateCompositeRiskRemediation (ligne 1030)
**Dépend de :** `calculateCompositeFunctionRemediation` ❌

---

## 🔧 Optimisations Recommandées

### Optimisation 1 : Supprimer Dead Code (URGENT)
**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Action :**
```typescript
// ❌ AVANT (lignes 79-90)
const { 
  buildActionResourcesMap,
  toggleDeleteAction, 
  // ... 8 autres fonctions non utilisées
} = actionsContext;

// ✅ APRÈS
const actionsContext = useSodActionsContext();
// Utiliser directement actionsContext.calculateRiskRemediation()
```

**Bénéfice :**
- Code plus lisible
- Moins de dépendances inutiles
- Performance légèrement améliorée

### Optimisation 2 : Migrer Fonctions de Remédiation (RECOMMANDÉ)
**Fichier :** `lib/utils/sodRulesApplication.ts`

**Action :**
1. Copier les 6 fonctions de calcul depuis `SodActionsContext.tsx`
2. Modifier pour lire depuis les Maps globales (au lieu des Refs)
3. Exporter les fonctions
4. Mettre à jour `page.tsx` pour utiliser les nouvelles fonctions

**Bénéfice :**
- ✅ Source unique de vérité
- ✅ Cohérence garantie
- ✅ Suppression complète du contexte
- ✅ Architecture 100% TanStack Query

### Optimisation 3 : Créer Hooks de Remédiation (OPTIONNEL)
**Fichier :** `lib/hooks/sod/useSodRemediation.ts`

**Action :**
Créer des hooks TanStack Query pour cacher les calculs de remédiation :
```typescript
export function useRiskRemediation(roleName: string, functions: any[]) {
  return useQuery({
    queryKey: ['sod', 'remediation', 'risk', roleName],
    queryFn: () => calculateRiskRemediation(roleName, functions),
    select: (data) => data,
  });
}
```

**Bénéfice :**
- Cache des calculs
- Optimisation des performances
- Architecture cohérente

---

## 🎯 Plan de Finalisation

### Option A : Migration Complète (RECOMMANDÉ)
**Temps total :** ~1 heure  
**Complexité :** Moyenne  
**Bénéfice :** Architecture 100% propre

1. ✅ Migrer les 6 fonctions de remédiation
2. ✅ Mettre à jour page.tsx
3. ✅ Supprimer SodActionsContext
4. ✅ Tests complets
5. ✅ Commit final

### Option B : Nettoyage Minimal (RAPIDE)
**Temps total :** ~15 minutes  
**Complexité :** Faible  
**Bénéfice :** Code propre, mais contexte maintenu

1. ✅ Supprimer les 8 fonctions extraites non utilisées
2. ✅ Garder uniquement calculateRiskRemediation et calculateCompositeRiskRemediation
3. ✅ Documenter la dépendance
4. ✅ Commit

---

## 🚨 Risques Identifiés

### Risque 1 : Divergence State (MOYEN)
**Problème :** Maps globales ≠ Refs contexte  
**Impact :** Calculs de remédiation potentiellement incorrects  
**Mitigation :** Migrer les fonctions vers sodRulesApplication.ts

### Risque 2 : Dead Code (FAIBLE)
**Problème :** 8 fonctions extraites mais non utilisées  
**Impact :** Confusion, maintenance difficile  
**Mitigation :** Supprimer les extractions inutiles

### Risque 3 : Double Provider (FAIBLE)
**Problème :** SodActionsProvider encore actif mais sous-utilisé  
**Impact :** Overhead mémoire minimal  
**Mitigation :** Option A (suppression) ou Option B (documentation)

---

## 🎉 Conclusion

La migration vers TanStack Query est **95% complétée** avec succès. L'architecture principale est opérationnelle, propre et performante. 

**Deux chemins possibles :**

1. **Migration complète** (1h) → Architecture 100% TanStack Query ✨
2. **Nettoyage rapide** (15 min) → Code propre, contexte documenté 📝

**Ma recommandation :** **Option A** pour une architecture cohérente et future-proof ! 🚀

