-- Migration: 009_add_last_activity_tracking.sql
-- Description: Ajouter le tracking de la dernière activité utilisateur
-- Date: 2025-01-11

-- ═══════════════════════════════════════════════════════════
-- 1. Ajouter la colonne last_activity dans profiles
-- ═══════════════════════════════════════════════════════════
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity);

COMMENT ON COLUMN profiles.last_activity IS 'Dernière activité de l''utilisateur (mise à jour à chaque requête)';

-- ═══════════════════════════════════════════════════════════
-- 2. Fonction pour récupérer les données auth des utilisateurs
-- ═══════════════════════════════════════════════════════════
-- Supprimer l'ancienne version de la fonction si elle existe
DROP FUNCTION IF EXISTS get_auth_users_data(UUID[]);

CREATE OR REPLACE FUNCTION get_auth_users_data(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.banned_until,
    au.created_at
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION get_auth_users_data(UUID[]) TO service_role;

COMMENT ON FUNCTION get_auth_users_data IS 'Récupère les données auth pour une liste d''utilisateurs (réservé au service role)';

-- ═══════════════════════════════════════════════════════════
-- 3. Fonction pour mettre à jour la dernière activité
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mettre à jour last_activity pour l'utilisateur connecté
  UPDATE profiles
  SET last_activity = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION update_last_activity() TO authenticated;

COMMENT ON FUNCTION update_last_activity IS 'Met à jour la dernière activité de l''utilisateur connecté';

-- ═══════════════════════════════════════════════════════════
-- 4. Fonction pour nettoyer les anciennes activités (optionnel)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_old_activity_data()
RETURNS TABLE (
  updated_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mettre à NULL les last_activity de plus de 1 an
  -- (optionnel, pour éviter de stocker des données trop anciennes)
  UPDATE profiles
  SET last_activity = NULL
  WHERE last_activity < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_updated_count;
END;
$$;

-- Accorder les permissions (pour les jobs automatiques)
GRANT EXECUTE ON FUNCTION cleanup_old_activity_data() TO service_role;

COMMENT ON FUNCTION cleanup_old_activity_data IS 'Nettoie les données d''activité trop anciennes';

-- ═══════════════════════════════════════════════════════════
-- 5. Mettre à jour last_activity pour les utilisateurs existants
-- ═══════════════════════════════════════════════════════════
UPDATE profiles
SET last_activity = updated_at
WHERE last_activity IS NULL;

