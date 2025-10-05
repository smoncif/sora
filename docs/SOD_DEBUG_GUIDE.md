# Guide de Debugging - Performance SoD

## 🎯 Objectif

Ce guide t'aide à interpréter les logs de debugging pour identifier **exactement** pourquoi la navigation est lente.

---

## 📋 Logs Implémentés

### DEBUG 1 : Changement de Contexte
```
╔════════════════════════════════════════════════════════════════
║ 🔄 [CONTEXT CHANGED] Page SoD
╠════════════════════════════════════════════════════════════════
║ Current Page: 2
║ Deleted Actions: 0
║ Restricted Actions: 0
║ Restricted Resources: 0
║ ⚠️  SI CE LOG APPARAIT À CHAQUE NAVIGATION → LE CONTEXTE CHANGE !
╚════════════════════════════════════════════════════════════════
```

**Quand il apparaît** : À chaque fois que `actionsContext` change de référence

**Diagnostic** :
- ✅ **Apparaît UNIQUEMENT au chargement initial** → Contexte stable ✅
- ❌ **Apparaît À CHAQUE changement de page** → **PROBLÈME : Le contexte change de référence !**

**Cause probable** : Pas de `useMemo` dans `SodActionsContext.tsx`

---

### DEBUG 2 : Pagination
```
╔════════════════════════════════════════════════════════════════
║ 📄 [PAGINATION] Simple Roles Raw
╠════════════════════════════════════════════════════════════════
║ Page: 2
║ Start: 5, End: 10
║ Sliced Roles: 5
║ Total Roles: 100
╚════════════════════════════════════════════════════════════════
```

**Quand il apparaît** : À chaque changement de page

**Diagnostic** :
- ✅ **Toujours présent** → Normal, c'est la pagination
- ⚠️ **Sliced Roles devrait être 5** (ou ROLES_PER_PAGE)

---

### DEBUG 3 : Application d'État
```
╔════════════════════════════════════════════════════════════════
║ 🔧 [STATE APPLICATION] Simple Roles
╠════════════════════════════════════════════════════════════════
║ Roles Processed: 5
║ Duration: 8.42ms
║ Context Size: 0
║ ⚠️  SI > 50ms → PROBLÈME DE PERFORMANCE !
╚════════════════════════════════════════════════════════════════
```

**Quand il apparaît** : À chaque changement de page

**Diagnostic** :
- ✅ **Duration < 20ms** → Application d'état rapide ✅
- ⚠️ **Duration 20-50ms** → Acceptable mais peut être optimisé
- ❌ **Duration > 50ms** → **PROBLÈME : Application d'état trop lente !**

**Cause probable** : Trop de calculs dans `applyStateToSimpleRoles`

---

### DEBUG 4 : Changement de Callbacks
```
╔════════════════════════════════════════════════════════════════
║ 🔄 [CALLBACK CHANGED] handleDeleteAction
╠════════════════════════════════════════════════════════════════
║ ⚠️  SI CE LOG APPARAIT À CHAQUE NAVIGATION → LES CALLBACKS CHANGENT !
╚════════════════════════════════════════════════════════════════
```

**Quand il apparaît** : À chaque fois que `handleDeleteAction` change de référence

**Diagnostic** :
- ✅ **Apparaît UNIQUEMENT au chargement initial** → Callbacks stables ✅
- ❌ **Apparaît À CHAQUE changement de page** → **PROBLÈME : Les callbacks changent !**

**Cause probable** : `actionsContext` change → `useCallback` recalcule → Nouveaux callbacks

---

### DEBUG 5 : Render du Composant
```
🎨 [RENDER] SodSimpleRoleCard - ROLE_001
```

**Quand il apparaît** : À chaque fois que le composant se rend

**Diagnostic** :
- ✅ **5 logs lors du changement de page** → Normal (5 nouveaux rôles)
- ❌ **10+ logs lors du changement de page** → **PROBLÈME : Trop de renders !**

**Cause probable** : `React.memo` ne fonctionne pas

---

### DEBUG 6 : Comparaison React.memo
```
╔════════════════════════════════════════════════════════════════
║ 🔍 [MEMO COMPARISON] SodSimpleRoleCard - ROLE_001
╠════════════════════════════════════════════════════════════════
║ Should NOT re-render: ❌ NON
╠════════════════════════════════════════════════════════════════
║ ✅ roleName same
║ ❌ risks same (référence)
║ ✅ defaultExpanded same
║ ❌ onDeleteAction same (référence)
║ ✅ onRestrictAction same (référence)
║ ✅ onRestrictResource same (référence)
╚════════════════════════════════════════════════════════════════
```

**Quand il apparaît** : Quand `React.memo` décide de re-rendre

**Diagnostic** :
- ✅ **Pas de log** → `React.memo` fonctionne, pas de re-render inutile ✅
- ❌ **Log avec "❌ risks same"** → **PROBLÈME : Les objets `risks` changent de référence !**
- ❌ **Log avec "❌ onDeleteAction same"** → **PROBLÈME : Les callbacks changent !**

---

## 🔬 Scénarios de Diagnostic

### Scénario 1 : Le Contexte Change (Le Plus Probable)

**Logs observés** :
```
1. 🔄 [CONTEXT CHANGED] Page SoD ← À CHAQUE navigation
2. 🔄 [CALLBACK CHANGED] handleDeleteAction ← À CHAQUE navigation
3. 🔍 [MEMO COMPARISON] ← "❌ onDeleteAction same"
4. 🎨 [RENDER] SodSimpleRoleCard ← TOUS les rôles
```

**Diagnostic** : Le contexte change de référence → Les callbacks changent → `React.memo` échoue → Tout se re-rend

**Solution** : Ajouter `useMemo` dans `SodActionsContext.tsx`

---

### Scénario 2 : Les Objets Changent de Référence

**Logs observés** :
```
1. 🔄 [CONTEXT CHANGED] Page SoD ← UNIQUEMENT au chargement
2. 🔄 [CALLBACK CHANGED] ← UNIQUEMENT au chargement
3. 🔍 [MEMO COMPARISON] ← "❌ risks same"
4. 🎨 [RENDER] SodSimpleRoleCard ← TOUS les rôles
```

**Diagnostic** : `applyStateToSimpleRoles` crée de nouveaux objets → Les références changent → `React.memo` échoue

**Solution** : Mémoïser les objets dans `applyStateToSimpleRoles` ou améliorer la comparaison

---

### Scénario 3 : Application d'État Lente

**Logs observés** :
```
1. 🔄 [CONTEXT CHANGED] Page SoD ← UNIQUEMENT au chargement
2. 🔧 [STATE APPLICATION] Duration: 150ms ← TROP LENT !
3. 🎨 [RENDER] SodSimpleRoleCard ← 5 rôles (normal)
```

**Diagnostic** : La pagination et les callbacks fonctionnent, mais `applyStateToSimpleRoles` est trop lent

**Solution** : Optimiser les calculs dans `applyStateToSimpleRoles`

---

### Scénario 4 : Tout Fonctionne Bien

**Logs observés** :
```
1. 🔄 [CONTEXT CHANGED] Page SoD ← UNIQUEMENT au chargement
2. 📄 [PAGINATION] ← À chaque navigation (normal)
3. 🔧 [STATE APPLICATION] Duration: 8ms ← Rapide ✅
4. 🎨 [RENDER] SodSimpleRoleCard ← 5 rôles (normal)
5. Pas de [MEMO COMPARISON] ← React.memo fonctionne ✅
```

**Diagnostic** : Tout fonctionne parfaitement ! Navigation instantanée ✅

---

## 📊 Tableau de Diagnostic Rapide

| Log | Fréquence Normale | Fréquence Problématique | Cause Probable |
|-----|-------------------|-------------------------|----------------|
| **CONTEXT CHANGED** | 1x (chargement) | À chaque navigation | Pas de `useMemo` |
| **PAGINATION** | À chaque navigation | - | Normal |
| **STATE APPLICATION** | À chaque navigation (< 20ms) | > 50ms | Calculs lourds |
| **CALLBACK CHANGED** | 1x (chargement) | À chaque navigation | Contexte change |
| **RENDER** | 5x par navigation | 10+ par navigation | `React.memo` échoue |
| **MEMO COMPARISON** | Jamais (si stable) | À chaque navigation | Références changent |

---

## 🎯 Procédure de Test

### Étape 1 : Lancer l'App
```bash
npm run dev
```

### Étape 2 : Ouvrir la Console
- F12 → Onglet "Console"
- Vider la console (Ctrl+L)

### Étape 3 : Charger un Fichier
- Va sur `/dashboard/analysis/sod`
- Charge un fichier SoD

### Étape 4 : Observer les Logs Initiaux
- Note combien de fois chaque log apparaît
- **Attendu** : Beaucoup de logs (chargement initial)

### Étape 5 : Vider la Console
- Ctrl+L pour vider

### Étape 6 : Naviguer vers Page 2
- Clique sur "Page 2"
- **OBSERVE LES LOGS**

### Étape 7 : Analyser les Résultats

**Si tu vois** :
```
🔄 [CONTEXT CHANGED] Page SoD
🔄 [CALLBACK CHANGED] handleDeleteAction
🔍 [MEMO COMPARISON] - ❌ onDeleteAction same
```
→ **PROBLÈME : Le contexte change !**

**Si tu vois** :
```
📄 [PAGINATION] Simple Roles Raw
🔧 [STATE APPLICATION] Duration: 8ms
🎨 [RENDER] SodSimpleRoleCard (5x)
```
→ **TOUT VA BIEN !** ✅

---

## 💡 Solutions par Scénario

### Solution 1 : Contexte Change
```typescript
// Dans lib/contexts/SodActionsContext.tsx
const value: SodActionsContextValue = useMemo(() => ({
  deletedActions: deletedActionsRef.current,
  // ...
}), [
  toggleDeleteAction,
  toggleRestrictAction,
  // ...
]);
```

### Solution 2 : Objets Changent
```typescript
// Mémoïser les rôles avec un hash
const rolesHash = useMemo(() => 
  roles.map(r => r.roleName).join('|'),
  [roles]
);
```

### Solution 3 : Application Lente
```typescript
// Optimiser les calculs
// - Utiliser des Maps au lieu de filter
// - Cacher les résultats
// - Éviter les boucles imbriquées
```

---

## 📝 Checklist de Debugging

- [ ] Ouvrir la console (F12)
- [ ] Vider la console (Ctrl+L)
- [ ] Charger un fichier SoD
- [ ] Vider la console à nouveau
- [ ] Naviguer vers page 2
- [ ] Noter les logs qui apparaissent
- [ ] Comparer avec les scénarios ci-dessus
- [ ] Identifier la cause
- [ ] Appliquer la solution

---

**Maintenant, teste et dis-moi quels logs tu vois !** 🚀
