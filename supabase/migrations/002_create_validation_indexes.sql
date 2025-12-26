-- Migration: 002_create_validation_indexes.sql
-- Description: Ajoute les indexes pour optimiser les requêtes
-- Date: 2025-11-02
-- Version: 1.1

-- ═══════════════════════════════════════════════════════════
-- Indexes pour role_validation_links
-- ═══════════════════════════════════════════════════════════

-- Index sur token (lookup principal)
CREATE INDEX IF NOT EXISTS idx_vl_token ON role_validation_links(token);

-- Index sur created_by (pour récupérer les liens d'un utilisateur)
CREATE INDEX IF NOT EXISTS idx_vl_created_by ON role_validation_links(created_by);

-- Index sur expires_at (pour le nettoyage automatique)
CREATE INDEX IF NOT EXISTS idx_vl_expires_at ON role_validation_links(expires_at);

-- Index sur status (pour filtrer par état)
CREATE INDEX IF NOT EXISTS idx_vl_status ON role_validation_links(status);

-- Index composite pour les requêtes fréquentes du créateur
CREATE INDEX IF NOT EXISTS idx_vl_created_status 
  ON role_validation_links(created_by, status, created_at DESC);

-- Index composite pour le nettoyage automatique
CREATE INDEX IF NOT EXISTS idx_vl_status_expires 
  ON role_validation_links(status, expires_at) 
  WHERE status = 'active';

-- Index GIN pour les recherches dans les arrays JSON (multi-rôles)
CREATE INDEX IF NOT EXISTS idx_vl_business_roles_gin
  ON role_validation_links USING GIN (business_roles);
  
CREATE INDEX IF NOT EXISTS idx_vl_selected_roles_gin
  ON role_validation_links USING GIN (selected_roles);

-- ═══════════════════════════════════════════════════════════
-- Indexes pour role_validation_results
-- ═══════════════════════════════════════════════════════════

-- Index sur link_id (pour récupérer les résultats d'un lien)
CREATE INDEX IF NOT EXISTS idx_vr_link_id ON role_validation_results(link_id);

-- Index sur submitted_at (pour trier par date)
CREATE INDEX IF NOT EXISTS idx_vr_submitted_at ON role_validation_results(submitted_at DESC);

-- Index sur validator_email (pour rechercher par validateur)
CREATE INDEX IF NOT EXISTS idx_vr_validator_email ON role_validation_results(validator_email);

-- Index composite pour récupérer les résultats d'un lien triés par date
CREATE INDEX IF NOT EXISTS idx_vr_link_submitted 
  ON role_validation_results(link_id, submitted_at DESC);

-- ═══════════════════════════════════════════════════════════
-- Analyse des tables pour optimiser le query planner
-- ═══════════════════════════════════════════════════════════
ANALYZE role_validation_links;
ANALYZE role_validation_results;







