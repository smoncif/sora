# 📝 Changelog - Système de Validation de Rôles

## Version 1.1 - 2 Novembre 2025

### 🎯 Changements Majeurs

#### 1. **Multi-Rôles Métier** (Breaking Change)
- **Avant** : Un lien de validation = 1 rôle métier
- **Maintenant** : Un lien de validation = Plusieurs rôles métier

**Impact base de données** :
```sql
-- Ancienne structure
business_role VARCHAR(255) NOT NULL,
selected_roles JSONB NOT NULL,  -- ["Z:M:ACC", "Z:D:REPORT"]

-- Nouvelle structure
business_roles JSONB NOT NULL,   -- ["Comptable Junior", "Comptable Senior"]
selected_roles JSONB NOT NULL,   -- {"Comptable Junior": ["Z:M:ACC"], ...}
```

**Migration requise** : Oui (voir scripts/migrations/)

---

#### 2. **Localisation du Bouton**
- **Avant** : Bouton dans `AnalysisCard.tsx` (par carte de rôle métier)
- **Maintenant** : Bouton dans `ActionsSection.tsx` (barre d'actions globale)
- **Position** : À côté du bouton "Exporter Spec" (bleu)

**Fichiers impactés** :
- `lib/components/analysis/ActionsSection/ActionsSection.tsx`
- `app/dashboard/analysis/roles/page.tsx`

---

#### 3. **QR Code Retiré**
- **Avant** : QR Code optionnel dans aperçu du lien
- **Maintenant** : Pas de QR Code

**Fichiers impactés** :
- `lib/components/validation/RoleValidationShareModal/RoleValidationShareModal.tsx`

---

#### 4. **Commentaires Optionnels**
- **Avant** : Commentaire obligatoire si `isApproved === false`
- **Maintenant** : Commentaires toujours optionnels

**Fichiers impactés** :
- `lib/hooks/validation/useRoleValidation.ts`
- `lib/components/validation/RoleValidationTable/RoleValidationTable.tsx`

---

### 📊 Nouveautés

#### Template Email Multi-Rôles
```
Sujet: Validation requise - {BUSINESS_ROLE_COUNT} Rôle(s) Métier

Bonjour,

Vous êtes invité(e) à valider la composition de {BUSINESS_ROLE_COUNT} rôle(s) métier :
{BUSINESS_ROLES_LIST}

Cette validation concerne au total {ROLE_COUNT} rôle(s) simple(s).

Lien: {LINK}
Expire le: {EXPIRATION}

Cordialement,
{REQUESTER}
```

**Nouvelles variables** :
- `{BUSINESS_ROLE_COUNT}` : Nombre de rôles métier
- `{BUSINESS_ROLES_LIST}` : Liste formatée (• Comptable Junior\n• Comptable Senior)

---

#### Colonne "Rôle Métier" dans le Tableau de Validation
- Nouvelle colonne dans `RoleValidationTable`
- Permet de distinguer à quel rôle métier appartient chaque rôle simple
- Groupement optionnel par rôle métier

---

### 🔧 API Changes

#### POST /api/validation/create
```typescript
// Ancienne version
{
  businessRole: string;
  selectedRoles: string[];
}

// Nouvelle version
{
  businessRoles: string[];
  selectedRoles: Record<string, string[]>;
}
```

#### GET /api/validation/[token]
```typescript
// Ancienne version
{
  businessRole: string;
  selectedRoles: string[];
}

// Nouvelle version
{
  businessRoles: string[];
  selectedRolesPerBusinessRole: Record<string, string[]>;
  totalRoleCount: number;
}
```

---

### 📦 Dépendances

Aucune nouvelle dépendance ajoutée.

---

### 🗄️ Migrations

#### Migration 001_update_validation_links_v1_1.sql
```sql
-- Renommer et adapter les colonnes
ALTER TABLE role_validation_links 
  RENAME COLUMN business_role TO business_role_old;

ALTER TABLE role_validation_links 
  ADD COLUMN business_roles JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Migrer les données existantes
UPDATE role_validation_links 
SET business_roles = jsonb_build_array(business_role_old);

-- Supprimer l'ancienne colonne
ALTER TABLE role_validation_links 
  DROP COLUMN business_role_old;

-- Adapter selected_roles pour le nouveau format
-- NOTE: Migration manuelle requise selon la structure actuelle
```

---

### ⚠️ Breaking Changes

1. **Structure de données** : `business_role` → `business_roles[]`
2. **API endpoints** : Paramètres modifiés (voir API Changes)
3. **Payload JSON** : Format complètement différent

---

### ✅ Checklist de Migration

- [ ] Exécuter migration SQL `001_update_validation_links_v1_1.sql`
- [ ] Mettre à jour `validationLinkService.ts`
- [ ] Mettre à jour `RoleValidationShareModal.tsx`
- [ ] Mettre à jour `RoleValidationTable.tsx`
- [ ] Adapter les API routes
- [ ] Mettre à jour les tests
- [ ] Tester le flux complet

---

### 📚 Documentation Mise à Jour

- ✅ RESUME_EXECUTIF_VALIDATION_ROLES.md
- ✅ ANALYSE_VALIDATION_ROLES.md
- ✅ FLUX_VALIDATION_ROLES.md
- ✅ SCRIPTS_VALIDATION_ROLES.md
- ✅ README_VALIDATION_ROLES.md
- ✅ MODIFICATIONS_BESOIN.md (nouveau)
- ✅ CHANGELOG_V1.1.md (ce fichier)

---

### 🚀 Prochaines Étapes

1. Valider l'architecture v1.1 avec l'équipe
2. Planifier la migration des données existantes (si déjà en production)
3. Démarrer l'implémentation selon la nouvelle architecture
4. Tests end-to-end du flux complet

---

**Date de release** : À déterminer  
**Compatibilité** : ⚠️ Breaking changes - Migration requise  
**Status** : 📝 Spécification complète




