# 🔍 Guide d'Interprétation des Logs de Performance

**Date** : 2025-01-14  
**Objectif** : Diagnostiquer les performances de pagination avec logs intelligents

---

## 📊 LOGS DISPONIBLES

### 1. 🎨 [RENDER] - Tracker les Renders du Composant

```
🎨 [RENDER] SodAnalysisPage render #3
```

**Signification** :
- Compteur de renders du composant principal
- Chaque changement d'état déclenche un nouveau render
- **Attendu** : 1-2 renders par changement de page
- **⚠️ Problème** : > 3 renders par changement de page

---

### 2. 🔍 [MEMO] - Recalcul des Rôles

```
🔍 [MEMO] simpleRoles recalculé: {
  count: 39,
  duration: "0.05ms",
  timestamp: "2025-01-14..."
}
```

**Signification** :
- Le `useMemo` des rôles s'est recalculé
- **Attendu** : 1 fois au chargement initial, puis jamais (sauf nouvelle session)
- **⚠️ Problème** : Si ce log apparaît à chaque changement de page → références non stables

**Diagnostic** :
- ✅ **OK** : Apparaît 1 fois après parsing
- ❌ **PROBLÈME** : Apparaît à chaque changement de page

---

### 3. 🔍 [PAGINATION] - Changement de Page

```
🔍 [PAGINATION] Changement page simple: {
  from: 0,
  to: 1,
  timestamp: "2025-01-14..."
}
```

**Signification** :
- L'utilisateur a changé de page
- Début du processus de pagination
- Timestamp pour corréler avec autres logs

---

### 4. ⏱️ [STEP 1] - Mise à Jour État Page

```
⏱️ [STEP 1] setState page: 0.12ms
```

**Signification** :
- Temps pour exécuter `setSimpleRolePage(newPage)`
- **Attendu** : < 1ms (quasi-instantané)
- **⚠️ Problème** : > 5ms

**Diagnostic** :
- ✅ **EXCELLENT** : < 1ms
- ✅ **BON** : 1-5ms
- ⚠️ **LENT** : 5-20ms
- ❌ **TRÈS LENT** : > 20ms

---

### 5. 🔍 [SLICE] - Pagination Slice

```
🔍 [SLICE] paginatedSimpleRolesRaw: {
  page: 1,
  pageSize: 5,
  sliceRange: "5-10",
  resultCount: 5,
  duration: "0.03ms"
}
```

**Signification** :
- Temps pour faire `simpleRoles.slice(start, end)`
- **Attendu** : < 1ms (opération native ultra-rapide)
- **⚠️ Problème** : > 10ms → tableau non optimisé

**Diagnostic** :
- ✅ **EXCELLENT** : < 0.1ms
- ✅ **BON** : 0.1-1ms
- ⚠️ **LENT** : 1-10ms
- ❌ **TRÈS LENT** : > 10ms

---

### 6. ⚡ [CACHE HIT] - Cache Allégé

```
⚡ [CACHE HIT] allRestrictedActions depuis cache: {
  cacheKey: "0-39-0-0-0",
  cacheSize: 156,
  duration: "< 0.01ms"
}
```

**Signification** :
- Le cache de `allRestrictedActions` fonctionne !
- Pas de recalcul, retour instantané
- **Attendu** : À chaque changement de page (sauf si version change)

**Diagnostic** :
- ✅ **EXCELLENT** : Log apparaît à chaque pagination
- ❌ **PROBLÈME** : Log n'apparaît jamais → cache ne fonctionne pas

---

### 7. 🔄 [CACHE MISS] - Recalcul Nécessaire

```
🔄 [CACHE MISS] allRestrictedActions recalcul nécessaire: {
  oldKey: "0-39-0-0-0",
  newKey: "1-39-0-0-0"
}
```

**Signification** :
- Le cache est invalide, recalcul nécessaire
- **Attendu** : Seulement quand `version` change (actions delete/restrict)
- **⚠️ Problème** : Apparaît à chaque pagination → clé de cache invalide

**Diagnostic** :
- ✅ **OK** : Apparaît quand on delete/restrict une action
- ❌ **PROBLÈME** : Apparaît à chaque changement de page

---

### 8. ✅ [CALC] - Calcul allRestrictedActions

```
✅ [CALC] allRestrictedActions calculé: {
  totalRoles: 39,
  restrictedActionsFound: 156,
  duration: "23.45ms",
  cacheKey: "1-39-0-0-0"
}
```

**Signification** :
- Temps pour parcourir tous les rôles et calculer les restrictions
- **Attendu** : 10-50ms (calcul lourd)
- Devrait apparaître seulement après CACHE MISS

**Diagnostic** :
- ✅ **BON** : 10-30ms
- ⚠️ **LENT** : 30-100ms
- ❌ **TRÈS LENT** : > 100ms

---

### 9. 🔍 [APPLY] - Application État aux Rôles

```
🔍 [APPLY] applyStateToSimpleRoles: {
  inputCount: 5,
  outputCount: 5,
  version: 0,
  duration: "8.23ms",
  isRecalculated: true
}
```

**Signification** :
- Temps pour appliquer l'état (restrictions) aux 5 rôles de la page
- **Attendu** : 5-20ms pour 5 rôles
- **⚠️ Problème** : > 50ms

**Diagnostic** :
- ✅ **EXCELLENT** : < 10ms
- ✅ **BON** : 10-30ms
- ⚠️ **LENT** : 30-100ms
- ❌ **TRÈS LENT** : > 100ms

---

### 10. ⏱️ [STEP 2] - Prefetch Pages Adjacentes

```
⏱️ [STEP 2] Prefetch pages adjacentes: 2.34ms
```

**Signification** :
- Temps pour lancer le prefetch des pages suivantes
- **Attendu** : < 5ms (asynchrone, non-bloquant)
- **⚠️ Problème** : > 20ms

---

### 11. ✅ [TOTAL] - Temps Total Pagination

```
✅ [TOTAL] Changement de page complet: 45.67ms
```

**Signification** :
- Temps total du début à la fin du changement de page
- **Attendu** : < 50ms pour navigation fluide
- **⚠️ Problème** : > 100ms

**Diagnostic** :
- ✅ **EXCELLENT** : < 20ms (instantané)
- ✅ **BON** : 20-50ms (fluide)
- ⚠️ **ACCEPTABLE** : 50-100ms (visible mais OK)
- ❌ **LENT** : 100-300ms (lag visible)
- ❌ **TRÈS LENT** : > 300ms (inacceptable)

---

### 12. 📊 [RÉSUMÉ PAGINATION] - État Global

```
📊 [RÉSUMÉ PAGINATION] {
  render: 5,
  simpleRolesTotal: 39,
  compositeRolesTotal: 0,
  currentPage: 2,
  pageSize: 5,
  rolesOnPage: 5,
  cacheStatus: "ACTIVE"
}
```

**Signification** :
- Vue d'ensemble de l'état après render
- Nombre de renders cumulés
- État du cache

**Diagnostic** :
- ✅ **OK** : render augmente de 1-2 par pagination
- ❌ **PROBLÈME** : render augmente de 5+ par pagination

---

## 🎯 SCÉNARIOS DE DIAGNOSTIC

### Scénario A : Pagination Optimale (< 20ms)

```
🔍 [PAGINATION] Changement page simple: { from: 0, to: 1 }
⏱️ [STEP 1] setState page: 0.08ms
🔍 [SLICE] paginatedSimpleRolesRaw: { duration: "0.02ms" }
⚡ [CACHE HIT] allRestrictedActions depuis cache: { duration: "< 0.01ms" }
🔍 [APPLY] applyStateToSimpleRoles: { duration: "6.12ms" }
⏱️ [STEP 2] Prefetch pages adjacentes: 1.23ms
✅ [TOTAL] Changement de page complet: 18.45ms
📊 [RÉSUMÉ PAGINATION] { render: 3, cacheStatus: "ACTIVE" }
```

**Analyse** : ✅ PARFAIT - Tout fonctionne comme prévu !

---

### Scénario B : Cache Invalide (50-100ms)

```
🔍 [PAGINATION] Changement page simple: { from: 0, to: 1 }
⏱️ [STEP 1] setState page: 0.11ms
🔍 [MEMO] simpleRoles recalculé: { count: 39, duration: "0.04ms" } ⚠️
🔍 [SLICE] paginatedSimpleRolesRaw: { duration: "0.03ms" }
🔄 [CACHE MISS] allRestrictedActions recalcul nécessaire ⚠️
✅ [CALC] allRestrictedActions calculé: { duration: "32.67ms" } ⚠️
🔍 [APPLY] applyStateToSimpleRoles: { duration: "12.34ms" }
⏱️ [STEP 2] Prefetch pages adjacentes: 2.11ms
✅ [TOTAL] Changement de page complet: 87.23ms
📊 [RÉSUMÉ PAGINATION] { render: 6, cacheStatus: "ACTIVE" }
```

**Analyse** : ⚠️ PROBLÈME - Références des rôles changent à chaque pagination !
**Solution** : Vérifier que `useMemo` des rôles utilise la bonne dépendance

---

### Scénario C : Apply State Lent (> 100ms)

```
🔍 [PAGINATION] Changement page simple: { from: 0, to: 1 }
⏱️ [STEP 1] setState page: 0.09ms
🔍 [SLICE] paginatedSimpleRolesRaw: { duration: "0.02ms" }
⚡ [CACHE HIT] allRestrictedActions depuis cache: { duration: "< 0.01ms" }
🔍 [APPLY] applyStateToSimpleRoles: { duration: "156.78ms" } ❌
⏱️ [STEP 2] Prefetch pages adjacentes: 1.89ms
✅ [TOTAL] Changement de page complet: 234.56ms
```

**Analyse** : ❌ PROBLÈME - `applyStateToSimpleRoles` trop lent !
**Solution** : Vérifier que les dépendances de `useMemo` sont stables

---

### Scénario D : Trop de Renders (> 100ms)

```
🎨 [RENDER] SodAnalysisPage render #8
🎨 [RENDER] SodAnalysisPage render #9
🎨 [RENDER] SodAnalysisPage render #10
🎨 [RENDER] SodAnalysisPage render #11
🔍 [PAGINATION] Changement page simple: { from: 0, to: 1 }
...
📊 [RÉSUMÉ PAGINATION] { render: 11 } ❌
```

**Analyse** : ❌ PROBLÈME - Cascade de renders !
**Solution** : Vérifier que les callbacks sont mémorisés avec `useCallback`

---

## 🔬 CHECKLIST DE DIAGNOSTIC

### Étape 1 : Chargement Initial
- [ ] `🔍 [MEMO] simpleRoles recalculé` apparaît **1 fois**
- [ ] `🔄 [CACHE MISS] allRestrictedActions` apparaît **1 fois**
- [ ] `✅ [CALC] allRestrictedActions calculé` apparaît **1 fois**
- [ ] `🔍 [APPLY] applyStateToSimpleRoles` avec duration < 20ms

### Étape 2 : Premier Changement de Page (1 → 2)
- [ ] `🔍 [PAGINATION] Changement page` apparaît **1 fois**
- [ ] `⏱️ [STEP 1] setState page` < 1ms
- [ ] `🔍 [SLICE] paginatedSimpleRolesRaw` < 1ms
- [ ] `⚡ [CACHE HIT]` apparaît (PAS de CACHE MISS)
- [ ] `🔍 [APPLY] applyStateToSimpleRoles` < 30ms
- [ ] `✅ [TOTAL]` < 50ms
- [ ] `📊 [RÉSUMÉ]` render augmente de 1-2 maximum

### Étape 3 : Deuxième Changement de Page (2 → 3)
- [ ] Mêmes vérifications que Étape 2
- [ ] `⚡ [CACHE HIT]` doit toujours apparaître
- [ ] Temps similaires ou meilleurs

### Étape 4 : Action Utilisateur (Delete/Restrict)
- [ ] `🔄 [CACHE MISS]` apparaît (version change)
- [ ] `✅ [CALC]` recalcule les restrictions
- [ ] Après recalcul, pagination redevient rapide

---

## 🎯 INTERPRÉTATION RAPIDE

### ✅ COMPORTEMENT OPTIMAL

```
Changement page 1 → 2:
🔍 [PAGINATION] Changement page simple
⏱️ [STEP 1] setState page: 0.08ms
🔍 [SLICE] paginatedSimpleRolesRaw: { duration: "0.02ms" }
⚡ [CACHE HIT] allRestrictedActions
🔍 [APPLY] applyStateToSimpleRoles: { duration: "8.12ms" }
✅ [TOTAL] Changement de page complet: 18.34ms ← ✅ EXCELLENT !
```

**Conclusion** : Performance optimale, navigation instantanée ! 🚀

---

### ⚠️ COMPORTEMENT SOUS-OPTIMAL

```
Changement page 1 → 2:
🎨 [RENDER] #5
🎨 [RENDER] #6
🎨 [RENDER] #7 ← ⚠️ Trop de renders
🔍 [MEMO] simpleRoles recalculé ← ⚠️ Ne devrait pas se recalculer
🔍 [PAGINATION] Changement page simple
...
🔄 [CACHE MISS] allRestrictedActions ← ⚠️ Cache ne fonctionne pas
✅ [CALC] allRestrictedActions: { duration: "45.67ms" } ← ⚠️ Recalcul inutile
✅ [TOTAL] Changement de page complet: 156.78ms ← ❌ LENT
```

**Problèmes identifiés** :
1. Cascade de renders (3+)
2. `simpleRoles` se recalcule
3. Cache de `allRestrictedActions` ne fonctionne pas
4. Temps total > 100ms

---

## 🛠️ ACTIONS CORRECTIVES PAR SCÉNARIO

### Si "🔍 [MEMO] simpleRoles recalculé" apparaît trop souvent :
**Cause** : `sodWorkflow.state.session?.simpleRoles?.roles` change de référence  
**Solution** : Vérifier que `useSodSession` retourne la même référence depuis le cache

### Si "🔄 [CACHE MISS]" à chaque pagination :
**Cause** : `simpleRoles` ou `compositeRoles` change de référence  
**Solution** : Vérifier que les `useMemo` des rôles fonctionnent

### Si "🔍 [APPLY] applyStateToSimpleRoles" > 50ms :
**Cause** : Fonction `applyStateToSimpleRoles` trop lente  
**Solution** : Vérifier la complexité de la fonction dans `lib/utils/sodStateApplication.ts`

### Si "🎨 [RENDER]" augmente de 5+ par pagination :
**Cause** : Cascade de re-renders  
**Solution** : Vérifier que tous les callbacks utilisent `useCallback`

---

## 📈 MÉTRIQUES DE RÉFÉRENCE

| Métrique | Excellent | Bon | Acceptable | Lent | Très Lent |
|----------|-----------|-----|------------|------|-----------|
| **setState** | < 0.5ms | 0.5-1ms | 1-5ms | 5-20ms | > 20ms |
| **Slice** | < 0.1ms | 0.1-1ms | 1-10ms | 10-50ms | > 50ms |
| **Cache Hit** | < 0.01ms | - | - | - | - |
| **Calc Actions** | 10-30ms | 30-50ms | 50-100ms | 100-200ms | > 200ms |
| **Apply State** | < 10ms | 10-30ms | 30-50ms | 50-100ms | > 100ms |
| **TOTAL** | < 20ms | 20-50ms | 50-100ms | 100-300ms | > 300ms |
| **Renders** | 1-2 | 2-3 | 3-5 | 5-10 | > 10 |

---

## 🎯 OBJECTIF

**Cible de performance** :
- ✅ Total < 50ms
- ✅ Renders : 1-2 par pagination
- ✅ Cache Hit systématique
- ✅ Pas de recalcul de `simpleRoles`

**Si ces critères sont respectés** → Performance optimale ! 🚀

---

**Prochaine étape** : Lancer `npm run dev`, naviguer entre les pages, et analyser les logs dans la console.

