# Résumé des Règles de Remédiation - Pour Validation

**Date :** 22 octobre 2025  
**Objectif :** Résumé simple et visuel pour valider la compréhension avant migration

---

## 🎯 RÈGLES PRINCIPALES EN 3 POINTS

### 1. Classification des Actions

```
┌─────────────────────────────────────────────────────────────┐
│                         ACTION                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  A des ressources S_TCODE ?                                  │
│      └─ OUI → Action SUPPRIMABLE                            │
│           └─ Remediée si : isDeleted = true                 │
│                                                              │
│  A d'autres ressources (non-S_TCODE) ?                       │
│      └─ OUI → Action RESTRAINABLE                           │
│           └─ Remediée si : isRestricted = true              │
│                                                              │
│  N'a NI S_TCODE NI autres ressources ?                       │
│      └─ Action IGNORÉE (non remediable)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

⚠️ NOTE : Une action peut être SUPPRIMABLE ET RESTRAINABLE en même temps !
```

---

### 2. Détection de la Restriction

```
┌─────────────────────────────────────────────────────────────┐
│           ACTION RESTREINTE ? (isRestricted)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔹 RESTRICTION DIRECTE :                                    │
│     restrictedActionsMap.get(actionKey) !== undefined       │
│                                                              │
│                      OU                                      │
│                                                              │
│  🔹 RESTRICTION INDIRECTE :                                  │
│     AU MOINS UNE ressource non-S_TCODE restreinte           │
│                                                              │
│     Ressource restreinte SI ET SEULEMENT SI :               │
│     ┌────────────────────────────────────────────┐          │
│     │ TOUTES ses valeurs sont dans le Set       │          │
│     │ restrictedResourcesMap.get(resKey)         │          │
│     │                                            │          │
│     │ values.every(v => Set.has(v))  ← TOUTES ! │          │
│     └────────────────────────────────────────────┘          │
│                                                              │
│  isRestricted = DIRECTE || INDIRECTE                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Logique de Remédiation Hiérarchique

```
┌──────────────────────────────────────────────────────────────┐
│                     FONCTION                                  │
│  Remediée SI :                                               │
│    (Toutes supprimables supprimées) OU (Toutes restrainables restreintes) │
│                         ⬆ AU MOINS UNE ⬆                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                      RISQUE                                   │
│  Remedié SI :                                                │
│    AU MOINS UNE fonction remediée                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                       RÔLE                                    │
│  Remedié SI :                                                │
│    TOUS les risques remediés                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔢 EXEMPLES CONCRETS

### Exemple 1 : Fonction avec Actions Mixtes

**Fonction ABC avec 4 actions :**
- Action A : S_TCODE (supprimable) → ✅ Supprimée
- Action B : S_TCODE (supprimable) → ❌ Non supprimée
- Action C : Ressource X (restrainable) → ✅ Restreinte
- Action D : Ressource Y (restrainable) → ✅ Restreinte

**Calcul :**
- `suppressableCount = 2` (A, B)
- `suppressedCount = 1` (A)
- `restrainableCount = 2` (C, D)
- `restrictedCount = 2` (C, D)

**Résultat :**
```typescript
allSuppressablesSuppressed = (2 > 0 && 1 === 2) = false  // ❌ Pas toutes supprimées
allRestrainablesRestricted = (2 > 0 && 2 === 2) = true   // ✅ Toutes restreintes

isRemediated = false || true = true  // ✅ FONCTION REMEDIÉE !
```

---

### Exemple 2 : Risque avec 3 Fonctions

**Risque XYZ avec 3 fonctions :**
- Fonction 1 : ✅ Remediée (toutes restreintes)
- Fonction 2 : ❌ Non remediée
- Fonction 3 : ❌ Non remediée

**Calcul :**
- `remediatedFunctions = 1`
- `totalFunctions = 3`

**Résultat :**
```typescript
isRemediated = (1 > 0) = true  // ✅ RISQUE REMEDIÉ (au moins une fonction) !
remediationPercentage = (1/3) * 100 = 33%
```

---

### Exemple 3 : Rôle Composite avec Exclusion

**Fonction ABC dans rôle composite ZZ :**
- Rôle simple R1 : Actions A1, A2 → ✅ NON EXCLU → Inclure
- Rôle simple R2 : Actions A3, A4 → ❌ EXCLU → Ignorer
- Rôle simple R3 : Actions A5, A6 → ✅ NON EXCLU → Inclure

**Aggrégation :**
```typescript
allActions = [
  { code: 'A1', sourceRoleName: 'R1', ... },
  { code: 'A2', sourceRoleName: 'R1', ... },
  { code: 'A5', sourceRoleName: 'R3', ... },
  { code: 'A6', sourceRoleName: 'R3', ... }
]
// ⚠️ A3 et A4 IGNORÉS (R2 exclu)
```

**Clés de Maps :**
```typescript
// Pour A1 :
const actionKey = getActionKey('R1', 'A1')  // ✅ Utiliser R1 (sourceRoleName)
const isDeleted = deletedActionsMap.get('R1|A1')

// Pour A5 :
const actionKey = getActionKey('R3', 'A5')  // ✅ Utiliser R3 (sourceRoleName)
const isDeleted = deletedActionsMap.get('R3|A5')
```

---

## 🔄 FLUX DE DONNÉES

### Pour Rôles Simples (Étape 1)

```
┌─────────────┐
│   page.tsx  │
└──────┬──────┘
       │
       │ calculateRiskRemediation(roleName, risk.functions)
       ▼
┌──────────────────────────────┐
│ calculateRiskRemediation     │ ← Itère sur functions
│   └─→ forEach function       │
│        └─→ calculateFunctionRemediation(roleName, func.actions)
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ calculateFunctionRemediation │ ← Analyse actions
│   └─→ forEach action         │
│        └─→ Lit Maps :        │
│            - deletedActionsMap        (isDeleted)
│            - restrictedActionsMap     (direct)
│            - restrictedResourcesMap   (indirect)
└──────────────────────────────┘
```

### Pour Rôles Composites (Étape 2)

```
┌─────────────┐
│   page.tsx  │
└──────┬──────┘
       │
       │ calculateCompositeRiskRemediation(compositeRoleName, risk.functions)
       ▼
┌─────────────────────────────────────┐
│ calculateCompositeRiskRemediation   │ ← Itère sur functions
│   └─→ forEach function              │
│        └─→ calculateCompositeFunctionRemediation(compositeRoleName, func)
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ calculateCompositeFunctionRemediation   │
│   └─→ forEach simpleRole               │
│        └─→ isSimpleRoleExcluded ?       │ ← Lit excludedSimpleRolesMap
│             ├─ OUI → Ignorer            │
│             └─ NON → Agréger actions    │
│                      └─→ forEach action │
│                           └─→ Lit Maps : │
│                               - deletedActionsMap    (avec sourceRoleName)
│                               - restrictedActionsMap (avec sourceRoleName)
│                               - restrictedResourcesMap (avec sourceRoleName)
└─────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE VALIDATION

- [ ] **Règle 1** : Action supprimable/restrainable bien comprise ?
- [ ] **Règle 2** : Restriction directe + indirecte bien comprise ?
- [ ] **Règle 3** : Fonction remediée (OU logique) bien comprise ?
- [ ] **Règle 4** : Risque remedié (AU MOINS UNE) bien compris ?
- [ ] **Règle 5** : Rôle remedié (TOUS) bien compris ?
- [ ] **Règle 6** : Agrégation composite avec sourceRoleName bien comprise ?
- [ ] **Règle 7** : Exclusion de rôles bien comprise ?
- [ ] **Point critique** : Normalisation des valeurs (déjà faite) bien compris ?
- [ ] **Point critique** : Maps globales à utiliser (au lieu des Refs) bien compris ?

---

**Validez ces règles et je procède à la migration ! 🚀**

