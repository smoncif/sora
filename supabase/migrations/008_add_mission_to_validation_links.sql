-- Migration: 008_add_mission_to_validation_links.sql
-- Description: Ajoute le champ "mission" obligatoire aux liens de validation
-- Date: 2025-11-11
-- Version: 1.2

-- ═══════════════════════════════════════════════════════════
-- 1. Ajouter la colonne mission
-- ═══════════════════════════════════════════════════════════
ALTER TABLE role_validation_links
ADD COLUMN mission TEXT NOT NULL DEFAULT 'Non spécifiée';

-- ═══════════════════════════════════════════════════════════
-- 2. Retirer la valeur par défaut (elle ne doit être utilisée que pour les anciennes lignes)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE role_validation_links
ALTER COLUMN mission DROP DEFAULT;

-- ═══════════════════════════════════════════════════════════
-- 3. Créer un index pour optimiser les recherches/tris
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_validation_links_mission ON role_validation_links(mission);

-- ═══════════════════════════════════════════════════════════
-- 4. Ajouter un index composite pour les recherches admin
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_validation_links_created_by_mission 
ON role_validation_links(created_by, mission);

-- ═══════════════════════════════════════════════════════════
-- 5. Commentaire pour documentation
-- ═══════════════════════════════════════════════════════════
COMMENT ON COLUMN role_validation_links.mission IS 
'Mission ou contexte de la validation (obligatoire à la création). Ex: "Audit Q4 2025", "Réorganisation Comptabilité"';


