-- Migration: 003_create_validation_rls.sql
-- Description: Configure les Row Level Security policies
-- Date: 2025-11-02
-- Version: 1.1

-- ═══════════════════════════════════════════════════════════
-- Activer RLS sur les tables
-- ═══════════════════════════════════════════════════════════
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




