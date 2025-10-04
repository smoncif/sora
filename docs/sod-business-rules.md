# Règles Métier - Analyse SoD (Segregation of Duties)

Ce document centralise toutes les règles métier pour l'analyse SoD.

---

## 📋 Table des matières

1. [Règles des Actions](#règles-des-actions)
2. [Règles des Ressources](#règles-des-ressources)
3. [Règles des Badges](#règles-des-badges)
4. [Règles Visuelles](#règles-visuelles)
5. [Règles des Boutons](#règles-des-boutons)

---

## 🎯 Règles des Actions

### Action Supprimée vs Action Restreinte

**Une action peut être soit supprimée, soit restreinte, mais PAS les deux en même temps.**

**Les actions possibles dépendent du type de ressources contenues dans l'action :**

#### 🔹 Cas 1 : Action avec UNIQUEMENT des ressources `S_TCODE`

- **Opération permise** : ✅ **SUPPRESSION UNIQUEMENT**
- **Opération interdite** : ❌ **RESTRICTION** (bouton désactivé)
- **Raison** : `S_TCODE` ne peut pas être restreint, il peut seulement être supprimé
- **Badge affiché** : Badge Action (🔵) uniquement
- **Badge Permission** : Non affiché (pas de ressources à restreindre)

#### 🔹 Cas 2 : Action avec UNIQUEMENT des ressources non-`S_TCODE`

- **Opération permise** : ✅ **RESTRICTION UNIQUEMENT**
- **Opération interdite** : ❌ **SUPPRESSION** (bouton désactivé)
- **Raison** : Les actions sans `S_TCODE` ne peuvent être que restreintes
- **Badge affiché** : Badge Permission (🟠) uniquement
- **Badge Action** : Non affiché (pas de `S_TCODE`)

#### 🔹 Cas 3 : Action avec les DEUX types de ressources (`S_TCODE` + autres)

- **Opérations permises** : ✅ **SUPPRESSION** OU ✅ **RESTRICTION** (mutuellement exclusif)
- **Badges affichés** : Badge Action (🔵) ET Badge Permission (🟠)
- **Comportement** : 
  - Cliquer sur "Supprimer" désactive automatiquement "Restreindre"
  - Cliquer sur "Restreindre" désactive automatiquement "Supprimer"

---

### Action Supprimée (`isDeleted = true`)

- **Définition** : L'action entière est marquée pour suppression
- **Applicable à** : Actions avec `S_TCODE` (Cas 1 ou Cas 3)
- **Effet sur les ressources** : 
  - **TOUTES** les ressources sont marquées pour suppression
  - Y compris les ressources `S_TCODE`
- **État visuel** :
  - Arrière-plan : **Rouge** (`alpha(theme.palette.error.main, 0.08)`)
  - Bordure : **Rouge** (`alpha(theme.palette.error.main, 0.3)`)
- **Bouton actif** : 🗑️ "Supprimer"
- **Effet sur l'autre état** : Si on clique sur "Supprimer", `isRestricted` est automatiquement mis à `false`
- **Badge Action** : Devient gris (si présent)

### Action Restreinte (`isRestricted = true`)

- **Définition** : Une action est dite **restreinte** si **toutes** les ressources qu'elle contient, **à part `S_TCODE`**, sont restreintes
- **Applicable à** : Actions avec ressources non-`S_TCODE` (Cas 2 ou Cas 3)
- **Effet sur les ressources** :
  - Les ressources **non-`S_TCODE`** : Marquées pour restriction
  - Les ressources **`S_TCODE`** : **Ne peuvent PAS être restreintes** (immunité), restent normales
- **État visuel** :
  - Arrière-plan : **Orange** (`alpha(theme.palette.warning.main, 0.08)`)
  - Bordure : **Orange** (`alpha(theme.palette.warning.main, 0.3)`)
- **Bouton actif** : 🚫 "Restreindre"
- **Effet sur l'autre état** : Si on clique sur "Restreindre", `isDeleted` est automatiquement mis à `false`
- **Badge Permission** : Devient gris (si présent)

---

## 📦 Règles des Ressources

### Ressource `S_TCODE`

**Spécificité : `S_TCODE` ne peut PAS être restreinte, elle peut seulement être supprimée.**

- Si l'action est **supprimée** (`isDeleted = true`) :
  - `S_TCODE` → État : Supprimée (rouge)
  
- Si l'action est **restreinte** (`isRestricted = true`) :
  - `S_TCODE` → État : **Normal** (aucun changement visuel)
  - Les autres ressources → État : Restreintes (orange)

### Autres Ressources

- Si l'action est **supprimée** :
  - Toutes les ressources → État : Supprimées (rouge)
  
- Si l'action est **restreinte** :
  - Ressources non-`S_TCODE` → État : Restreintes (orange)

---

## 🎨 Règles des Badges

### Badge Action (🔵 Bleu)

- **Condition d'affichage** : L'action contient au moins une ressource `S_TCODE`
- **État normal** : Badge bleu (`theme.palette.primary.main`)
- **État grisé** : Badge gris (`theme.palette.grey[400]`)
  - **Quand ?** : Si l'action est supprimée (`isDeleted = true`)

### Badge Permission (🟠 Orange)

- **Condition d'affichage** : L'action contient au moins une ressource **autre que** `S_TCODE`
- **État normal** : Badge orange (`theme.palette.warning.main`)
- **État grisé** : Badge gris (`theme.palette.grey[400]`)
  - **Quand ?** : Si l'action est restreinte (`isRestricted = true`)

### Combinaisons possibles

1. **Action avec `S_TCODE` uniquement** :
   - Badge Action (🔵) affiché
   - Badge Permission **non affiché**
   - Bouton "Restreindre" **désactivé** (rien à restreindre)

2. **Action sans `S_TCODE`** :
   - Badge Action **non affiché**
   - Badge Permission (🟠) affiché

3. **Action avec `S_TCODE` ET autres ressources** :
   - Badge Action (🔵) affiché
   - Badge Permission (🟠) affiché
   - Les deux boutons sont actifs

---

## 👁️ Règles Visuelles

### Arrière-plan des Actions

| État | Couleur | Code |
|------|---------|------|
| Normal | Gris très clair | `alpha(theme.palette.grey[400], 0.06)` |
| Supprimée | Rouge clair | `alpha(theme.palette.error.main, 0.08)` |
| Restreinte | Orange clair | `alpha(theme.palette.warning.main, 0.08)` |

### Arrière-plan des Ressources

| État | Couleur | Code |
|------|---------|------|
| Normal | Gris très clair | `alpha(theme.palette.grey[400], 0.06)` |
| Supprimée | Rouge clair | `alpha(theme.palette.error.main, 0.08)` |
| Restreinte | Orange clair | `alpha(theme.palette.warning.main, 0.08)` |

### Bordures

| État | Couleur | Code |
|------|---------|------|
| Normal | Gris clair | `alpha(theme.palette.grey[400], 0.2)` |
| Supprimée | Rouge | `alpha(theme.palette.error.main, 0.3)` |
| Restreinte | Orange | `alpha(theme.palette.warning.main, 0.3)` |

---

## 🔘 Règles des Boutons

### Bouton "Supprimer" (🗑️)

- **Couleur** : Rouge (`theme.palette.error.main`)
- **Action** : Toggle `isDeleted` et force `isRestricted = false`
- **État désactivé** : 
  1. Si l'action est **restreinte** (`isRestricted = true`) - Cas 3
  2. Si l'action contient **UNIQUEMENT** des ressources non-`S_TCODE` - **Cas 2**
- **État activé** :
  - Cas 1 : Action avec uniquement `S_TCODE` ✅
  - Cas 3 : Action avec les deux types de ressources (si non restreinte) ✅
- **Tooltip** :
  - Si actif : "Supprimer l'action"
  - Si désactivé car Cas 2 : "Impossible de supprimer (action sans S_TCODE)"
  - Si désactivé par restriction : (bouton grisé)
  - Si déjà supprimé : "Annuler suppression"

### Bouton "Restreindre" (🚫)

- **Couleur** : Orange foncé (`theme.palette.warning.dark`)
- **Action** : Toggle `isRestricted` et force `isDeleted = false`
- **État désactivé** :
  1. Si l'action est **supprimée** (`isDeleted = true`) - Cas 3
  2. Si l'action contient **UNIQUEMENT** `S_TCODE` - **Cas 1**
- **État activé** :
  - Cas 2 : Action avec uniquement ressources non-`S_TCODE` ✅
  - Cas 3 : Action avec les deux types de ressources (si non supprimée) ✅
- **Tooltip** :
  - Si actif : "Restreindre l'action"
  - Si désactivé car Cas 1 : "Aucune ressource à restreindre (seulement S_TCODE)"
  - Si désactivé par suppression : (bouton grisé)
  - Si déjà restreint : "Annuler restriction"

### Interaction entre les boutons

**Les boutons dépendent du type de ressources** :

| Type de ressources | Bouton "Supprimer" | Bouton "Restreindre" | Mutuellement exclusif ? |
|-------------------|-------------------|---------------------|------------------------|
| **Cas 1** : Uniquement `S_TCODE` | ✅ Activé | ❌ Désactivé (permanent) | Non |
| **Cas 2** : Uniquement non-`S_TCODE` | ❌ Désactivé (permanent) | ✅ Activé | Non |
| **Cas 3** : Les deux types | ✅ Activé* | ✅ Activé* | **Oui** |

\* Dans le Cas 3, un seul bouton peut être actif à la fois :
- Cliquer sur "Supprimer" désactive automatiquement "Restreindre"
- Cliquer sur "Restreindre" désactive automatiquement "Supprimer"

---

## 📝 Notes Techniques

### Structure de données

```typescript
interface SodAction {
  code: string;
  description?: string;
  resources: SodResource[];
  isDeleted?: boolean;      // Mutuellement exclusif avec isRestricted
  isRestricted?: boolean;   // Mutuellement exclusif avec isDeleted
}

interface SodResource {
  code: string;              // Ex: 'S_TCODE', 'S_C_FUNCT', etc.
  description?: string;
  externalResources: SodExternalResource[];
  isDeleted?: boolean;       // Hérité de l'action si supprimée
  isRestricted?: boolean;    // Hérité de l'action si restreinte ET code !== 'S_TCODE'
}
```

### Logique de propagation des états

```typescript
// Si action supprimée → toutes ressources supprimées
if (action.isDeleted) {
  resource.isDeleted = true;
  resource.isRestricted = false;
}

// Si action restreinte → ressources non-S_TCODE restreintes
if (action.isRestricted && resource.code !== 'S_TCODE') {
  resource.isRestricted = true;
  resource.isDeleted = false;
}

// S_TCODE immune à la restriction
if (resource.code === 'S_TCODE' && action.isRestricted) {
  resource.isRestricted = false; // Toujours false
}
```

---

## 🔄 Historique des modifications

| Date | Description |
|------|-------------|
| 2025-01-03 | Création du document avec règles initiales |
| 2025-01-03 | Ajout des 3 cas d'actions selon le type de ressources (S_TCODE uniquement, non-S_TCODE uniquement, ou les deux) |
| 2025-01-03 | Ajout de la règle de propagation globale au niveau du rôle (une action supprimée l'est partout dans le même rôle) |
| 2025-01-03 | Ajout de la règle de détection de duplication d'actions (icône d'alerte si même action avec mêmes sous-catégories dans le même risque) |
| 2025-01-04 | Ajout des règles de propagation de restriction par valeurs (sous-ensemble, Map globale, clé de propagation) |
| 2025-01-04 | Ajout du bouton de restriction au niveau des ressources (🚫 sur la ressource parent) |
| 2025-01-04 | Ajout de la logique de restriction au niveau de l'action (mise à jour de la Map globale + re-calcul des états) |
| 2025-01-04 | Correction du bug de double exécution d'Immer (logique de la Map déplacée en dehors de updateRoles) |
| 2025-01-04 | Ajout du tableau comparatif : Restriction par Action vs Restriction par Ressource |
| 2025-01-04 | Implémentation de la gestion des intervalles de valeurs (expansion, normalisation, propagation) |
| 2025-01-04 | Ajout des fonctions `normalizeValue`, `expandInterval` pour gérer les intervalles numériques et alphabétiques |
| 2025-01-04 | Intervalles alphanumériques (A1 → A5) ignorés (pas d'expansion) |

---

## 🔗 Règles de Propagation

### Propagation au niveau du Rôle

**Règle de portée globale par rôle** : Si une action est supprimée (ou restreinte) dans un rôle simple, elle l'est **partout** où cette transaction apparaît dans ce rôle simple.

#### Portée de la propagation :

Quand une action (identifiée par son `code`) est supprimée/restreinte dans un rôle simple :

1. ✅ **Dans toutes les fonctions** du même rôle où cette action apparaît
2. ✅ **Dans tous les risques** du même rôle où cette action apparaît
3. ✅ **Dans les rôles composites** qui contiennent ce rôle simple (même transaction)

#### Exemple concret :

```
Rôle Simple : "ZHR_ADMIN"
├─ Risque 1 : "SOD-HRM-001"
│  └─ Fonction A : "BS11"
│     └─ Action : SM12 ← Supprimée ici
│
├─ Risque 2 : "SOD-HRM-002"
│  └─ Fonction B : "AP2CLNT910"
│     └─ Action : SM12 ← Automatiquement supprimée aussi
│
└─ Risque 3 : "SOD-HRM-003"
   └─ Fonction C : "HR_ADMIN"
      └─ Action : SM12 ← Automatiquement supprimée aussi
```

Si l'utilisateur supprime l'action `SM12` dans la Fonction A, elle sera automatiquement marquée comme supprimée dans les Fonctions B et C du **même rôle**.

#### Rôles Composites :

```
Rôle Composite : "Z_FULL_HR_ADMIN"
├─ Rôle Simple 1 : "ZHR_ADMIN"
│  └─ Action : SM12 ← Supprimée
│
└─ Rôle Simple 2 : "ZHR_PAYROLL"
   └─ Action : SM12 ← NON affectée (autre rôle simple)
```

La suppression de `SM12` dans "ZHR_ADMIN" n'affecte **pas** la même action dans "ZHR_PAYROLL" car ce sont deux rôles simples différents.

#### Implémentation technique :

- La clé de propagation est : `(roleName, actionCode)`
- Quand `handleDeleteAction(roleName, riskId, actionCode)` est appelée, **tous** les risques du rôle `roleName` sont parcourus pour trouver et marquer toutes les instances de `actionCode`

---

## ⚠️ Règles de Détection de Conflits

### Détection de Duplication d'Actions dans un Risque

**Règle** : Une icône d'alerte doit être affichée si une même action (avec les mêmes sous-catégories) est présente dans plusieurs fonctions qui composent le même risque.

#### Définition :

- **Action identique** : Même `code` d'action (ex: `SM12`)
- **Sous-catégories identiques** : Même ensemble de ressources et valeurs
  - Même `resource.code` (ex: `S_TCODE`)
  - Mêmes `externalResources` avec mêmes valeurs

#### Critères de détection :

Pour qu'une alerte soit déclenchée, il faut :

1. ✅ Même **risque** (`riskId`)
2. ✅ **Fonctions différentes** (`functionCode` différent)
3. ✅ Même **code d'action** (`actionCode`)
4. ✅ Mêmes **ressources et valeurs** (structure identique des sous-catégories)

#### Exemple de conflit :

```
Risque : "SOD-HRM-001"
├─ Fonction A : "BS11"
│  └─ Action : SM12 ⚠️
│     └─ S_TCODE : SM12
│     └─ ACTVT : 01, 02
│
└─ Fonction B : "AP2CLNT910"
   └─ Action : SM12 ⚠️ (même action, mêmes ressources/valeurs)
      └─ S_TCODE : SM12
      └─ ACTVT : 01, 02
```

**Résultat** : Icône ⚠️ affichée sur les deux actions car elles sont identiques dans des fonctions différentes du même risque.

#### Cas sans conflit :

```
Risque : "SOD-HRM-001"
├─ Fonction A : "BS11"
│  └─ Action : SM12
│     └─ S_TCODE : SM12
│     └─ ACTVT : 01, 02
│
└─ Fonction B : "AP2CLNT910"
   └─ Action : SM12 (valeurs différentes)
      └─ S_TCODE : SM12
      └─ ACTVT : 03, 06 ← Différent
```

**Résultat** : Pas d'alerte car les sous-catégories (valeurs ACTVT) sont différentes.

#### Affichage de l'alerte :

- **Position** : À côté du code de l'action (juste avant les badges)
- **Icône** : ⚠️ (`WarningIcon`) en couleur orange/rouge
- **Tooltip** : "Action dupliquée détectée dans ce risque"
- **Taille** : Petite (cohérente avec les badges)

#### Implémentation technique :

```typescript
// Fonction de comparaison des actions
function areActionsIdentical(action1: SodAction, action2: SodAction): boolean {
  if (action1.code !== action2.code) return false;
  
  // Comparer les ressources et leurs valeurs
  // Deep comparison des structures
  return isEqual(action1.resources, action2.resources);
}

// Détection au niveau du risque
function detectDuplicateActionsInRisk(risk: SodRisk): Map<string, boolean> {
  // Retourne un Map avec actionCode comme clé et boolean (isDuplicate)
}
```

---

---

## 🔄 Règles de Propagation de Restriction par Valeurs

### Vue d'ensemble

La restriction ne se propage **pas au niveau des ressources entières**, mais au **niveau des VALEURS** contenues dans les ressources.

### Hiérarchie : Parent → Enfants vs Enfant → Parent

#### 1️⃣ **Action Restreinte → Ressources (Parent → Enfants)**

Si une **action** est restreinte :
- ✅ **TOUTES** les ressources non-`S_TCODE` héritent de la restriction
- ❌ Les ressources **`S_TCODE`** restent normales (immunité)
- 🔍 **Héritage** : Parent → Enfants

**Exemple** :
```
Action SM12 [RESTREINTE] 🟠
├─ S_TCODE [NORMALE] ✅ (immunisée)
├─ S_C_FUNCT → ACTVT: 16 [RESTREINTE] 🟠 (hérite)
└─ S_ENQUE → S_ENQ_ACT: ALL [RESTREINTE] 🟠 (hérite)
```

#### 2️⃣ **Ressource Restreinte → Action (Enfant → Parent)**

Si une **ressource** est restreinte directement :
- ✅ L'action parente devient **restreinte**
- ❌ Les **autres ressources sœurs** restent **normales**
- 🔍 **Héritage** : Enfant → Parent (mais pas entre frères/sœurs)

**Exemple** :
```
Action SM12 [RESTREINTE] 🟠 (hérite de l'enfant)
├─ S_TCODE [NORMALE] ✅
├─ S_C_FUNCT → ACTVT: PADM, ABC [RESTREINTE] 🟠 (directement restreinte)
└─ S_ENQUE → S_ENQ_ACT: ALL [NORMALE] ✅ (pas d'héritage entre sœurs)
```

---

### Propagation Globale par Valeurs

#### Clé de Propagation

```typescript
Key = (roleName, resourceCode, externalResourceCode, valeurs[])
```

**Exemple** :
```typescript
{
  roleName: "ZROLE_A",
  resourceCode: "S_C_FUNCT",
  externalResourceCode: "ACTVT",
  values: ["PADM", "ABC", "DEF"]  // Triées alphabétiquement
}
```

#### Règle de Sous-Ensemble (⊂)

Si on restreint `S_C_FUNCT → ACTVT: PADM, ABC, DEF` dans "ZROLE_A" :

| Occurrence | Valeurs | Est restreinte ? | Raison |
|-----------|---------|------------------|--------|
| `ACTVT: PADM, ABC, DEF` | Même ensemble | ✅ OUI 🟠 | Identique |
| `ACTVT: DEF, PADM, ABC` | Même ensemble | ✅ OUI 🟠 | Ordre différent (ignoré) |
| `ACTVT: PADM, ABC` | Sous-ensemble | ✅ OUI 🟠 | {PADM, ABC} ⊂ {PADM, ABC, DEF} |
| `ACTVT: PADM` | Sous-ensemble | ✅ OUI 🟠 | {PADM} ⊂ {PADM, ABC, DEF} |
| `ACTVT: ABC` | Sous-ensemble | ✅ OUI 🟠 | {ABC} ⊂ {PADM, ABC, DEF} |
| `ACTVT: PADM, ABC, RRR` | Sur-ensemble | ❌ NON ✅ | {PADM, ABC, RRR} ⊃ {PADM, ABC, DEF}, contient `RRR` |
| `ACTVT: XYZ` | Aucune valeur | ❌ NON ✅ | {XYZ} ∩ {PADM, ABC, DEF} = ∅ |

#### Portée de la Propagation

La propagation se fait dans **TOUT le rôle** :
- ✅ **Toutes les actions** (même code ou codes différents)
- ✅ **Tous les risques**
- ✅ **Toutes les fonctions**
- ✅ **Même ressource** (`resourceCode`)
- ✅ **Même ressource externe** (`externalResourceCode`)

**Exemple Complet** :
```
Rôle "ZROLE_A"

📌 Source de restriction :
Risque 1 → Fonction 1 → Action SM12
└─ S_C_FUNCT → ACTVT: PADM, ABC, DEF [RESTREINTE] 🟠

🔄 Propagation automatique :

├─ Risque 1 → Fonction 2 → Action SM51
│  └─ S_C_FUNCT → ACTVT: PADM, ABC [RESTREINTE] 🟠 (sous-ensemble)
│
├─ Risque 2 → Fonction 1 → Action SM12
│  ├─ S_C_FUNCT → ACTVT: PADM [RESTREINTE] 🟠 (sous-ensemble)
│  └─ S_ENQUE → S_ENQ_ACT: PADM [NORMALE] ✅ (ressource différente)
│
├─ Risque 2 → Fonction 3 → Action SM59
│  └─ S_C_FUNCT → ACTVT: PADM, ABC, RRR [NORMALE] ✅ (sur-ensemble)
│
└─ Risque 3 → Fonction 1 → Action SM12
   └─ S_C_FUNCT → ACTVT: XYZ [NORMALE] ✅ (aucune valeur commune)
```

#### Points Clés

- 📌 L'**ordre des valeurs** n'a pas d'importance : `PADM, ABC` ≡ `ABC, PADM`
- 📌 Seuls les **sous-ensembles** (⊂) sont automatiquement restreints
- 📌 Les **sur-ensembles** (⊃) restent normaux (contiennent des valeurs non restreintes)
- 📌 La restriction se propage **par triplet** : `(resourceCode, externalResourceCode, valeurs)`
- 📌 Les ressources **différentes** ne sont **pas affectées** (même avec valeurs identiques)

---

### Algorithme de Détection

```typescript
// Map globale des restrictions par rôle
const restrictionsMap = new Map<string, Set<string>>();
// Key: "roleName|resourceCode|externalResourceCode"
// Value: Set de valeurs restreintes

// Fonction de vérification de sous-ensemble
function isSubsetRestricted(
  targetValues: string[],
  restrictedValues: Set<string>
): boolean {
  // Toutes les valeurs de target sont-elles dans restricted ?
  return targetValues.every(val => restrictedValues.has(val));
}

// Exemple d'utilisation
const restrictedValues = new Set(["PADM", "ABC", "DEF"]);

isSubsetRestricted(["PADM", "ABC"], restrictedValues);     // true ✅
isSubsetRestricted(["PADM"], restrictedValues);            // true ✅
isSubsetRestricted(["PADM", "ABC", "RRR"], restrictedValues); // false ❌
isSubsetRestricted(["XYZ"], restrictedValues);             // false ❌
```

---

### Interface Utilisateur

#### Bouton de Restriction

- **Position** : Au niveau de la **ressource parent** (ex: `S_C_FUNCT`)
- **Icône** : 🚫 (`BlockIcon`)
- **Action** : Restreint la ressource avec toutes ses valeurs
- **Effet visuel** : La ressource et toutes ses valeurs externes passent en fond orange

**Exemple d'affichage** :
```
▸ S_C_FUNCT [🚫]  ← Bouton ICI
    ACTVT: PADM, ABC, DEF
```

#### État Visuel de la Ressource

Une ressource restreinte affiche :
- **Fond** : Orange clair (`alpha(theme.palette.warning.main, 0.08)`)
- **Bordure** : Orange (`alpha(theme.palette.warning.main, 0.3)`)
- **Bouton actif** : Fond orange plus foncé

---

## 🎬 Règles de Restriction au Niveau de l'Action

### Comportement du Bouton "Restreindre" d'une Action

Quand l'utilisateur clique sur le **bouton "Restreindre" (🚫) d'une action** :

#### Étape 1 : Mise à Jour de la Map Globale

1. **Si l'action passe de NORMALE → RESTREINTE** :
   - ✅ Toutes les valeurs des ressources non-`S_TCODE` sont **ajoutées** à la Map globale
   - 🔑 Clé : `(roleName, resourceCode, externalResourceCode)`
   - 📦 Valeur : `Set<string>` des valeurs restreintes

2. **Si l'action passe de RESTREINTE → NORMALE** :
   - ❌ Toutes les valeurs des ressources non-`S_TCODE` sont **retirées** de la Map globale
   - 🗑️ Si le Set devient vide, la clé est supprimée de la Map

#### Étape 2 : Propagation Globale

Après la mise à jour de la Map, **tous les états du rôle sont re-calculés** :
- ✅ Toutes les actions du rôle sont parcourues
- ✅ Toutes les ressources sont vérifiées avec `isSubsetRestricted()`
- ✅ Les états `isRestricted` sont mis à jour en fonction de la Map

#### Exemple Concret

**Scénario** :
```
Action SM51
├─ S_TCODE: SM51
└─ S_C_FUNCT → ACTVT: PADM, ABC
```

**Étape 1 : Clic sur "Restreindre" de SM51**
```typescript
// Map AVANT :
Map = {}

// Clic sur 🚫 de l'action SM51
// → Ajout des valeurs à la Map
Map = {
  "ZROLE_A|S_C_FUNCT|ACTVT": Set(["PADM", "ABC"])
}

// Résultat visuel :
SM51 [RESTREINTE] 🟠
├─ S_TCODE: SM51 [NORMALE] ✅
└─ S_C_FUNCT → ACTVT: PADM, ABC [RESTREINTE] 🟠
```

**Étape 2 : Propagation automatique**
```
Action SM50
└─ S_C_FUNCT → ACTVT: PADM [RESTREINTE] 🟠 (sous-ensemble détecté)

Action CCC
└─ S_C_FUNCT → ACTVT: ABC [RESTREINTE] 🟠 (sous-ensemble détecté)
```

**Étape 3 : Re-clic sur "Restreindre" de SM51 (dé-restriction)**
```typescript
// Map AVANT :
Map = {
  "ZROLE_A|S_C_FUNCT|ACTVT": Set(["PADM", "ABC"])
}

// Re-clic sur 🚫 de l'action SM51
// → Retrait des valeurs de la Map
Map = {}

// Résultat visuel :
SM51 [NORMALE] ✅
├─ S_TCODE: SM51 [NORMALE] ✅
└─ S_C_FUNCT → ACTVT: PADM, ABC [NORMALE] ✅

// Propagation de la dé-restriction :
Action SM50
└─ S_C_FUNCT → ACTVT: PADM [NORMALE] ✅

Action CCC
└─ S_C_FUNCT → ACTVT: ABC [NORMALE] ✅
```

#### Points Clés

- 🔄 **Synchronisation** : La Map et les états visuels sont toujours synchronisés
- 🌐 **Propagation bidirectionnelle** : 
  - Restriction au niveau action → Propage aux ressources identiques
  - Dé-restriction au niveau action → Retire la propagation
- ⚡ **Performance** : Un seul parcours du rôle après chaque clic
- 🎯 **Cohérence** : Toutes les ressources avec les mêmes valeurs (ou sous-ensembles) sont affectées

---

### Différence : Restriction par Action vs Restriction par Ressource

| Aspect | Restriction par **Action** (🚫 sur l'action) | Restriction par **Ressource** (🚫 sur la ressource) |
|--------|---------------------------------------------|---------------------------------------------------|
| **Cible** | Toutes les ressources non-`S_TCODE` de l'action | Une ressource spécifique |
| **Map** | Ajoute/retire **toutes** les valeurs des ressources | Ajoute/retire **uniquement** les valeurs de cette ressource |
| **Propagation** | Affecte toutes les ressources identiques du rôle | Affecte toutes les ressources identiques du rôle |
| **Bouton** | Au niveau de l'action (à gauche) | Au niveau de la ressource parent (à droite) |
| **Use Case** | Restreindre une action complète d'un coup | Restreindre finement une ressource spécifique |

**Exemple** :
```
Action SM12
├─ S_TCODE: SM12
├─ S_C_FUNCT → ACTVT: PADM, ABC
└─ S_ENQUE → S_ENQ_ACT: ALL

🚫 Clic sur l'action → Restreint S_C_FUNCT ET S_ENQUE
🚫 Clic sur S_C_FUNCT → Restreint UNIQUEMENT S_C_FUNCT
```

---

## 🔢 Gestion des Intervalles de Valeurs

### Principe Général

Un **intervalle** représente une **plage de valeurs** entre `valueFrom` et `valueTo`.

**Format dans l'Excel** :
- `valueFrom` : Valeur de départ (ex: `"01"`)
- `valueTo` : Valeur de fin (ex: `"05"`)

**Affichage dans l'UI** : `01 → 05`

---

### Types d'Intervalles Supportés

#### 1️⃣ Intervalles Numériques

**Exemple** : `01 → 05`

**Expansion** :
```typescript
valueFrom = "01"
valueTo = "05"

→ Valeurs extraites : ["1", "2", "3", "4", "5"]
```

**Points clés** :
- ✅ Les zéros devant sont retirés : `"01"` → `"1"`
- ✅ Normalisation : `"01"` = `"1"` (considérés identiques)
- ✅ Ordre croissant obligatoire : `valueFrom` ≤ `valueTo`

**Exemples** :
```
01 → 05  →  ["1", "2", "3", "4", "5"]
10 → 15  →  ["10", "11", "12", "13", "14", "15"]
1 → 3    →  ["1", "2", "3"]
```

#### 2️⃣ Intervalles Alphabétiques

**Exemple** : `A → E`

**Expansion** :
```typescript
valueFrom = "A"
valueTo = "E"

→ Valeurs extraites : ["A", "B", "C", "D", "E"]
```

**Points clés** :
- ✅ Une seule lettre (majuscule ou minuscule)
- ✅ Normalisation en majuscules : `"a"` → `"A"`
- ✅ Ordre croissant obligatoire

**Exemples** :
```
A → E  →  ["A", "B", "C", "D", "E"]
X → Z  →  ["X", "Y", "Z"]
a → c  →  ["A", "B", "C"]  (normalisé en majuscules)
```

---

### Cas Ignorés (Pas de Propagation)

#### ❌ Intervalles Alphanumériques

**Exemple** : `A1 → A5`

**Comportement** :
```typescript
valueFrom = "A1"
valueTo = "A5"

→ Valeurs extraites : ["A1", "A5"]  (pas d'expansion)
```

**Raison** : Logique d'incrémentation ambiguë (incrémenter la lettre ? le chiffre ? les deux ?).

#### ❌ Types Incompatibles

**Exemple** : `A → 5`

**Comportement** :
```typescript
valueFrom = "A"
valueTo = "5"

→ Valeurs extraites : ["A", "5"]  (pas d'expansion)
→ Warning dans la console
```

#### ❌ Ordre Inversé

**Exemple** : `05 → 01`

**Comportement** :
```typescript
valueFrom = "05"
valueTo = "01"

→ Valeurs extraites : ["5", "1"]  (pas d'expansion)
→ Warning dans la console
```

**Note** : Ce cas ne devrait normalement pas se présenter dans les données.

---

### Propagation avec Intervalles

#### Scénario 1 : Restreindre un Intervalle

**Action** : Restreindre `ACTVT: 01 → 05`

**Map globale** :
```typescript
Key: "ZROLE_A|S_C_FUNCT|ACTVT"
Values: Set(["1", "2", "3", "4", "5"])
```

**Propagation** :

| Occurrence | Valeurs Extraites | Restreinte ? | Raison |
|-----------|-------------------|--------------|--------|
| `ACTVT: 01 → 05` | `["1", "2", "3", "4", "5"]` | ✅ OUI 🟠 | Ensemble identique |
| `ACTVT: 1 → 5` | `["1", "2", "3", "4", "5"]` | ✅ OUI 🟠 | Normalisation : `"01"` = `"1"` |
| `ACTVT: 02 → 04` | `["2", "3", "4"]` | ✅ OUI 🟠 | Sous-intervalle : {2,3,4} ⊂ {1,2,3,4,5} |
| `ACTVT: 03` | `["3"]` | ✅ OUI 🟠 | Valeur individuelle présente |
| `ACTVT: 01 → 08` | `["1", "2", "3", "4", "5", "6", "7", "8"]` | ❌ NON ✅ | Sur-intervalle : contient 6, 7, 8 |
| `ACTVT: 10 → 15` | `["10", "11", "12", "13", "14", "15"]` | ❌ NON ✅ | Aucune valeur commune |

#### Scénario 2 : Restreindre des Valeurs Individuelles

**Actions** :
1. Restreindre `ACTVT: 01`
2. Restreindre `ACTVT: 02`
3. Restreindre `ACTVT: 03`
4. Restreindre `ACTVT: 04`
5. Restreindre `ACTVT: 05`

**Map globale** :
```typescript
Key: "ZROLE_A|S_C_FUNCT|ACTVT"
Values: Set(["1", "2", "3", "4", "5"])
```

**Propagation** :

| Occurrence | Valeurs Extraites | Restreinte ? | Raison |
|-----------|-------------------|--------------|--------|
| `ACTVT: 01 → 05` | `["1", "2", "3", "4", "5"]` | ✅ OUI 🟠 | Toutes les valeurs de l'intervalle sont dans la Map |
| `ACTVT: 1 → 5` | `["1", "2", "3", "4", "5"]` | ✅ OUI 🟠 | Idem (normalisation) |

---

### Implémentation Technique

#### Fonction `normalizeValue`

```typescript
function normalizeValue(value: string): string {
  const trimmed = value.trim();
  
  // Nombre pur → Retirer les zéros devant
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10).toString(); // "01" → "1"
  }
  
  // Autre → Majuscules
  return trimmed.toUpperCase(); // "abc" → "ABC"
}
```

#### Fonction `expandInterval`

```typescript
function expandInterval(from: string, to: string): string[] {
  const normFrom = normalizeValue(from);
  const normTo = normalizeValue(to);
  
  // Cas 1 : Numérique pur
  if (/^\d+$/.test(normFrom) && /^\d+$/.test(normTo)) {
    const start = parseInt(normFrom, 10);
    const end = parseInt(normTo, 10);
    
    if (start > end) return [normFrom, normTo]; // Ordre inversé
    
    const values: string[] = [];
    for (let i = start; i <= end; i++) {
      values.push(i.toString());
    }
    return values;
  }
  
  // Cas 2 : Alphabétique pur
  if (/^[A-Z]$/.test(normFrom) && /^[A-Z]$/.test(normTo)) {
    const start = normFrom.charCodeAt(0);
    const end = normTo.charCodeAt(0);
    
    if (start > end) return [normFrom, normTo]; // Ordre inversé
    
    const values: string[] = [];
    for (let i = start; i <= end; i++) {
      values.push(String.fromCharCode(i));
    }
    return values;
  }
  
  // Cas 3 : Alphanumérique ou incompatible → Pas d'expansion
  return [normFrom, normTo];
}
```

#### Fonction `extractValues` (Mise à Jour)

```typescript
function extractValues(resource: SodResource): string[] {
  const allValues: string[] = [];
  
  for (const extRes of resource.externalResources || []) {
    for (const value of extRes.values || []) {
      // Cas 1 : Intervalle
      if (value.valueFrom && value.valueTo && value.valueFrom !== value.valueTo) {
        const expandedValues = expandInterval(value.valueFrom, value.valueTo);
        allValues.push(...expandedValues);
      }
      // Cas 2 : Valeur(s) simple(s)
      else if (value.valueFrom) {
        const fromValues = value.valueFrom
          .split(',')
          .map(v => normalizeValue(v))
          .filter(Boolean);
        allValues.push(...fromValues);
      }
    }
  }
  
  return allValues;
}
```

---

### Points Clés

- 📌 **Normalisation** : `"01"` = `"1"`, `"a"` = `"A"`
- 📌 **Expansion automatique** : Intervalles numériques et alphabétiques
- 📌 **Pas d'expansion** : Intervalles alphanumériques (A1 → A5)
- 📌 **Sous-ensemble** : Un intervalle est restreint si toutes ses valeurs sont restreintes
- 📌 **Affichage** : Format intervalle préservé dans l'UI (`01 → 05`)

---

## 📌 À venir

*Aucune fonctionnalité en attente pour le moment.*

