-- Migration: 001_create_validation_tables.sql
-- Description: Crée les tables pour le système de validation de rôles (multi-rôles métier)
-- Date: 2025-11-02
-- Version: 1.1

-- ═══════════════════════════════════════════════════════════
-- 1. Table pour les liens de validation temporaires
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_validation_links (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  
  -- Métadonnées du lien (MULTI-RÔLES)
  business_roles JSONB NOT NULL,              -- Array des rôles métier ["Comptable Junior", "Comptable Senior"]
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
  CONSTRAINT business_roles_not_empty CHECK (jsonb_array_length(business_roles) > 0)
);

-- ═══════════════════════════════════════════════════════════
-- 2. Table pour les résultats de validation
-- ═══════════════════════════════════════════════════════════
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
  
  -- Résultats de validation (avec businessRole pour chaque rôle)
  results JSONB NOT NULL,
  
  -- Métadonnées additionnelles
  metadata JSONB,
  
  -- Contraintes
  CONSTRAINT results_not_empty CHECK (jsonb_array_length(results) > 0)
);

-- ═══════════════════════════════════════════════════════════
-- 3. Commentaires pour documentation
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE role_validation_links IS 'Stocke les liens de validation temporaires pour le partage de rôles métier (peut être plusieurs rôles métier par lien)';
COMMENT ON TABLE role_validation_results IS 'Stocke les résultats de validation soumis par les validateurs';

COMMENT ON COLUMN role_validation_links.token IS 'Token unique UUID pour l''URL de validation';
COMMENT ON COLUMN role_validation_links.business_roles IS 'Array JSON des noms de rôles métier concernés (peut être plusieurs)';
COMMENT ON COLUMN role_validation_links.selected_roles IS 'Map JSON {businessRole: [simpleRoles]} des rôles simples par rôle métier';
COMMENT ON COLUMN role_validation_links.payload IS 'Données complètes nécessaires pour reconstruire la vue de validation';
COMMENT ON COLUMN role_validation_links.technical_view_enabled IS 'Si true, la vue technique est disponible dans la page de validation';
COMMENT ON COLUMN role_validation_results.results IS 'Array JSON des validations par rôle (isApproved, comment optionnel, businessRole)';

