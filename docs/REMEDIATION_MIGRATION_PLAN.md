# Plan de Migration - Fonctions de Remédiation

**Date :** 22 octobre 2025  
**Objectif :** Migrer les 6 fonctions de calcul de remédiation depuis SodActionsContext vers sodRulesApplication.ts

---

## 📋 RÉSUMÉ DES RÈGLES DE GESTION

### Hiérarchie de Remédiation

```
RÔLE (Simple ou Composite)
  └── RISQUE
       └── FONCTION
            └── ACTION
                 └── RESSOURCE
                      └── RESSOURCE EXTERNE (avec valeurs)
```

---

## 🎯 RÈGLES MÉTIER - RÔLES SIMPLES (ÉTAPE 1)

### 1️⃣ Remédiation d'une FONCTION (calculateFunctionRemediation)

**Entrée :**
- `roleName` : Nom du rôle simple
- `actions[]` : Liste des actions de la fonction

**Logique :**

Pour chaque action :
1. **Classifier l'action** :
   - `hasTCode` : Action a une ressource S_TCODE → Action **supprimable**
   - `hasOtherResources` : Action a des ressources non-S_TCODE → Action **restrainable**
   - Ignorer les actions qui n'ont ni S_TCODE ni autres ressources

2. **Vérifier l'état de suppression** (pour actions supprimables) :
   ```typescript
   const actionKey = getActionKey(roleName, action.code);
   const isDeleted = deletedActionsMap.get(actionKey) || false;
   ```

3. **Vérifier l'état de restriction** (pour actions restrainables) :
   ```typescript
   // a) Restriction directe
   const restriction = restrictedActionsMap.get(actionKey);
   const isActionDirectlyRestricted = !!restriction;
   
   // b) Restriction indirecte (via ressources)
   let hasRestrictedResource = false;
   for (const resource of action.resources) {
     if (resource.code === 'S_TCODE') continue; // Ignorer S_TCODE
     
     for (const extRes of resource.externalResources) {
       const values = extractExternalResourceValues(extRes);
       const resKey = getResourceKey(roleName, resource.code, extRes.code);
       const restrictedValuesSet = restrictedResourcesMap.get(resKey);
       
       // ✅ RÈGLE : Toutes les valeurs doivent être dans le Set
       const allValuesRestricted = values.length > 0 && 
                                    values.every(v => restrictedValuesSet.has(v));
       
       if (allValuesRestricted) {
         hasRestrictedResource = true;
         break;
       }
     }
   }
   
   const isRestricted = isActionDirectlyRestricted || hasRestrictedResource;
   ```

4. **Compter** :
   - `suppressableCount` : Nombre d'actions supprimables
   - `suppressedCount` : Nombre d'actions supprimées
   - `restrainableCount` : Nombre d'actions restrainables
   - `restrictedCount` : Nombre d'actions restreintes

5. **Déterminer la remédiation** :
   ```typescript
   // ✅ RÈGLE PRINCIPALE : Fonction remediée si AU MOINS UNE condition est vraie
   const allSuppressablesSuppressed = suppressableCount > 0 && suppressedCount === suppressableCount;
   const allRestrainablesRestricted = restrainableCount > 0 && restrictedCount === restrainableCount;
   
   const isRemediated = allSuppressablesSuppressed || allRestrainablesRestricted;
   ```

**Sortie :**
```typescript
{
  isRemediated: boolean,        // La fonction est-elle remediée ?
  totalActions: number,         // Nombre total d'actions remediables
  remediatedActions: number     // Nombre d'actions remediées
}
```

---

### 2️⃣ Remédiation d'un RISQUE (calculateRiskRemediation)

**Entrée :**
- `roleName` : Nom du rôle simple
- `functions[]` : Liste des fonctions du risque

**Logique :**

1. Pour chaque fonction, calculer `calculateFunctionRemediation(roleName, func.actions)`
2. Compter les fonctions remediées
3. **Règle :** Un risque est remedié si **AU MOINS UNE** de ses fonctions est remediée

**Sortie :**
```typescript
{
  isRemediated: boolean,           // Le risque est-il remedié ?
  totalFunctions: number,          // Nombre total de fonctions
  remediatedFunctions: number,     // Nombre de fonctions remediées
  remediationPercentage: number    // Pourcentage (0-100)
}
```

---

### 3️⃣ Remédiation d'un RÔLE SIMPLE (calculateRoleRemediation)

**Entrée :**
- `roleName` : Nom du rôle simple
- `risks[]` : Liste des risques du rôle

**Logique :**

1. Pour chaque risque, calculer `calculateRiskRemediation(roleName, risk.functions)`
2. Compter les risques remediés
3. **Règle :** Un rôle est remedié si **TOUS** ses risques sont remediés

**Sortie :**
```typescript
{
  isRemediated: boolean,           // Le rôle est-il remedié ?
  totalRisks: number,              // Nombre total de risques
  remediatedRisks: number,         // Nombre de risques remediés
  remediationPercentage: number    // Pourcentage (0-100)
}
```

---

## 🎯 RÈGLES MÉTIER - RÔLES COMPOSITES (ÉTAPE 2)

### 4️⃣ Remédiation d'une FONCTION COMPOSITE (calculateCompositeFunctionRemediation)

**Entrée :**
- `compositeRoleName` : Nom du rôle composite
- `func` : Fonction composite (contient plusieurs rôles simples)

**Logique :**

1. **Agréger toutes les actions** de tous les rôles simples NON EXCLUS :
   ```typescript
   const allActions: any[] = [];
   
   func.simpleRoles.forEach(simpleRole => {
     // ✅ RÈGLE CRITIQUE : Ignorer les rôles simples exclus
     const isExcluded = isSimpleRoleExcluded(compositeRoleName, simpleRole.roleName);
     if (isExcluded) return;
     
     // Ajouter toutes les actions de ce rôle simple
     simpleRole.actions.forEach(action => {
       allActions.push({
         ...action,
         sourceRoleName: simpleRole.roleName  // ✅ IMPORTANT : Garder la référence
       });
     });
   });
   ```

2. **Analyser chaque action agrégée** (même logique que l'Étape 1) :
   ```typescript
   allActions.forEach(action => {
     const sourceRoleName = action.sourceRoleName;  // ✅ Utiliser le rôle source
     const actionKey = getActionKey(sourceRoleName, action.code);
     
     // Vérifier suppression
     const isDeleted = deletedActionsMap.get(actionKey) || false;
     
     // Vérifier restriction (directe + indirecte)
     const restriction = restrictedActionsMap.get(actionKey);
     const hasRestrictedResource = ...;  // Même logique que l'Étape 1
     
     const isRestricted = !!restriction || hasRestrictedResource;
     
     // Compter
     if (hasTCode) {
       suppressableCount++;
       if (isDeleted) suppressedCount++;
     }
     
     if (hasOtherResources) {
       restrainableCount++;
       if (isRestricted) restrictedCount++;
     }
   });
   ```

3. **Déterminer la remédiation** :
   ```typescript
   // ✅ MÊME RÈGLE que l'Étape 1
   const isRemediated = allSuppressablesSuppressed || allRestrainablesRestricted;
   ```

**Sortie :**
```typescript
{
  isRemediated: boolean,           // La fonction composite est-elle remediée ?
  totalSimpleRoles: number,        // Nombre de rôles simples (non exclus)
  remediatedSimpleRoles: number    // Si remedié, = totalSimpleRoles, sinon 0
}
```

---

### 5️⃣ Remédiation d'un RISQUE COMPOSITE (calculateCompositeRiskRemediation)

**Entrée :**
- `compositeRoleName` : Nom du rôle composite
- `functions[]` : Liste des fonctions du risque

**Logique :**

1. Pour chaque fonction, calculer `calculateCompositeFunctionRemediation(compositeRoleName, func)`
2. Compter les fonctions remediées
3. **Règle :** Un risque composite est remedié si **AU MOINS UNE** de ses fonctions est remediée

**Sortie :**
```typescript
{
  isRemediated: boolean,
  totalFunctions: number,
  remediatedFunctions: number,
  remediationPercentage: number
}
```

---

### 6️⃣ Remédiation d'un RÔLE COMPOSITE (calculateCompositeRoleRemediation)

**Entrée :**
- `compositeRoleName` : Nom du rôle composite
- `risks[]` : Liste des risques du rôle

**Logique :**

1. Pour chaque risque, calculer `calculateCompositeRiskRemediation(compositeRoleName, risk.functions)`
2. Compter les risques remediés
3. **Règle :** Un rôle composite est remedié si **TOUS** ses risques sont remediés

**Sortie :**
```typescript
{
  isRemediated: boolean,
  totalRisks: number,
  remediatedRisks: number,
  remediationPercentage: number
}
```

---

## 🔑 RÈGLES CLÉS À RESPECTER

### Règle 1 : Hiérarchie de Remédiation
```
FONCTION remediée    → AU MOINS UNE condition (suppression OU restriction)
RISQUE remedié       → AU MOINS UNE fonction remediée
RÔLE remedié         → TOUS les risques remediés
```

### Règle 2 : Classification des Actions
```
Action avec S_TCODE          → SUPPRIMABLE  (vérifier isDeleted)
Action avec autres ressources → RESTRAINABLE (vérifier isRestricted)
Action sans ressources       → IGNORÉE
```

### Règle 3 : Restriction Indirecte
```
Action DIRECTEMENT restreinte : restrictedActionsMap.get(actionKey)
Action INDIRECTEMENT restreinte : AU MOINS UNE ressource non-S_TCODE restreinte
  └── Ressource restreinte : TOUTES ses valeurs dans restrictedResourcesMap
```

### Règle 4 : Rôles Composites
```
1. Agréger TOUTES les actions de TOUS les rôles simples NON EXCLUS
2. Analyser au niveau FONCTION (pas rôle par rôle)
3. Utiliser sourceRoleName pour les clés de Maps
```

### Règle 5 : Exclusion de Rôles
```
Rôle simple exclu → IGNORÉ dans tous les calculs de remédiation composite
Vérifier avec : excludedSimpleRolesMap.get(compositeRoleName|simpleRoleName)
```

---

## 🔄 DÉPENDANCES ENTRE FONCTIONS

```
Rôles Simples (Étape 1) :
┌─────────────────────────────┐
│ calculateFunctionRemediation│ ← Fonction de base
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ calculateRiskRemediation    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ calculateRoleRemediation    │
└─────────────────────────────┘

Rôles Composites (Étape 2) :
┌──────────────────────────────────┐
│calculateCompositeFunctionRemediation│ ← Fonction de base (avec exclusion)
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│calculateCompositeRiskRemediation │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│calculateCompositeRoleRemediation │
└──────────────────────────────────┘
```

---

## 🔧 MODIFICATIONS NÉCESSAIRES

### Changement 1 : Lecture depuis Maps Globales

**❌ AVANT (SodActionsContext.tsx) :**
```typescript
const isDeleted = deletedActionsRef.current.get(actionKey);
const restriction = restrictedActionsRef.current.get(actionKey);
const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
const isExcluded = excludedSimpleRolesRef.current.get(key);
```

**✅ APRÈS (sodRulesApplication.ts) :**
```typescript
const isDeleted = deletedActionsMap.get(actionKey);
const restriction = restrictedActionsMap.get(actionKey);
const restrictedValuesSet = restrictedResourcesMap.get(resKey);
const isExcluded = excludedSimpleRolesMap.get(key);
```

### Changement 2 : Imports Nécessaires

**À importer dans sodRulesApplication.ts :**
```typescript
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';
```

**Déjà disponibles :**
- `getActionKey()` ✅
- `getResourceKey()` ✅
- `getExcludedRoleKey()` ✅
- Maps globales ✅

### Changement 3 : Suppression des useCallback

**❌ AVANT (dans Provider) :**
```typescript
const calculateFunctionRemediation = useCallback((roleName, actions) => {
  // ...
}, [getActionKey, getResourceKey]);
```

**✅ APRÈS (fonctions pures) :**
```typescript
export function calculateFunctionRemediation(roleName: string, actions: any[]) {
  // ...
}
```

---

## 📝 FONCTIONS À MIGRER

### Fonction 1 : `calculateFunctionRemediation`
- **Ligne source** : 688-795 (SodActionsContext.tsx)
- **Complexité** : Moyenne
- **Dépendances** : `extractExternalResourceValues`, Maps globales
- **Utilise** : `deletedActionsMap`, `restrictedActionsMap`, `restrictedResourcesMap`

### Fonction 2 : `calculateRiskRemediation`
- **Ligne source** : 801-824 (SodActionsContext.tsx)
- **Complexité** : Faible (délègue à calculateFunctionRemediation)
- **Dépendances** : `calculateFunctionRemediation`

### Fonction 3 : `calculateRoleRemediation`
- **Ligne source** : 830-853 (SodActionsContext.tsx)
- **Complexité** : Faible (délègue à calculateRiskRemediation)
- **Dépendances** : `calculateRiskRemediation`

### Fonction 4 : `calculateCompositeFunctionRemediation`
- **Ligne source** : 877-1016 (SodActionsContext.tsx)
- **Complexité** : Élevée (agrégation + exclusion)
- **Dépendances** : `extractExternalResourceValues`, `isSimpleRoleExcluded`, Maps globales
- **Utilise** : `deletedActionsMap`, `restrictedActionsMap`, `restrictedResourcesMap`, `excludedSimpleRolesMap`
- **⚠️ CRITIQUE** : Utilise `sourceRoleName` pour les clés de Maps

### Fonction 5 : `calculateCompositeRiskRemediation`
- **Ligne source** : 1030-1078 (SodActionsContext.tsx)
- **Complexité** : Faible (délègue à calculateCompositeFunctionRemediation)
- **Dépendances** : `calculateCompositeFunctionRemediation`

### Fonction 6 : `calculateCompositeRoleRemediation`
- **Ligne source** : 1092-1141 (SodActionsContext.tsx)
- **Complexité** : Faible (délègue à calculateCompositeRiskRemediation)
- **Dépendances** : `calculateCompositeRiskRemediation`

---

## 🔍 FONCTION AUXILIAIRE NÉCESSAIRE

### `isSimpleRoleExcluded`
**Actuellement dans :** SodActionsContext.tsx (ligne 598-604)

**❌ AVANT :**
```typescript
const isSimpleRoleExcluded = useCallback((compositeRoleName: string, simpleRoleName: string): boolean => {
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  return excludedSimpleRolesRef.current.get(key) || false;
}, [getExcludedRoleKey]);
```

**✅ APRÈS (à créer dans sodRulesApplication.ts) :**
```typescript
export function isSimpleRoleExcluded(compositeRoleName: string, simpleRoleName: string): boolean {
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  return excludedSimpleRolesMap.get(key) || false;
}
```

---

## ⚠️ POINTS CRITIQUES

### Point Critique 1 : sourceRoleName
Dans `calculateCompositeFunctionRemediation`, chaque action agrégée garde son `sourceRoleName` :
```typescript
allActions.push({
  ...action,
  sourceRoleName: simpleRole.roleName  // ✅ NE PAS OUBLIER !
});

// Plus tard :
const actionKey = getActionKey(sourceRoleName, action.code);  // ✅ Utiliser sourceRoleName
```

### Point Critique 2 : Normalisation des Valeurs
Les valeurs extraites par `extractExternalResourceValues` sont **déjà normalisées**.  
Les Sets dans `restrictedResourcesMap` contiennent des **valeurs normalisées**.  
→ La comparaison `.every(v => restrictedValuesSet.has(v))` fonctionne directement.

### Point Critique 3 : Exclusion de Rôles
La fonction `isSimpleRoleExcluded` est appelée **AVANT** d'agréger les actions.  
Si un rôle est exclu, ses actions **NE SONT PAS INCLUSES** dans le calcul.

### Point Critique 4 : Logique OU vs ET
```
FONCTION remediée    → (Toutes supprimées) OU (Toutes restreintes)  [AU MOINS UNE]
RISQUE remedié       → AU MOINS UNE fonction remediée
RÔLE remedié         → TOUS les risques remediés
```

---

## 📦 PLAN D'IMPLÉMENTATION

### Étape 1 : Créer la Fonction Auxiliaire
```typescript
// Dans sodRulesApplication.ts
export function isSimpleRoleExcluded(compositeRoleName: string, simpleRoleName: string): boolean {
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  return excludedSimpleRolesMap.get(key) || false;
}
```

### Étape 2 : Migrer les Fonctions de Base
1. `calculateFunctionRemediation` (Rôles Simples)
2. `calculateCompositeFunctionRemediation` (Rôles Composites)

### Étape 3 : Migrer les Fonctions Intermédiaires
3. `calculateRiskRemediation` (Rôles Simples)
4. `calculateCompositeRiskRemediation` (Rôles Composites)

### Étape 4 : Migrer les Fonctions de Haut Niveau
5. `calculateRoleRemediation` (Rôles Simples)
6. `calculateCompositeRoleRemediation` (Rôles Composites)

### Étape 5 : Mettre à Jour page.tsx
- Importer depuis `sodRulesApplication.ts`
- Supprimer les imports du contexte
- Supprimer les extractions inutiles

### Étape 6 : Supprimer le Context
- Retirer `SodActionsProvider` de `layout.tsx`
- Supprimer les fichiers du contexte

---

## 🎯 VALIDATION FINALE

**Ai-je bien compris les règles ?**

### ✅ Règle 1 : Action Supprimable/Restrainable
- Action avec S_TCODE → **Supprimable** (vérifier `isDeleted`)
- Action avec autres ressources → **Restrainable** (vérifier `isRestricted`)
- Une action peut être **les deux** en même temps

### ✅ Règle 2 : Restriction Indirecte
- Action restreinte si :
  1. **Directement** : Dans `restrictedActionsMap` OU
  2. **Indirectement** : AU MOINS UNE ressource non-S_TCODE restreinte
- Ressource restreinte si : **TOUTES** ses valeurs dans `restrictedResourcesMap`

### ✅ Règle 3 : Fonction Remediée
- **TOUTES** les actions supprimables supprimées OU
- **TOUTES** les actions restrainables restreintes
- **⚠️ OU logique, pas ET !**

### ✅ Règle 4 : Risque Remedié
- **AU MOINS UNE** fonction remediée

### ✅ Règle 5 : Rôle Remedié
- **TOUS** les risques remediés

### ✅ Règle 6 : Rôles Composites
- Agréger **TOUTES** les actions de **TOUS** les rôles simples **NON EXCLUS**
- Garder `sourceRoleName` pour les clés de Maps
- Analyser au niveau **FONCTION** (pas rôle par rôle)

### ✅ Règle 7 : Exclusion
- Rôle simple exclu → **IGNORÉ** complètement
- Vérifier avec `excludedSimpleRolesMap`

---

## ❓ QUESTIONS POUR VALIDATION

1. **Les règles ci-dessus sont-elles correctes ?**
2. **Y a-t-il des cas particuliers à gérer ?**
3. **Les fonctions doivent-elles retourner des détails supplémentaires ?**
4. **Dois-je ajouter des console.warn pour les cas d'erreur ?**

---

**Une fois validé, je procéderai à la migration complète !** 🚀

