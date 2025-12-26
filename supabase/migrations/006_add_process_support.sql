-- Migration: 006_add_process_support.sql
-- Description: Ajoute le support des processus métier dans le système de validation
-- Date: 2025-11-02

-- ═══════════════════════════════════════════════════════════
-- 1. Ajouter la colonne process à role_validation_results
-- ═══════════════════════════════════════════════════════════
ALTER TABLE role_validation_results
ADD COLUMN IF NOT EXISTS process VARCHAR(255);

-- ═══════════════════════════════════════════════════════════
-- 2. Créer une contrainte unique pour link_id + process
-- ═══════════════════════════════════════════════════════════
-- Un valideur ne peut soumettre qu'une fois par processus pour un même lien
CREATE UNIQUE INDEX IF NOT EXISTS idx_vr_link_process_unique
  ON role_validation_results(link_id, process);

-- ═══════════════════════════════════════════════════════════
-- 3. Index pour améliorer les performances
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_vr_process 
  ON role_validation_results(process);

CREATE INDEX IF NOT EXISTS idx_vr_link_process 
  ON role_validation_results(link_id, process);

-- ═══════════════════════════════════════════════════════════
-- 4. Fonction pour récupérer les validations par processus
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_validation_results_by_process(
  p_link_id UUID,
  p_process VARCHAR
)
RETURNS TABLE (
  id UUID,
  process VARCHAR,
  validator_name VARCHAR,
  validator_email VARCHAR,
  submitted_at TIMESTAMPTZ,
  results JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vr.id,
    vr.process,
    vr.validator_name,
    vr.validator_email,
    vr.submitted_at,
    vr.results
  FROM role_validation_results vr
  WHERE vr.link_id = p_link_id
    AND vr.process = p_process;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. Fonction pour vérifier si tous les processus sont soumis
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_all_processes_submitted(
  p_link_id UUID,
  p_required_processes VARCHAR[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_submitted_count INTEGER;
  v_required_count INTEGER;
BEGIN
  -- Compter les processus soumis
  SELECT COUNT(DISTINCT process)
  INTO v_submitted_count
  FROM role_validation_results
  WHERE link_id = p_link_id
    AND process = ANY(p_required_processes);
  
  -- Compter les processus requis
  v_required_count := array_length(p_required_processes, 1);
  
  -- Retourner true si tous les processus sont soumis
  RETURN v_submitted_count = v_required_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 6. Commentaires pour documentation
-- ═══════════════════════════════════════════════════════════
COMMENT ON COLUMN role_validation_results.process IS 'Processus métier concerné par cette validation (ex: Comptabilité, Achats)';
COMMENT ON FUNCTION get_validation_results_by_process IS 'Récupère les résultats de validation pour un processus spécifique';
COMMENT ON FUNCTION check_all_processes_submitted IS 'Vérifie si tous les processus requis ont été soumis pour un lien';







