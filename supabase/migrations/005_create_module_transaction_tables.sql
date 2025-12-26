-- Migration: 005_create_module_transaction_tables.sql
-- Description: Crée les tables pour stocker les modules SAP et leurs transactions
-- Date: 2025-11-02

-- ═══════════════════════════════════════════════════════════
-- 1. Table des modules SAP (hiérarchie)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sap_modules (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiant du module (ex: "MM", "MM-IV", "MM-IV-LIV")
  module_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Description du module
  description TEXT NOT NULL,
  
  -- Hiérarchie (niveau 1, 2, 3, etc.)
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  
  -- Module parent (NULL pour les modules de niveau 1)
  parent_module_id VARCHAR(255) REFERENCES sap_modules(module_id) ON DELETE CASCADE,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  
  -- Contraintes
  CONSTRAINT valid_hierarchy CHECK (
    (level = 1 AND parent_module_id IS NULL) OR 
    (level > 1 AND parent_module_id IS NOT NULL)
  )
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_modules_module_id ON sap_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_parent ON sap_modules(parent_module_id);
CREATE INDEX IF NOT EXISTS idx_modules_level ON sap_modules(level);

-- ═══════════════════════════════════════════════════════════
-- 2. Table des transactions SAP
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sap_transactions (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code de la transaction (ex: "MIR4", "FB03")
  transaction_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Description de la transaction
  description TEXT,
  
  -- Module associé (référence au module le plus spécifique)
  module_id VARCHAR(255) REFERENCES sap_modules(module_id) ON DELETE SET NULL,
  
  -- Métadonnées additionnelles
  metadata JSONB,
  
  -- Temporalité
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_transactions_code ON sap_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_transactions_module ON sap_transactions(module_id);

-- ═══════════════════════════════════════════════════════════
-- 3. Fonction pour récupérer la hiérarchie complète d'un module
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_module_hierarchy(p_module_id VARCHAR)
RETURNS TABLE (
  module_id VARCHAR,
  description TEXT,
  level INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE module_tree AS (
    -- Cas de base : le module demandé
    SELECT 
      m.module_id,
      m.description,
      m.level,
      m.parent_module_id
    FROM sap_modules m
    WHERE m.module_id = p_module_id
    
    UNION ALL
    
    -- Récursion : remonter vers les parents
    SELECT 
      m.module_id,
      m.description,
      m.level,
      m.parent_module_id
    FROM sap_modules m
    INNER JOIN module_tree mt ON m.module_id = mt.parent_module_id
  )
  SELECT 
    mt.module_id,
    mt.description,
    mt.level
  FROM module_tree mt
  ORDER BY mt.level ASC;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. Fonction pour récupérer les transactions avec leur hiérarchie de modules
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_transactions_with_module_hierarchy()
RETURNS TABLE (
  transaction_code VARCHAR,
  transaction_description TEXT,
  module_id VARCHAR,
  module_description TEXT,
  module_level INTEGER,
  parent_module_id VARCHAR,
  level1_module VARCHAR,
  level1_description TEXT,
  level2_module VARCHAR,
  level2_description TEXT,
  level3plus_module VARCHAR,
  level3plus_description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE module_hierarchy AS (
    -- Récupérer tous les modules avec leur hiérarchie
    SELECT 
      m.module_id,
      m.description,
      m.level,
      m.parent_module_id,
      m.module_id as root_module_id,
      ARRAY[m.module_id] as path
    FROM sap_modules m
    WHERE m.parent_module_id IS NULL
    
    UNION ALL
    
    SELECT 
      m.module_id,
      m.description,
      m.level,
      m.parent_module_id,
      mh.root_module_id,
      mh.path || m.module_id
    FROM sap_modules m
    INNER JOIN module_hierarchy mh ON m.parent_module_id = mh.module_id
  ),
  transaction_modules AS (
    SELECT 
      t.transaction_code,
      t.description as transaction_description,
      t.module_id,
      mh.path,
      mh.level
    FROM sap_transactions t
    LEFT JOIN module_hierarchy mh ON t.module_id = mh.module_id
  )
  SELECT 
    tm.transaction_code,
    tm.transaction_description,
    tm.module_id,
    m.description as module_description,
    m.level as module_level,
    m.parent_module_id,
    -- Niveau 1
    CASE WHEN array_length(tm.path, 1) >= 1 THEN tm.path[1] ELSE NULL END as level1_module,
    m1.description as level1_description,
    -- Niveau 2
    CASE WHEN array_length(tm.path, 1) >= 2 THEN tm.path[2] ELSE NULL END as level2_module,
    m2.description as level2_description,
    -- Niveau 3+
    CASE WHEN array_length(tm.path, 1) >= 3 THEN tm.path[array_length(tm.path, 1)] ELSE NULL END as level3plus_module,
    m3.description as level3plus_description
  FROM transaction_modules tm
  LEFT JOIN sap_modules m ON tm.module_id = m.module_id
  LEFT JOIN sap_modules m1 ON tm.path[1] = m1.module_id
  LEFT JOIN sap_modules m2 ON tm.path[2] = m2.module_id
  LEFT JOIN sap_modules m3 ON tm.path[array_length(tm.path, 1)] = m3.module_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. Commentaires pour documentation
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE sap_modules IS 'Stocke la hiérarchie des modules SAP (ex: MM > MM-IV > MM-IV-LIV)';
COMMENT ON TABLE sap_transactions IS 'Stocke les transactions SAP avec leur module associé';
COMMENT ON FUNCTION get_module_hierarchy IS 'Récupère la hiérarchie complète d''un module (parents et enfants)';
COMMENT ON FUNCTION get_transactions_with_module_hierarchy IS 'Récupère toutes les transactions avec leur hiérarchie de modules décomposée';







