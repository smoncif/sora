-- Migration: 004_create_validation_functions.sql
-- Description: Fonctions utilitaires pour le système de validation
-- Date: 2025-11-02
-- Version: 1.1

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

-- ═══════════════════════════════════════════════════════════
-- Accorder les permissions d'exécution
-- ═══════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION get_validation_link_by_token(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_validation_links() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_validation_links(UUID) TO authenticated;




