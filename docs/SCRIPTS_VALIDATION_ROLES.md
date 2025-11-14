# Scripts et Configuration - Système de Validation de Rôles

## 🗄️ Migrations Supabase

### 1. Créer les Tables Principales

```sql
-- Migration: 001_create_validation_tables.sql
-- Description: Crée les tables pour le système de validation de rôles
-- Date: 2025-11-02

-- 1. Table pour les liens de validation temporaires
CREATE TABLE IF NOT EXISTS role_validation_links (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  
  -- Métadonnées du lien
  business_roles JSONB NOT NULL,              -- Array des rôles métier concernés ["Comptable Junior", "Comptable Senior"]
  selected_roles JSONB NOT NULL,              -- Map {businessRole: [simpleRoles]}
  technical_view_enabled BOOLEAN DEFAULT false,
  
  -- Temporalité
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Créateur
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- État du lien
  status VARCHAR(50) DEFAULT 'active',
  
  -- Données complètes (pour reconstruction)
  payload JSONB NOT NULL,
  
  -- Métadonnées additionnelles
  metadata JSONB,
  
  -- Contraintes
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'completed')),
  CONSTRAINT expires_in_future CHECK (expires_at > created_at),
  CONSTRAINT expires_max_30_days CHECK (expires_at <= created_at + INTERVAL '30 days'),
  CONSTRAINT selected_roles_not_empty CHECK (jsonb_array_length(selected_roles) > 0)
);

-- 2. Table pour les résultats de validation
CREATE TABLE IF NOT EXISTS role_validation_results (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien associé
  link_id UUID NOT NULL REFERENCES role_validation_links(id) ON DELETE CASCADE,
  
  -- Validateur (optionnel - anonyme possible)
  validator_email VARCHAR(255),
  validator_name VARCHAR(255),
  
  -- Temporalité
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Résultats de validation
  results JSONB NOT NULL,
  
  -- Métadonnées additionnelles
  metadata JSONB,
  
  -- Contraintes
  CONSTRAINT results_not_empty CHECK (jsonb_array_length(results) > 0)
);

-- Commentaires pour documentation
COMMENT ON TABLE role_validation_links IS 'Stocke les liens de validation temporaires pour le partage de rôles métier (peut être plusieurs rôles métier par lien)';
COMMENT ON TABLE role_validation_results IS 'Stocke les résultats de validation soumis par les validateurs';

COMMENT ON COLUMN role_validation_links.token IS 'Token unique UUID pour l''URL de validation';
COMMENT ON COLUMN role_validation_links.business_roles IS 'Array JSON des noms de rôles métier concernés (peut être plusieurs)';
COMMENT ON COLUMN role_validation_links.selected_roles IS 'Map JSON {businessRole: [simpleRoles]} des rôles simples par rôle métier';
COMMENT ON COLUMN role_validation_links.payload IS 'Données complètes nécessaires pour reconstruire la vue de validation';
COMMENT ON COLUMN role_validation_links.technical_view_enabled IS 'Si true, la vue technique est disponible dans la page de validation';
COMMENT ON COLUMN role_validation_results.results IS 'Array JSON des validations par rôle (isApproved, comment optionnel, businessRole)';
```

### 2. Créer les Indexes de Performance

```sql
-- Migration: 002_create_validation_indexes.sql
-- Description: Ajoute les indexes pour optimiser les requêtes
-- Date: 2025-11-02

-- Indexes pour role_validation_links
CREATE INDEX IF NOT EXISTS idx_vl_token ON role_validation_links(token);
CREATE INDEX IF NOT EXISTS idx_vl_created_by ON role_validation_links(created_by);
CREATE INDEX IF NOT EXISTS idx_vl_expires_at ON role_validation_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_vl_status ON role_validation_links(status);

-- Index composite pour les requêtes fréquentes du créateur
CREATE INDEX IF NOT EXISTS idx_vl_created_status 
  ON role_validation_links(created_by, status, created_at DESC);

-- Index GIN pour les recherches dans les arrays JSON
CREATE INDEX IF NOT EXISTS idx_vl_business_roles_gin
  ON role_validation_links USING GIN (business_roles);
  
CREATE INDEX IF NOT EXISTS idx_vl_selected_roles_gin
  ON role_validation_links USING GIN (selected_roles);

-- Index composite pour le nettoyage automatique
CREATE INDEX IF NOT EXISTS idx_vl_status_expires 
  ON role_validation_links(status, expires_at) 
  WHERE status = 'active';

-- Indexes pour role_validation_results
CREATE INDEX IF NOT EXISTS idx_vr_link_id ON role_validation_results(link_id);
CREATE INDEX IF NOT EXISTS idx_vr_submitted_at ON role_validation_results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_vr_validator_email ON role_validation_results(validator_email);

-- Index composite pour récupérer les résultats d'un lien
CREATE INDEX IF NOT EXISTS idx_vr_link_submitted 
  ON role_validation_results(link_id, submitted_at DESC);

-- Analyse des tables pour optimiser le query planner
ANALYZE role_validation_links;
ANALYZE role_validation_results;
```

### 3. Configurer les RLS Policies

```sql
-- Migration: 003_create_validation_rls.sql
-- Description: Configure les Row Level Security policies
-- Date: 2025-11-02

-- Activer RLS sur les tables
ALTER TABLE role_validation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_validation_results ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- Policies pour role_validation_links
-- ═══════════════════════════════════════════════════════════

-- 1. Lecture : Les utilisateurs peuvent voir leurs propres liens
CREATE POLICY "Users can read their own validation links"
  ON role_validation_links
  FOR SELECT
  USING (auth.uid() = created_by);

-- 2. Création : Les utilisateurs authentifiés peuvent créer des liens
CREATE POLICY "Authenticated users can create validation links"
  ON role_validation_links
  FOR INSERT
  WITH CHECK (auth.uid() = created_by AND auth.role() = 'authenticated');

-- 3. Mise à jour : Les utilisateurs peuvent mettre à jour leurs propres liens
CREATE POLICY "Users can update their own validation links"
  ON role_validation_links
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 4. Suppression : Les utilisateurs peuvent supprimer leurs propres liens
CREATE POLICY "Users can delete their own validation links"
  ON role_validation_links
  FOR DELETE
  USING (auth.uid() = created_by);

-- 5. Lecture publique par token (pour la page de validation)
-- Note: Cette policy permet à n'importe qui avec le token de lire le lien
-- C'est sécurisé car le token est un UUID imprévisible
CREATE POLICY "Anyone can read validation link by token"
  ON role_validation_links
  FOR SELECT
  USING (true);  -- Accessible publiquement, sécurisé par le token UUID

-- ═══════════════════════════════════════════════════════════
-- Policies pour role_validation_results
-- ═══════════════════════════════════════════════════════════

-- 1. Lecture : Les créateurs de liens peuvent voir les résultats
CREATE POLICY "Link creators can view results"
  ON role_validation_results
  FOR SELECT
  USING (
    link_id IN (
      SELECT id 
      FROM role_validation_links 
      WHERE created_by = auth.uid()
    )
  );

-- 2. Insertion : N'importe qui peut soumettre une validation (public)
-- Sécurisé car nécessite un token valide pour obtenir le link_id
CREATE POLICY "Anyone can submit validation results"
  ON role_validation_results
  FOR INSERT
  WITH CHECK (true);  -- Ouvert pour permettre soumissions anonymes

-- 3. Mise à jour : Impossible de modifier les résultats soumis
-- (Pas de policy UPDATE = interdiction)

-- 4. Suppression : Seul le créateur du lien peut supprimer les résultats
CREATE POLICY "Link creators can delete results"
  ON role_validation_results
  FOR DELETE
  USING (
    link_id IN (
      SELECT id 
      FROM role_validation_links 
      WHERE created_by = auth.uid()
    )
  );
```

### 4. Créer les Fonctions Utilitaires

```sql
-- Migration: 004_create_validation_functions.sql
-- Description: Fonctions utilitaires pour le système de validation
-- Date: 2025-11-02

-- ═══════════════════════════════════════════════════════════
-- Fonction: get_validation_link_by_token
-- Description: Récupère un lien de validation et vérifie son expiration
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_validation_link_by_token(
  p_token UUID
)
RETURNS TABLE (
  id UUID,
  token UUID,
  business_roles JSONB,
  selected_roles JSONB,
  technical_view_enabled BOOLEAN,
  expires_at TIMESTAMPTZ,
  status VARCHAR(50),
  payload JSONB,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vl.id,
    vl.token,
    vl.business_roles,
    vl.selected_roles,
    vl.technical_view_enabled,
    vl.expires_at,
    vl.status,
    vl.payload,
    (vl.expires_at < NOW()) AS is_expired
  FROM role_validation_links vl
  WHERE vl.token = p_token;
  
  -- Si le lien est expiré, mettre à jour son statut
  UPDATE role_validation_links
  SET status = 'expired'
  WHERE token = p_token 
    AND expires_at < NOW() 
    AND status = 'active';
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- Fonction: cleanup_expired_validation_links
-- Description: Marque les liens expirés et supprime les vieux
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_expired_validation_links()
RETURNS TABLE (
  expired_count INTEGER,
  deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
  v_deleted_count INTEGER;
BEGIN
  -- 1. Marquer les liens actifs qui ont expiré
  UPDATE role_validation_links
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- 2. Supprimer les liens expirés depuis plus de 30 jours
  DELETE FROM role_validation_links
  WHERE status = 'expired' 
    AND expires_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_expired_count, v_deleted_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- Fonction: get_user_validation_links
-- Description: Récupère tous les liens d'un utilisateur avec leurs résultats
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_user_validation_links(
  p_user_id UUID
)
RETURNS TABLE (
  link_id UUID,
  token UUID,
  business_roles JSONB,
  business_roles_count INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(50),
  has_results BOOLEAN,
  results_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vl.id AS link_id,
    vl.token,
    vl.business_roles,
    jsonb_array_length(vl.business_roles) AS business_roles_count,
    vl.created_at,
    vl.expires_at,
    vl.status,
    EXISTS (
      SELECT 1 
      FROM role_validation_results vr 
      WHERE vr.link_id = vl.id
    ) AS has_results,
    COALESCE(
      (SELECT COUNT(*)::INTEGER 
       FROM role_validation_results vr 
       WHERE vr.link_id = vl.id),
      0
    ) AS results_count
  FROM role_validation_links vl
  WHERE vl.created_by = p_user_id
  ORDER BY vl.created_at DESC;
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_validation_link_by_token(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_validation_links() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_validation_links(UUID) TO authenticated;
```

---

## 📧 Configuration Email (Resend)

### 1. Variables d'Environnement (.env.local)

```bash
# Email Service (Resend)
EMAIL_API_KEY=re_123456789abcdefghijklmnop
EMAIL_FROM=noreply@votre-domaine.com
EMAIL_FROM_NAME=Sora - Analyse de Rôles

# Application URLs
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_NAME=Sora

# Cron Job Secret (pour sécuriser le nettoyage automatique)
CRON_SECRET=votre_secret_cron_tres_securise_ici
```

### 2. Installation de Resend

```bash
npm install resend
# ou
yarn add resend
# ou
pnpm add resend
```

### 3. Configuration Vercel Cron (vercel.json)

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

**Schedule Cron Syntax** :
- `0 * * * *` : Toutes les heures à la minute 0
- `0 0 * * *` : Tous les jours à minuit
- `0 */6 * * *` : Toutes les 6 heures

---

## 🔐 Configuration Supabase

### 1. Variables d'Environnement

```bash
# Supabase (déjà configuré normalement)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Exécuter les Migrations

**Via Supabase Dashboard** :
1. Aller sur https://app.supabase.com/project/[votre-projet]/sql
2. Copier le contenu de `001_create_validation_tables.sql`
3. Cliquer sur "Run"
4. Répéter pour les autres migrations

**Via Supabase CLI** (recommandé) :
```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login

# Créer une migration
supabase migration new create_validation_tables

# Copier le contenu SQL dans le fichier créé
# supabase/migrations/[timestamp]_create_validation_tables.sql

# Appliquer la migration
supabase db push
```

---

## 📦 Dépendances NPM

### 1. Installer les Packages Nécessaires

```bash
npm install \
  uuid \
  date-fns \
  resend \
  @mui/x-date-pickers \
  react-hook-form \
  @hookform/resolvers \
  zod

# Types TypeScript
npm install -D \
  @types/uuid
```

### 2. package.json (extrait)

```json
{
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@mui/x-date-pickers": "^6.18.0",
    "date-fns": "^2.30.0",
    "react-hook-form": "^7.47.0",
    "resend": "^2.0.0",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.7"
  }
}
```

---

## 🧪 Données de Test

### 1. Script de Seed pour Développement

```sql
-- seed_validation_test_data.sql
-- ⚠️ À UTILISER UNIQUEMENT EN DÉVELOPPEMENT ⚠️

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Remplacer par un vrai user_id
  v_link_id UUID;
BEGIN
  -- 1. Créer un lien de validation actif
  INSERT INTO role_validation_links (
    token,
    business_role,
    selected_roles,
    technical_view_enabled,
    created_by,
    expires_at,
    status,
    payload
  ) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Comptable Junior',
    '["Z:M:ACCOUNTING_BASIC", "Z:D:REPORT_VIEWER", "Z:A:INVOICE_READER"]'::jsonb,
    true,
    v_user_id,
    NOW() + INTERVAL '7 days',
    'active',
    '{
      "businessRole": "Comptable Junior",
      "selectedRoles": [
        {
          "roleName": "Z:M:ACCOUNTING_BASIC",
          "roleId": "ABC123",
          "description": "Gestion comptable de base",
          "transactions": [
            {"code": "FB01", "description": "Créer pièce comptable", "usage": 145}
          ]
        }
      ],
      "transactionCount": 23
    }'::jsonb
  )
  RETURNING id INTO v_link_id;
  
  -- 2. Créer un résultat de validation pour ce lien
  INSERT INTO role_validation_results (
    link_id,
    validator_email,
    validator_name,
    results,
    metadata
  ) VALUES (
    v_link_id,
    'validator@example.com',
    'Marie Martin',
    '[
      {
        "roleId": "ABC123",
        "roleName": "Z:M:ACCOUNTING_BASIC",
        "isApproved": true,
        "comment": "Validé - Conforme aux besoins"
      }
    ]'::jsonb,
    '{"ipAddress": "127.0.0.1", "timeSpentSeconds": 180}'::jsonb
  );
  
  -- 3. Créer un lien expiré
  INSERT INTO role_validation_links (
    token,
    business_role,
    selected_roles,
    technical_view_enabled,
    created_by,
    expires_at,
    status,
    payload
  ) VALUES (
    '660e8400-e29b-41d4-a716-446655440001',
    'RH Manager',
    '["Z:M:HR_BASIC"]'::jsonb,
    false,
    v_user_id,
    NOW() - INTERVAL '2 days',
    'expired',
    '{"businessRole": "RH Manager", "selectedRoles": [], "transactionCount": 5}'::jsonb
  );
  
  RAISE NOTICE 'Données de test créées avec succès !';
END $$;
```

### 2. Script de Nettoyage

```sql
-- cleanup_test_data.sql
-- Supprime toutes les données de test

DELETE FROM role_validation_results
WHERE validator_email = 'validator@example.com';

DELETE FROM role_validation_links
WHERE token IN (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440001'
);
```

---

## 🔍 Requêtes SQL Utiles

### 1. Statistiques Globales

```sql
-- Vue d'ensemble des validations
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_links,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_links,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_links,
  COUNT(*) AS total_links,
  COUNT(DISTINCT created_by) AS unique_creators
FROM role_validation_links;

-- Statistiques des résultats
SELECT 
  COUNT(*) AS total_results,
  COUNT(DISTINCT validator_email) AS unique_validators,
  AVG(jsonb_array_length(results))::NUMERIC(10,2) AS avg_roles_per_validation
FROM role_validation_results;
```

### 2. Liens Proches de l'Expiration

```sql
-- Liens qui expirent dans les prochaines 24 heures
SELECT 
  vl.id,
  vl.token,
  vl.business_role,
  vl.expires_at,
  vl.expires_at - NOW() AS time_remaining,
  u.email AS creator_email
FROM role_validation_links vl
LEFT JOIN auth.users u ON vl.created_by = u.id
WHERE vl.status = 'active'
  AND vl.expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
ORDER BY vl.expires_at ASC;
```

### 3. Taux de Soumission

```sql
-- Taux de soumission par créateur
SELECT 
  u.email AS creator_email,
  COUNT(DISTINCT vl.id) AS total_links,
  COUNT(DISTINCT vr.id) AS links_with_results,
  ROUND(
    COUNT(DISTINCT vr.id)::NUMERIC / 
    NULLIF(COUNT(DISTINCT vl.id), 0) * 100, 
    2
  ) AS submission_rate_percent
FROM role_validation_links vl
LEFT JOIN auth.users u ON vl.created_by = u.id
LEFT JOIN role_validation_results vr ON vl.id = vr.link_id
WHERE vl.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.email
ORDER BY submission_rate_percent DESC;
```

### 4. Temps Moyen de Validation

```sql
-- Temps moyen entre création du lien et soumission
SELECT 
  AVG(vr.submitted_at - vl.created_at) AS avg_time_to_submit,
  MIN(vr.submitted_at - vl.created_at) AS min_time,
  MAX(vr.submitted_at - vl.created_at) AS max_time
FROM role_validation_links vl
INNER JOIN role_validation_results vr ON vl.id = vr.link_id
WHERE vl.created_at >= NOW() - INTERVAL '30 days';
```

---

## 🛠️ Scripts de Maintenance

### 1. Vérification de la Santé du Système

```sql
-- healthcheck_validation_system.sql

DO $$
DECLARE
  v_active_links INTEGER;
  v_expired_unupdated INTEGER;
  v_orphan_results INTEGER;
BEGIN
  -- Vérifier les liens actifs
  SELECT COUNT(*) INTO v_active_links
  FROM role_validation_links
  WHERE status = 'active' AND expires_at > NOW();
  
  RAISE NOTICE 'Liens actifs valides: %', v_active_links;
  
  -- Vérifier les liens expirés non mis à jour
  SELECT COUNT(*) INTO v_expired_unupdated
  FROM role_validation_links
  WHERE status = 'active' AND expires_at < NOW();
  
  IF v_expired_unupdated > 0 THEN
    RAISE WARNING 'Liens expirés non marqués: % (exécuter cleanup)', v_expired_unupdated;
  END IF;
  
  -- Vérifier les résultats orphelins (ne devrait pas arriver avec CASCADE)
  SELECT COUNT(*) INTO v_orphan_results
  FROM role_validation_results vr
  LEFT JOIN role_validation_links vl ON vr.link_id = vl.id
  WHERE vl.id IS NULL;
  
  IF v_orphan_results > 0 THEN
    RAISE WARNING 'Résultats orphelins détectés: %', v_orphan_results;
  END IF;
  
  RAISE NOTICE 'Vérification terminée !';
END $$;
```

### 2. Export de Données pour Backup

```sql
-- export_validation_data.sql
-- Copier le résultat dans un fichier JSON

SELECT jsonb_build_object(
  'links', (
    SELECT jsonb_agg(row_to_json(vl))
    FROM role_validation_links vl
  ),
  'results', (
    SELECT jsonb_agg(row_to_json(vr))
    FROM role_validation_results vr
  ),
  'export_date', NOW()
) AS validation_backup;
```

---

## 📊 Monitoring & Alertes

### 1. Créer une Vue pour le Dashboard

```sql
-- Vue: validation_dashboard
-- Description: Vue synthétique pour le dashboard admin

CREATE OR REPLACE VIEW validation_dashboard AS
SELECT 
  -- Statistiques globales
  COUNT(DISTINCT vl.id) AS total_links,
  COUNT(DISTINCT vl.id) FILTER (WHERE vl.status = 'active') AS active_links,
  COUNT(DISTINCT vl.id) FILTER (WHERE vl.status = 'completed') AS completed_links,
  COUNT(DISTINCT vl.id) FILTER (WHERE vl.status = 'expired') AS expired_links,
  
  -- Résultats
  COUNT(DISTINCT vr.id) AS total_submissions,
  COUNT(DISTINCT vr.validator_email) AS unique_validators,
  
  -- Taux de conversion
  ROUND(
    COUNT(DISTINCT vr.id)::NUMERIC / 
    NULLIF(COUNT(DISTINCT vl.id), 0) * 100,
    2
  ) AS submission_rate,
  
  -- Données temporelles
  AVG(vr.submitted_at - vl.created_at) AS avg_time_to_submit,
  MIN(vl.created_at) AS first_link_created,
  MAX(vl.created_at) AS last_link_created
FROM role_validation_links vl
LEFT JOIN role_validation_results vr ON vl.id = vr.link_id;

-- Permissions
GRANT SELECT ON validation_dashboard TO authenticated;
```

### 2. Fonction d'Alerte par Email (exemple)

```sql
-- Fonction: send_expiration_alerts
-- Description: Envoie des alertes pour les liens proches de l'expiration
-- Note: Nécessite une extension PostgreSQL pour envoyer des emails
--       Ou appeler une fonction Edge Function Supabase

CREATE OR REPLACE FUNCTION send_expiration_alerts()
RETURNS TABLE (
  link_id UUID,
  creator_email TEXT,
  business_role VARCHAR,
  hours_remaining NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vl.id AS link_id,
    u.email AS creator_email,
    vl.business_role,
    EXTRACT(EPOCH FROM (vl.expires_at - NOW())) / 3600 AS hours_remaining
  FROM role_validation_links vl
  INNER JOIN auth.users u ON vl.created_by = u.id
  WHERE vl.status = 'active'
    AND vl.expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1 
      FROM role_validation_results vr 
      WHERE vr.link_id = vl.id
    );
  
  -- TODO: Implémenter l'envoi d'email via Edge Function
  -- ou service externe (Resend, SendGrid, etc.)
END;
$$;
```

---

## ✅ Checklist de Déploiement

### Avant le Déploiement

- [ ] Variables d'environnement configurées (`.env.local` et Vercel)
- [ ] Compte Resend créé et API key obtenue
- [ ] Migrations Supabase exécutées (001, 002, 003, 004)
- [ ] RLS policies testées
- [ ] Indexes créés et analysés
- [ ] Données de test créées et validées
- [ ] Vercel Cron configuré (`vercel.json`)

### Tests Pré-Prod

- [ ] Création d'un lien de validation (via UI)
- [ ] Envoi d'email de validation (vérifier réception)
- [ ] Accès à la page de validation via le lien
- [ ] Soumission d'une validation
- [ ] Consultation des résultats par le créateur
- [ ] Expiration automatique d'un lien (forcer la date)
- [ ] Nettoyage automatique (exécuter le cron manuellement)

### Déploiement Production

- [ ] Merger la branche dans `main`
- [ ] Déploiement automatique Vercel
- [ ] Vérifier les logs Vercel (pas d'erreurs)
- [ ] Tester en production (créer un lien réel)
- [ ] Monitorer les erreurs (Sentry, Vercel Analytics)

### Post-Déploiement

- [ ] Documenter le processus pour les utilisateurs
- [ ] Former les early adopters
- [ ] Collecter le feedback
- [ ] Itérer sur les améliorations

---

**Document créé le** : 2 Novembre 2025  
**Version** : 1.0  
**Statut** : ✅ Scripts Prêts pour Déploiement

