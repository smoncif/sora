# Flux de Données - Système de Validation de Rôles

## 🔄 Diagrammes de Flux

### 1. Flux Principal : Création et Envoi de Lien

```
┌─────────────────────────────────────────────────────────────────────┐
│            UTILISATEUR DANS PAGE ANALYSE DES RÔLES                   │
│                  (Barre d'actions globale)                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Clique "Partager pour validation"
                                   │ (bouton à côté de "Exporter Spec")
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              RoleValidationShareModal s'ouvre                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ • Pré-rempli avec TOUS les businessRoles sélectionnés        │  │
│  │ • Map des selectedRoles par businessRole                     │  │
│  │ • Date d'expiration (défaut: +7 jours)                       │  │
│  │ • Switch "Vue technique" (défaut: false)                     │  │
│  │ • Template email multi-rôles par défaut                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Utilisateur configure
                                   │ et clique "Générer le lien"
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POST /api/validation/create                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Request Body:                                                 │  │
│  │ {                                                             │  │
│  │   businessRoles: ["Comptable Junior", "Comptable Senior"],  │  │
│  │   selectedRoles: {                                           │  │
│  │     "Comptable Junior": ["Z:M:ACC", "Z:D:REPORT"],         │  │
│  │     "Comptable Senior": ["Z:M:ACC_ADV", "Z:A:INV"]         │  │
│  │   },                                                          │  │
│  │   expirationDate: "2025-11-09T23:59:59Z",                   │  │
│  │   enableTechnicalView: true,                                 │  │
│  │   payload: { /* toutes les données multi-rôles */ }          │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ API crée un token UUID
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              INSERT dans role_validation_links                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Supabase DB:                                                  │  │
│  │ {                                                             │  │
│  │   id: uuid(),                                                 │  │
│  │   token: "550e8400-...",                                     │  │
│  │   business_roles: ["Comptable Junior", "Comptable Senior"], │  │
│  │   selected_roles: {                                          │  │
│  │     "Comptable Junior": ["Z:M:ACC", "Z:D:REPORT"],         │  │
│  │     "Comptable Senior": ["Z:M:ACC_ADV"]                     │  │
│  │   },                                                          │  │
│  │   technical_view_enabled: true,                              │  │
│  │   expires_at: "2025-11-09T23:59:59Z",                       │  │
│  │   payload: {...},                                            │  │
│  │   created_by: user_id,                                       │  │
│  │   status: "active"                                           │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Retourne token et lien
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Modal affiche le lien généré                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Lien: https://app.com/validation/550e8400-...               │  │
│  │ Résumé: 2 rôle(s) métier, 4 rôle(s) simple(s)               │  │
│  │ Expire le: 09/11/2025 23:59                                 │  │
│  │ [📋 Copier]  [📧 Envoyer par email]                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Utilisateur clique "Envoyer"
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                POST /api/email/send-validation                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ {                                                             │  │
│  │   recipients: ["user@example.com"],                          │  │
│  │   subject: "Validation requise - ...",                       │  │
│  │   body: "...\n{LINK}\n...",                                 │  │
│  │   link: "https://app.com/validation/550e8400-..."           │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Service email (Resend/SendGrid)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Email envoyé aux destinataires                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 2. Flux de Validation : Accès au Lien et Soumission

```
┌─────────────────────────────────────────────────────────────────────┐
│              VALIDATEUR reçoit l'email et clique sur le lien         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ GET /validation/[token]
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js Server Component                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ async function RoleValidationPage({ params }) {              │  │
│  │   const data = await fetch(                                  │  │
│  │     `/api/validation/${params.token}`                        │  │
│  │   );                                                          │  │
│  │                                                               │  │
│  │   if (!data.ok) return <ExpiredPage />;                     │  │
│  │   return <RoleValidationContent data={data} />;             │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ API vérifie token et expiration
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  GET /api/validation/[token]                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. SELECT * FROM role_validation_links                       │  │
│  │    WHERE token = '550e8400-...'                              │  │
│  │                                                               │  │
│  │ 2. Vérifier expires_at > NOW()                              │  │
│  │                                                               │  │
│  │ 3. Si expiré:                                                │  │
│  │    UPDATE status = 'expired'                                 │  │
│  │    RETURN 404                                                │  │
│  │                                                               │  │
│  │ 4. Si valide:                                                │  │
│  │    RETURN {                                                  │  │
│  │      token,                                                  │  │
│  │      businessRole,                                           │  │
│  │      selectedRoles,                                          │  │
│  │      technicalViewEnabled,                                   │  │
│  │      payload                                                 │  │
│  │    }                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Données valides
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              RoleValidationContent (Client Component)                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ État Local:                                                   │  │
│  │ • showTechnicalView (si technicalViewEnabled)                │  │
│  │ • validationResults: Map<roleId, {                           │  │
│  │     isApproved: boolean | null,                              │  │
│  │     comment: string                                          │  │
│  │   }>                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Affichage:                                                    │  │
│  │ • Header (businessRole, expiration, requester)               │  │
│  │ • Switch "Vue technique" (si enabled)                        │  │
│  │ • RoleValidationTable                                        │  │
│  │   ├─ Colonnes de base (toujours)                            │  │
│  │   └─ Colonnes techniques (si switch ON)                     │  │
│  │ • Bouton "Soumettre"                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Validateur remplit le formulaire
                                   │ et clique "Soumettre"
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POST /api/validation/submit                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Request Body:                                                 │  │
│  │ {                                                             │  │
│  │   token: "550e8400-...",                                     │  │
│  │   validatorEmail: "validator@example.com",                   │  │
│  │   validatorName: "Marie Martin",                             │  │
│  │   results: [                                                 │  │
│  │     {                                                         │  │
│  │       roleId: "ABC123",                                      │  │
│  │       roleName: "Z:M:ACCOUNTING_BASIC",                     │  │
│  │       isApproved: true,                                      │  │
│  │       comment: "Validé - Conforme"                          │  │
│  │     },                                                        │  │
│  │     ...                                                       │  │
│  │   ]                                                           │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ API enregistre les résultats
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│            INSERT dans role_validation_results                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. SELECT id FROM role_validation_links                      │  │
│  │    WHERE token = '550e8400-...'                              │  │
│  │                                                               │  │
│  │ 2. INSERT INTO role_validation_results {                     │  │
│  │      link_id: [id from step 1],                              │  │
│  │      validator_email,                                        │  │
│  │      validator_name,                                         │  │
│  │      results: [...],                                         │  │
│  │      submitted_at: NOW()                                     │  │
│  │    }                                                          │  │
│  │                                                               │  │
│  │ 3. UPDATE role_validation_links                              │  │
│  │    SET status = 'completed'                                  │  │
│  │    WHERE id = [id from step 1]                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Succès
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Page de Confirmation affichée                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ✅ Validation soumise avec succès !                          │  │
│  │                                                               │  │
│  │ Vos retours ont été enregistrés et transmis au créateur.     │  │
│  │ Vous pouvez fermer cette page.                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3. Flux de Consultation des Résultats (pour le Créateur)

```
┌─────────────────────────────────────────────────────────────────────┐
│         CRÉATEUR consulte les validations dans son Dashboard         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ GET /api/validation/results?userId=[id]
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Récupération des liens et résultats associés            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SELECT vl.*, vr.*                                            │  │
│  │ FROM role_validation_links vl                                │  │
│  │ LEFT JOIN role_validation_results vr ON vl.id = vr.link_id  │  │
│  │ WHERE vl.created_by = [userId]                               │  │
│  │ ORDER BY vl.created_at DESC                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Affichage dans un tableau
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Tableau des Validations                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ | Rôle Métier | Date Création | Expiration | Statut | Action│  │
│  │ |─────────────|───────────────|────────────|────────|───────│  │
│  │ | Comptable   | 02/11/2025    | 09/11/2025 | ✅     | Voir  │  │
│  │ | RH Manager  | 01/11/2025    | ⏰ Expiré  | ⏸️     | -     │  │
│  │ | Vendeur     | 31/10/2025    | 07/11/2025 | 📧     | Rappel│  │
│  │ └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Statuts:                                                            │
│  • ✅ Completed : Validation soumise                                │
│  • 📧 Active : En attente de validation                             │
│  • ⏰ Expired : Lien expiré                                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Créateur clique "Voir" sur une validation
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Modal de Détails de Validation                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Rôle Métier: Comptable Junior                                │  │
│  │ Validé par: Marie Martin (validator@example.com)             │  │
│  │ Date de soumission: 05/11/2025 14:30                         │  │
│  │                                                               │  │
│  │ Résultats:                                                    │  │
│  │ ┌────────────────────────────────────────────────────────┐  │  │
│  │ │ ✅ Z:M:ACCOUNTING_BASIC                                │  │  │
│  │ │    "Validé - Conforme aux besoins"                     │  │  │
│  │ │                                                         │  │  │
│  │ │ ❌ Z:D:REPORT_VIEWER                                   │  │  │
│  │ │    "Refusé - Accès trop large"                        │  │  │
│  │ │                                                         │  │  │
│  │ │ ❓ Z:A:INVOICE_READER                                  │  │  │
│  │ │    "À discuter avec la hiérarchie"                    │  │  │
│  │ └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │ [Exporter PDF] [Fermer]                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💾 Schémas de Données Détaillés

### Table: `role_validation_links`

```sql
CREATE TABLE role_validation_links (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Métadonnées du lien
  business_role VARCHAR(255) NOT NULL,
  selected_roles JSONB NOT NULL,              -- Array de strings
  technical_view_enabled BOOLEAN DEFAULT false,
  
  -- Temporalité
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Créateur
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- État du lien
  status VARCHAR(50) DEFAULT 'active',        -- 'active', 'expired', 'completed'
  
  -- Données complètes (pour reconstruction)
  payload JSONB NOT NULL,
  
  -- Métadonnées additionnelles
  metadata JSONB,                             -- Champ extensible
  
  -- Contraintes
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'completed')),
  CONSTRAINT expires_in_future CHECK (expires_at > created_at),
  CONSTRAINT expires_max_30_days CHECK (expires_at <= created_at + INTERVAL '30 days')
);

-- Indexes
CREATE INDEX idx_vl_token ON role_validation_links(token);
CREATE INDEX idx_vl_created_by ON role_validation_links(created_by);
CREATE INDEX idx_vl_expires_at ON role_validation_links(expires_at);
CREATE INDEX idx_vl_status ON role_validation_links(status);
CREATE INDEX idx_vl_business_role ON role_validation_links(business_role);

-- Index composite pour les requêtes fréquentes
CREATE INDEX idx_vl_created_status ON role_validation_links(created_by, status, created_at DESC);
```

**Exemple de Ligne:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "business_role": "Comptable Junior",
  "selected_roles": [
    "Z:M:ACCOUNTING_BASIC",
    "Z:D:REPORT_VIEWER",
    "Z:A:INVOICE_READER"
  ],
  "technical_view_enabled": true,
  "created_at": "2025-11-02T10:30:00.000Z",
  "expires_at": "2025-11-09T23:59:59.000Z",
  "created_by": "user-uuid-abc-123",
  "status": "active",
  "payload": {
    "businessRole": "Comptable Junior",
    "selectedRoles": [
      {
        "roleName": "Z:M:ACCOUNTING_BASIC",
        "roleId": "ABC123",
        "description": "Gestion comptable de base",
        "licence": "SAP_FI_BASIC",
        "transactions": [
          {
            "code": "FB01",
            "description": "Créer pièce comptable",
            "module": "FI",
            "moduleDescription": "Finance",
            "subModule": "GL",
            "subModuleDescription": "Grand Livre",
            "usage": 145
          },
          {
            "code": "FB02",
            "description": "Modifier pièce comptable",
            "module": "FI",
            "moduleDescription": "Finance",
            "subModule": "GL",
            "subModuleDescription": "Grand Livre",
            "usage": 87
          }
        ]
      },
      {
        "roleName": "Z:D:REPORT_VIEWER",
        "roleId": "DEF456",
        "description": "Consultation de rapports",
        "licence": "SAP_BASIC",
        "transactions": [
          {
            "code": "SE16",
            "description": "Navigateur de données",
            "module": "BC",
            "moduleDescription": "Base Components",
            "subModule": "DWB",
            "subModuleDescription": "Data Workbench",
            "usage": 23
          }
        ]
      }
    ],
    "transactionCount": 23,
    "createdBy": {
      "id": "user-uuid-abc-123",
      "name": "Jean Dupont",
      "email": "jean.dupont@example.com"
    }
  },
  "metadata": {
    "emailsSent": ["validator1@example.com", "validator2@example.com"],
    "emailSentAt": "2025-11-02T10:35:00.000Z"
  }
}
```

---

### Table: `role_validation_results`

```sql
CREATE TABLE role_validation_results (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Lien associé
  link_id UUID NOT NULL REFERENCES role_validation_links(id) ON DELETE CASCADE,
  
  -- Validateur (optionnel - anonyme possible)
  validator_email VARCHAR(255),
  validator_name VARCHAR(255),
  
  -- Temporalité
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Résultats de validation
  results JSONB NOT NULL,                     -- Array de validations par rôle
  
  -- Métadonnées additionnelles
  metadata JSONB,                             -- IP, user-agent, etc.
  
  -- Contraintes
  CONSTRAINT results_not_empty CHECK (jsonb_array_length(results) > 0)
);

-- Indexes
CREATE INDEX idx_vr_link_id ON role_validation_results(link_id);
CREATE INDEX idx_vr_submitted_at ON role_validation_results(submitted_at DESC);
CREATE INDEX idx_vr_validator_email ON role_validation_results(validator_email);

-- Index composite
CREATE INDEX idx_vr_link_submitted ON role_validation_results(link_id, submitted_at DESC);
```

**Exemple de Ligne:**
```json
{
  "id": "x1y2z3a4-b5c6-7890-defg-hi9876543210",
  "link_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "validator_email": "marie.martin@example.com",
  "validator_name": "Marie Martin",
  "submitted_at": "2025-11-05T14:30:00.000Z",
  "results": [
    {
      "roleId": "ABC123",
      "roleName": "Z:M:ACCOUNTING_BASIC",
      "isApproved": true,
      "comment": "Validé - Conforme aux besoins du poste. Les transactions sont pertinentes."
    },
    {
      "roleId": "DEF456",
      "roleName": "Z:D:REPORT_VIEWER",
      "isApproved": false,
      "comment": "Refusé - L'accès SE16 est trop large pour un comptable junior. Proposer un rapport spécifique à la place."
    },
    {
      "roleId": "GHI789",
      "roleName": "Z:A:INVOICE_READER",
      "isApproved": null,
      "comment": "À discuter avec la hiérarchie - Nécessite validation du responsable comptable."
    }
  ],
  "metadata": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "timeSpentSeconds": 420
  }
}
```

---

## 🔑 Exemples de Code Complets

### 1. Service de Génération de Template Email

```typescript
// lib/services/email/emailTemplateService.ts

export interface EmailTemplateVariables {
  link: string;
  businessRoleCount: number;     // Nombre de rôles métier
  businessRolesList: string;     // Liste formatée (ligne par ligne)
  roleCount: number;             // Nombre total de rôles simples
  expiration: string;
  requester: string;
}

export function generateDefaultEmailTemplate(
  variables: EmailTemplateVariables
): { subject: string; body: string } {
  const subject = `Validation requise - ${variables.businessRoleCount} Rôle(s) Métier`;
  
  const body = `Bonjour,

Vous êtes invité(e) à valider la composition de ${variables.businessRoleCount} rôle(s) métier :
${variables.businessRolesList}

Cette validation concerne au total ${variables.roleCount} rôle(s) simple(s).

Veuillez accéder au lien suivant pour consulter et valider les rôles proposés :
${variables.link}

⚠️ Ce lien expirera le ${variables.expiration}

Cordialement,
${variables.requester}`;

  return { subject, body };
}

export function formatExpirationDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

export function replaceTemplateVariables(
  template: string,
  variables: EmailTemplateVariables
): string {
  return template
    .replace(/{LINK}/g, variables.link)
    .replace(/{BUSINESS_ROLE_COUNT}/g, String(variables.businessRoleCount))
    .replace(/{BUSINESS_ROLES_LIST}/g, variables.businessRolesList)
    .replace(/{ROLE_COUNT}/g, String(variables.roleCount))
    .replace(/{EXPIRATION}/g, variables.expiration)
    .replace(/{REQUESTER}/g, variables.requester);
}

/**
 * Formate la liste des rôles métier pour l'email
 */
export function formatBusinessRolesList(businessRoles: string[]): string {
  return businessRoles.map(role => `• ${role}`).join('\n');
}
```

---

### 2. Hook Custom pour la Gestion de la Validation

```typescript
// lib/hooks/validation/useRoleValidation.ts

import { useState, useCallback } from 'react';

export interface ValidationResult {
  roleId: string;
  roleName: string;
  businessRole: string;       // 🆕 Rôle métier associé
  isApproved: boolean | null;
  comment: string;             // ✅ OPTIONNEL (pas de validation requise)
}

export function useRoleValidation(initialRoles: any[]) {
  const [results, setResults] = useState<Map<string, ValidationResult>>(
    new Map(
      initialRoles.map(role => [
        role.roleId,
        {
          roleId: role.roleId,
          roleName: role.roleName,
          isApproved: null,
          comment: '',
        }
      ])
    )
  );
  
  const [isDirty, setIsDirty] = useState(false);

  const updateApproval = useCallback((roleId: string, isApproved: boolean | null) => {
    setResults(prev => {
      const updated = new Map(prev);
      const current = updated.get(roleId);
      if (current) {
        updated.set(roleId, { ...current, isApproved });
      }
      return updated;
    });
    setIsDirty(true);
  }, []);

  const updateComment = useCallback((roleId: string, comment: string) => {
    setResults(prev => {
      const updated = new Map(prev);
      const current = updated.get(roleId);
      if (current) {
        updated.set(roleId, { ...current, comment });
      }
      return updated;
    });
    setIsDirty(true);
  }, []);

  const validateResults = useCallback((): { 
    isValid: boolean; 
    errors: string[] 
  } => {
    const errors: string[] = [];
    const resultArray = Array.from(results.values());
    
    // Vérifier qu'au moins une validation a été faite
    const hasAnyValidation = resultArray.some(r => r.isApproved !== null);
    if (!hasAnyValidation) {
      errors.push('Veuillez valider au moins un rôle');
    }
    
    // ✅ COMMENTAIRES OPTIONNELS - Plus de validation requise
    // Les commentaires sont encouragés via UX mais pas obligatoires
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [results]);

  const resetResults = useCallback(() => {
    setResults(new Map(
      initialRoles.map(role => [
        role.roleId,
        {
          roleId: role.roleId,
          roleName: role.roleName,
          isApproved: null,
          comment: '',
        }
      ])
    ));
    setIsDirty(false);
  }, [initialRoles]);

  return {
    results: Array.from(results.values()),
    updateApproval,
    updateComment,
    validateResults,
    resetResults,
    isDirty,
  };
}
```

---

### 3. Composant de Switch Tri-State pour Validation

```typescript
// lib/components/validation/ApprovalSwitch/ApprovalSwitch.tsx

import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  HelpOutline 
} from '@mui/icons-material';

interface ApprovalSwitchProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
}

export const ApprovalSwitch: React.FC<ApprovalSwitchProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleClick = (newValue: boolean | null) => {
    if (disabled) return;
    onChange(newValue);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 1, 
      alignItems: 'center',
      justifyContent: 'center' 
    }}>
      <Tooltip title="Valider">
        <IconButton
          onClick={() => handleClick(true)}
          disabled={disabled}
          sx={{
            color: value === true ? 'success.main' : 'action.disabled',
            bgcolor: value === true ? 'success.light' : 'transparent',
            '&:hover': {
              bgcolor: 'success.light',
            },
          }}
        >
          <CheckCircle />
        </IconButton>
      </Tooltip>

      <Tooltip title="En attente">
        <IconButton
          onClick={() => handleClick(null)}
          disabled={disabled}
          sx={{
            color: value === null ? 'warning.main' : 'action.disabled',
            bgcolor: value === null ? 'warning.light' : 'transparent',
            '&:hover': {
              bgcolor: 'warning.light',
            },
          }}
        >
          <HelpOutline />
        </IconButton>
      </Tooltip>

      <Tooltip title="Refuser">
        <IconButton
          onClick={() => handleClick(false)}
          disabled={disabled}
          sx={{
            color: value === false ? 'error.main' : 'action.disabled',
            bgcolor: value === false ? 'error.light' : 'transparent',
            '&:hover': {
              bgcolor: 'error.light',
            },
          }}
        >
          <Cancel />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
```

---

### 4. Gestion de l'Expiration Automatique (Cron Job)

```typescript
// lib/services/validation/validationCleanupService.ts

import { createClient } from 'lib/utils/supabase/server';

/**
 * Service de nettoyage des liens expirés
 * À exécuter périodiquement (ex: toutes les heures via Vercel Cron ou autre)
 */
export async function cleanupExpiredValidationLinks(): Promise<{
  expiredCount: number;
  deletedCount: number;
}> {
  const supabase = await createClient();
  
  // 1. Marquer les liens expirés
  const { data: expiredLinks, error: expireError } = await supabase
    .from('role_validation_links')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  
  if (expireError) {
    console.error('Erreur marquage liens expirés:', expireError);
    throw expireError;
  }
  
  const expiredCount = expiredLinks?.length || 0;
  
  // 2. Supprimer les liens expirés depuis plus de 30 jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: deletedLinks, error: deleteError } = await supabase
    .from('role_validation_links')
    .delete()
    .eq('status', 'expired')
    .lt('expires_at', thirtyDaysAgo.toISOString())
    .select('id');
  
  if (deleteError) {
    console.error('Erreur suppression vieux liens:', deleteError);
    throw deleteError;
  }
  
  const deletedCount = deletedLinks?.length || 0;
  
  console.log(`✅ Nettoyage terminé: ${expiredCount} expirés, ${deletedCount} supprimés`);
  
  return { expiredCount, deletedCount };
}

/**
 * API Route pour le Cron Job
 * /api/cron/cleanup-validations/route.ts
 */
export async function GET(request: Request) {
  // Vérifier que c'est bien Vercel Cron qui appelle
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    const result = await cleanupExpiredValidationLinks();
    
    return Response.json({
      success: true,
      expiredCount: result.expiredCount,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Erreur cron cleanup:', error);
    return Response.json({
      success: false,
      error: 'Cleanup failed',
    }, { status: 500 });
  }
}
```

**Configuration Vercel Cron (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-validations",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 🎯 Points Critiques d'Implémentation

### 1. Gestion de la Sécurité
- ✅ **Tokens UUID v4** : Imprévisibles et uniques
- ✅ **Expiration stricte** : Vérifiée à chaque accès
- ✅ **RLS Supabase** : Protège les données sensibles
- ✅ **Validation des entrées** : Zod schemas partout
- ⚠️ **Rate limiting** : À implémenter pour `/api/validation/[token]`

### 2. Performance
- 📦 **Payload complet stocké** : Évite les JOINs complexes
- 🔄 **Indexes optimisés** : Sur token, created_by, expires_at
- 💾 **Cache côté client** : React Query pour les données de validation
- ⚡ **Pagination** : Si > 50 rôles dans le tableau

### 3. UX/UI
- 🎨 **Loading states** : Partout (génération, envoi, soumission)
- ✅ **Validation temps réel** : Feedback immédiat
- 📱 **Mobile responsive** : Tableau adaptatif
- ♿ **Accessibilité** : ARIA labels, keyboard navigation

---

**Document créé le** : 2 Novembre 2025  
**Version** : 1.0  
**Complément de** : ANALYSE_VALIDATION_ROLES.md

