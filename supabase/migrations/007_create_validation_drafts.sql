-- Création de la table pour sauvegarder les brouillons de validation de rôles
CREATE TABLE IF NOT EXISTS role_validation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES role_validation_links(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  results JSONB NOT NULL,
  validator_name TEXT,
  validator_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_validation_drafts_link_process
  ON role_validation_drafts (link_id, process);







